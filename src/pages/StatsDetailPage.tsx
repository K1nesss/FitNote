import { Activity, Dumbbell, TrendingUp } from "lucide-react"
import { useParams } from "react-router-dom"

import { LiquidNutritionBars } from "@/components/stats/LiquidNutritionBars"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingState } from "@/components/ui/state"
import { useAppData } from "@/lib/app-data"

const detailMap = {
  nutrition: { title: "营养", icon: Activity },
  training: { title: "训练", icon: Dumbbell },
  exercises: { title: "动作", icon: TrendingUp },
}

export function StatsDetailPage() {
  const type = (useParams().type ?? "nutrition") as keyof typeof detailMap
  const detail = detailMap[type] ?? detailMap.nutrition
  const Icon = detail.icon
  const { data, loading } = useAppData()

  if (loading || !data) {
    return <LoadingState title={detail.title} />
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">{detail.title}</CardTitle>
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-muted">
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderDetail(type, data)}</CardContent>
      </Card>
    </div>
  )
}

function renderDetail(type: keyof typeof detailMap, data: NonNullable<ReturnType<typeof useAppData>["data"]>) {
  if (type === "nutrition") {
    return (
      <div className="space-y-4">
        <div className="flex h-52 items-end gap-3">
          <LiquidNutritionBars
            trend={data.stats.foodTrend}
            maxCalories={data.profile.goals.calories}
            heightClassName="h-40"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["热量", data.todayMacro.calories, "kcal"],
            ["蛋白质", data.todayMacro.protein, "g"],
            ["碳水", data.todayMacro.carbs, "g"],
          ].map(([label, value, unit]) => (
            <div key={label} className="rounded-3xl bg-white/70 p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold">
                {value}
                <span className="text-sm text-muted-foreground">{unit}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "training") {
    return data.stats.trainingDays.length ? (
      <div className="space-y-3">
        {data.stats.trainingDays.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-3xl bg-white/70 p-4">
            <p className="font-medium">{item.date}</p>
            <p className="text-sm text-muted-foreground">{item.order}</p>
          </div>
        ))}
      </div>
    ) : (
      <InlineStatsEmpty icon={Dumbbell} />
    )
  }

  if (type === "exercises") {
    return data.stats.exerciseTrends.length ? (
      <div className="space-y-4">
        {data.stats.exerciseTrends.map((trend) => (
          <div key={trend.name} className="rounded-3xl bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{trend.name}</p>
              <p>{trend.current} kg</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((trend.current / Math.max(trend.best, 1)) * 100, 100)}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {trend.change >= 0 ? "+" : ""}
              {trend.change} kg
            </p>
          </div>
        ))}
      </div>
    ) : (
      <InlineStatsEmpty icon={TrendingUp} />
    )
  }

  return <InlineStatsEmpty icon={Activity} />
}

function InlineStatsEmpty({ icon: Icon }: { icon: typeof Activity }) {
  return (
    <div className="flex min-h-24 items-center rounded-[28px] bg-muted/35 px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/46 text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <p className="font-medium text-muted-foreground">暂无</p>
      </div>
    </div>
  )
}
