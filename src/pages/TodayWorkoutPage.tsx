import { CalendarDays, Clock3, Dumbbell, History } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateStrip } from "@/components/ui/date-strip"
import { LoadingState } from "@/components/ui/state"
import { weekdayText } from "@/lib/app-data"
import { useDayData } from "@/lib/use-day-data"
import { useSelectedDateParam } from "@/lib/use-selected-date"

export function TodayWorkoutPage() {
  const { selectedDate, setSelectedDate } = useSelectedDateParam()
  const { dayData, loading } = useDayData(selectedDate)

  if (loading || !dayData) {
    return <LoadingState title="训练" />
  }

  const todayPlan = dayData.plan
  const sessionPath = `/workout/session?date=${selectedDate}`

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
        <WorkoutRecords sessions={dayData.workoutSessions} />
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
              {todayPlan.exercises.length}
            </Badge>
            <Badge>
              <Dumbbell className="mr-1 h-3.5 w-3.5" />
              {todayPlan.exercises.length}
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

      <WorkoutRecords sessions={dayData.workoutSessions} />
    </div>
  )
}

function WorkoutRecords({ sessions }: { sessions: NonNullable<ReturnType<typeof useDayData>["dayData"]>["workoutSessions"] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">记录</h2>
      {sessions.map((session) => (
        <Card key={session.id}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
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
    </section>
  )
}
