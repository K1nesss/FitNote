import { Check, Dumbbell, Flame, RotateCcw } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { workoutSummaryStorageKey } from "@/pages/WorkoutSessionPage"

type Summary = {
  title: string
  durationMinutes: number
  sets: number
  volume: number
  exercises: Array<{ id: string; name: string; muscle: string; sets: number }>
}

const fallbackSummary: Summary = {
  title: "训练",
  durationMinutes: 0,
  sets: 0,
  volume: 0,
  exercises: [],
}

export function WorkoutSummaryPage() {
  const summary = readSummary()
  const summaryCards: Array<{
    label: string
    value: string | number
    icon: LucideIcon
  }> = [
    { label: "时长", value: `${summary.durationMinutes} 分钟`, icon: Dumbbell },
    { label: "总组数", value: summary.sets, icon: Check },
    { label: "容量", value: `${Math.round(summary.volume).toLocaleString("en-US")} kg`, icon: RotateCcw },
    { label: "消耗", value: Math.round(summary.durationMinutes * 5), icon: Flame },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-secondary text-secondary-foreground">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-semibold tracking-normal">完成</h2>
          <p className="mt-2 text-sm text-muted-foreground">{summary.title}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>动作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.exercises.map((exercise) => (
            <div key={exercise.id} className="flex items-center justify-between rounded-3xl bg-white/70 p-4">
              <div>
                <p className="font-medium">{exercise.name}</p>
                <p className="text-sm text-muted-foreground">{exercise.muscle}</p>
              </div>
              <p className="text-sm font-medium">{exercise.sets} 组</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="quiet">
          <Link to="/workout/history">历史</Link>
        </Button>
        <Button asChild>
          <Link to="/">完成</Link>
        </Button>
      </div>
    </div>
  )
}

function readSummary() {
  try {
    const raw = sessionStorage.getItem(workoutSummaryStorageKey)
    return raw ? ({ ...fallbackSummary, ...JSON.parse(raw) } as Summary) : fallbackSummary
  } catch {
    return fallbackSummary
  }
}
