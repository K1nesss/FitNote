import { ArrowDown, ArrowUp, BookOpen, Check, Minus, Plus, Repeat, Search, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, SectionHeader, SegmentedControl } from "@/components/ui/controls"
import { ConfirmDialog, Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/state"
import { useToast } from "@/components/ui/toast"
import { getTodayWeekday, useAppData, weekdayText } from "@/lib/app-data"
import { slotLabel, type ExerciseKind, type LibraryExercise, type PlanExercise, type WorkoutPlan } from "@/lib/api"
import { describeTarget } from "@/lib/exercise-kind"
import { ExerciseFields } from "@/components/workout/ExerciseFields"
import { formatWeight, parseDecimal, parseInteger } from "@/lib/format"
import { useSubmitLock } from "@/lib/use-submit-lock"
import { cn } from "@/lib/utils"

type ExerciseDraft = {
  id: string
  libraryExerciseId: string | null
  name: string
  muscleGroup: string
  defaultSets: string
  defaultReps: string
  defaultWeight: string
  kind: ExerciseKind
}

const weekdays = [1, 2, 3, 4, 5, 6, 7]
const emptyCustom = { name: "", muscleGroup: "", defaultSets: "3", defaultReps: "10", defaultWeight: "0", kind: "strength" as ExerciseKind }

function dayName(day: number) {
  return day > 100 ? slotLabel(day) : weekdayText(day)
}

export function WorkoutPlanPage() {
  const { data, savePlan, createExercise, saveSettings } = useAppData()
  const { showToast } = useToast()
  const planMode = data?.settings.planMode ?? "weekly"
  const rotationSlots = data?.settings.rotationSlots ?? 3
  const nextRotationWeekday = data?.plans.find((plan) => plan.id === data.nextRotationPlanId)?.weekday ?? 101
  const [selectedDay, setSelectedDay] = useState(() => (planMode === "rotation" ? nextRotationWeekday : getTodayWeekday()))
  const [modePending, setModePending] = useState(false)
  const [title, setTitle] = useState("")
  const [exercises, setExercises] = useState<ExerciseDraft[]>([])
  const [dirty, setDirty] = useState(false)
  const [pendingDay, setPendingDay] = useState<number | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [muscle, setMuscle] = useState<string | null>(null)
  const [editing, setEditing] = useState<ExerciseDraft | null>(null)
  const [draft, setDraft] = useState(emptyCustom)
  const saveSubmit = useSubmitLock()
  const createSubmit = useSubmitLock()

  const currentPlan = data?.plans.find((plan) => plan.weekday === selectedDay)
  const planSignature = planKey(currentPlan)
  const loadedDay = useRef<number | null>(null)

  // Load the saved plan when the day changes, or when saved data changes while nothing is being edited.
  useEffect(() => {
    if (loadedDay.current === selectedDay && dirty) {
      return
    }
    loadedDay.current = selectedDay
    setTitle(currentPlan?.title ?? (selectedDay > 100 ? slotLabel(selectedDay) : `${weekdayText(selectedDay)}训练`))
    setExercises((currentPlan?.exercises ?? []).map(fromPlanExercise))
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, planSignature])

  const muscles = useMemo(() => Array.from(new Set((data?.exerciseLibrary ?? []).map((exercise) => exercise.muscleGroup))), [data?.exerciseLibrary])
  const filteredLibrary = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return (data?.exerciseLibrary ?? []).filter(
      (exercise) =>
        (!muscle || exercise.muscleGroup === muscle) &&
        (!keyword || exercise.name.toLowerCase().includes(keyword) || exercise.muscleGroup.includes(keyword)),
    )
  }, [data?.exerciseLibrary, query, muscle])
  const addedLibraryIds = new Set(exercises.map((exercise) => exercise.libraryExerciseId))

  if (!data) {
    return null
  }

  async function changeSettings(next: { planMode?: "weekly" | "rotation"; rotationSlots?: number }) {
    if (dirty) {
      showToast({ title: "先保存或放弃当前修改", tone: "error" })
      return
    }
    setModePending(true)
    try {
      await saveSettings(next)
      if (next.planMode) {
        setSelectedDay(next.planMode === "rotation" ? 101 : getTodayWeekday())
        showToast({ title: next.planMode === "rotation" ? "已切换为循环模式" : "已切换为按星期", description: next.planMode === "rotation" ? "完成一次训练就轮到下一天，不受星期限制" : undefined })
      }
      if (next.rotationSlots && selectedDay > 100 + next.rotationSlots) {
        setSelectedDay(100 + next.rotationSlots)
      }
    } catch (error) {
      showToast({ title: "保存失败", description: error instanceof Error ? error.message : undefined, tone: "error" })
    } finally {
      setModePending(false)
    }
  }

  const visibleDays = planMode === "rotation" ? Array.from({ length: rotationSlots }, (_, index) => 101 + index) : weekdays

  function edit(next: ExerciseDraft[]) {
    setExercises(next)
    setDirty(true)
  }

  function chooseDay(day: number) {
    if (day === selectedDay) {
      return
    }
    if (dirty) {
      setPendingDay(day)
      return
    }
    setSelectedDay(day)
  }

  function addLibraryExercise(exercise: LibraryExercise) {
    edit([...exercises, fromLibraryExercise(exercise)])
    showToast({ title: `已添加 ${exercise.name}` })
  }

  async function addCustomExercise() {
    if (!draft.name.trim() || !draft.muscleGroup.trim()) {
      showToast({ title: "请填写动作名称和肌群", tone: "error" })
      return
    }

    await createSubmit.run(async () => {
      const libraryExerciseId = await createExercise(toExercisePayload(draft))
      edit([...exercises, { ...draft, id: crypto.randomUUID(), libraryExerciseId }])
      setDraft(emptyCustom)
      setCustomOpen(false)
      setLibraryOpen(false)
      showToast({ title: "已添加到计划和动作库" })
    })
  }

  async function saveCurrentPlan() {
    await saveSubmit.run(async () => {
      await savePlan(selectedDay, { title, exercises: exercises.map(toExercisePayload) })
      setDirty(false)
      showToast({ title: exercises.length ? "计划已保存" : selectedDay > 100 ? `${dayName(selectedDay)}已清空` : `${weekdayText(selectedDay)}设为休息日` })
    })
  }

  function saveEditing() {
    if (!editing) {
      return
    }
    edit(exercises.map((exercise) => (exercise.id === editing.id ? editing : exercise)))
    setEditing(null)
  }

  function moveExercise(id: string, direction: -1 | 1) {
    const index = exercises.findIndex((exercise) => exercise.id === id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= exercises.length) {
      return
    }
    const next = [...exercises]
    const [item] = next.splice(index, 1)
    next.splice(targetIndex, 0, item)
    edit(next)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <SegmentedControl
          options={[
            { value: "weekly", label: "按星期" },
            { value: "rotation", label: "循环 A/B/C" },
          ]}
          value={planMode}
          onChange={(value) => {
            if (value !== planMode && !modePending) void changeSettings({ planMode: value })
          }}
        />
        {planMode === "rotation" ? (
          <div className="flex items-center justify-between gap-3 rounded-[1.4rem] bg-muted/45 px-4 py-2">
            <p className="flex min-w-0 items-center gap-2 text-sm">
              <Repeat className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">
                一轮 {rotationSlots} 天 · 下次练 <span className="font-semibold">{slotLabel(nextRotationWeekday)}</span>
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 shadow-sm transition active:scale-90 disabled:opacity-40"
                aria-label="减少一天"
                disabled={rotationSlots <= 2 || modePending}
                onClick={() => void changeSettings({ rotationSlots: rotationSlots - 1 })}
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 shadow-sm transition active:scale-90 disabled:opacity-40"
                aria-label="增加一天"
                disabled={rotationSlots >= 6 || modePending}
                onClick={() => void changeSettings({ rotationSlots: rotationSlots + 1 })}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
        {visibleDays.map((weekday) => {
          const plan = data.plans.find((item) => item.weekday === weekday)
          const count = plan?.exercises.length ?? 0
          const active = weekday === selectedDay
          return (
            <button
              key={weekday}
              type="button"
              onClick={() => chooseDay(weekday)}
              aria-pressed={active}
              className={cn(
                "flex h-16 flex-col items-center justify-center rounded-[1.25rem] text-sm font-semibold transition active:scale-95",
                active ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(23,105,166,0.22)]" : "bg-muted/50 text-foreground",
              )}
            >
              <span>{weekday > 100 ? String.fromCharCode(64 + weekday - 100) : weekdayText(weekday).replace("周", "")}</span>
              <span className={cn("mt-1 text-[11px] font-medium", active ? "opacity-80" : "text-muted-foreground")}>
                {planMode === "rotation" && weekday === nextRotationWeekday ? "下次" : count ? `${count} 个` : weekday > 100 ? "空" : "休"}
              </span>
            </button>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <Field label={`${dayName(selectedDay)} · 训练名称`}>
            <Input
              value={title}
              placeholder="例如：推 / 胸肩三头"
              onChange={(event) => {
                setTitle(event.target.value)
                setDirty(true)
              }}
            />
          </Field>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <SectionHeader
          title={`动作 · ${exercises.length}`}
          action={
            <Button
              size="sm"
              variant="ghost"
              className="text-primary"
              onClick={() => {
                setQuery("")
                setLibraryOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              添加动作
            </Button>
          }
        />
        {exercises.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={selectedDay > 100 ? "还没有动作" : "休息日"}
            description={selectedDay > 100 ? "从动作库添加这一天要练的动作。循环模式下，空的训练日会被跳过。" : "从动作库添加动作，或直接保存为休息日。"}
            action={
              <Button variant="secondary" onClick={() => setLibraryOpen(true)}>
                <BookOpen className="h-4 w-4" />
                打开动作库
              </Button>
            }
          />
        ) : null}
        {exercises.map((exercise, index) => (
          <Card key={exercise.id}>
            <CardContent className="grid grid-cols-[auto_1fr_auto] items-center gap-2 p-3">
              <div className="grid gap-1">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/55 text-muted-foreground transition active:scale-95 disabled:opacity-30"
                  aria-label={`上移 ${exercise.name}`}
                  disabled={index === 0}
                  onClick={() => moveExercise(exercise.id, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/55 text-muted-foreground transition active:scale-95 disabled:opacity-30"
                  aria-label={`下移 ${exercise.name}`}
                  disabled={index === exercises.length - 1}
                  onClick={() => moveExercise(exercise.id, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              <button type="button" className="min-w-0 rounded-2xl px-2 py-2 text-left active:bg-muted/40" onClick={() => setEditing(exercise)}>
                <p className="truncate font-semibold">{exercise.name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {exercise.muscleGroup} · {describeTarget(exercise.kind, parseInteger(exercise.defaultSets, 1, 1), parseInteger(exercise.defaultReps, 1, 1), parseDecimal(exercise.defaultWeight))}
                </p>
                <p className="text-xs text-primary">点按修改组数与重量</p>
              </button>
              <Button size="icon" variant="ghost" aria-label={`移除 ${exercise.name}`} onClick={() => edit(exercises.filter((item) => item.id !== exercise.id))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="sticky-actions">
        <Button className="w-full" size="lg" variant={dirty ? "default" : "secondary"} onClick={saveCurrentPlan} disabled={saveSubmit.pending || !dirty}>
          <Check className="h-5 w-5" />
          {saveSubmit.pending ? "保存中…" : dirty ? (exercises.length ? `保存${dayName(selectedDay)}计划` : selectedDay > 100 ? "保存（清空这一天）" : "保存为休息日") : "已保存"}
        </Button>
      </div>

      <Dialog
        open={libraryOpen}
        title="动作库"
        description="点按即可加入计划，可连续添加"
        onClose={() => setLibraryOpen(false)}
        footer={
          <Button variant="secondary" className="w-full" onClick={() => setCustomOpen(true)}>
            <Plus className="h-4 w-4" />
            找不到？新建自定义动作
          </Button>
        }
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" type="search" placeholder="搜索动作" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
          <div className="flex w-max gap-1.5">
            {[null, ...muscles].map((item) => (
              <button
                key={item ?? "all"}
                type="button"
                onClick={() => setMuscle(item)}
                className={cn(
                  "h-9 rounded-full px-3.5 text-sm font-medium transition",
                  muscle === item ? "bg-primary text-primary-foreground" : "bg-muted/55 text-muted-foreground",
                )}
              >
                {item ?? "全部"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {filteredLibrary.map((exercise) => {
            const added = addedLibraryIds.has(exercise.id)
            return (
              <button
                key={exercise.id}
                type="button"
                className="pressable flex w-full items-center justify-between gap-3 rounded-[1.25rem] bg-muted/40 px-4 py-3 text-left"
                onClick={() => addLibraryExercise(exercise)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{exercise.name}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {exercise.muscleGroup} · {exercise.defaultSets}×{exercise.defaultReps} · {formatWeight(exercise.defaultWeight)} kg
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    added ? "bg-primary text-primary-foreground" : "bg-card text-primary",
                  )}
                >
                  {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
              </button>
            )
          })}
          {filteredLibrary.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">没有匹配的动作</p> : null}
        </div>
      </Dialog>

      <Dialog
        open={customOpen}
        title="新建动作"
        onClose={() => setCustomOpen(false)}
        footer={
          <Button className="w-full" onClick={addCustomExercise} disabled={createSubmit.pending}>
            <Plus className="h-4 w-4" />
            添加
          </Button>
        }
      >
        <ExerciseInputs draft={draft} onChange={setDraft} />
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        title="修改动作"
        onClose={() => setEditing(null)}
        footer={
          <Button className="w-full" onClick={saveEditing}>
            完成
          </Button>
        }
      >
        {editing ? <ExerciseInputs draft={editing} onChange={setEditing} /> : null}
      </Dialog>

      <ConfirmDialog
        open={pendingDay !== null}
        title="放弃未保存的修改？"
        description={`${dayName(selectedDay)}的修改还没有保存。`}
        confirmLabel="放弃修改"
        destructive
        onConfirm={() => {
          setDirty(false)
          if (pendingDay !== null) {
            setSelectedDay(pendingDay)
          }
          setPendingDay(null)
        }}
        onClose={() => setPendingDay(null)}
      />
    </div>
  )
}

function planKey(plan: WorkoutPlan | undefined) {
  if (!plan) {
    return "none"
  }
  return JSON.stringify([plan.title, plan.exercises.map((exercise) => [exercise.id, exercise.name, exercise.sets, exercise.reps, exercise.weight])])
}

function ExerciseInputs<T extends Omit<ExerciseDraft, "id" | "libraryExerciseId">>({ draft, onChange }: { draft: T; onChange: (value: T) => void }) {
  return <ExerciseFields draft={draft} onChange={onChange} />
}

function toExercisePayload(exercise: Omit<ExerciseDraft, "id" | "libraryExerciseId"> & Partial<Pick<ExerciseDraft, "id" | "libraryExerciseId">>) {
  return {
    id: exercise.id,
    libraryExerciseId: exercise.libraryExerciseId,
    name: exercise.name.trim(),
    muscleGroup: exercise.muscleGroup.trim(),
    defaultSets: parseInteger(exercise.defaultSets, 3, 1),
    defaultReps: parseInteger(exercise.defaultReps, 10, 1),
    defaultWeight: parseDecimal(exercise.defaultWeight, 0),
    kind: exercise.kind,
  }
}

function fromPlanExercise(exercise: PlanExercise): ExerciseDraft {
  return {
    id: exercise.id,
    libraryExerciseId: exercise.libraryExerciseId,
    name: exercise.name,
    muscleGroup: exercise.muscle,
    defaultSets: String(exercise.sets),
    defaultReps: String(exercise.reps),
    defaultWeight: String(exercise.weight),
    kind: exercise.kind ?? "strength",
  }
}

function fromLibraryExercise(exercise: LibraryExercise): ExerciseDraft {
  return {
    id: crypto.randomUUID(),
    libraryExerciseId: exercise.id,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    defaultSets: String(exercise.defaultSets),
    defaultReps: String(exercise.defaultReps),
    defaultWeight: String(exercise.defaultWeight),
    kind: exercise.kind ?? "strength",
  }
}
