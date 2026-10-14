import { Field, SegmentedControl } from "@/components/ui/controls"
import { Input } from "@/components/ui/input"
import type { ExerciseKind } from "@/lib/api"
import { kindOptions } from "@/lib/exercise-kind"

export type ExerciseFieldsDraft = {
  name: string
  muscleGroup: string
  kind?: ExerciseKind
  defaultSets: string
  defaultReps: string
  defaultWeight: string
}

/** Name / muscle / type / targets. Labels adapt to the exercise type. */
export function ExerciseFields<T extends ExerciseFieldsDraft>({ draft, onChange, muscles = [], allowKind = true }: { draft: T; onChange: (value: T) => void; muscles?: string[]; allowKind?: boolean }) {
  const kind = draft.kind ?? "strength"

  return (
    <>
      <Field label="动作名称">
        <Input value={draft.name} placeholder="例如：器械推胸" onChange={(event) => onChange({ ...draft, name: event.target.value })} />
      </Field>
      <Field label="肌群">
        <Input value={draft.muscleGroup} placeholder="例如：胸" onChange={(event) => onChange({ ...draft, muscleGroup: event.target.value })} />
      </Field>
      {muscles.length ? (
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {muscles.map((item) => (
            <button key={item} type="button" className="h-8 rounded-full bg-muted/55 px-3 text-xs font-medium" onClick={() => onChange({ ...draft, muscleGroup: item })}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
      {allowKind ? (
        <Field label="类型" hint={kindOptions.find((item) => item.value === kind)?.hint}>
          <SegmentedControl
            options={kindOptions.map((item) => ({ value: item.value, label: item.label }))}
            value={kind}
            onChange={(value) =>
              onChange({
                ...draft,
                kind: value,
                defaultSets: value === "cardio" ? "1" : draft.defaultSets,
                defaultReps: value === "cardio" ? "30" : value === "duration" ? "60" : draft.defaultReps === "60" || draft.defaultReps === "30" ? "10" : draft.defaultReps,
              })
            }
          />
        </Field>
      ) : null}
      {kind === "cardio" ? (
        <Field label="目标时长（分钟）">
          <Input inputMode="numeric" value={draft.defaultReps} placeholder="30" onChange={(event) => onChange({ ...draft, defaultReps: event.target.value })} />
        </Field>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Field label="组数">
            <Input inputMode="numeric" value={draft.defaultSets} placeholder="3" onChange={(event) => onChange({ ...draft, defaultSets: event.target.value })} />
          </Field>
          <Field label={kind === "duration" ? "秒/组" : "次数"}>
            <Input inputMode="numeric" value={draft.defaultReps} placeholder={kind === "duration" ? "60" : "10"} onChange={(event) => onChange({ ...draft, defaultReps: event.target.value })} />
          </Field>
          <Field label={kind === "duration" ? "负重 kg" : "重量 kg"}>
            <Input inputMode="decimal" value={draft.defaultWeight} placeholder="0" onChange={(event) => onChange({ ...draft, defaultWeight: event.target.value })} />
          </Field>
        </div>
      )}
    </>
  )
}
