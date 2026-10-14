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

export type ExerciseKind = "strength" | "cardio" | "duration"

export type LibraryExercise = {
  kind: ExerciseKind
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
  kind: ExerciseKind
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
  mealType: MealType
  title: string
  note: string
  createdAt: number
  rawText?: string
  items: Array<Macro & { name: string }>
}

export type MealType = "breakfast" | "lunch" | "dinner" | "breakfastSnack" | "lunchSnack" | "dinnerSnack"

export type WorkoutHistoryItem = {
  id: string
  date: string
  dateKey: string
  title: string
  volume: string
  sets: number
  startedAt: number
  finishedAt: number | null
}

export type WorkoutSetRecord = {
  isWarmup?: boolean
  rpe?: number | null
  kind: ExerciseKind
  durationSec: number | null
  distanceM: number | null
  id: string
  exerciseId: string
  exerciseName: string
  setIndex: number
  actualReps: number
  actualWeight: number
  completedAt: number
}

export type WorkoutSessionDetail = Omit<WorkoutHistoryItem, "sets"> & {
  planId: string | null
  sets: WorkoutSetRecord[]
}

export type FoodTrendItem = Macro & {
  day: string
  date: string
}

export type ExerciseTrend = {
  key: string
  name: string
  current: number
  best: number
  change: number
  lastAt: number
  points: Array<{ weight: number; completedAt: number }>
}

export type AppStats = {
  foodTrend: FoodTrendItem[]
  trainingCount7d: number
  trainingDays: Array<{ id: string; date: string; dateKey: string; order: number }>
  exerciseTrends: ExerciseTrend[]
}

export type ReminderSettings = {
  workout: { enabled: boolean; time: string }
  meal: { enabled: boolean; time: string }
  weekly: { enabled: boolean; day: number; time: string }
}

export type BootstrapData = {
  profile: UserProfile
  exerciseLibrary: LibraryExercise[]
  plans: WorkoutPlan[]
  nextRotationPlanId: string | null
  todayKey: string
  todayPlan: WorkoutPlan | null
  todayMacro: Macro
  todayMeals: MealRecord[]
  recentMeals: MealRecord[]
  workoutHistory: WorkoutHistoryItem[]
  stats: AppStats
  bodyWeights: Array<{ date: string; weight: number }>
  waterToday: number
  frequentMeals: FrequentMeal[]
  settings: {
    planMode: "weekly" | "rotation"
    rotationSlots: number
    waterGoal: number
    reminders: ReminderSettings
    timezone: string
    ai: AiSettings | null
  }
}

export type FrequentMeal = Macro & {
  mealId: string
  label: string
  count: number
  mealType: string
  lastAt: number
}

export type HistorySet = { weight: number; reps: number; durationSec: number | null; distanceM: number | null }

export type ExerciseHistory = Record<
  string,
  { lastDate: string; lastSets: HistorySet[]; bestWeight: number; bestOneRepMax: number; bestVolumeSet: number; sessions: number }
>

export type ExerciseDetail = {
  key: string
  name: string
  muscle: string
  kind: ExerciseKind
  bestWeight: number
  bestOneRepMax: number
  bestVolume: number
  totalSets: number
  sessions: Array<{
    id: string
    date: string
    dateKey: string
    startedAt: number
    sets: HistorySet[]
    bestWeight: number
    bestReps: number
    volume: number
    oneRepMax: number
    totalDurationSec: number
    totalDistanceM: number
  }>
}

export type AiSettings = {
  providerId: string
  baseUrl: string
  model: string
  protocol: "openai" | "anthropic"
  hasKey: boolean
  keyHint: string
}

export type AiSettingsPayload = {
  providerId: string
  baseUrl?: string
  model: string
  protocol?: "openai" | "anthropic"
  apiKey?: string
}

export type DayData = {
  date: string
  plan: WorkoutPlan | null
  macro: Macro
  meals: MealRecord[]
  workoutSessions: WorkoutHistoryItem[]
}

export type ProfilePayload = {
  name: string
  heightCm: number | null
  weightKg: number | null
  goals: Macro
  timezone?: string
}

export type SessionInfo = {
  authRequired: boolean
  authorized: boolean
}

export type ImportResult = BootstrapData & {
  imported: Record<string, number>
}

export type ExercisePayload = {
  kind?: ExerciseKind
  name: string
  muscleGroup: string
  defaultSets: number
  defaultReps: number
  defaultWeight: number
}

export type PlanPayload = {
  title: string
  exercises: Array<ExercisePayload & { id?: string; libraryExerciseId?: string | null }>
}

export type MealPayload = Macro & {
  date?: string
  mealType: MealType
  rawText: string
  items: Array<Macro & { name: string }>
}

export type MealUpdatePayload = Partial<Macro> & {
  mealType?: MealType
  rawText?: string
  items?: Array<Macro & { name: string }>
}

export type WorkoutSessionPayload = {
  date?: string
  planId: string | null
  startedAt: number
  finishedAt: number
  sets: Array<{
    exerciseId: string
    setIndex: number
    actualReps: number
    actualWeight: number
    completedAt?: number
    durationSec?: number | null
    distanceM?: number | null
    isWarmup?: boolean
    rpe?: number | null
  }>
}

export type WorkoutSessionUpdatePayload = {
  date?: string
  startedAt?: number
  finishedAt?: number | null
  sets: Array<{
    id?: string
    exerciseId: string
    setIndex: number
    actualReps: number
    actualWeight: number
    completedAt?: number
    durationSec?: number | null
    distanceM?: number | null
    isWarmup?: boolean
    rpe?: number | null
  }>
}

export async function getSession() {
  return request<SessionInfo>("/api/session")
}

export async function getBootstrap() {
  return request<BootstrapData>("/api/bootstrap")
}

export async function getDayData(date: string) {
  return request<DayData>(`/api/day?date=${encodeURIComponent(date)}`)
}

export async function saveProfile(payload: ProfilePayload) {
  return request<BootstrapData>("/api/profile", { method: "PUT", body: payload })
}

export type SettingsPayload = { timezone?: string; waterGoal?: number; planMode?: "weekly" | "rotation"; rotationSlots?: number }

export async function saveSettings(payload: SettingsPayload) {
  return request<BootstrapData>("/api/settings", { method: "PUT", body: payload })
}

export async function createExercise(payload: ExercisePayload) {
  return request<BootstrapData & { createdExerciseId: string }>("/api/exercises", { method: "POST", body: payload })
}

export async function deleteExercise(id: string) {
  return request<BootstrapData>(`/api/exercises/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function savePlan(weekday: number, payload: PlanPayload) {
  return request<BootstrapData>(`/api/plans/${weekday}`, { method: "PUT", body: payload })
}

export async function saveMeal(payload: MealPayload) {
  return request<BootstrapData>("/api/meals", { method: "POST", body: payload })
}

export async function updateMeal(id: string, payload: MealUpdatePayload) {
  return request<BootstrapData>(`/api/meals/${encodeURIComponent(id)}`, { method: "PUT", body: payload })
}

export async function deleteMeal(id: string) {
  return request<BootstrapData>(`/api/meals/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function saveWorkoutSession(payload: WorkoutSessionPayload) {
  return request<BootstrapData>("/api/workout-sessions", { method: "POST", body: payload })
}

export async function getWorkoutSession(id: string) {
  return request<WorkoutSessionDetail>(`/api/workout-sessions/${encodeURIComponent(id)}`)
}

export async function updateWorkoutSession(id: string, payload: WorkoutSessionUpdatePayload) {
  return request<BootstrapData>(`/api/workout-sessions/${encodeURIComponent(id)}`, { method: "PUT", body: payload })
}

export async function deleteWorkoutSession(id: string) {
  return request<BootstrapData>(`/api/workout-sessions/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function saveReminders(payload: ReminderSettings) {
  return request<BootstrapData>("/api/reminders", { method: "PUT", body: payload })
}

export async function saveAiSettings(payload: AiSettingsPayload) {
  return request<BootstrapData>("/api/ai/settings", { method: "PUT", body: payload })
}

export async function deleteAiSettings() {
  return request<BootstrapData>("/api/ai/settings", { method: "DELETE" })
}

export async function testAiSettings() {
  return request<{ ok: boolean; reply: string; model: string; elapsedMs: number }>("/api/ai/test", { method: "POST", body: {} })
}

export async function analyzeMealPhoto(image: string, note?: string) {
  return request<{ text: string; model: string; elapsedMs: number }>("/api/ai/meal-photo", { method: "POST", body: { image, note } })
}

export function exerciseKey(libraryExerciseId: string | null | undefined, name: string) {
  return libraryExerciseId ? `lib:${libraryExerciseId}` : `name:${name}`
}

export async function getExerciseHistory(keys: string[], excludeSessionId?: string) {
  const query = keys.map((key) => encodeURIComponent(key)).join(",")
  return request<ExerciseHistory>(`/api/exercise-history?keys=${encodeURIComponent(query)}${excludeSessionId ? `&exclude=${encodeURIComponent(excludeSessionId)}` : ""}`)
}

export async function getExerciseDetail(key: string) {
  return request<ExerciseDetail>(`/api/exercise-detail?key=${encodeURIComponent(key)}`)
}

export type SessionExercisePayload = {
  name: string
  muscleGroup: string
  libraryExerciseId: string | null
  kind: ExerciseKind
  sets: number
  reps: number
  weight: number
  addToPlanWeekday?: number | null
}

export async function createSessionExercise(payload: SessionExercisePayload) {
  return request<BootstrapData & { exercise: PlanExercise }>("/api/session-exercises", { method: "POST", body: payload })
}

export async function copyMeal(id: string, payload: { date: string; mealType?: MealType }) {
  return request<BootstrapData>(`/api/meals/${encodeURIComponent(id)}/copy`, { method: "POST", body: payload })
}

export async function saveBodyWeight(payload: { date: string; weight: number }) {
  return request<BootstrapData>("/api/body-weight", { method: "PUT", body: payload })
}

export async function deleteBodyWeight(date: string) {
  return request<BootstrapData>(`/api/body-weight/${encodeURIComponent(date)}`, { method: "DELETE" })
}

export async function saveWater(payload: { date: string; ml: number }) {
  return request<BootstrapData>("/api/water", { method: "PUT", body: payload })
}

// ---------------------------------------------------------------------------
// AI coach
// ---------------------------------------------------------------------------

export type ChatTurn = { role: "user" | "assistant"; content: string }

export type GeneratedPlan = {
  mode: "weekly" | "rotation"
  rotationSlots: number | null
  summary: string
  tips: string[]
  plans: Array<{
    weekday: number
    label: string
    title: string
    focus: string
    exercises: Array<ExercisePayload & { libraryExerciseId: string | null; note: string }>
  }>
}

export type PlanGeneratorInput = {
  goal: string
  mode: "weekly" | "rotation"
  days: number[]
  rotationSlots: number
  minutes: number
  level: string
  equipment: string
  notes: string
}

export type MealSuggestion = Macro & {
  title: string
  mealType: MealType
  reason: string
  items: Array<Macro & { name: string }>
}

export type MealSuggestionResult = { remaining: Macro; eaten: Macro & { meals: number }; goals: Macro; advice: string; options: MealSuggestion[] }

export type MonthlyReviewResult = {
  text: string
  stats: { sessions: number; perWeek: number; avgCalories: number; avgProtein: number; loggedDays: number; weightChange: number | null }
}

export async function aiChat(messages: ChatTurn[]) {
  return request<{ text: string }>("/api/ai/chat", { method: "POST", body: { messages } })
}

export async function aiWorkoutPlan(input: PlanGeneratorInput) {
  return request<GeneratedPlan>("/api/ai/workout-plan", { method: "POST", body: input })
}

export async function aiMealSuggestions(note?: string) {
  return request<MealSuggestionResult>("/api/ai/meal-suggestions", { method: "POST", body: { note } })
}

export async function aiMonthlyReview() {
  return request<MonthlyReviewResult>("/api/ai/monthly-review", { method: "POST", body: {} })
}

export async function applyPlans(payload: { mode: "weekly" | "rotation"; rotationSlots?: number | null; plans: Array<{ weekday: number; title: string; exercises: PlanPayload["exercises"] }> }) {
  return request<BootstrapData>("/api/plans/apply", { method: "POST", body: payload })
}

/** The plan to follow on a date: by weekday, or in rotation mode the next slot (today/future only). */
export function planForDate(data: BootstrapData, date: string, today: string) {
  if (data.settings.planMode === "rotation") {
    if (date < today) return null
    return data.plans.find((plan) => plan.id === data.nextRotationPlanId) ?? null
  }
  const [year, month, day] = date.split("-").map(Number)
  const weekday = new Date(year, month - 1, day).getDay() || 7
  return data.plans.find((plan) => plan.weekday === weekday) ?? null
}

export function slotLabel(weekday: number) {
  return weekday > 100 ? `训练 ${String.fromCharCode(64 + weekday - 100)}` : `周${["一", "二", "三", "四", "五", "六", "日"][weekday - 1] ?? ""}`
}

export async function exportData() {
  return request<Record<string, unknown>>("/api/export")
}

export async function importData(payload: unknown) {
  return request<ImportResult>("/api/import", { method: "POST", body: payload })
}

export async function clearData() {
  return request<BootstrapData>("/api/data", { method: "DELETE" })
}

// ---------------------------------------------------------------------------
// Access passcode (only used when the Worker has the APP_PASSCODE secret set)
// ---------------------------------------------------------------------------

const passcodeKey = "fitnote.passcode"
export const unauthorizedEvent = "fitnote:unauthorized"

export function getStoredPasscode() {
  try {
    return localStorage.getItem(passcodeKey) ?? ""
  } catch {
    return ""
  }
}

export function setStoredPasscode(value: string) {
  try {
    if (value) {
      localStorage.setItem(passcodeKey, value)
    } else {
      localStorage.removeItem(passcodeKey)
    }
  } catch {
    // Storage unavailable (private mode): the passcode is kept for this page only.
  }
  memoryPasscode = value
}

let memoryPasscode = ""

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {}
  const passcode = memoryPasscode || getStoredPasscode()

  if (options.body !== undefined) {
    headers["content-type"] = "application/json"
  }

  if (passcode) {
    headers.authorization = `Bearer ${passcode}`
  }

  let response: Response

  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    })
  } catch {
    throw new ApiError("网络连接失败，请检查网络后重试", 0)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = typeof body?.error === "string" ? body.error : `请求失败（${response.status}）`

    if (response.status === 401) {
      window.dispatchEvent(new Event(unauthorizedEvent))
    }

    throw new ApiError(message, response.status)
  }

  return (await response.json()) as T
}
