import { Check, ChevronLeft, ChevronRight, Dumbbell, Flame, History, Plus, Timer, Trash2, Trophy, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { ExercisePicker } from "@/components/workout/ExercisePicker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SegmentedControl, Stepper } from "@/components/ui/controls"
import { ConfirmDialog, Dialog } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { readActiveWorkout, readRestSeconds, writeActiveWorkout, writeRestSeconds, type ActiveSet, type ActiveWorkout } from "@/lib/active-workout"
import { exerciseKey, getExerciseHistory, planForDate, slotLabel, type ExerciseHistory, type LibraryExercise, type PlanExercise, type WorkoutPlan } from "@/lib/api"
import { useAppData, weekdayText } from "@/lib/app-data"
import { relativeDateLabel, timestampOnDate, todayKey, weekdayNumber } from "@/lib/date"
import { describeSet, describeTarget, formatDuration as formatLongDuration, suggestWeight } from "@/lib/exercise-kind"
import { formatNumber, formatWeight, parseDecimal, parseInteger } from "@/lib/format"
import { useSelectedDateParam } from "@/lib/use-selected-date"
import { useSubmitLock } from "@/lib/use-submit-lock"
import { cn } from "@/lib/utils"

export const workoutSummaryStorageKey = "fitnote.workoutSummary"

const restOptions = [60, 90, 120, 180]
const rpeOptions = [6, 7, 8, 9, 10]

export function WorkoutSessionPage() {
  const { data } = useAppData()
  const { selectedDate } = useSelectedDateParam()

  if (!data) {
    return null
  }

  // A workout already in progress keeps the plan it started with (rotation could otherwise move on).
  const saved = readActiveWorkout()
  const resumed = saved && saved.date === selectedDate && saved.planId ? data.plans.find((item) => item.id === saved.planId) ?? null : null
  const plan = resumed ?? planForDate(data, selectedDate, todayKey())
  const rotation = data.settings.planMode === "rotation"
  // In rotation mode, exercises added "to the plan" go into the slot being trained; with no slot, only "this time".
  const planWeekday = plan && plan.weekday > 0 ? plan.weekday : rotation ? null : weekdayNumber(selectedDate)
  // Keyed by date only: adding an exercise to the plan mid-workout must not reset the session.
  return (
    <ActiveSession
      key={selectedDate}
      plan={plan && plan.exercises.length ? plan : null}
      planWeekday={planWeekday}
      date={selectedDate}
      library={data.exerciseLibrary}
    />
  )
}

function ActiveSession({ plan, planWeekday, date, library }: { plan: WorkoutPlan | null; planWeekday: number | null; date: string; library: LibraryExercise[] }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { saveWorkoutSession, createSessionExercise } = useAppData()
  const finishSubmit = useSubmitLock()
  const addSubmit = useSubmitLock()
  const [workout, setWorkout] = useState<ActiveWorkout>(() => {
    const saved = readActiveWorkout()
    if (saved && saved.date === date) {
      return saved
    }
    return {
      date,
      planId: plan?.id ?? null,
      planTitle: plan?.title ?? "自由训练",
      startedAt: Date.now(),
      exerciseIndex: 0,
      sets: [],
      restEndsAt: null,
      extraExercises: [],
    }
  })
  const exercises = useMemo(() => {
    const planned = plan?.exercises ?? []
    const plannedIds = new Set(planned.map((item) => item.id))
    return [...planned, ...(workout.extraExercises ?? []).filter((item) => !plannedIds.has(item.id))]
  }, [plan, workout.extraExercises])
  const index = Math.min(workout.exerciseIndex, Math.max(exercises.length - 1, 0))
  const exercise = exercises[index] ?? null
  const kind = exercise?.kind ?? "strength"
  const [history, setHistory] = useState<ExerciseHistory>({})
  const [weight, setWeight] = useState("")
  const [reps, setReps] = useState("")
  const [minutes, setMinutes] = useState("")
  const [distance, setDistance] = useState("")
  const [restSeconds, setRestSeconds] = useState(readRestSeconds)
  const [finishOpen, setFinishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addToPlan, setAddToPlan] = useState<"once" | "plan">("once")
  const [warmup, setWarmup] = useState(false)
  const [rpe, setRpe] = useState<number | null>(null)
  const now = useNow(1000)
  const vibrated = useRef<number | null>(null)
  const initialised = useRef<string | null>(null)
  const exerciseKeys = useMemo(() => exercises.map((item) => exerciseKey(item.libraryExerciseId, item.name)), [exercises])
  const current = exercise ? history[exerciseKey(exercise.libraryExerciseId, exercise.name)] : undefined
  const completedForExercise = exercise ? workout.sets.filter((set) => set.exerciseId === exercise.id) : []
  const workingForExercise = completedForExercise.filter((set) => !set.isWarmup)
  const workingSets = workout.sets.filter((set) => !set.isWarmup)
  const workingVolume = workingSets.reduce((sum, set) => sum + set.weight * set.reps * (set.kind && set.kind !== "strength" ? 0 : 1), 0)
  const restRemaining = workout.restEndsAt ? Math.min(restSeconds, Math.max(0, Math.ceil((workout.restEndsAt - now) / 1000))) : 0
  const elapsed = Math.max(0, Math.floor((now - workout.startedAt) / 1000))
  const suggestion = exercise && kind === "strength" && current ? suggestWeight(current.lastSets, exercise.reps) : null
  const doneByExercise = useMemo(() => {
    const map = new Map<string, number>()
    for (const set of workout.sets) {
      if (set.isWarmup) continue
      map.set(set.exerciseId, (map.get(set.exerciseId) ?? 0) + 1)
    }
    return map
  }, [workout.sets])

  useEffect(() => {
    writeActiveWorkout(workout)
  }, [workout])

  useEffect(() => {
    if (exerciseKeys.length === 0) return
    let cancelled = false
    getExerciseHistory(exerciseKeys)
      .then((result) => !cancelled && setHistory(result))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [exerciseKeys.join("|")])

  // Pre-fill inputs when the current exercise changes (or history arrives): continue from this
  // workout's last set, else last session's numbers, else the plan target.
  useEffect(() => {
    if (!exercise) return
    const marker = `${exercise.id}:${current ? "h" : "-"}`
    if (initialised.current === marker) return
    if (initialised.current?.split(":")[0] !== exercise.id) {
      // New exercise: start with no warm-up flag; offer warm-up only before the first working set.
      setWarmup(false)
      setRpe(null)
    }
    initialised.current = marker
    const lastHere = [...workout.sets].reverse().find((set) => set.exerciseId === exercise.id)
    if (kind === "cardio") {
      setMinutes(String(lastHere?.durationSec ? Math.round(lastHere.durationSec / 60) : current?.lastSets[0]?.durationSec ? Math.round(current.lastSets[0].durationSec / 60) : exercise.reps))
      setDistance(lastHere?.distanceM ? String(lastHere.distanceM / 1000) : current?.lastSets[0]?.distanceM ? String(current.lastSets[0].distanceM / 1000) : "")
      return
    }
    if (kind === "duration") {
      setReps(String(lastHere?.durationSec ?? current?.lastSets[0]?.durationSec ?? exercise.reps))
      setWeight(String(lastHere?.weight ?? exercise.weight))
      return
    }
    const suggested = current ? suggestWeight(current.lastSets, exercise.reps) : null
    setWeight(String(lastHere?.weight ?? suggested?.weight ?? exercise.weight))
    setReps(String(lastHere?.reps ?? exercise.reps))
  }, [exercise?.id, current, kind])

  useEffect(() => {
    if (workout.restEndsAt && restRemaining === 0 && vibrated.current !== workout.restEndsAt) {
      vibrated.current = workout.restEndsAt
      navigator.vibrate?.([200, 100, 200])
    }
  }, [restRemaining, workout.restEndsAt])

  function update(patch: Partial<ActiveWorkout>) {
    setWorkout((state) => ({ ...state, ...patch }))
  }

  function goToExercise(next: number) {
    if (next < 0 || next >= exercises.length) return
    update({ exerciseIndex: next })
  }

  function completeSet() {
    if (!exercise) return
    const base = { id: crypto.randomUUID(), exerciseId: exercise.id, exerciseName: exercise.name, kind, completedAt: Date.now() }
    let set: ActiveSet

    if (kind === "cardio") {
      const durationSec = Math.round(parseDecimal(minutes) * 60)
      if (durationSec <= 0) {
        showToast({ title: "请填写时长", tone: "error" })
        return
      }
      const km = parseDecimal(distance)
      set = { ...base, weight: 0, reps: 1, durationSec, distanceM: km > 0 ? Math.round(km * 1000) : null }
    } else if (kind === "duration") {
      const durationSec = parseInteger(reps, 0)
      if (durationSec <= 0) {
        showToast({ title: "请填写坚持的秒数", tone: "error" })
        return
      }
      set = { ...base, weight: parseDecimal(weight), reps: 1, durationSec, rpe }
    } else {
      const actualReps = parseInteger(reps, 0)
      if (actualReps <= 0) {
        showToast({ title: "次数需要大于 0", tone: "error" })
        return
      }
      set = { ...base, weight: parseDecimal(weight), reps: actualReps, isWarmup: warmup, rpe: warmup ? null : rpe }
      const previousBest = Math.max(current?.bestWeight ?? 0, ...workingForExercise.map((item) => item.weight))
      if (!warmup && current && current.sessions > 0 && set.weight > previousBest) {
        set.isRecord = true
        showToast({ title: `新纪录：${exercise.name} ${formatWeight(set.weight)} kg`, description: `之前最佳 ${formatWeight(previousBest)} kg` })
        navigator.vibrate?.([60, 40, 60, 40, 120])
      }
    }

    navigator.vibrate?.(30)
    const nextSets = [...workout.sets, set]
    const doneNow = nextSets.filter((item) => item.exerciseId === exercise.id && !item.isWarmup).length
    const rest = set.isWarmup ? Math.min(restSeconds, 60) : restSeconds
    update({ sets: nextSets, restEndsAt: kind === "cardio" ? null : Date.now() + rest * 1000 })
    setRpe(null)

    if (!set.isWarmup && doneNow >= exercise.sets && index < exercises.length - 1 && !set.isRecord) {
      showToast({ title: `${exercise.name} 完成`, description: "休息后进入下一个动作" })
    }
  }

  function setRest(value: number) {
    setRestSeconds(value)
    writeRestSeconds(value)
    if (workout.restEndsAt && restRemaining > 0) {
      update({ restEndsAt: Date.now() + value * 1000 })
    }
  }

  async function addExercise(item: LibraryExercise) {
    const weekday = planWeekday
    const toPlan = addToPlan === "plan" && weekday !== null
    await addSubmit.run(async () => {
      const created = await createSessionExercise({
        name: item.name,
        muscleGroup: item.muscleGroup,
        libraryExerciseId: item.id,
        kind: item.kind,
        sets: item.defaultSets,
        reps: item.defaultReps,
        weight: item.defaultWeight,
        addToPlanWeekday: toPlan ? weekday : null,
      })
      const planLength = plan?.exercises.length ?? 0
      const oldLength = exercises.length
      setWorkout((state) => ({
        ...state,
        extraExercises: toPlan ? (state.extraExercises ?? []) : [...(state.extraExercises ?? []), created],
        exerciseIndex: toPlan ? planLength : oldLength,
      }))
      setAddOpen(false)
      showToast({ title: toPlan && weekday !== null ? `已加入${dayName(weekday)}计划` : `已添加 ${item.name}` })
    }, "添加失败")
  }

  async function finishWorkout() {
    if (workout.sets.length === 0) return

    await finishSubmit.run(async () => {
      const finishedAt = Date.now()
      const startedAt = timestampOnDate(date, workout.startedAt)
      const result = await saveWorkoutSession({
        date,
        planId: plan?.id ?? null,
        startedAt,
        finishedAt: Math.max(startedAt, timestampOnDate(date, finishedAt)),
        sets: workout.sets.map((set, setIndex) => ({
          exerciseId: set.exerciseId,
          setIndex: setIndex + 1,
          actualReps: set.reps,
          actualWeight: set.weight,
          completedAt: timestampOnDate(date, set.completedAt),
          durationSec: set.durationSec ?? null,
          distanceM: set.distanceM ?? null,
          isWarmup: Boolean(set.isWarmup),
          rpe: set.rpe ?? null,
        })),
      })

      sessionStorage.setItem(
        workoutSummaryStorageKey,
        JSON.stringify({
          title: plan?.title ?? "自由训练",
          durationMinutes: Math.max(1, Math.round((finishedAt - workout.startedAt) / 60000)),
          sets: workingSets.length,
          warmups: workout.sets.length - workingSets.length,
          volume: workingVolume,
          queued: result === "queued",
          records: workout.sets.filter((set) => set.isRecord).map((set) => `${set.exerciseName} ${formatWeight(set.weight)} kg`),
          exercises: exercises
            .map((item) => {
              const sets = workingSets.filter((set) => set.exerciseId === item.id)
              return { id: item.id, name: item.name, muscle: item.muscle, sets: sets.length, best: sets.reduce((best, set) => Math.max(best, set.weight), 0) }
            })
            .filter((item) => item.sets > 0),
        }),
      )
      writeActiveWorkout(null)
      navigate(`/workout/summary?date=${date}`, { replace: true })
    })
  }

  function discardWorkout() {
    writeActiveWorkout(null)
    setDiscardOpen(false)
    navigate(`/workout?date=${date}`, { replace: true })
  }

  const isLast = index >= exercises.length - 1
  const pickerSelected = new Set<string | null>(exercises.map((item) => item.libraryExerciseId))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 truncate text-sm text-muted-foreground">
          {workout.planTitle || plan?.title || "自由训练"} · 已练 <span className="font-semibold text-foreground tabular-nums">{formatClock(elapsed)}</span>
        </p>
        <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
          {workingSets.length} 组 · {formatNumber(workingVolume, 0)} kg
        </p>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
        <div className="flex w-max gap-2 pb-1">
          {exercises.map((item, itemIndex) => {
            const done = doneByExercise.get(item.id) ?? 0
            const complete = done >= item.sets
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goToExercise(itemIndex)}
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition active:scale-95",
                  itemIndex === index ? "bg-primary text-primary-foreground" : complete ? "bg-primary/12 text-primary" : "bg-muted/55 text-muted-foreground",
                )}
              >
                {complete ? <Check className="h-3.5 w-3.5" /> : null}
                <span className="max-w-[7rem] truncate">{item.name}</span>
                <span className="tabular-nums opacity-75">
                  {done}/{item.sets}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex h-10 items-center gap-1 rounded-full border border-dashed border-primary/50 px-3.5 text-sm font-medium text-primary active:scale-95"
          >
            <Plus className="h-4 w-4" />
            加动作
          </button>
        </div>
      </div>

      {!exercise ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">自由训练</p>
              <p className="mt-1 text-sm text-muted-foreground">{relativeDateLabel(date)}没有安排计划，添加动作直接开始记录。</p>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              添加动作
            </Button>
            <Link to="/workout/plan" className="text-sm font-medium text-primary">
              或去安排训练计划
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  动作 {index + 1}/{exercises.length} · {exercise.muscle}
                </p>
                <h2 className="mt-0.5 text-2xl font-bold leading-tight">{exercise.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground tabular-nums">目标 {describeTarget(kind, exercise.sets, exercise.reps, exercise.weight)}</p>
              </div>
              <div className="shrink-0 rounded-2xl bg-muted/55 px-3 py-2 text-center">
                {warmup && kind === "strength" ? (
                  <>
                    <p className="text-[11px] text-muted-foreground">本组</p>
                    <p className="text-base font-bold leading-6 text-warning">热身</p>
                    <p className="text-[11px] text-muted-foreground">不计入</p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-muted-foreground">第</p>
                    <p className="text-xl font-bold leading-none tabular-nums">{workingForExercise.length + 1}</p>
                    <p className="text-[11px] text-muted-foreground">组</p>
                  </>
                )}
              </div>
            </div>

            {current && current.lastSets.length ? (
              <Link
                to={`/workout/library/${encodeURIComponent(exerciseKey(exercise.libraryExerciseId, exercise.name))}`}
                className="pressable block rounded-[1.25rem] bg-muted/40 px-4 py-3"
              >
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  上次 {current.lastDate}
                  {kind === "strength" && current.bestWeight > 0 ? (
                    <span className="ml-auto flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-warning" />
                      最佳 {formatWeight(current.bestWeight)} kg
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums">{current.lastSets.map((set) => describeSet(kind, set)).join("  ·  ")}</p>
                {suggestion ? (
                  <p className={cn("mt-1 text-xs", suggestion.weight > Math.max(...current.lastSets.map((set) => set.weight)) ? "text-primary" : "text-muted-foreground")}>
                    建议 {formatWeight(suggestion.weight)} kg（{suggestion.reason}）
                  </p>
                ) : null}
              </Link>
            ) : (
              <p className="px-1 text-xs text-muted-foreground">第一次做这个动作，记录后会显示上次成绩和建议重量。</p>
            )}

            {kind === "cardio" ? (
              <div className="grid grid-cols-2 gap-2.5">
                <Stepper label="时长" unit="分钟" value={minutes} onChange={setMinutes} step={5} />
                <Stepper label="距离（可选）" unit="km" value={distance} onChange={setDistance} step={0.5} decimal />
              </div>
            ) : kind === "duration" ? (
              <div className="grid grid-cols-2 gap-2.5">
                <Stepper label="坚持" unit="秒" value={reps} onChange={setReps} step={5} />
                <Stepper label="负重（可选）" unit="kg" value={weight} onChange={setWeight} step={2.5} decimal />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Stepper label="重量" unit="kg" value={weight} onChange={setWeight} step={2.5} decimal />
                <Stepper label="次数" unit="次" value={reps} onChange={setReps} step={1} />
              </div>
            )}

            {kind !== "cardio" ? (
              <div className="flex items-center gap-1.5">
                {kind === "strength" ? (
                  <button
                    type="button"
                    aria-pressed={warmup}
                    onClick={() => setWarmup((value) => !value)}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold transition active:scale-95",
                      warmup ? "bg-warning/18 text-warning" : "bg-muted/55 text-muted-foreground",
                    )}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    热身
                  </button>
                ) : null}
                <span className="ml-1 shrink-0 text-xs text-muted-foreground">RPE</span>
                <div className="grid flex-1 grid-cols-5 gap-1">
                  {rpeOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={rpe === value}
                      disabled={warmup && kind === "strength"}
                      onClick={() => setRpe((currentValue) => (currentValue === value ? null : value))}
                      className={cn(
                        "h-9 rounded-full text-sm font-semibold tabular-nums transition active:scale-95 disabled:opacity-35",
                        rpe === value ? "bg-primary text-primary-foreground" : "bg-muted/45 text-muted-foreground",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <Button size="lg" className="w-full" onClick={completeSet}>
              <Check className="h-5 w-5" />
              {kind === "cardio" ? "记录这次有氧" : warmup && kind === "strength" ? "完成热身组" : "完成这一组"}
            </Button>
            {kind !== "cardio" && workingForExercise.length === 0 && !warmup ? (
              <p className="-mt-2 px-1 text-center text-[11px] text-muted-foreground">RPE 可选：10 = 力竭，8 ≈ 还能再做 2 次</p>
            ) : null}

            {completedForExercise.length > 0 ? (
              <div className="space-y-1.5">
                {completedForExercise.map((set) => (
                  <div key={set.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 py-1.5 pl-4 pr-1.5">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {set.isWarmup ? <span className="font-medium text-warning">热身</span> : `第 ${workingForExercise.indexOf(set) + 1} 组`}
                      {set.isRecord ? <Trophy className="h-3.5 w-3.5 text-warning" aria-label="新纪录" /> : null}
                      {set.rpe ? <span className="rounded-full bg-card px-1.5 text-[11px] font-semibold tabular-nums text-foreground">RPE {set.rpe}</span> : null}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-sm font-semibold tabular-nums">{describeSet(set.kind ?? kind, { weight: set.weight, reps: set.reps, durationSec: set.durationSec ?? null, distanceM: set.distanceM ?? null })}</span>
                      <Button size="icon" variant="ghost" className="h-9 min-h-9 w-9" aria-label={set.isWarmup ? "删除热身组" : `删除第 ${workingForExercise.indexOf(set) + 1} 组`} onClick={() => update({ sets: workout.sets.filter((item) => item.id !== set.id) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {workout.restEndsAt && restRemaining > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Timer className="h-6 w-6 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">组间休息</p>
                <p className="text-3xl font-bold leading-none tabular-nums">{formatClock(restRemaining)}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => update({ restEndsAt: null })}>
                <X className="h-4 w-4" />
                跳过
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {restOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRest(value)}
                  className={cn("h-9 rounded-full text-sm font-semibold tabular-nums transition", value === restSeconds ? "bg-primary/14 text-primary" : "bg-muted/45 text-muted-foreground")}
                >
                  {value % 60 === 0 ? `${value / 60} 分钟` : `${value} 秒`}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="sticky-actions">
        <div className="grid grid-cols-[auto_auto_1fr] gap-2">
          <Button variant="secondary" size="icon" className="h-12 w-12" onClick={() => goToExercise(index - 1)} disabled={index === 0 || !exercise} aria-label="上一个动作">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="secondary" size="icon" className="h-12 w-12" onClick={() => goToExercise(index + 1)} disabled={isLast || !exercise} aria-label="下一个动作">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button className="h-12" variant={isLast && exercise && workingForExercise.length >= exercise.sets ? "default" : "quiet"} onClick={() => setFinishOpen(true)}>
            结束训练
          </Button>
        </div>
      </div>

      <Dialog
        open={addOpen}
        title="添加动作"
        description={plan ? undefined : planWeekday !== null ? "这一天没有计划，可以只记录本次，或加入每周计划" : undefined}
        onClose={() => setAddOpen(false)}
        footer={
          planWeekday !== null ? (
            <SegmentedControl
              options={[
                { value: "once" as const, label: "仅本次" },
                { value: "plan" as const, label: `加入${dayName(planWeekday)}计划` },
              ]}
              value={addToPlan}
              onChange={setAddToPlan}
            />
          ) : undefined
        }
      >
        <ExercisePicker library={library} selectedIds={pickerSelected} onPick={(item) => void addExercise(item)} />
      </Dialog>

      <Dialog open={finishOpen} title="结束训练？" placement="center" onClose={() => setFinishOpen(false)}>
        {workout.sets.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            共 {workingSets.length} 组{workout.sets.length > workingSets.length ? `（另有 ${workout.sets.length - workingSets.length} 组热身）` : ""}，用时 {formatLongDuration(elapsed)}。保存后可在训练记录中修改。
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">还没有完成任何一组，不会保存记录。</p>
        )}
        <div className="grid gap-2">
          {workout.sets.length > 0 ? (
            <Button size="lg" onClick={finishWorkout} disabled={finishSubmit.pending}>
              {finishSubmit.pending ? "保存中…" : "保存并结束"}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setFinishOpen(false)}>
            继续训练
          </Button>
          <Button
            variant="danger-ghost"
            onClick={() => {
              setFinishOpen(false)
              setDiscardOpen(true)
            }}
          >
            放弃本次训练
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        title="放弃本次训练？"
        description="已完成的组不会被保存。"
        confirmLabel="放弃"
        destructive
        onConfirm={discardWorkout}
        onClose={() => setDiscardOpen(false)}
      />
    </div>
  )
}

function dayName(weekday: number) {
  return weekday > 100 ? slotLabel(weekday) : weekdayText(weekday)
}

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(hours ? 2 : 1, "0")}:${String(seconds).padStart(2, "0")}`
  return hours ? `${hours}:${mmss}` : mmss
}

function useNow(interval: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval)
    const onVisible = () => setNow(Date.now())
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [interval])
  return now
}

export type { PlanExercise }
