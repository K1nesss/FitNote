import { ChevronRight, Dumbbell, Flame, Scale, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"

import { LiquidNutritionBars } from "@/components/stats/LiquidNutritionBars"
import { Sparkline } from "@/components/stats/Sparkline"
import { Card, CardContent } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/controls"
import { EmptyState } from "@/components/ui/state"
import { useAppData } from "@/lib/app-data"
import { formatNumber, formatWeight } from "@/lib/format"

export function StatsPage() {
  const { data } = useAppData()

  if (!data) {
    return null
  }

  const foodTrend = data.stats.foodTrend
  const goals = data.profile.goals
  const loggedDays = foodTrend.filter((item) => item.calories > 0)
  const average = loggedDays.length ? loggedDays.reduce((sum, item) => sum + item.calories, 0) / loggedDays.length : 0
  const averageProtein = loggedDays.length ? loggedDays.reduce((sum, item) => sum + item.protein, 0) / loggedDays.length : 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Link to="/stats/nutrition" className="block">
          <Card className="h-full">
            <CardContent className="p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/14 text-primary">
                <Flame className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground">7 天日均热量</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {formatNumber(average, 0)}
                <span className="ml-1 text-xs font-medium text-muted-foreground">kcal</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">蛋白质 {formatNumber(averageProtein, 0)}g / 天</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/stats/training" className="block">
          <Card className="h-full">
            <CardContent className="p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-strong/18 text-accent-strong">
                <Dumbbell className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground">近 7 天训练</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {data.stats.trainingCount7d}
                <span className="ml-1 text-xs font-medium text-muted-foreground">次</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">累计 {data.workoutHistory.length} 次</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Link to="/stats/weight" className="block">
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/14 text-primary">
                <Scale className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-xs text-muted-foreground">体重</span>
                <span className="block text-lg font-semibold tabular-nums">
                  {data.bodyWeights.length ? `${formatNumber(data.bodyWeights[data.bodyWeights.length - 1].weight, 1)} kg` : "未记录"}
                </span>
              </span>
            </span>
            {data.bodyWeights.length >= 2 ? <Sparkline values={data.bodyWeights.slice(-14).map((entry) => entry.weight)} className="h-8 w-24" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </CardContent>
        </Card>
      </Link>

      <section className="space-y-2">
        <SectionHeader
          title="饮食趋势"
          action={
            <Link to="/stats/nutrition" className="flex h-11 items-center text-sm font-medium text-primary">
              详情
              <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />
        <Card>
          <CardContent className="p-5">
            <div className="flex h-40 items-end gap-2">
              <LiquidNutritionBars trend={foodTrend} maxCalories={goals.calories} />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">柱高为占每日目标 {formatNumber(goals.calories, 0)} kcal 的比例</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionHeader
          title="重量变化"
          action={
            data.stats.exerciseTrends.length ? (
              <Link to="/stats/exercises" className="flex h-11 items-center text-sm font-medium text-primary">
                全部
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null
          }
        />
        {data.stats.exerciseTrends.length ? (
          <Card>
            <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
              {data.stats.exerciseTrends.slice(0, 4).map((trend) => (
                <Link key={trend.key} to={`/workout/library/${encodeURIComponent(trend.key)}`} className="pressable flex items-center justify-between gap-3 rounded-[1.1rem] px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{trend.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      当前 {formatWeight(trend.current)} kg · 最佳 {formatWeight(trend.best)} kg
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Sparkline values={trend.points.map((point) => point.weight)} className="h-7 w-16" />
                    <span className={trend.change > 0 ? "text-sm font-semibold text-primary tabular-nums" : "text-sm text-muted-foreground tabular-nums"}>
                      {trend.change === 0 ? "持平" : `${trend.change > 0 ? "+" : ""}${formatWeight(trend.change)}`}
                    </span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <EmptyState icon={TrendingUp} title="还没有数据" description="完成几次训练后，这里会显示每个动作的重量变化。" />
        )}
      </section>
    </div>
  )
}
