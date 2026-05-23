import { ArrowRight, Dumbbell, Flame, Utensils } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/state"
import { useAppData } from "@/lib/app-data"

export function DashboardPage() {
  const { data, loading } = useAppData()

  if (loading || !data) {
    return <LoadingState title="FitNote" />
  }

  const todayMacro = data.todayMacro
  const macroGoal = data.profile.goals
  const todayPlan = data.todayPlan
  const caloriesPercent = Math.min(todayMacro.calories / macroGoal.calories, 1)
  const macroItems = [
    { label: "蛋白质", value: todayMacro.protein, goal: macroGoal.protein, unit: "g" },
    { label: "碳水", value: todayMacro.carbs, goal: macroGoal.carbs, unit: "g" },
    { label: "脂肪", value: todayMacro.fat, goal: macroGoal.fat, unit: "g" },
  ]

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-4xl">{todayMacro.calories}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">kcal</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-secondary/24 text-secondary-foreground">
              <Flame className="h-7 w-7" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>{macroGoal.calories} kcal</span>
              <span>{Math.round(caloriesPercent * 100)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${caloriesPercent * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {macroItems.map((item) => (
              <div key={item.label} className="rounded-3xl bg-muted/60 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-xl font-semibold">
                  {item.value}
                  <span className="text-sm font-medium text-muted-foreground">{item.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" className="h-16 rounded-3xl">
          <Link to={todayPlan?.exercises.length ? "/workout/session" : "/workout/plan"}>
            <Dumbbell className="h-5 w-5" />
            训练
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-16 rounded-3xl">
          <Link to="/food">
            <Utensils className="h-5 w-5" />
            饮食
          </Link>
        </Button>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{todayPlan?.title ?? "今日计划"}</CardTitle>
            </div>
            <div className="rounded-full bg-white/46 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {todayPlan?.exercises.length ?? 0}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayPlan?.exercises.length ? (
            todayPlan.exercises.slice(0, 3).map((exercise) => (
              <div key={exercise.id} className="flex items-center justify-between rounded-3xl bg-white/70 p-4">
                <div>
                  <p className="font-medium">{exercise.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {exercise.sets} 组 x {exercise.reps} 次 · {exercise.weight} kg
                  </p>
                </div>
                <div className="rounded-full bg-white/46 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {exercise.muscle}
                </div>
              </div>
            ))
          ) : (
            <div className="flex min-h-24 items-center rounded-[28px] bg-muted/35 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/46 text-muted-foreground">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <p className="font-medium text-muted-foreground">未设置</p>
              </div>
            </div>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link to={todayPlan?.exercises.length ? "/workout" : "/workout/plan"} aria-label="查看计划">
              计划
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
