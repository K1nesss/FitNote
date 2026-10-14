import { ChevronRight, Dumbbell, TrendingUp } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { LiquidNutritionBars } from "@/components/stats/LiquidNutritionBars"
import { Sparkline } from "@/components/stats/Sparkline"
import { Card, CardContent } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/controls"
import { EmptyState } from "@/components/ui/state"
import type { BootstrapData } from "@/lib/api"
import { useAppData } from "@/lib/app-data"
import { formatNumber, formatWeight } from "@/lib/format"

export function StatsDetailPage() {
  const type = useParams().type ?? "nutrition"
  const { data } = useAppData()

  if (!data) {
    return null
  }

  if (type === "training") return <TrainingDetail data={data} />
  if (type === "exercises") return <ExerciseDetail data={data} />
  return <NutritionDetail data={data} />
}

function NutritionDetail({ data }: { data: BootstrapData }) {
  const goals = data.profile.goals
  const trend = data.stats.foodTrend

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="flex h-48 items-end gap-2">
            <LiquidNutritionBars trend={trend} maxCalories={goals.calories} heightClassName="h-40" />
          </div>
        </CardContent>
      </Card>
      <section className="space-y-2">
        <SectionHeader title="每日明细" />
        <Card>
          <CardContent className="p-1.5">
            <div className="grid grid-cols-[2.5rem_1fr_repeat(3,3.25rem)] gap-1 px-3 py-2 text-[11px] font-medium text-muted-foreground">
              <span />
              <span>热量</span>
              <span className="text-right">蛋白</span>
              <span className="text-right">碳水</span>
              <span className="text-right">脂肪</span>
            </div>
            {[...trend].reverse().map((day) => (
              <Link
                key={day.date}
                to={`/food?date=${day.date}`}
                className="pressable grid grid-cols-[2.5rem_1fr_repeat(3,3.25rem)] items-center gap-1 rounded-[1.1rem] px-3 py-2.5 text-sm tabular-nums"
              >
                <span className="font-medium">周{day.day}</span>
                <span className={day.calories > goals.calories ? "font-semibold text-warning" : "font-semibold"}>{formatNumber(day.calories, 0)}</span>
                <span className="text-right text-muted-foreground">{formatNumber(day.protein, 0)}</span>
                <span className="text-right text-muted-foreground">{formatNumber(day.carbs, 0)}</span>
                <span className="text-right text-muted-foreground">{formatNumber(day.fat, 0)}</span>
              </Link>
            ))}
            <div className="grid grid-cols-[2.5rem_1fr_repeat(3,3.25rem)] gap-1 border-t border-[var(--surface-border)] px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
              <span>目标</span>
              <span>{formatNumber(goals.calories, 0)}</span>
              <span className="text-right">{formatNumber(goals.protein, 0)}</span>
              <span className="text-right">{formatNumber(goals.carbs, 0)}</span>
              <span className="text-right">{formatNumber(goals.fat, 0)}</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function TrainingDetail({ data }: { data: BootstrapData }) {
  const sessions = data.workoutHistory.filter((session) => data.stats.trainingDays.some((day) => day.id === session.id))

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5 text-center">
          <p className="text-sm text-muted-foreground">近 7 天</p>
          <p className="text-4xl font-bold tabular-nums">
            {data.stats.trainingCount7d}
            <span className="ml-1 text-base font-medium text-muted-foreground">次训练</span>
          </p>
        </CardContent>
      </Card>
      {sessions.length ? (
        <Card>
          <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
            {sessions.map((session) => (
              <Link key={session.id} to={`/workout?date=${session.dateKey}`} className="pressable flex items-center justify-between gap-3 rounded-[1.25rem] px-3 py-3">
                <div>
                  <p className="font-medium">{session.title}</p>
                  <p className="text-sm text-muted-foreground">{session.date}</p>
                </div>
                <span className="flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
                  {session.sets} 组 · {session.volume}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon={Dumbbell} title="近 7 天没有训练" />
      )}
    </div>
  )
}

function ExerciseDetail({ data }: { data: BootstrapData }) {
  const trends = data.stats.exerciseTrends

  if (!trends.length) {
    return <EmptyState icon={TrendingUp} title="还没有数据" description="完成几次训练后，这里会显示每个动作的重量变化。" />
  }

  return (
    <Card>
      <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
        {trends.map((trend) => (
          <Link key={trend.key} to={`/workout/library/${encodeURIComponent(trend.key)}`} className="pressable block rounded-[1.1rem] px-3 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate font-medium">{trend.name}</p>
              <p className="shrink-0 font-semibold tabular-nums">{formatWeight(trend.current)} kg</p>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground tabular-nums">
                最佳 {formatWeight(trend.best)} kg · {trend.change > 0 ? "+" : ""}
                {formatWeight(trend.change)} kg · {trend.points.length} 次
              </p>
              <Sparkline values={trend.points.map((point) => point.weight)} className="h-8 w-28" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
