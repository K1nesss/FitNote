import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { ToastProvider } from "@/components/ui/toast"
import { ThemeProvider } from "@/lib/theme"
import { DashboardPage } from "@/pages/DashboardPage"
import { FoodPage } from "@/pages/FoodPage"
import { FoodImagePage } from "@/pages/FoodImagePage"
import { ExerciseLibraryPage } from "@/pages/ExerciseLibraryPage"
import { MealConfirmPage } from "@/pages/MealConfirmPage"
import { OnboardingPage } from "@/pages/OnboardingPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { SettingsDetailPage } from "@/pages/SettingsDetailPage"
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
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/workout" element={<TodayWorkoutPage />} />
            <Route path="/workout/session" element={<WorkoutSessionPage />} />
            <Route path="/workout/summary" element={<WorkoutSummaryPage />} />
            <Route path="/workout/plan" element={<WorkoutPlanPage />} />
            <Route path="/workout/history" element={<WorkoutHistoryPage />} />
            <Route path="/workout/library" element={<ExerciseLibraryPage />} />
            <Route path="/food" element={<FoodPage />} />
            <Route path="/food/confirm" element={<MealConfirmPage />} />
            <Route path="/food/image" element={<FoodImagePage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/stats/:type" element={<StatsDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/settings/:section" element={<SettingsDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </ToastProvider>
    </ThemeProvider>
  )
}
