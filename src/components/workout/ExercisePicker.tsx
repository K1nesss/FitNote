import { Check, Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import type { LibraryExercise } from "@/lib/api"
import { describeTarget } from "@/lib/exercise-kind"
import { cn } from "@/lib/utils"

/** Searchable exercise library list with muscle-group filter chips. */
export function ExercisePicker({
  library,
  selectedIds,
  onPick,
}: {
  library: LibraryExercise[]
  selectedIds?: Set<string | null>
  onPick: (exercise: LibraryExercise) => void
}) {
  const [query, setQuery] = useState("")
  const [muscle, setMuscle] = useState<string | null>(null)
  const muscles = useMemo(() => Array.from(new Set(library.map((exercise) => exercise.muscleGroup))), [library])
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return library.filter(
      (exercise) =>
        (!muscle || exercise.muscleGroup === muscle) &&
        (!keyword || exercise.name.toLowerCase().includes(keyword) || exercise.muscleGroup.includes(keyword)),
    )
  }, [library, query, muscle])

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" type="search" placeholder="搜索动作" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
        <div className="flex w-max gap-1.5">
          {[null, ...muscles].map((item) => (
            <button
              key={item ?? "all"}
              type="button"
              onClick={() => setMuscle(item)}
              className={cn("h-9 rounded-full px-3.5 text-sm font-medium transition", muscle === item ? "bg-primary text-primary-foreground" : "bg-muted/55 text-muted-foreground")}
            >
              {item ?? "全部"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {filtered.map((exercise) => {
          const added = selectedIds?.has(exercise.id)
          return (
            <button
              key={exercise.id}
              type="button"
              className="pressable flex w-full items-center justify-between gap-3 rounded-[1.25rem] bg-muted/40 px-4 py-3 text-left"
              onClick={() => onPick(exercise)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{exercise.name}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {exercise.muscleGroup} · {describeTarget(exercise.kind, exercise.defaultSets, exercise.defaultReps, exercise.defaultWeight)}
                </span>
              </span>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", added ? "bg-primary text-primary-foreground" : "bg-card text-primary")}>
                {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
            </button>
          )
        })}
        {filtered.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">没有匹配的动作</p> : null}
      </div>
    </>
  )
}
