import { Check, ChevronRight, Minus, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingState } from "@/components/ui/state"
import { useAppData } from "@/lib/app-data"
import { timestampOnDate, weekdayNumber } from "@/lib/date"
import { useSelectedDateParam } from "@/lib/use-selected-date"
import { useSubmitLock } from "@/lib/use-submit-lock"

type CompletedSet = {
  id: string
  exerciseId: string
  exerciseName: string
  weight: number
  reps: number
}

export const workoutSummaryStorageKey = "fitnote.workoutSummary"

export function WorkoutSessionPage() {
  const navigate = useNavigate()
  const { data, loading, saveWorkoutSession } = useAppData()
  const { selectedDate } = useSelectedDateParam()
  const selectedWeekday = weekdayNumber(selectedDate)
  const todayPlan = data?.plans.find((plan) => plan.weekday === selectedWeekday) ?? null
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const firstExercise = todayPlan?.exercises[0]
  const [weight, setWeight] = useState(firstExercise?.weight ?? 0)
  const [reps, setReps] = useState(firstExercise?.reps ?? 0)
  const [sets, setSets] = useState<CompletedSet[]>([])
  const [startedAt] = useState(() => timestampOnDate(selectedDate))
  const finishSubmit = useSubmitLock()

  useEffect(() => {
    if (firstExercise) {
      setWeight(firstExercise.weight)
      setReps(firstExercise.reps)
    }
  }, [firstExercise])

  if (loading || !data) {
    return <LoadingState title="训练" />
  }

  if (!todayPlan || todayPlan.exercises.length === 0) {
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">训练</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-24 items-center rounded-[28px] bg-muted/35 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/46 text-muted-foreground">
                  <Check className="h-6 w-6" />
                </div>
                <p className="font-medium text-muted-foreground">未设置</p>
              </div>
            </div>
            <Button asChild className="w-full rounded-3xl">
              <Link to="/workout/plan">计划</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const activePlan = todayPlan
  const exercise = activePlan.exercises[Math.min(exerciseIndex, activePlan.exercises.length - 1)]
  const completedForExercise = sets.filter((set) => set.exerciseId === exercise.id)

  function completeSet() {
    setSets((current) => [
      ...current,
      { id: crypto.randomUUID(), exerciseId: exercise.id, exerciseName: exercise.name, weight, reps },
    ])
  }

  function goNextExercise() {
    const nextIndex = Math.min(exerciseIndex + 1, activePlan.exercises.length - 1)
    const nextExercise = activePlan.exercises[nextIndex]
    setExerciseIndex(nextIndex)
    setWeight(nextExercise.weight)
    setReps(nextExercise.reps)
  }

  async function finishWorkout() {
    await finishSubmit.run(async () => {
      const finishedAt = Date.now()
      await saveWorkoutSession({
        date: selectedDate,
        planId: activePlan.id,
        startedAt,
        finishedAt: timestampOnDate(selectedDate, finishedAt),
        sets: sets.map((set, index) => ({
          exerciseId: set.exerciseId,
          setIndex: index + 1,
          actualReps: set.reps,
          actualWeight: set.weight,
        })),
      })

      const volume = sets.reduce((sum, set) => sum + set.weight * set.reps, 0)
      sessionStorage.setItem(
        workoutSummaryStorageKey,
        JSON.stringify({
          title: activePlan.title,
          durationMinutes: Math.max(1, Math.round((finishedAt - startedAt) / 60000)),
          sets: sets.length,
          volume,
          exercises: activePlan.exercises.map((item) => ({
            id: item.id,
            name: item.name,
            muscle: item.muscle,
            sets: sets.filter((set) => set.exerciseId === item.id).length,
          })),
        }),
      )
      navigate(`/workout/summary?date=${selectedDate}`)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          {exerciseIndex + 1} / {activePlan.exercises.length}
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
          disabled={exerciseIndex === activePlan.exercises.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
          下一个
        </Button>
        <Button variant="quiet" className="w-full" onClick={finishWorkout} disabled={finishSubmit.pending}>
          结束
        </Button>
      </div>
    </div>
  )
}
