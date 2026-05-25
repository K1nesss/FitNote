import { ArrowDown, ArrowUp, BookOpen, Check, Plus, Search, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/state"
import { useToast } from "@/components/ui/toast"
import { getTodayWeekday, useAppData, weekdayText } from "@/lib/app-data"
import type { LibraryExercise, PlanExercise } from "@/lib/api"
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
}

const weekdays = [1, 2, 3, 4, 5, 6, 7]

export function WorkoutPlanPage() {
  const { data, loading, savePlan, createExercise } = useAppData()
  const { showToast } = useToast()
  const [selectedDay, setSelectedDay] = useState(getTodayWeekday())
  const [title, setTitle] = useState("")
  const [exercises, setExercises] = useState<ExerciseDraft[]>([])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<ExerciseDraft | null>(null)
  const [draft, setDraft] = useState({ name: "", muscleGroup: "", defaultSets: "3", defaultReps: "10", defaultWeight: "0" })
  const saveSubmit = useSubmitLock()
  const createSubmit = useSubmitLock()
  const canSave = exercises.length > 0

  const currentPlan = data?.plans.find((plan) => plan.weekday === selectedDay)
  const filteredLibrary = useMemo(() => {
    const keyword = query.trim()
    const library = data?.exerciseLibrary ?? []

    if (!keyword) {
      return library
    }

    return library.filter((exercise) => exercise.name.includes(keyword) || exercise.muscleGroup.includes(keyword))
  }, [data?.exerciseLibrary, query])

  useEffect(() => {
    setTitle(currentPlan?.title ?? `${weekdayText(selectedDay)}训练`)
    setExercises((currentPlan?.exercises ?? []).map(fromPlanExercise))
  }, [currentPlan, selectedDay])

  if (loading || !data) {
    return <LoadingState title="训练计划" />
  }

  function addLibraryExercise(exercise: LibraryExercise) {
    setExercises((current) => [...current, fromLibraryExercise(exercise)])
    setQuery("")
    setLibraryOpen(false)
    showToast({ title: "已添加" })
  }

  async function addCustomExercise() {
    if (!draft.name.trim() || !draft.muscleGroup.trim()) {
      return
    }

    await createSubmit.run(async () => {
      const next = { ...draft, id: crypto.randomUUID(), libraryExerciseId: null }
      await createExercise(toExercisePayload(draft))
      setExercises((current) => [...current, next])
      setDraft({ name: "", muscleGroup: "", defaultSets: "3", defaultReps: "10", defaultWeight: "0" })
      setCustomOpen(false)
      showToast({ title: "已添加" })
    })
  }

  async function saveCurrentPlan() {
    if (!canSave) {
      showToast({ title: "先添加动作" })
      return
    }

    await saveSubmit.run(async () => {
      await savePlan(selectedDay, { title, exercises: exercises.map(toExercisePayload) })
      showToast({ title: "已保存" })
    })
  }

  function saveEditing() {
    if (!editing) {
      return
    }

    setExercises((current) => current.map((exercise) => (exercise.id === editing.id ? editing : exercise)))
    setEditing(null)
  }

  function deleteExercise(id: string) {
    setExercises((current) => current.filter((exercise) => exercise.id !== id))
  }

  function moveExercise(id: string, direction: -1 | 1) {
    setExercises((current) => {
      const index = current.findIndex((exercise) => exercise.id === id)
      const targetIndex = index + direction

      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)

      return next
    })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">训练计划</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {weekdays.map((weekday) => {
              const plan = data.plans.find((item) => item.weekday === weekday)
              return (
                <button
                  key={weekday}
                  type="button"
                  onClick={() => setSelectedDay(weekday)}
                  className={`flex h-16 flex-col items-center justify-center rounded-3xl text-xs font-semibold transition active:scale-95 ${
                    weekday === selectedDay ? "bg-primary text-primary-foreground" : "bg-white/62 text-muted-foreground"
                  }`}
                >
                  <span>{weekdayText(weekday).replace("周", "")}</span>
                  <span className="mt-1 text-[10px] opacity-75">{plan?.exercises.length || "-"}</span>
                </button>
              )
            })}
          </div>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{weekdayText(selectedDay)}</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="quiet"
            aria-label="动作库"
            onClick={() => {
              setQuery("")
              setLibraryOpen(true)
            }}
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="quiet" aria-label="新增动作" onClick={() => setCustomOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {exercises.length === 0 ? (
          <div className="flex min-h-24 items-center rounded-[28px] bg-muted/35 px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/46 text-muted-foreground">
                <BookOpen className="h-6 w-6" />
              </div>
              <p className="font-medium text-muted-foreground">未添加</p>
            </div>
          </div>
        ) : null}
        {exercises.map((exercise, index) => (
          <Card key={exercise.id}>
            <CardContent
              className="grid min-h-20 grid-cols-[auto_1fr_auto] items-center gap-3 p-4 transition active:scale-[0.99]"
              role="button"
              tabIndex={0}
              onClick={() => setEditing(exercise)}
            >
              <div className="grid gap-1" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-2xl bg-muted/55 text-muted-foreground transition active:scale-95 disabled:opacity-35"
                  aria-label="上移"
                  disabled={index === 0}
                  onClick={() => moveExercise(exercise.id, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-2xl bg-muted/55 text-muted-foreground transition active:scale-95 disabled:opacity-35"
                  aria-label="下移"
                  disabled={index === exercises.length - 1}
                  onClick={() => moveExercise(exercise.id, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{exercise.name}</p>
                <p className="text-sm text-muted-foreground">
                  {exercise.muscleGroup} · {toInteger(exercise.defaultSets, 1)} 组 ·{" "}
                  {toInteger(exercise.defaultReps, 1)} 次 · {toDecimal(exercise.defaultWeight, 0)} kg · {index + 1}
                </p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-muted-foreground transition active:scale-95"
                aria-label="删除"
                onClick={(event) => {
                  event.stopPropagation()
                  deleteExercise(exercise.id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="w-full rounded-3xl" size="lg" onClick={saveCurrentPlan} disabled={!canSave || saveSubmit.pending}>
        <Check className="h-5 w-5" />
        保存
      </Button>

      <Dialog open={libraryOpen} title="动作库" onClose={() => setLibraryOpen(false)}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="搜索" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="max-h-[48vh] space-y-2 overflow-y-auto">
          {filteredLibrary.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-3xl bg-white/70 p-4 text-left transition active:scale-[0.99]"
              onClick={() => addLibraryExercise(exercise)}
            >
              <span>
                <span className="block font-medium">{exercise.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {exercise.muscleGroup} · {exercise.defaultSets} x {exercise.defaultReps}
                </span>
              </span>
              <Plus className="h-4 w-4" />
            </button>
          ))}
        </div>
      </Dialog>

      <Dialog open={customOpen} title="新增动作" onClose={() => setCustomOpen(false)}>
        <ExerciseInputs draft={draft} onChange={setDraft} />
        <Button className="w-full rounded-3xl" onClick={addCustomExercise} disabled={createSubmit.pending}>
          <Plus className="h-4 w-4" />
          添加
        </Button>
      </Dialog>

      <Dialog open={Boolean(editing)} title="编辑动作" onClose={() => setEditing(null)}>
        {editing ? (
          <>
            <ExerciseInputs draft={editing} onChange={setEditing} />
            <Button className="w-full rounded-3xl" onClick={saveEditing}>
              保存
            </Button>
          </>
        ) : null}
      </Dialog>
    </div>
  )
}

function ExerciseInputs<T extends Omit<ExerciseDraft, "id" | "libraryExerciseId">>({
  draft,
  onChange,
}: {
  draft: T
  onChange: (value: T) => void
}) {
  return (
    <>
      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">动作</span>
        <Input value={draft.name} placeholder="动作名称" onChange={(event) => onChange({ ...draft, name: event.target.value })} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-muted-foreground">肌群</span>
        <Input
          value={draft.muscleGroup}
          placeholder="肌群"
          onChange={(event) => onChange({ ...draft, muscleGroup: event.target.value })}
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">组</span>
          <Input
            inputMode="numeric"
            value={draft.defaultSets}
            placeholder="3"
            onChange={(event) => onChange({ ...draft, defaultSets: event.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">次</span>
          <Input
            inputMode="numeric"
            value={draft.defaultReps}
            placeholder="10"
            onChange={(event) => onChange({ ...draft, defaultReps: event.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">kg</span>
          <Input
            inputMode="decimal"
            value={draft.defaultWeight}
            placeholder="0"
            onChange={(event) => onChange({ ...draft, defaultWeight: event.target.value })}
          />
        </label>
      </div>
    </>
  )
}

function toExercisePayload(exercise: Omit<ExerciseDraft, "id" | "libraryExerciseId"> & Partial<Pick<ExerciseDraft, "id" | "libraryExerciseId">>) {
  return {
    id: exercise.id,
    libraryExerciseId: exercise.libraryExerciseId,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    defaultSets: toInteger(exercise.defaultSets, 1),
    defaultReps: toInteger(exercise.defaultReps, 1),
    defaultWeight: toDecimal(exercise.defaultWeight, 0),
  }
}

function toInteger(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : fallback
}

function toDecimal(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 10) / 10) : fallback
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
  }
}
