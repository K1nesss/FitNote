import { Activity, Dumbbell, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { foodTrend, macroGoal, todayMacro } from "@/data/mock"

export function StatsPage() {
  const maxCalories = Math.max(...foodTrend.map((item) => item.calories), macroGoal.calories)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <Link to="/stats/nutrition" className="block">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/22 text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">kcal</p>
            <p className="mt-1 text-2xl font-semibold">{todayMacro.calories}</p>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Link to="/stats/training" className="block">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/24 text-secondary-foreground">
              <Dumbbell className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">7d</p>
            <p className="mt-1 text-2xl font-semibold">4 次</p>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Link to="/stats/nutrition">
            <CardTitle>饮食趋势</CardTitle>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex h-44 items-end gap-3">
            {foodTrend.map((item) => (
              <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-32 w-full items-end rounded-full bg-muted/70 p-1">
                  <div
                    className="w-full rounded-full bg-primary"
                    style={{ height: `${(item.calories / maxCalories) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{item.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Link to="/stats/exercises" className="flex items-center justify-between">
            <div>
              <CardTitle>重量变化</CardTitle>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            ["卧推", "70 kg", "近 4 周 +5 kg", 82],
            ["深蹲", "105 kg", "近 4 周 +7.5 kg", 76],
            ["硬拉", "130 kg", "近 4 周 +10 kg", 88],
          ].map(([name, value, note, percent]) => (
            <div key={name} className="space-y-2 rounded-3xl bg-muted/60 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{name}</span>
                <span>{value}</span>
              </div>
              <div className="h-2 rounded-full bg-white">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-sm text-muted-foreground">{note}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
