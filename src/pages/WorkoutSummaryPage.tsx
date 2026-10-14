import { Check, Clock3, Dumbbell, Flame, Layers, Trophy } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/controls"
import { formatNumber, formatWeight } from "@/lib/format"
import { useSelectedDateParam } from "@/lib/use-selected-date"
import { workoutSummaryStorageKey } from "@/pages/WorkoutSessionPage"

type Summary = {
  title: string
  durationMinutes: number
  sets: number
  volume: number
  exercises: Array<{ id: string; name: string; muscle: string; sets: number; best?: number }>
  records?: string[]
  queued?: boolean
}

const fallbackSummary: Summary = {
  title: "训练",
  durationMinutes: 0,
  sets: 0,
  volume: 0,
  exercises: [],
}

export function WorkoutSummaryPage() {
  const [summary] = useState(readSummary)
  const { selectedDate } = useSelectedDateParam()
  const summaryCards: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: "时长", value: `${summary.durationMinutes} 分钟`, icon: Clock3 },
    { label: "总组数", value: `${summary.sets} 组`, icon: Layers },
    { label: "总容量", value: `${formatNumber(summary.volume, 0)} kg`, icon: Dumbbell },
    { label: "估算消耗", value: `约 ${Math.round(summary.durationMinutes * 5)} kcal`, icon: Flame },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(23,105,166,0.25)]">
            <Check className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold">训练完成</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary.title} · {summary.queued ? "已保存在本机，联网后自动同步" : "已保存"}
          </p>
        </CardContent>
      </Card>

      {summary.records?.length ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/18 text-warning">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">刷新了 {summary.records.length} 项个人纪录</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{summary.records.join("、")}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="mb-3 h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.exercises.length ? (
        <section className="space-y-2">
          <SectionHeader title="完成的动作" />
          <Card>
            <CardContent className="divide-y divide-[var(--surface-border)] p-2">
              {summary.exercises.map((exercise) => (
                <div key={exercise.id} className="flex items-center justify-between px-3 py-3">
                  <div>
                    <p className="font-medium">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">{exercise.muscle}</p>
                  </div>
                  <p className="text-sm tabular-nums">
                    {exercise.sets} 组{exercise.best ? <span className="text-muted-foreground"> · 最高 {formatWeight(exercise.best)} kg</span> : null}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="secondary" size="lg">
          <Link to="/workout/history">训练历史</Link>
        </Button>
        <Button asChild size="lg">
          <Link to={`/workout?date=${selectedDate}`} replace>
            完成
          </Link>
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
