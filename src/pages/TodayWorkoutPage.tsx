import { CalendarDays, Clock3, Dumbbell, History } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/state"
import { useAppData, weekdayText } from "@/lib/app-data"

export function TodayWorkoutPage() {
  const { data, loading } = useAppData()

  if (loading || !data) {
    return <LoadingState title="训练" />
  }

  const todayPlan = data.todayPlan

  if (!todayPlan || todayPlan.exercises.length === 0) {
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">今日训练</CardTitle>
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
      </div>
    )
  }

  return (
    <div className="space-y-5">
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
              {todayPlan.exercises.length}
            </Badge>
            <Badge>
              <Dumbbell className="mr-1 h-3.5 w-3.5" />
              {todayPlan.exercises.length}
            </Badge>
          </div>
          <Button asChild size="lg" className="w-full rounded-3xl">
            <Link to="/workout/session">
              <Dumbbell className="h-5 w-5" />
              开始
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">动作</h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/workout/history">
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
                <p className="font-medium">{exercise.sets} 组</p>
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
    </div>
  )
}
