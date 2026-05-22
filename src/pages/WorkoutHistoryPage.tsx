import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { workoutHistory } from "@/data/mock"

export function WorkoutHistoryPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">历史</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workoutHistory.map((session) => (
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
        </CardContent>
      </Card>
    </div>
  )
}
