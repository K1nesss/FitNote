import { Dumbbell, Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/state"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { todayPlan } from "@/data/mock"

export function ExerciseLibraryPage() {
  const { showToast } = useToast()
  const [query, setQuery] = useState("")
  const exercises = useMemo(
    () => todayPlan.exercises.filter((exercise) => exercise.name.includes(query.trim()) || exercise.muscle.includes(query.trim())),
    [query],
  )

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">动作库</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" placeholder="搜索" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          {exercises.map((exercise) => (
            <div key={exercise.id} className="flex items-center justify-between rounded-3xl bg-white/70 p-4">
              <div>
                <p className="font-medium">{exercise.name}</p>
                <p className="text-sm text-muted-foreground">
                  {exercise.sets} x {exercise.reps} · {exercise.weight} kg
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{exercise.muscle}</Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="添加动作"
                  onClick={() => showToast({ title: "已添加", description: exercise.name })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {exercises.length === 0 ? <EmptyState icon={Dumbbell} title="无结果" /> : null}
        </CardContent>
      </Card>
      <EmptyState icon={Dumbbell} title="没有更多" description="自定义动作会保存在动作库。" />
    </div>
  )
}
