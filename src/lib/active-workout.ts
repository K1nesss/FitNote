// Keeps an in-progress workout in localStorage so it survives reloads, the browser
// killing a background tab, or accidentally navigating away (very common on phones).

import type { ExerciseKind, PlanExercise } from "@/lib/api"

export type ActiveSet = {
  id: string
  exerciseId: string
  exerciseName: string
  kind?: ExerciseKind
  weight: number
  reps: number
  durationSec?: number | null
  distanceM?: number | null
  completedAt: number
  isRecord?: boolean
  /** Warm-up sets are logged but excluded from volume, set targets and records. */
  isWarmup?: boolean
  /** Rate of perceived exertion, 6–10. */
  rpe?: number | null
}

export type ActiveWorkout = {
  date: string
  planId: string | null
  planTitle: string
  startedAt: number
  exerciseIndex: number
  sets: ActiveSet[]
  restEndsAt: number | null
  /** Exercises added during this workout that are not part of the saved plan. */
  extraExercises?: PlanExercise[]
}

const storageKey = "fitnote.activeWorkout"
const restKey = "fitnote.restSeconds"

export function readActiveWorkout(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as ActiveWorkout
    if (!parsed || typeof parsed.date !== "string" || !Array.isArray(parsed.sets)) {
      return null
    }
    // Abandon workouts older than 18 hours.
    if (Date.now() - Number(parsed.startedAt) > 18 * 60 * 60 * 1000) {
      localStorage.removeItem(storageKey)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeActiveWorkout(workout: ActiveWorkout | null) {
  try {
    if (workout) {
      localStorage.setItem(storageKey, JSON.stringify(workout))
    } else {
      localStorage.removeItem(storageKey)
    }
  } catch {
    // Storage full or unavailable: the workout still works for this page view.
  }
}

export function readRestSeconds() {
  try {
    const value = Number(localStorage.getItem(restKey))
    return Number.isFinite(value) && value >= 30 && value <= 600 ? value : 90
  } catch {
    return 90
  }
}

export function writeRestSeconds(value: number) {
  try {
    localStorage.setItem(restKey, String(value))
  } catch {
    // ignore
  }
}
