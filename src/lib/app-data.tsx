import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"

import * as api from "@/lib/api"
import type {
  BootstrapData,
  ExercisePayload,
  MealPayload,
  MealUpdatePayload,
  PlanPayload,
  ProfilePayload,
  ReminderSettings,
  WorkoutSessionPayload,
  WorkoutSessionUpdatePayload,
} from "@/lib/api"
import { queueWrite, readPendingWrites, writePendingWrites, type PendingWrite } from "@/lib/pending-sessions"
import { useReminderScheduler } from "@/lib/reminders"

type AppDataContextValue = {
  data: BootstrapData | null
  loading: boolean
  error: string | null
  /** True when the Worker requires a passcode and we don't have a valid one. */
  locked: boolean
  isProfileReady: boolean
  refresh: () => Promise<void>
  unlock: (passcode: string) => Promise<boolean>
  lock: () => void
  saveProfile: (payload: ProfilePayload) => Promise<void>
  saveSettings: (payload: api.SettingsPayload) => Promise<void>
  applyPlans: (payload: Parameters<typeof api.applyPlans>[0]) => Promise<void>
  createExercise: (payload: ExercisePayload) => Promise<string>
  deleteExercise: (id: string) => Promise<void>
  savePlan: (weekday: number, payload: PlanPayload) => Promise<void>
  /** "queued" when offline. */
  saveMeal: (payload: MealPayload) => Promise<"saved" | "queued">
  updateMeal: (id: string, payload: MealUpdatePayload) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  /** "queued" when offline: the workout is kept on this device and uploaded later. */
  saveWorkoutSession: (payload: WorkoutSessionPayload) => Promise<"saved" | "queued">
  pendingSessions: number
  syncPendingSessions: () => Promise<void>
  createSessionExercise: (payload: api.SessionExercisePayload) => Promise<api.PlanExercise>
  copyMeal: (id: string, payload: { date: string; mealType?: api.MealType }) => Promise<void>
  saveBodyWeight: (payload: { date: string; weight: number }) => Promise<"saved" | "queued">
  deleteBodyWeight: (date: string) => Promise<void>
  saveWater: (payload: { date: string; ml: number }) => Promise<"saved" | "queued">
  updateWorkoutSession: (id: string, payload: WorkoutSessionUpdatePayload) => Promise<void>
  deleteWorkoutSession: (id: string) => Promise<void>
  saveReminders: (payload: ReminderSettings) => Promise<void>
  saveAiSettings: (payload: api.AiSettingsPayload) => Promise<void>
  deleteAiSettings: () => Promise<void>
  exportData: () => Promise<Record<string, unknown>>
  importData: (payload: unknown) => Promise<Record<string, number>>
  clearData: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BootstrapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [pendingSessions, setPendingSessions] = useState(() => readPendingWrites().length)
  const syncing = useRef(false)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)

    try {
      const next = await api.getBootstrap()
      if (id === requestId.current) {
        setData(next)
        setLocked(false)
      }
    } catch (caught) {
      if (id === requestId.current) {
        if (caught instanceof api.ApiError && caught.status === 401) {
          setLocked(true)
        } else {
          setError(caught instanceof Error ? caught.message : "加载失败")
        }
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onUnauthorized = () => setLocked(true)
    window.addEventListener(api.unauthorizedEvent, onUnauthorized)
    return () => window.removeEventListener(api.unauthorizedEvent, onUnauthorized)
  }, [])

  // Re-sync when the app comes back to the foreground (common on mobile: the day may have changed).
  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now()
      } else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) {
        void refresh()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [refresh])

  useReminderScheduler(data?.settings.reminders)

  const syncPendingSessions = useCallback(async () => {
    if (syncing.current) {
      return
    }
    const queue = readPendingWrites()
    if (queue.length === 0) {
      setPendingSessions(0)
      return
    }
    syncing.current = true
    try {
      let remaining = [...queue]
      for (const item of queue) {
        try {
          setData(await sendPendingWrite(item))
          remaining = remaining.filter((entry) => entry.localId !== item.localId)
          writePendingWrites(remaining)
        } catch (caught) {
          // Still offline (status 0) or server error: keep it and try again later.
          if (caught instanceof api.ApiError && caught.status >= 400 && caught.status < 500 && caught.status !== 401) {
            remaining = remaining.filter((entry) => entry.localId !== item.localId)
            writePendingWrites(remaining)
            continue
          }
          break
        }
      }
      setPendingSessions(remaining.length)
    } finally {
      syncing.current = false
    }
  }, [])

  useEffect(() => {
    if (data) {
      void syncPendingSessions()
    }
    const onOnline = () => void syncPendingSessions()
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [Boolean(data), syncPendingSessions])

  const value = useMemo<AppDataContextValue>(() => {
    async function apply<T extends BootstrapData>(next: Promise<T>) {
      const result = await next
      setData(result)
      setError(null)
      return result
    }

    return {
      data,
      loading,
      error,
      locked,
      isProfileReady: Boolean(data?.profile.heightCm && data.profile.weightKg),
      refresh,
      unlock: async (passcode) => {
        api.setStoredPasscode(passcode.trim())
        try {
          const session = await api.getSession()
          if (!session.authorized) {
            return false
          }
        } catch {
          return false
        }
        await refresh()
        return true
      },
      lock: () => {
        api.setStoredPasscode("")
        setData(null)
        setLocked(true)
      },
      saveProfile: async (payload) => void (await apply(api.saveProfile(payload))),
      saveSettings: async (payload) => void (await apply(api.saveSettings(payload))),
      createExercise: async (payload) => (await apply(api.createExercise(payload))).createdExerciseId,
      deleteExercise: async (id) => void (await apply(api.deleteExercise(id))),
      savePlan: async (weekday, payload) => void (await apply(api.savePlan(weekday, payload))),
      saveMeal: async (payload) => {
        try {
          await apply(api.saveMeal(payload))
          return "saved"
        } catch (caught) {
          if (isOffline(caught)) {
            setPendingSessions(queueWrite({ type: "meal", payload }))
            return "queued"
          }
          throw caught
        }
      },
      updateMeal: async (id, payload) => void (await apply(api.updateMeal(id, payload))),
      deleteMeal: async (id) => void (await apply(api.deleteMeal(id))),
      saveWorkoutSession: async (payload) => {
        try {
          await apply(api.saveWorkoutSession(payload))
          return "saved"
        } catch (caught) {
          if (isOffline(caught)) {
            setPendingSessions(queueWrite({ type: "workout", payload }))
            return "queued"
          }
          throw caught
        }
      },
      pendingSessions,
      syncPendingSessions,
      createSessionExercise: async (payload) => (await apply(api.createSessionExercise(payload))).exercise,
      copyMeal: async (id, payload) => void (await apply(api.copyMeal(id, payload))),
      saveBodyWeight: async (payload) => {
        try {
          await apply(api.saveBodyWeight(payload))
          return "saved"
        } catch (caught) {
          if (isOffline(caught)) {
            setPendingSessions(queueWrite({ type: "weight", payload }))
            return "queued"
          }
          throw caught
        }
      },
      deleteBodyWeight: async (date) => void (await apply(api.deleteBodyWeight(date))),
      saveWater: async (payload) => {
        // Optimistic: water taps should feel instant even on a slow connection.
        setData((current) => (current && payload.date === current.todayKey ? { ...current, waterToday: payload.ml } : current))
        try {
          await apply(api.saveWater(payload))
          return "saved"
        } catch (caught) {
          if (isOffline(caught)) {
            setPendingSessions(queueWrite({ type: "water", payload }))
            return "queued"
          }
          throw caught
        }
      },
      applyPlans: async (payload) => void (await apply(api.applyPlans(payload))),
      updateWorkoutSession: async (id, payload) => void (await apply(api.updateWorkoutSession(id, payload))),
      deleteWorkoutSession: async (id) => void (await apply(api.deleteWorkoutSession(id))),
      saveReminders: async (payload) => void (await apply(api.saveReminders(payload))),
      saveAiSettings: async (payload) => void (await apply(api.saveAiSettings(payload))),
      deleteAiSettings: async () => void (await apply(api.deleteAiSettings())),
      exportData: () => api.exportData(),
      importData: async (payload) => (await apply(api.importData(payload))).imported,
      clearData: async () => void (await apply(api.clearData())),
    }
  }, [data, error, loading, locked, refresh, pendingSessions, syncPendingSessions])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

function isOffline(caught: unknown) {
  return caught instanceof api.ApiError && caught.status === 0
}

function sendPendingWrite(item: PendingWrite) {
  switch (item.type) {
    case "workout":
      return api.saveWorkoutSession(item.payload)
    case "meal":
      return api.saveMeal(item.payload)
    case "weight":
      return api.saveBodyWeight(item.payload)
    case "water":
      return api.saveWater(item.payload)
  }
}

export function useAppData() {
  const context = useContext(AppDataContext)

  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider")
  }

  return context
}

export function getTodayWeekday() {
  const day = new Date().getDay()
  return day === 0 ? 7 : day
}

export function weekdayText(weekday: number) {
  return `周${["一", "二", "三", "四", "五", "六", "日"][Math.max(0, Math.min(6, weekday - 1))]}`
}

export function errorMessage(caught: unknown, fallback = "操作失败") {
  return caught instanceof Error && caught.message ? caught.message : fallback
}
