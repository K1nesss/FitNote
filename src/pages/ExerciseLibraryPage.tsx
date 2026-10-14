import { ChevronRight, Dumbbell, Plus, Search, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/controls"
import { ExerciseFields, type ExerciseFieldsDraft } from "@/components/workout/ExerciseFields"
import { describeTarget } from "@/lib/exercise-kind"
import { ConfirmDialog, Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/state"
import { useToast } from "@/components/ui/toast"
import type { LibraryExercise } from "@/lib/api"
import { useAppData } from "@/lib/app-data"
import { parseDecimal, parseInteger } from "@/lib/format"
import { useSubmitLock } from "@/lib/use-submit-lock"
import { cn } from "@/lib/utils"

const emptyDraft: ExerciseFieldsDraft = { name: "", muscleGroup: "", defaultSets: "3", defaultReps: "10", defaultWeight: "0", kind: "strength" }

export function ExerciseLibraryPage() {
  const { data, createExercise, deleteExercise } = useAppData()
  const { showToast } = useToast()
  const [query, setQuery] = useState("")
  const [muscle, setMuscle] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<LibraryExercise | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const createSubmit = useSubmitLock()
  const deleteSubmit = useSubmitLock()
  const library = data?.exerciseLibrary ?? []
  const muscles = useMemo(() => Array.from(new Set(library.map((exercise) => exercise.muscleGroup))), [library])
  const exercises = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return library.filter(
      (exercise) =>
        (!muscle || exercise.muscleGroup === muscle) &&
        (!keyword || exercise.name.toLowerCase().includes(keyword) || exercise.muscleGroup.includes(keyword)),
    )
  }, [library, query, muscle])
  const custom = exercises.filter((exercise) => !exercise.isBuiltin)
  const builtin = exercises.filter((exercise) => exercise.isBuiltin)

  async function addExercise() {
    if (!draft.name.trim() || !draft.muscleGroup.trim()) {
      showToast({ title: "请填写动作名称和肌群", tone: "error" })
      return
    }

    await createSubmit.run(async () => {
      await createExercise({
        name: draft.name.trim(),
        muscleGroup: draft.muscleGroup.trim(),
        defaultSets: parseInteger(draft.defaultSets, 3, 1),
        defaultReps: parseInteger(draft.defaultReps, 10, 1),
        defaultWeight: parseDecimal(draft.defaultWeight, 0),
        kind: draft.kind,
      })
      setDraft(emptyDraft)
      setAdding(false)
      showToast({ title: "已添加" })
    })
  }

  async function removeExercise() {
    if (!removing) {
      return
    }
    await deleteSubmit.run(async () => {
      await deleteExercise(removing.id)
      setRemoving(null)
      showToast({ title: "已删除" })
    }, "删除失败")
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" type="search" placeholder={`搜索 ${library.length} 个动作`} value={query} onChange={(event) => setQuery(event.target.value)} />
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

      <section className="space-y-2">
        <SectionHeader
          title={`我的动作 · ${custom.length}`}
          action={
            <Button size="sm" variant="ghost" className="text-primary" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              新建
            </Button>
          }
        />
        {custom.length ? (
          <Card>
            <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
              {custom.map((exercise) => (
                <ExerciseRow key={exercise.id} exercise={exercise} onDelete={() => setRemoving(exercise)} />
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="px-1 text-sm text-muted-foreground">{query || muscle ? "没有匹配的自定义动作" : "还没有自定义动作"}</p>
        )}
      </section>

      <section className="space-y-2">
        <SectionHeader title={`内置动作 · ${builtin.length}`} />
        {builtin.length ? (
          <Card>
            <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
              {builtin.map((exercise) => (
                <ExerciseRow key={exercise.id} exercise={exercise} />
              ))}
            </CardContent>
          </Card>
        ) : (
          <EmptyState icon={Dumbbell} title="没有匹配的动作" />
        )}
      </section>

      <Dialog
        open={adding}
        title="新建动作"
        onClose={() => setAdding(false)}
        footer={
          <Button className="w-full" onClick={addExercise} disabled={createSubmit.pending}>
            <Plus className="h-4 w-4" />
            添加
          </Button>
        }
      >
        <ExerciseFields draft={draft} onChange={setDraft} muscles={muscles} />
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        title={`删除「${removing?.name ?? ""}」？`}
        description="已加入训练计划的动作和历史记录不受影响。"
        confirmLabel="删除"
        destructive
        pending={deleteSubmit.pending}
        onConfirm={removeExercise}
        onClose={() => setRemoving(null)}
      />
    </div>
  )
}

function ExerciseRow({ exercise, onDelete }: { exercise: LibraryExercise; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <Link to={`/workout/library/${encodeURIComponent(`lib:${exercise.id}`)}`} className="pressable flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[1.1rem] px-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate font-medium">{exercise.name}</span>
          <span className="block text-xs text-muted-foreground tabular-nums">
            {exercise.muscleGroup} · {describeTarget(exercise.kind, exercise.defaultSets, exercise.defaultReps, exercise.defaultWeight)}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
      {onDelete ? (
        <Button size="icon" variant="ghost" aria-label={`删除 ${exercise.name}`} onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  )
}
