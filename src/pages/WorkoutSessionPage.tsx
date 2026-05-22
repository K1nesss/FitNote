import { Check, ChevronRight, Minus, Plus } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { todayPlan } from "@/data/mock"

type CompletedSet = {
  id: string
  weight: number
  reps: number
}

export function WorkoutSessionPage() {
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [weight, setWeight] = useState(todayPlan.exercises[0].weight)
  const [reps, setReps] = useState(todayPlan.exercises[0].reps)
  const [sets, setSets] = useState<CompletedSet[]>([])

  const exercise = todayPlan.exercises[exerciseIndex]
  const completedForExercise = sets.filter((set) => set.id.startsWith(exercise.id))

  function completeSet() {
    setSets((current) => [
      ...current,
      { id: `${exercise.id}-${current.length + 1}`, weight, reps },
    ])
  }

  function goNextExercise() {
    const nextIndex = Math.min(exerciseIndex + 1, todayPlan.exercises.length - 1)
    const nextExercise = todayPlan.exercises[nextIndex]
    setExerciseIndex(nextIndex)
    setWeight(nextExercise.weight)
    setReps(nextExercise.reps)
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          {exerciseIndex + 1} / {todayPlan.exercises.length}
        </p>
        <h2 className="text-3xl font-semibold">{exercise.name}</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>当前组</CardTitle>
            <Badge>{exercise.muscle}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">重量 kg</span>
              <Input
                inputMode="decimal"
                value={weight}
                onChange={(event) => setWeight(Number(event.target.value) || 0)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-muted-foreground">次数</span>
              <Input
                inputMode="numeric"
                value={reps}
                onChange={(event) => setReps(Number(event.target.value) || 0)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="quiet"
              onClick={() => setWeight((value) => Math.max(value - 2.5, 0))}
              aria-label="减重"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button variant="quiet" onClick={() => setWeight((value) => value + 2.5)} aria-label="加重">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Button size="lg" className="w-full rounded-3xl" onClick={completeSet}>
            <Check className="h-5 w-5" />
            完成
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>记录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completedForExercise.length === 0 ? (
            <p className="rounded-3xl bg-muted/70 p-4 text-sm text-muted-foreground">暂无</p>
          ) : (
            completedForExercise.map((set, index) => (
              <div key={set.id} className="flex items-center justify-between rounded-3xl bg-muted/70 p-4">
                <span>第 {index + 1} 组</span>
                <span className="font-medium">
                  {set.weight} kg x {set.reps}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          className="w-full"
          onClick={goNextExercise}
          disabled={exerciseIndex === todayPlan.exercises.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
          下一个
        </Button>
        <Button asChild variant="quiet" className="w-full">
          <Link to="/workout/summary">结束</Link>
        </Button>
      </div>
    </div>
  )
}
