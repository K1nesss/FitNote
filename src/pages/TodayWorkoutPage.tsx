import { BookOpen, CalendarRange, ChevronLeft, ChevronRight, Dumbbell, History, Play, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InputWithSuffix, SectionHeader } from "@/components/ui/controls"
import { DateStrip } from "@/components/ui/date-strip"
import { ConfirmDialog, Dialog } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/state"
import { useToast } from "@/components/ui/toast"
import { readActiveWorkout } from "@/lib/active-workout"
import type { WorkoutSessionDetail, WorkoutSetRecord } from "@/lib/api"
import { getWorkoutSession, slotLabel } from "@/lib/api"
import { errorMessage, useAppData, weekdayText } from "@/lib/app-data"
import { relativeDateLabel } from "@/lib/date"
import { describeSet } from "@/lib/exercise-kind"
import { formatNumber, formatWeight, parseDecimal, parseInteger } from "@/lib/format"
import { useDayData } from "@/lib/use-day-data"
import { useSelectedDateParam } from "@/lib/use-selected-date"
import { useSubmitLock } from "@/lib/use-submit-lock"

export function TodayWorkoutPage() {
  const { selectedDate, setSelectedDate } = useSelectedDateParam()
  const { data, refresh: refreshApp, updateWorkoutSession, deleteWorkoutSession } = useAppData()
  const rotation = data?.settings.planMode === "rotation"
  const { dayData, showSkeleton, error, refresh } = useDayData(selectedDate)
  const [activeWorkout] = useState(readActiveWorkout)

  async function refreshRecords() {
    await Promise.all([refresh(), refreshApp()])
  }

  const plan = dayData?.plan
  const totalSets = plan?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0
  const sessionPath = `/workout/session?date=${selectedDate}`

  return (
    <div className="space-y-5">
      <DateStrip value={selectedDate} onChange={setSelectedDate} />

      {activeWorkout ? (
        <Link
          to={`/workout/session?date=${activeWorkout.date}`}
          className="pressable flex items-center gap-3 rounded-[1.75rem] bg-primary p-4 text-primary-foreground shadow-[0_12px_28px_rgba(23,105,166,0.22)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Play className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">继续未完成的训练</span>
            <span className="block text-sm opacity-85">
              {activeWorkout.planTitle} · 已完成 {activeWorkout.sets.length} 组
            </span>
          </span>
          <ChevronRight className="h-5 w-5" />
        </Link>
      ) : null}

      {showSkeleton ? <div className="skeleton h-48 rounded-[2rem]" /> : null}
      {error && !dayData ? (
        <EmptyState icon={Dumbbell} title="加载失败" description={error} action={<Button onClick={() => void refresh()}>重试</Button>} />
      ) : null}

      {dayData ? (
        plan && plan.exercises.length > 0 ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-xs text-muted-foreground">
                  {relativeDateLabel(selectedDate)} · {plan.weekday > 100 ? `循环 · ${slotLabel(plan.weekday)}` : weekdayText(plan.weekday)}
                </p>
                <h2 className="mt-0.5 text-2xl font-bold">{plan.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.exercises.length} 个动作 · {totalSets} 组
                </p>
              </div>
              <ol className="divide-y divide-[var(--surface-border)] rounded-[1.4rem] bg-muted/35">
                {plan.exercises.map((exercise, index) => (
                  <li key={exercise.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted-foreground tabular-nums">{index + 1}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{exercise.name}</span>
                        <span className="block text-xs text-muted-foreground">{exercise.muscle}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {exercise.sets}×{exercise.reps} · {formatWeight(exercise.weight)}kg
                    </span>
                  </li>
                ))}
              </ol>
              {activeWorkout?.date !== selectedDate ? (
                <Button asChild size="lg" className="w-full">
                  <Link to={sessionPath}>
                    <Play className="h-5 w-5" />
                    开始训练
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={CalendarRange}
            title={rotation ? `${relativeDateLabel(selectedDate)}没有循环训练` : `${relativeDateLabel(selectedDate)}是休息日`}
            description={
              rotation
                ? "循环模式下，今天和以后会显示下一个训练日。也可以直接开始一次自由训练。"
                : "可以直接开始一次自由训练，或在训练计划里为这一天安排动作。"
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to={sessionPath}>
                    <Play className="h-4 w-4" />
                    自由训练
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/workout/plan">安排计划</Link>
                </Button>
              </div>
            }
          />
        )
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {[
          { to: "/workout/plan", label: "训练计划", icon: CalendarRange },
          { to: "/workout/history", label: "历史", icon: History },
          { to: "/workout/library", label: "动作库", icon: BookOpen },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="pressable flex flex-col items-center gap-1.5 rounded-[1.5rem] bg-muted/45 py-3.5 text-sm font-medium">
            <item.icon className="h-5 w-5 text-primary" />
            {item.label}
          </Link>
        ))}
      </div>

      {dayData ? (
        <WorkoutRecords
          sessions={dayData.workoutSessions}
          selectedDate={selectedDate}
          onChanged={refreshRecords}
          onUpdate={updateWorkoutSession}
          onDelete={deleteWorkoutSession}
        />
      ) : null}
    </div>
  )
}

type Sessions = NonNullable<ReturnType<typeof useDayData>["dayData"]>["workoutSessions"]

function WorkoutRecords({
  sessions,
  selectedDate,
  onChanged,
  onUpdate,
  onDelete,
}: {
  sessions: Sessions
  selectedDate: string
  onChanged: () => Promise<void>
  onUpdate: ReturnType<typeof useAppData>["updateWorkoutSession"]
  onDelete: ReturnType<typeof useAppData>["deleteWorkoutSession"]
}) {
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<WorkoutSessionDetail | null>(null)
  const [sets, setSets] = useState<WorkoutSetDraft[]>([])
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveSubmit = useSubmitLock()
  const deleteSubmit = useSubmitLock()
  const exerciseGroups = groupWorkoutSets(sets)
  const activeGroup = exerciseGroups.find((group) => group.exerciseId === activeExerciseId) ?? null

  useEffect(() => {
    setSets((detail?.sets ?? []).map(toSetDraft))
    setActiveExerciseId(null)
  }, [detail])

  async function openSession(id: string) {
    setOpen(true)
    setDetail(null)

    try {
      setDetail(await getWorkoutSession(id))
    } catch (caught) {
      setOpen(false)
      showToast({ title: "无法打开记录", description: errorMessage(caught), tone: "error" })
    }
  }

  function close() {
    setOpen(false)
    setDetail(null)
    setActiveExerciseId(null)
  }

  function updateSet(id: string, patch: Partial<WorkoutSetDraft>) {
    setSets((current) => current.map((set) => (set.id === id ? { ...set, ...patch } : set)))
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
          actualReps: parseInteger(set.actualReps, 0),
          actualWeight: parseDecimal(set.actualWeight, 0),
          completedAt: set.completedAt,
          durationSec: set.durationSec,
          distanceM: set.distanceM,
          isWarmup: Boolean(set.isWarmup),
          rpe: set.rpe ?? null,
        })),
      })
      close()
      await onChanged()
      showToast({ title: "已保存" })
    })
  }

  async function removeSession() {
    if (!detail) {
      return
    }

    await deleteSubmit.run(async () => {
      await onDelete(detail.id)
      setConfirmDelete(false)
      close()
      await onChanged()
      showToast({ title: "已删除" })
    }, "删除失败")
  }

  const workingSets = sets.filter((set) => !set.isWarmup)
  const totalVolume = workingSets.reduce(
    (sum, set) => sum + (set.kind && set.kind !== "strength" ? 0 : parseDecimal(set.actualWeight, 0) * parseInteger(set.actualReps, 0)),
    0,
  )

  return (
    <section className="space-y-2">
      <SectionHeader title="当天记录" />
      {sessions.map((session) => (
        <Card key={session.id} role="button" tabIndex={0} onClick={() => void openSession(session.id)} onKeyDown={(event) => event.key === "Enter" && void openSession(session.id)}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-semibold">{session.title}</p>
              <p className="text-sm text-muted-foreground">
                {session.date}
                {session.finishedAt ? ` · ${Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60000))} 分钟` : ""}
              </p>
            </div>
            <div className="text-right text-sm tabular-nums">
              <p className="font-semibold">{session.volume}</p>
              <p className="text-muted-foreground">{session.sets} 组</p>
            </div>
          </CardContent>
        </Card>
      ))}
      {sessions.length === 0 ? <EmptyState icon={History} title="这一天还没有训练记录" /> : null}

      <Dialog
        open={open}
        title={activeGroup ? activeGroup.exerciseName : "训练记录"}
        description={detail && !activeGroup ? `${detail.date} · ${detail.title}` : undefined}
        onClose={close}
        footer={
          detail ? (
            activeGroup ? (
              <Button className="w-full" variant="secondary" onClick={() => setActiveExerciseId(null)}>
                <ChevronLeft className="h-4 w-4" />
                返回全部动作
              </Button>
            ) : (
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)} disabled={deleteSubmit.pending}>
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
                <Button onClick={saveSession} disabled={saveSubmit.pending}>
                  {saveSubmit.pending ? "保存中…" : "保存修改"}
                </Button>
              </div>
            )
          ) : null
        }
      >
        {!detail ? <div className="skeleton h-32 rounded-3xl" /> : null}
        {detail && !activeGroup ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["动作", `${exerciseGroups.length}`],
                ["组数", `${workingSets.length}`],
                ["容量", `${formatNumber(totalVolume, 0)}kg`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-muted/45 py-2.5">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {exerciseGroups.map((group) => (
                <button
                  key={group.exerciseId}
                  type="button"
                  className="pressable flex w-full items-center justify-between gap-3 rounded-[1.4rem] bg-muted/45 p-4 text-left"
                  onClick={() => setActiveExerciseId(group.exerciseId)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{group.exerciseName}</span>
                    <span className="block text-sm text-muted-foreground tabular-nums">
                      {group.sets.filter((set) => !set.isWarmup).length} 组
                      {group.sets.some((set) => set.isWarmup) ? ` + ${group.sets.filter((set) => set.isWarmup).length} 热身` : ""}
                      {group.bestWeight > 0 ? ` · 最高 ${formatWeight(group.bestWeight)} kg` : ""}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
              {exerciseGroups.length === 0 ? <p className="rounded-2xl bg-muted/45 p-4 text-sm text-muted-foreground">没有组数据</p> : null}
            </div>
          </>
        ) : null}
        {detail && activeGroup ? (
          <div className="space-y-2">
            {activeGroup.sets.map((set, index) =>
              set.kind && set.kind !== "strength" ? (
                <div key={set.id} className="grid grid-cols-[3rem_1fr_2.75rem] items-center gap-2">
                  <SetLabel set={set} index={index} sets={activeGroup.sets} />
                  <span className="text-sm font-medium tabular-nums">
                    {describeSet(set.kind, { weight: parseDecimal(set.actualWeight), reps: parseInteger(set.actualReps), durationSec: set.durationSec, distanceM: set.distanceM })}
                  </span>
                  <Button size="icon" variant="ghost" aria-label={`删除第 ${index + 1} 组`} onClick={() => setSets((current) => current.filter((item) => item.id !== set.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
              <div key={set.id} className="grid grid-cols-[3rem_1fr_1fr_2.75rem] items-center gap-2">
                <SetLabel set={set} index={index} sets={activeGroup.sets} onToggleWarmup={() => updateSet(set.id, { isWarmup: !set.isWarmup })} />
                <InputWithSuffix
                  suffix="kg"
                  inputMode="decimal"
                  className="h-11"
                  value={set.actualWeight}
                  onChange={(event) => updateSet(set.id, { actualWeight: event.target.value })}
                  aria-label={`第 ${index + 1} 组重量`}
                />
                <InputWithSuffix
                  suffix="次"
                  inputMode="numeric"
                  className="h-11"
                  value={set.actualReps}
                  onChange={(event) => updateSet(set.id, { actualReps: event.target.value })}
                  aria-label={`第 ${index + 1} 组次数`}
                />
                <Button size="icon" variant="ghost" aria-label={`删除第 ${index + 1} 组`} onClick={() => setSets((current) => current.filter((item) => item.id !== set.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              ),
            )}
            <p className="px-1 pt-1 text-xs text-muted-foreground">点组号可切换热身组。修改后返回，点击「保存修改」生效。</p>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="删除这次训练？"
        description="这次训练的所有组都会被删除，无法恢复。"
        confirmLabel="删除"
        destructive
        pending={deleteSubmit.pending}
        onConfirm={removeSession}
        onClose={() => setConfirmDelete(false)}
      />
    </section>
  )
}

type WorkoutSetDraft = Omit<WorkoutSetRecord, "actualReps" | "actualWeight"> & {
  actualReps: string
  actualWeight: string
}

function toSetDraft(set: WorkoutSetRecord): WorkoutSetDraft {
  return { ...set, actualReps: String(set.actualReps), actualWeight: String(set.actualWeight) }
}

function groupWorkoutSets(sets: WorkoutSetDraft[]) {
  const map = new Map<string, { exerciseId: string; exerciseName: string; sets: WorkoutSetDraft[]; bestWeight: number }>()

  for (const set of sets) {
    const group = map.get(set.exerciseId) ?? { exerciseId: set.exerciseId, exerciseName: set.exerciseName, sets: [], bestWeight: 0 }
    group.sets.push(set)
    if (!set.isWarmup) group.bestWeight = Math.max(group.bestWeight, parseDecimal(set.actualWeight, 0))
    map.set(set.exerciseId, group)
  }

  return Array.from(map.values())
}

function SetLabel({ set, index, sets, onToggleWarmup }: { set: WorkoutSetDraft; index: number; sets: WorkoutSetDraft[]; onToggleWarmup?: () => void }) {
  const workingNumber = sets.slice(0, index + 1).filter((item) => !item.isWarmup).length
  const label = set.isWarmup ? "热身" : `第 ${workingNumber} 组`
  const content = (
    <span className="flex flex-col leading-tight">
      <span className={set.isWarmup ? "text-sm font-medium text-warning" : "text-sm text-muted-foreground"}>{label}</span>
      {set.rpe ? <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">RPE {set.rpe}</span> : null}
    </span>
  )
  if (!onToggleWarmup) return content
  return (
    <button type="button" className="rounded-xl py-1 text-left active:bg-muted/50" onClick={onToggleWarmup} aria-label={`${label}，点按切换热身`}>
      {content}
    </button>
  )
}
