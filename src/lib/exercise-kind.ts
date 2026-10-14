import type { ExerciseKind, HistorySet } from "@/lib/api"
import { formatNumber, formatWeight } from "@/lib/format"

export const kindOptions: Array<{ value: ExerciseKind; label: string; hint: string }> = [
  { value: "strength", label: "力量", hint: "组数 × 次数 × 重量" },
  { value: "duration", label: "计时", hint: "如平板支撑：每组坚持的秒数" },
  { value: "cardio", label: "有氧", hint: "时长（分钟）与距离" },
]

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${rest} 秒`
  return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分钟`
}

/** One-line description of a logged set, e.g. "60 kg × 8", "45 秒", "30 分钟 · 5.2 km". */
export function describeSet(kind: ExerciseKind | undefined, set: HistorySet) {
  if (kind === "cardio") {
    const parts = [formatDuration(set.durationSec ?? 0)]
    if (set.distanceM) parts.push(`${formatNumber(set.distanceM / 1000, 2)} km`)
    return parts.join(" · ")
  }
  if (kind === "duration") {
    const time = formatDuration(set.durationSec ?? 0)
    return set.weight > 0 ? `${time} · +${formatWeight(set.weight)} kg` : time
  }
  return `${formatWeight(set.weight)} kg × ${set.reps}`
}

/** Plan target text, e.g. "4×10 · 60kg", "3×60秒", "30 分钟". */
export function describeTarget(kind: ExerciseKind | undefined, sets: number, reps: number, weight: number) {
  if (kind === "cardio") return `${reps} 分钟`
  if (kind === "duration") return `${sets}×${reps}秒${weight > 0 ? ` · ${formatWeight(weight)}kg` : ""}`
  return `${sets}×${reps} · ${formatWeight(weight)}kg`
}

/** "+2.5 kg" style progression: suggest more weight when every set last time hit the target reps. */
export function suggestWeight(lastSets: HistorySet[], targetReps: number) {
  if (lastSets.length === 0) return null
  const top = Math.max(...lastSets.map((set) => set.weight))
  if (top <= 0) return null
  const topSets = lastSets.filter((set) => set.weight === top)
  const hitAll = topSets.every((set) => set.reps >= targetReps)
  const step = top < 20 ? 1 : 2.5
  return hitAll ? { weight: top + step, reason: `上次 ${formatWeight(top)} kg 全部完成 ${targetReps} 次` } : { weight: top, reason: `上次 ${formatWeight(top)} kg 未全部完成，保持重量` }
}
