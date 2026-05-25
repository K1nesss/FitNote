import { CalendarDays, Check, Clock3, Dumbbell, History, Trash2 } from "lucide-react"
import type { ComponentProps } from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateStrip } from "@/components/ui/date-strip"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/state"
import { useAppData, weekdayText } from "@/lib/app-data"
import type { WorkoutSessionDetail, WorkoutSetRecord } from "@/lib/api"
import { getWorkoutSession } from "@/lib/api"
import { useDayData } from "@/lib/use-day-data"
import { useSelectedDateParam } from "@/lib/use-selected-date"
import { useSubmitLock } from "@/lib/use-submit-lock"

export function TodayWorkoutPage() {
  const { selectedDate, setSelectedDate } = useSelectedDateParam()
  const { refresh: refreshApp, updateWorkoutSession, deleteWorkoutSession } = useAppData()
  const { dayData, loading, refresh } = useDayData(selectedDate)

  if (loading || !dayData) {
    return <LoadingState title="训练" />
  }

  const todayPlan = dayData.plan
  const sessionPath = `/workout/session?date=${selectedDate}`
  const totalSets = todayPlan?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0

  async function refreshRecords() {
    await Promise.all([refresh(), refreshApp()])
  }

  if (!todayPlan || todayPlan.exercises.length === 0) {
    return (
      <div className="space-y-5">
        <DateStrip value={selectedDate} onChange={setSelectedDate} />
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">训练</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-24 items-center rounded-[28px] bg-muted/35 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/46 text-muted-foreground">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <p className="font-medium text-muted-foreground">未设置</p>
              </div>
            </div>
            <Button asChild size="lg" className="w-full rounded-3xl">
              <Link to="/workout/plan">计划</Link>
            </Button>
          </CardContent>
        </Card>
        <WorkoutRecords
          sessions={dayData.workoutSessions}
          selectedDate={selectedDate}
          onChanged={refreshRecords}
          onUpdate={updateWorkoutSession}
          onDelete={deleteWorkoutSession}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <DateStrip value={selectedDate} onChange={setSelectedDate} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-3xl">{todayPlan.title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{weekdayText(todayPlan.weekday)}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-accent/72 text-accent-foreground">
              <CalendarDays className="h-7 w-7" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Badge>
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {todayPlan.exercises.length} 个
            </Badge>
            <Badge>
              <Dumbbell className="mr-1 h-3.5 w-3.5" />
              {totalSets} 组
            </Badge>
          </div>
          <Button asChild size="lg" className="w-full rounded-3xl">
            <Link to={sessionPath}>
              <Dumbbell className="h-5 w-5" />
              开始
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">动作</h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/workout/history" aria-label="历史">
            <History className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {todayPlan.exercises.map((exercise) => (
          <Card key={exercise.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted font-semibold">
                  {exercise.order}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{exercise.name}</p>
                  <p className="text-sm text-muted-foreground">{exercise.muscle}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">
                  {exercise.sets}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">组</span>
                </p>
                <p className="text-muted-foreground">
                  {exercise.reps} 次 · {exercise.weight} kg
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button asChild variant="quiet" className="w-full">
        <Link to="/workout/plan">计划</Link>
      </Button>

      <WorkoutRecords
        sessions={dayData.workoutSessions}
        selectedDate={selectedDate}
        onChanged={refreshRecords}
        onUpdate={updateWorkoutSession}
        onDelete={deleteWorkoutSession}
      />
    </div>
  )
}

function WorkoutRecords({
  sessions,
  selectedDate,
  onChanged,
  onUpdate,
  onDelete,
}: {
  sessions: NonNullable<ReturnType<typeof useDayData>["dayData"]>["workoutSessions"]
  selectedDate: string
  onChanged: () => Promise<void>
  onUpdate: ReturnType<typeof useAppData>["updateWorkoutSession"]
  onDelete: ReturnType<typeof useAppData>["deleteWorkoutSession"]
}) {
  const [detail, setDetail] = useState<WorkoutSessionDetail | null>(null)
  const [sets, setSets] = useState<WorkoutSetDraft[]>([])
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const saveSubmit = useSubmitLock()
  const deleteSubmit = useSubmitLock()
  const exerciseGroups = groupWorkoutSets(sets)
  const activeGroup = exerciseGroups.find((group) => group.exerciseId === activeExerciseId) ?? null

  useEffect(() => {
    setSets((detail?.sets ?? []).map(toSetDraft))
    setActiveExerciseId(null)
  }, [detail])

  async function openSession(id: string) {
    setLoadingDetail(true)

    try {
      setDetail(await getWorkoutSession(id))
    } finally {
      setLoadingDetail(false)
    }
  }

  function updateSet(id: string, patch: Partial<WorkoutSetDraft>) {
    setSets((current) => current.map((set) => (set.id === id ? { ...set, ...patch } : set)))
  }

  function deleteSet(id: string) {
    setSets((current) => current.filter((set) => set.id !== id))
  }

  function deleteExerciseRecord(exerciseId: string) {
    setSets((current) => current.filter((set) => set.exerciseId !== exerciseId))
    setActiveExerciseId((current) => (current === exerciseId ? null : current))
  }

  async function saveSession() {
    if (!detail) {
      return
    }

    await saveSubmit.run(async () => {
      await onUpdate(detail.id, {
        date: selectedDate,
        startedAt: detail.startedAt,
        finishedAt: detail.finishedAt,
        sets: sets.map((set, index) => ({
          id: set.id,
          exerciseId: set.exerciseId,
          setIndex: index + 1,
          actualReps: toInteger(set.actualReps, 0),
          actualWeight: toDecimal(set.actualWeight, 0),
          completedAt: set.completedAt,
        })),
      })
      setDetail(null)
      await onChanged()
    })
  }

  async function removeSession() {
    if (!detail) {
      return
    }

    await deleteSubmit.run(async () => {
      await onDelete(detail.id)
      setDetail(null)
      await onChanged()
    })
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">记录</h2>
      {sessions.map((session) => (
        <Card key={session.id}>
          <CardContent
            className="flex items-center justify-between gap-4 p-4 transition active:scale-[0.99]"
            role="button"
            tabIndex={0}
            onClick={() => void openSession(session.id)}
          >
            <div>
              <p className="font-medium">{session.title}</p>
              <p className="text-sm text-muted-foreground">{session.date}</p>
            </div>
            <div className="text-right text-sm">
              <p>{session.volume}</p>
              <p className="text-muted-foreground">{session.sets} 组</p>
            </div>
          </CardContent>
        </Card>
      ))}
      {sessions.length === 0 ? (
        <div className="rounded-[28px] bg-muted/35 p-5 text-sm font-medium text-muted-foreground">暂无</div>
      ) : null}
      <Dialog
        open={Boolean(detail) || loadingDetail}
        title="训练记录"
        onClose={() => {
          setDetail(null)
          setActiveExerciseId(null)
        }}
      >
        {loadingDetail && !detail ? <p className="rounded-3xl bg-muted/60 p-4 text-sm text-muted-foreground">加载中</p> : null}
        {detail && !activeGroup ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="动作" value={exerciseGroups.length} unit="个" />
              <MetricCard label="日期" value={detail.date} />
              <MetricCard label="组数" value={sets.length} unit="组" />
            </div>
            <div className="space-y-3">
              {exerciseGroups.map((group) => (
                <div key={group.exerciseId} className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <button
                    type="button"
                    className="flex min-h-20 items-center justify-between gap-3 rounded-[28px] bg-muted/55 p-4 text-left transition active:scale-[0.99]"
                    onClick={() => setActiveExerciseId(group.exerciseId)}
                  >
                    <span>
                      <span className="block font-medium">{group.exerciseName}</span>
                      <span className="block text-sm text-muted-foreground">
                        {group.sets.length} 组 · {Math.round(group.volume).toLocaleString("en-US")} kg
                      </span>
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">{formatWeight(group.bestWeight)} kg</span>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="删除动作记录"
                    onClick={() => deleteExerciseRecord(group.exerciseId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {exerciseGroups.length === 0 ? (
                <div className="rounded-3xl bg-muted/55 p-4 text-sm text-muted-foreground">无动作</div>
              ) : null}
            </div>
            <MetricCard
              label="容量"
              value={Math.round(
                sets.reduce((sum, set) => sum + toDecimal(set.actualWeight, 0) * toInteger(set.actualReps, 0), 0),
              )}
              unit="kg"
            />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" className="rounded-3xl" onClick={removeSession} disabled={deleteSubmit.pending}>
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
              <Button className="rounded-3xl" onClick={saveSession} disabled={saveSubmit.pending}>
                <Check className="h-4 w-4" />
                保存
              </Button>
            </div>
          </>
        ) : null}
        {detail && activeGroup ? (
          <>
            <Button variant="ghost" className="w-fit rounded-3xl" onClick={() => setActiveExerciseId(null)}>
              返回
            </Button>
            <div className="rounded-[28px] bg-muted/55 p-4">
              <p className="font-medium">{activeGroup.exerciseName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeGroup.sets.length} 组 · {Math.round(activeGroup.volume).toLocaleString("en-US")} kg
              </p>
            </div>
            <div className="space-y-3">
              {activeGroup.sets.map((set, index) => (
                <div key={set.id} className="rounded-[28px] bg-muted/55 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-medium">第 {index + 1} 组</p>
                    <Button size="icon" variant="ghost" aria-label="删除组" onClick={() => deleteSet(set.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InputWithSuffix
                      suffix="kg"
                      inputMode="decimal"
                      value={set.actualWeight}
                      onChange={(event) => updateSet(set.id, { actualWeight: event.target.value })}
                    />
                    <InputWithSuffix
                      suffix="次"
                      inputMode="numeric"
                      value={set.actualReps}
                      onChange={(event) => updateSet(set.id, { actualReps: event.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full rounded-3xl" onClick={saveSession} disabled={saveSubmit.pending}>
              <Check className="h-4 w-4" />
              保存
            </Button>
          </>
        ) : null}
      </Dialog>
    </section>
  )
}

type WorkoutSetDraft = Omit<WorkoutSetRecord, "actualReps" | "actualWeight"> & {
  actualReps: string
  actualWeight: string
}

function toSetDraft(set: WorkoutSetRecord): WorkoutSetDraft {
  return {
    ...set,
    actualReps: String(set.actualReps),
    actualWeight: String(set.actualWeight),
  }
}

function MetricCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-3xl bg-muted/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">
        {value}
        {unit ? <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  )
}

function InputWithSuffix({ suffix, className, ...props }: ComponentProps<typeof Input> & { suffix: string }) {
  return (
    <div className="relative">
      <Input className={`pr-12 ${className ?? ""}`} {...props} />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
        {suffix}
      </span>
    </div>
  )
}

function groupWorkoutSets(sets: WorkoutSetDraft[]) {
  const map = new Map<
    string,
    { exerciseId: string; exerciseName: string; sets: WorkoutSetDraft[]; volume: number; bestWeight: number }
  >()

  for (const set of sets) {
    const group = map.get(set.exerciseId) ?? {
      exerciseId: set.exerciseId,
      exerciseName: set.exerciseName,
      sets: [],
      volume: 0,
      bestWeight: 0,
    }
    const weight = toDecimal(set.actualWeight, 0)
    group.sets.push(set)
    group.volume += weight * toInteger(set.actualReps, 0)
    group.bestWeight = Math.max(group.bestWeight, weight)
    map.set(set.exerciseId, group)
  }

  return Array.from(map.values())
}

function formatWeight(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function toInteger(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback
}

function toDecimal(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 10) / 10) : fallback
}
