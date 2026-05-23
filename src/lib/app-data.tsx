import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

import * as api from "@/lib/api"
import type {
  BootstrapData,
  ExercisePayload,
  MealPayload,
  PlanPayload,
  ProfilePayload,
  WorkoutSessionPayload,
} from "@/lib/api"

type AppDataContextValue = {
  data: BootstrapData | null
  loading: boolean
  error: string | null
  isProfileReady: boolean
  refresh: () => Promise<void>
  saveProfile: (payload: ProfilePayload) => Promise<void>
  createExercise: (payload: ExercisePayload) => Promise<void>
  savePlan: (weekday: number, payload: PlanPayload) => Promise<void>
  saveMeal: (payload: MealPayload) => Promise<void>
  saveWorkoutSession: (payload: WorkoutSessionPayload) => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BootstrapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setData(await api.getBootstrap())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function apply(next: Promise<BootstrapData>) {
    setError(null)

    try {
      setData(await next)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "保存失败"
      setError(message)
      throw caught
    }
  }

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      loading,
      error,
      isProfileReady: Boolean(data?.profile.heightCm && data.profile.weightKg),
      refresh,
      saveProfile: (payload) => apply(api.saveProfile(payload)),
      createExercise: (payload) => apply(api.createExercise(payload)),
      savePlan: (weekday, payload) => apply(api.savePlan(weekday, payload)),
      saveMeal: (payload) => apply(api.saveMeal(payload)),
      saveWorkoutSession: (payload) => apply(api.saveWorkoutSession(payload)),
    }),
    [data, error, loading, refresh],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
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
