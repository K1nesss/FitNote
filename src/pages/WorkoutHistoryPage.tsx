import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState, LoadingState } from "@/components/ui/state"
import { useAppData } from "@/lib/app-data"
import { Dumbbell } from "lucide-react"

export function WorkoutHistoryPage() {
  const { data, loading } = useAppData()

  if (loading || !data) {
    return <LoadingState title="历史" />
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">历史</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.workoutHistory.map((session) => (
            <div key={session.id} className="flex items-center justify-between rounded-3xl bg-white/70 p-4">
              <div>
                <p className="font-medium">{session.title}</p>
                <p className="text-sm text-muted-foreground">{session.date}</p>
              </div>
              <div className="text-right text-sm">
                <p>{session.volume}</p>
                <p className="text-muted-foreground">{session.sets} 组</p>
              </div>
            </div>
          ))}
          {data.workoutHistory.length === 0 ? <EmptyState icon={Dumbbell} title="暂无" /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
