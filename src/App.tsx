import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import type { ReactNode } from "react"

import { AppShell } from "@/components/layout/AppShell"
import { ErrorState, LoadingState } from "@/components/ui/state"
import { ToastProvider } from "@/components/ui/toast"
import { AppDataProvider, useAppData } from "@/lib/app-data"
import { ThemeProvider } from "@/lib/theme"
import { AiPage } from "@/pages/AiPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { FoodPage } from "@/pages/FoodPage"
import { FoodImagePage } from "@/pages/FoodImagePage"
import { ExerciseDetailPage } from "@/pages/ExerciseDetailPage"
import { ExerciseLibraryPage } from "@/pages/ExerciseLibraryPage"
import { MealConfirmPage } from "@/pages/MealConfirmPage"
import { OnboardingPage } from "@/pages/OnboardingPage"
import { PasscodePage } from "@/pages/PasscodePage"
import { ProfilePage } from "@/pages/ProfilePage"
import { SettingsDetailPage } from "@/pages/SettingsDetailPage"
import { BodyWeightPage } from "@/pages/BodyWeightPage"
import { StatsPage } from "@/pages/StatsPage"
import { StatsDetailPage } from "@/pages/StatsDetailPage"
import { TodayWorkoutPage } from "@/pages/TodayWorkoutPage"
import { WorkoutHistoryPage } from "@/pages/WorkoutHistoryPage"
import { WorkoutPlanPage } from "@/pages/WorkoutPlanPage"
import { WorkoutSessionPage } from "@/pages/WorkoutSessionPage"
import { WorkoutSummaryPage } from "@/pages/WorkoutSummaryPage"

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppDataProvider>
          <AppShell>
            <SetupGate>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/workout" element={<TodayWorkoutPage />} />
                <Route path="/workout/session" element={<WorkoutSessionPage />} />
                <Route path="/workout/summary" element={<WorkoutSummaryPage />} />
                <Route path="/workout/plan" element={<WorkoutPlanPage />} />
                <Route path="/workout/history" element={<WorkoutHistoryPage />} />
                <Route path="/workout/library" element={<ExerciseLibraryPage />} />
                <Route path="/workout/library/:key" element={<ExerciseDetailPage />} />
                <Route path="/stats/weight" element={<BodyWeightPage />} />
                <Route path="/food" element={<FoodPage />} />
                <Route path="/food/confirm" element={<MealConfirmPage />} />
                <Route path="/food/image" element={<FoodImagePage />} />
                <Route path="/ai" element={<AiPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/stats/:type" element={<StatsDetailPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/settings/:section" element={<SettingsDetailPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </SetupGate>
          </AppShell>
        </AppDataProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

/**
 * Decides what to render before the app data is ready:
 * passcode screen → loading skeleton → error with retry → onboarding (only when data
 * actually loaded and the profile is incomplete; never because a request failed).
 */
function SetupGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { data, loading, error, locked, isProfileReady, refresh } = useAppData()

  if (locked) {
    return <PasscodePage />
  }

  if (!data) {
    if (loading) {
      return <LoadingState />
    }

    return <ErrorState title="无法连接到 FitNote" description={error ?? "请检查网络后重试。"} onRetry={() => void refresh()} />
  }

  if (!isProfileReady && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
