// Writes made without a connection (common in gyms and on the subway) are queued here
// and uploaded automatically when the app is back online.
import type { MealPayload, WorkoutSessionPayload } from "@/lib/api"

const legacyKey = "fitnote.pendingSessions"
const storageKey = "fitnote.pendingWrites"

export type PendingWrite =
  | { localId: string; queuedAt: number; type: "workout"; payload: WorkoutSessionPayload }
  | { localId: string; queuedAt: number; type: "meal"; payload: MealPayload }
  | { localId: string; queuedAt: number; type: "weight"; payload: { date: string; weight: number } }
  | { localId: string; queuedAt: number; type: "water"; payload: { date: string; ml: number } }

type NewWrite = PendingWrite extends infer W ? (W extends PendingWrite ? Omit<W, "localId" | "queuedAt"> : never) : never

export function readPendingWrites(): PendingWrite[] {
  try {
    const current = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as PendingWrite[]
    // Migrate the older workout-only queue.
    const legacy = JSON.parse(localStorage.getItem(legacyKey) ?? "[]") as Array<{ localId: string; queuedAt: number; payload: WorkoutSessionPayload }>
    if (Array.isArray(legacy) && legacy.length) {
      const merged = [...(Array.isArray(current) ? current : []), ...legacy.map((item) => ({ ...item, type: "workout" as const }))]
      localStorage.setItem(storageKey, JSON.stringify(merged))
      localStorage.removeItem(legacyKey)
      return merged
    }
    return Array.isArray(current) ? current.filter((item) => item && item.type && item.payload) : []
  } catch {
    return []
  }
}

export function writePendingWrites(list: PendingWrite[]) {
  try {
    if (list.length) {
      localStorage.setItem(storageKey, JSON.stringify(list))
    } else {
      localStorage.removeItem(storageKey)
    }
  } catch {
    // ignore
  }
}

/** Queues a write; water and weight keep only the latest value per date. Returns the queue length. */
export function queueWrite(write: NewWrite) {
  let list = readPendingWrites()
  if (write.type === "water" || write.type === "weight") {
    list = list.filter((item) => !(item.type === write.type && (item.payload as { date: string }).date === write.payload.date))
  }
  list.push({ ...write, localId: crypto.randomUUID(), queuedAt: Date.now() } as PendingWrite)
  writePendingWrites(list)
  return list.length
}
