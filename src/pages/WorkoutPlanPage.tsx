import { ArrowDown, ArrowUp, BookOpen, GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { todayPlan, weeklyPlan } from "@/data/mock"

type ExerciseDraft = {
  id: string
  name: string
  muscle: string
  sets: number
  reps: number
  weight: number
  order: number
}

export function WorkoutPlanPage() {
  const { showToast } = useToast()
  const [selectedDay, setSelectedDay] = useState("周五")
  const [exercises, setExercises] = useState<ExerciseDraft[]>(todayPlan.exercises)
  const [editing, setEditing] = useState<ExerciseDraft | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDraft | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: "", muscle: "", sets: 3, reps: 10, weight: 0 })

  function addExercise() {
    if (!draft.name.trim()) {
      return
    }

    setExercises((current) => [
      ...current,
      {
        ...draft,
        id: crypto.randomUUID(),
        order: current.length + 1,
      },
    ])
    setDraft({ name: "", muscle: "", sets: 3, reps: 10, weight: 0 })
    showToast({ title: "已添加", description: "动作已加入计划。" })
  }

  function saveEditing() {
    if (!editing) {
      return
    }

    setExercises((current) => current.map((exercise) => (exercise.id === editing.id ? editing : exercise)))
    setEditing(null)
    showToast({ title: "已保存" })
  }

  function deleteExercise(id: string) {
    setExercises((current) => current.filter((exercise) => exercise.id !== id).map((exercise, index) => ({ ...exercise, order: index + 1 })))
    showToast({ title: "已删除" })
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

      return next.map((exercise, orderIndex) => ({ ...exercise, order: orderIndex + 1 }))
    })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">训练计划</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weeklyPlan.map((item) => (
              <button
                key={item.day}
                type="button"
                onClick={() => setSelectedDay(item.day)}
                className={`flex h-16 flex-col items-center justify-center rounded-3xl text-xs font-semibold transition active:scale-95 ${
                  item.day === selectedDay
                    ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(32,33,36,0.16)]"
                    : "bg-white/62 text-muted-foreground"
                }`}
              >
                <span>{item.day.replace("周", "")}</span>
                <span className="mt-1 text-[10px] opacity-75">{item.count || "-"}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{selectedDay}动作</h2>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="quiet" aria-label="动作库">
            <Link to="/workout/library">
              <BookOpen className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="sm" variant="quiet" aria-label="添加动作" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {exercises.map((exercise) => (
          <Card key={exercise.id}>
            <CardContent
              className="grid min-h-20 grid-cols-[auto_1fr] items-center gap-3 p-4 active:scale-[0.99]"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedExercise(exercise)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  setSelectedExercise(exercise)
                }
              }}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium">{exercise.name}</p>
                <p className="text-sm text-muted-foreground">
                  {exercise.muscle} · {exercise.sets} x {exercise.reps} · {exercise.weight} kg
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={adding} title="新增动作" onClose={() => setAdding(false)}>
          <Input
            placeholder="动作名称"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            placeholder="肌群"
            value={draft.muscle}
            onChange={(event) => setDraft((current) => ({ ...current, muscle: event.target.value }))}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="组"
              inputMode="numeric"
              value={draft.sets}
              onChange={(event) => setDraft((current) => ({ ...current, sets: Number(event.target.value) || 0 }))}
            />
            <Input
              placeholder="次"
              inputMode="numeric"
              value={draft.reps}
              onChange={(event) => setDraft((current) => ({ ...current, reps: Number(event.target.value) || 0 }))}
            />
            <Input
              placeholder="kg"
              inputMode="decimal"
              value={draft.weight}
              onChange={(event) => setDraft((current) => ({ ...current, weight: Number(event.target.value) || 0 }))}
            />
          </div>
          <Button
            className="w-full rounded-3xl"
            onClick={() => {
              addExercise()
              setAdding(false)
            }}
          >
            <Plus className="h-4 w-4" />
            添加
          </Button>
      </Dialog>

      <Dialog open={Boolean(selectedExercise)} title={selectedExercise?.name ?? "动作"} onClose={() => setSelectedExercise(null)}>
        {selectedExercise ? (
          <div className="space-y-2">
            <Button
              variant="quiet"
              className="w-full justify-start rounded-3xl"
              onClick={() => {
                setEditing(selectedExercise)
                setSelectedExercise(null)
              }}
            >
              <Pencil className="h-4 w-4" />
              编辑
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="quiet"
                className="rounded-3xl"
                onClick={() => {
                  moveExercise(selectedExercise.id, -1)
                  setSelectedExercise(null)
                }}
              >
                <ArrowUp className="h-4 w-4" />
                上移
              </Button>
              <Button
                variant="quiet"
                className="rounded-3xl"
                onClick={() => {
                  moveExercise(selectedExercise.id, 1)
                  setSelectedExercise(null)
                }}
              >
                <ArrowDown className="h-4 w-4" />
                下移
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-3xl"
              onClick={() => {
                deleteExercise(selectedExercise.id)
                setSelectedExercise(null)
              }}
            >
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(editing)} title="编辑动作" onClose={() => setEditing(null)}>
        {editing ? (
          <>
            <Input
              value={editing.name}
              onChange={(event) => setEditing((current) => (current ? { ...current, name: event.target.value } : current))}
            />
            <Input
              value={editing.muscle}
              onChange={(event) => setEditing((current) => (current ? { ...current, muscle: event.target.value } : current))}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={editing.sets}
                onChange={(event) => setEditing((current) => (current ? { ...current, sets: Number(event.target.value) || 0 } : current))}
              />
              <Input
                value={editing.reps}
                onChange={(event) => setEditing((current) => (current ? { ...current, reps: Number(event.target.value) || 0 } : current))}
              />
              <Input
                value={editing.weight}
                onChange={(event) => setEditing((current) => (current ? { ...current, weight: Number(event.target.value) || 0 } : current))}
              />
            </div>
            <Button className="w-full" onClick={saveEditing}>
              保存
            </Button>
          </>
        ) : null}
      </Dialog>
    </div>
  )
}
