import { ChevronRight, History } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/controls"
import { EmptyState } from "@/components/ui/state"
import { useAppData } from "@/lib/app-data"

export function WorkoutHistoryPage() {
  const { data } = useAppData()

  if (!data) {
    return null
  }

  const groups = new Map<string, typeof data.workoutHistory>()
  for (const session of data.workoutHistory) {
    const [year, month] = session.dateKey.split("-")
    const key = `${year}年${Number(month)}月`
    groups.set(key, [...(groups.get(key) ?? []), session])
  }

  if (data.workoutHistory.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="还没有训练记录"
        description="完成一次训练后会出现在这里。"
        action={
          <Button asChild>
            <Link to="/workout">去训练</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      {Array.from(groups.entries()).map(([month, sessions]) => (
        <section key={month} className="space-y-2">
          <SectionHeader title={`${month} · ${sessions.length} 次`} />
          <Card>
            <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
              {sessions.map((session) => (
                <Link key={session.id} to={`/workout?date=${session.dateKey}`} className="pressable flex items-center justify-between gap-3 rounded-[1.25rem] px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{session.title}</p>
                    <p className="text-sm text-muted-foreground">{session.date}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-right text-sm tabular-nums">
                    <div>
                      <p className="font-semibold">{session.volume}</p>
                      <p className="text-muted-foreground">{session.sets} 组</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      ))}
      <p className="pb-2 text-center text-xs text-muted-foreground">显示最近 {data.workoutHistory.length} 次训练</p>
    </div>
  )
}
