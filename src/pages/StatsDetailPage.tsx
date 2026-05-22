import { Activity, Dumbbell, TrendingUp } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/state"
import { foodTrend, macroGoal } from "@/data/mock"

const detailMap = {
  nutrition: { title: "营养", icon: Activity },
  training: { title: "训练", icon: Dumbbell },
  exercises: { title: "动作", icon: TrendingUp },
}

export function StatsDetailPage() {
  const type = (useParams().type ?? "nutrition") as keyof typeof detailMap
  const detail = detailMap[type] ?? detailMap.nutrition
  const Icon = detail.icon

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
        <CardContent>{renderDetail(type)}</CardContent>
      </Card>

      <Button asChild variant="quiet" className="w-full">
        <Link to="/stats">返回</Link>
      </Button>
    </div>
  )
}

function renderDetail(type: keyof typeof detailMap) {
  if (type === "nutrition") {
    return (
      <div className="space-y-4">
        <div className="flex h-52 items-end gap-3">
          {foodTrend.map((item) => (
            <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full items-end rounded-full bg-muted/70 p-1">
                <div
                  className="w-full rounded-full bg-primary"
                  style={{ height: `${(item.calories / macroGoal.calories) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{item.day}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["热量", "蛋白质", "碳水"].map((label) => (
            <div key={label} className="rounded-3xl bg-white/70 p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold">达标</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "training") {
    return (
      <div className="space-y-3">
        {["周一 下肢", "周三 推", "周五 上肢", "周六 拉"].map((item, index) => (
          <div key={item} className="flex items-center justify-between rounded-3xl bg-white/70 p-4">
            <p className="font-medium">{item}</p>
            <p className="text-sm text-muted-foreground">{index + 1}</p>
          </div>
        ))}
      </div>
    )
  }

  if (type === "exercises") {
    return (
      <div className="space-y-4">
        {[
          ["卧推", "70 kg", 82],
          ["深蹲", "105 kg", 76],
          ["硬拉", "130 kg", 88],
        ].map(([name, value, percent]) => (
          <div key={name as string} className="rounded-3xl bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{name as string}</p>
              <p>{value as string}</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <EmptyState icon={Activity} title="暂无数据" />
}
