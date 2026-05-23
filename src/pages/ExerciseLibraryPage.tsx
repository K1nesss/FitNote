import { Dumbbell, Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EmptyState, LoadingState } from "@/components/ui/state"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"

export function ExerciseLibraryPage() {
  const { data, loading, createExercise } = useAppData()
  const { showToast } = useToast()
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: "", muscleGroup: "", defaultSets: 3, defaultReps: 10, defaultWeight: 0 })
  const exercises = useMemo(() => {
    const keyword = query.trim()
    const library = data?.exerciseLibrary ?? []

    if (!keyword) {
      return library
    }

    return library.filter((exercise) => exercise.name.includes(keyword) || exercise.muscleGroup.includes(keyword))
  }, [data?.exerciseLibrary, query])

  if (loading || !data) {
    return <LoadingState title="动作库" />
  }

  async function addExercise() {
    if (!draft.name.trim() || !draft.muscleGroup.trim()) {
      return
    }

    await createExercise(draft)
    setDraft({ name: "", muscleGroup: "", defaultSets: 3, defaultReps: 10, defaultWeight: 0 })
    setAdding(false)
    showToast({ title: "已添加" })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">动作库</CardTitle>
            <Button size="sm" variant="quiet" aria-label="新增动作" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
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
                  {exercise.defaultSets} x {exercise.defaultReps} · {exercise.defaultWeight} kg
                </p>
              </div>
              <Badge>{exercise.muscleGroup}</Badge>
            </div>
          ))}
          {exercises.length === 0 ? <EmptyState icon={Dumbbell} title="无结果" /> : null}
        </CardContent>
      </Card>

      <Dialog open={adding} title="新增动作" onClose={() => setAdding(false)}>
        <Input
          placeholder="动作名称"
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
        <Input
          placeholder="肌群"
          value={draft.muscleGroup}
          onChange={(event) => setDraft((current) => ({ ...current, muscleGroup: event.target.value }))}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="组"
            inputMode="numeric"
            value={draft.defaultSets}
            onChange={(event) => setDraft((current) => ({ ...current, defaultSets: Number(event.target.value) || 0 }))}
          />
          <Input
            placeholder="次"
            inputMode="numeric"
            value={draft.defaultReps}
            onChange={(event) => setDraft((current) => ({ ...current, defaultReps: Number(event.target.value) || 0 }))}
          />
          <Input
            placeholder="kg"
            inputMode="decimal"
            value={draft.defaultWeight}
            onChange={(event) => setDraft((current) => ({ ...current, defaultWeight: Number(event.target.value) || 0 }))}
          />
        </div>
        <Button className="w-full rounded-3xl" onClick={addExercise}>
          <Plus className="h-4 w-4" />
          添加
        </Button>
      </Dialog>
    </div>
  )
}
