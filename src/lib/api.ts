export type Macro = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type UserProfile = {
  id: string
  name: string
  heightCm: number | null
  weightKg: number | null
  goals: Macro
}

export type LibraryExercise = {
  id: string
  userId: string | null
  name: string
  muscleGroup: string
  defaultSets: number
  defaultReps: number
  defaultWeight: number
  isBuiltin: boolean
}

export type PlanExercise = {
  id: string
  libraryExerciseId: string | null
  name: string
  muscle: string
  sets: number
  reps: number
  weight: number
  order: number
}

export type WorkoutPlan = {
  id: string
  weekday: number
  title: string
  createdAt: number
  exercises: PlanExercise[]
}

export type MealRecord = Macro & {
  id: string
  title: string
  note: string
  createdAt: number
  rawText?: string
}

export type WorkoutHistoryItem = {
  id: string
  date: string
  title: string
  volume: string
  sets: number
  startedAt: number
  finishedAt: number | null
}

export type FoodTrendItem = Macro & {
  day: string
}

export type ExerciseTrend = {
  name: string
  current: number
  best: number
  change: number
  points: Array<{ weight: number; completedAt: number }>
}

export type AppStats = {
  foodTrend: FoodTrendItem[]
  trainingCount7d: number
  trainingDays: Array<{ id: string; date: string; order: number }>
  exerciseTrends: ExerciseTrend[]
}

export type BootstrapData = {
  profile: UserProfile
  exerciseLibrary: LibraryExercise[]
  plans: WorkoutPlan[]
  todayPlan: WorkoutPlan | null
  todayMacro: Macro
  todayMeals: MealRecord[]
  recentMeals: MealRecord[]
  workoutHistory: WorkoutHistoryItem[]
  stats: AppStats
}

export type ProfilePayload = {
  name: string
  heightCm: number | null
  weightKg: number | null
  goals: Macro
}

export type ExercisePayload = {
  name: string
  muscleGroup: string
  defaultSets: number
  defaultReps: number
  defaultWeight: number
}

export type PlanPayload = {
  title: string
  exercises: Array<ExercisePayload & { libraryExerciseId?: string | null }>
}

export type MealPayload = Macro & {
  rawText: string
  items: Array<Macro & { name: string }>
}

export type WorkoutSessionPayload = {
  planId: string | null
  startedAt: number
  finishedAt: number
  sets: Array<{
    exerciseId: string
    setIndex: number
    actualReps: number
    actualWeight: number
  }>
}

export async function getBootstrap() {
  return request<BootstrapData>("/api/bootstrap")
}

export async function saveProfile(payload: ProfilePayload) {
  return request<BootstrapData>("/api/profile", { method: "PUT", body: payload })
}

export async function createExercise(payload: ExercisePayload) {
  return request<BootstrapData>("/api/exercises", { method: "POST", body: payload })
}

export async function savePlan(weekday: number, payload: PlanPayload) {
  return request<BootstrapData>(`/api/plans/${weekday}`, { method: "PUT", body: payload })
}

export async function saveMeal(payload: MealPayload) {
  return request<BootstrapData>("/api/meals", { method: "POST", body: payload })
}

export async function saveWorkoutSession(payload: WorkoutSessionPayload) {
  return request<BootstrapData>("/api/workout-sessions", { method: "POST", body: payload })
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = typeof body?.error === "string" ? body.error : `Request failed: ${response.status}`
    throw new Error(message)
  }

  return (await response.json()) as T
}
