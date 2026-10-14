import { AiError, analyzeMealPhoto, deleteAiConfig, loadAiConfig, publicAiConfig, saveAiConfig, testAiConfig, type AiConfigInput } from "./ai"
import { buildContext, coachChat, generateWorkoutPlan, monthlyReview, suggestMeals, type PlanRequest } from "./coach"
import { ensureSchema, SCHEMA_VERSION, syncBuiltinExercises } from "./db/runtime-schema"
import {
  copyMeal,
  createSessionExercise,
  deleteBodyWeight,
  getBodyWeights,
  getExerciseDetail,
  getExerciseHistory,
  getFrequentMeals,
  getWater,
  normalizeKind,
  ProgressError,
  saveBodyWeight,
  saveWater,
} from "./progress"
import {
  addDaysToKey,
  DEFAULT_TIMEZONE,
  formatDateKey,
  formatMonthDay,
  getActiveTimeZone,
  getWeekday,
  hourOf,
  isValidTimeZone,
  normalizeDateKey,
  setActiveTimeZone,
  startOfDateKey,
  timestampOnDate,
} from "./time"

export interface Env {
  ASSETS: Fetcher
  DB?: D1Database
  /** Optional secret. When set, every /api request must send it (Settings → Variables and Secrets). */
  APP_PASSCODE?: string
  /** Optional default IANA time zone for a brand-new database, e.g. "Europe/Berlin". */
  DEFAULT_TIMEZONE?: string
}

const defaultUserId = "default"
const defaultName = "我"
const defaultGoals = { calories: 2200, protein: 150, carbs: 240, fat: 70 }

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
}

const defaultReminders = {
  workout: { enabled: false, time: "19:00" },
  meal: { enabled: false, time: "12:30" },
  weekly: { enabled: false, day: 7, time: "20:30" },
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request)
    }

    try {
      return await handleApi(request, env, url)
    } catch (error) {
      if (error instanceof HttpError || error instanceof AiError || error instanceof ProgressError) {
        return json({ error: error.message }, error.status)
      }

      const message = error instanceof Error ? error.message : "Unknown error"
      console.error("FitNote API error", message)
      return json({ error: message }, 500)
    }
  },
} satisfies ExportedHandler<Env>

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const { pathname } = url
  const method = request.method

  if (pathname === "/api/health") {
    return json({ ok: true, service: "fitnote", db: Boolean(env.DB), schema: SCHEMA_VERSION })
  }

  const authRequired = Boolean(env.APP_PASSCODE)
  const authorized = !authRequired || (await checkPasscode(request, env.APP_PASSCODE ?? ""))

  if (pathname === "/api/session" && method === "GET") {
    return json({ authRequired, authorized })
  }

  if (!authorized) {
    throw new HttpError(401, "需要访问密码")
  }

  const db = getDB(env)
  await prepare(db, env)

  if (pathname === "/api/bootstrap" && method === "GET") {
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/day" && method === "GET") {
    return json(await getDayData(db, url.searchParams.get("date")))
  }

  if (pathname === "/api/profile" && method === "PUT") {
    await saveProfile(db, await readBody<ProfileInput>(request))
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/settings" && method === "PUT") {
    await saveSettings(db, await readBody<SettingsInput>(request))
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/exercises" && method === "POST") {
    const createdExerciseId = await createLibraryExercise(db, await readBody<ExerciseInput>(request))
    return json({ ...(await getBootstrap(db)), createdExerciseId })
  }

  if (pathname.startsWith("/api/exercises/") && method === "DELETE") {
    await deleteLibraryExercise(db, idFrom(pathname, "/api/exercises/"))
    return json(await getBootstrap(db))
  }

  if (pathname.startsWith("/api/plans/") && method === "PUT") {
    await savePlan(db, Number(pathname.replace("/api/plans/", "")), await readBody<PlanInput>(request))
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/meals" && method === "POST") {
    await saveMeal(db, await readBody<MealInput>(request))
    return json(await getBootstrap(db))
  }

  if (pathname.startsWith("/api/meals/") && method === "PUT") {
    await updateMeal(db, idFrom(pathname, "/api/meals/"), await readBody<MealInput>(request))
    return json(await getBootstrap(db))
  }

  if (pathname.startsWith("/api/meals/") && method === "DELETE") {
    await deleteMeal(db, idFrom(pathname, "/api/meals/"))
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/workout-sessions" && method === "POST") {
    await saveWorkoutSession(db, await readBody<WorkoutSessionInput>(request))
    return json(await getBootstrap(db))
  }

  if (pathname.startsWith("/api/workout-sessions/") && method === "GET") {
    return json(await getWorkoutSessionDetail(db, idFrom(pathname, "/api/workout-sessions/")))
  }

  if (pathname.startsWith("/api/workout-sessions/") && method === "PUT") {
    await updateWorkoutSession(db, idFrom(pathname, "/api/workout-sessions/"), await readBody<WorkoutSessionInput>(request))
    return json(await getBootstrap(db))
  }

  if (pathname.startsWith("/api/workout-sessions/") && method === "DELETE") {
    await deleteWorkoutSession(db, idFrom(pathname, "/api/workout-sessions/"))
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/reminders" && method === "PUT") {
    await saveReminders(db, await readBody<ReminderSettings>(request))
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/ai/settings" && method === "PUT") {
    await saveAiConfig(db, defaultUserId, await readBody<AiConfigInput>(request))
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/ai/settings" && method === "DELETE") {
    await deleteAiConfig(db, defaultUserId)
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/ai/chat" && method === "POST") {
    const body = await readBody<{ messages?: unknown }>(request)
    return json(await coachChat(await loadAiConfig(db, defaultUserId), await buildContext(db, defaultUserId), body.messages))
  }

  if (pathname === "/api/ai/workout-plan" && method === "POST") {
    const body = await readBody<PlanRequest>(request)
    return json(await generateWorkoutPlan(await loadAiConfig(db, defaultUserId), await buildContext(db, defaultUserId), body))
  }

  if (pathname === "/api/ai/meal-suggestions" && method === "POST") {
    const body = await readBody<{ note?: string }>(request)
    return json(await suggestMeals(await loadAiConfig(db, defaultUserId), await buildContext(db, defaultUserId), body))
  }

  if (pathname === "/api/ai/monthly-review" && method === "POST") {
    return json(await monthlyReview(await loadAiConfig(db, defaultUserId), await buildContext(db, defaultUserId)))
  }

  if (pathname === "/api/plans/apply" && method === "POST") {
    const body = await readBody<{ mode?: string; rotationSlots?: number; plans?: Array<PlanInput & { weekday?: number }> }>(request)
    const plans = Array.isArray(body.plans) ? body.plans.slice(0, 7) : []
    if (!plans.length) throw new HttpError(400, "没有可应用的计划")
    await saveSettings(db, {
      planMode: body.mode === "rotation" ? "rotation" : "weekly",
      ...(body.mode === "rotation" ? { rotationSlots: body.rotationSlots ?? plans.length } : {}),
    })
    for (const plan of plans) {
      await savePlan(db, Number(plan.weekday), plan)
    }
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/ai/test" && method === "POST") {
    return json(await testAiConfig(await loadAiConfig(db, defaultUserId)))
  }

  if (pathname === "/api/ai/meal-photo" && method === "POST") {
    const body = await readBody<{ image?: string; note?: string }>(request)
    return json(await analyzeMealPhoto(await loadAiConfig(db, defaultUserId), body.image, body.note))
  }

  if (pathname === "/api/exercise-history" && method === "GET") {
    const keys = (url.searchParams.get("keys") ?? "").split(",").map((key) => decodeURIComponent(key)).filter(Boolean)
    return json(await getExerciseHistory(db, defaultUserId, keys, url.searchParams.get("exclude")))
  }

  if (pathname === "/api/exercise-detail" && method === "GET") {
    return json(await getExerciseDetail(db, defaultUserId, url.searchParams.get("key") ?? ""))
  }

  if (pathname === "/api/session-exercises" && method === "POST") {
    const exercise = await createSessionExercise(db, defaultUserId, await readBody(request))
    return json({ ...(await getBootstrap(db)), exercise })
  }

  if (pathname.startsWith("/api/meals/") && pathname.endsWith("/copy") && method === "POST") {
    const mealId = decodeURIComponent(pathname.slice("/api/meals/".length, -"/copy".length))
    await copyMeal(db, defaultUserId, mealId, await readBody(request), normalizeMealType)
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/body-weight" && method === "PUT") {
    await saveBodyWeight(db, defaultUserId, await readBody(request))
    return json(await getBootstrap(db))
  }

  if (pathname.startsWith("/api/body-weight/") && method === "DELETE") {
    await deleteBodyWeight(db, defaultUserId, idFrom(pathname, "/api/body-weight/"))
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/water" && method === "PUT") {
    await saveWater(db, defaultUserId, await readBody(request))
    return json(await getBootstrap(db))
  }

  if (pathname === "/api/export" && method === "GET") {
    return json(await exportData(db))
  }

  if (pathname === "/api/import" && method === "POST") {
    const counts = await importData(db, await readBody<ImportInput>(request))
    await prepare(db, env)
    return json({ ...(await getBootstrap(db)), imported: counts })
  }

  if (pathname === "/api/data" && method === "DELETE") {
    const timezone = getActiveTimeZone()
    await clearUserData(db)
    await prepare(db, env)
    await saveSettings(db, { timezone })
    return json(await getBootstrap(db))
  }

  throw new HttpError(404, "Not found")
}

type ProfileInput = {
  name?: string
  heightCm?: number | string | null
  weightKg?: number | string | null
  goals?: MacroInput
  timezone?: string
}

type SettingsInput = {
  planMode?: string
  rotationSlots?: number | string
  timezone?: string
  waterGoal?: number | string
}

type MacroInput = {
  calories?: number | string
  protein?: number | string
  carbs?: number | string
  fat?: number | string
}

type ExerciseInput = {
  kind?: string
  name?: string
  muscleGroup?: string
  defaultSets?: number | string
  defaultReps?: number | string
  defaultWeight?: number | string
}

type PlanInput = {
  title?: string
  exercises?: Array<ExerciseInput & { id?: string; libraryExerciseId?: string | null; sortOrder?: number }>
}

type MealInput = MacroInput & {
  date?: string
  mealType?: string
  rawText?: string
  items?: Array<MacroInput & { name?: string }>
}

type WorkoutSessionInput = {
  date?: string
  planId?: string | null
  startedAt?: number
  finishedAt?: number | null
  sets?: WorkoutSetInput[]
}

type WorkoutSetInput = {
  isWarmup?: boolean
  rpe?: number | string | null
  durationSec?: number | string | null
  distanceM?: number | string | null
  id?: string
  exerciseId?: string
  setIndex?: number
  actualReps?: number | string
  actualWeight?: number | string
  completedAt?: number
}

type ReminderSettings = {
  workout?: { enabled?: boolean; time?: string }
  meal?: { enabled?: boolean; time?: string }
  weekly?: { enabled?: boolean; day?: number | string; time?: string }
}

type ImportInput = {
  version?: number
  data?: Record<string, unknown>
}

function getDB(env: Env) {
  if (!env.DB) {
    throw new HttpError(500, "未绑定 D1 数据库（binding 名称需为 DB）")
  }

  return env.DB
}

/** Schema check (once per isolate) + default rows (never overwrites) + owner's time zone. */
async function prepare(db: D1Database, env: Env) {
  await ensureSchema(db)

  const now = Date.now()
  const initialTimeZone = isValidTimeZone(env.DEFAULT_TIMEZONE) ? env.DEFAULT_TIMEZONE : DEFAULT_TIMEZONE
  const results = await db.batch([
    db
      .prepare("INSERT OR IGNORE INTO users (id, name, height_cm, weight_kg, created_at, updated_at) VALUES (?, ?, NULL, NULL, ?, ?)")
      .bind(defaultUserId, defaultName, now, now),
    db
      .prepare("INSERT OR IGNORE INTO nutrition_goals (user_id, calories, protein, carbs, fat, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(defaultUserId, defaultGoals.calories, defaultGoals.protein, defaultGoals.carbs, defaultGoals.fat, now),
    db
      .prepare("INSERT OR IGNORE INTO app_settings (key, user_id, value, updated_at) VALUES (?, ?, ?, ?)")
      .bind("reminders", defaultUserId, JSON.stringify(defaultReminders), now),
    db
      .prepare("INSERT OR IGNORE INTO app_settings (key, user_id, value, updated_at) VALUES (?, ?, ?, ?)")
      .bind("timezone", defaultUserId, JSON.stringify(initialTimeZone), now),
    db.prepare("SELECT value FROM app_settings WHERE key = ? AND user_id = ?").bind("timezone", defaultUserId),
  ])

  const row = (results[4]?.results?.[0] ?? null) as { value?: string } | null
  setActiveTimeZone(parseJson<string>(row?.value) ?? initialTimeZone)
}

async function checkPasscode(request: Request, expected: string) {
  const header = request.headers.get("authorization") ?? ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  const encoder = new TextEncoder()
  const a = encoder.encode(provided)
  const b = encoder.encode(expected)

  if (a.byteLength !== b.byteLength) {
    // Keep timing roughly constant even on length mismatch.
    crypto.subtle.timingSafeEqual(b, b)
    return false
  }

  return crypto.subtle.timingSafeEqual(a, b)
}

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: jsonHeaders })
}

function idFrom(pathname: string, prefix: string) {
  return decodeURIComponent(pathname.slice(prefix.length))
}

async function readBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, "Invalid JSON body")
  }
}

async function getBootstrap(db: D1Database) {
  const now = Date.now()
  const todayKey = formatDateKey(now)
  const todayStart = startOfDateKey(todayKey)
  const tomorrowStart = startOfDateKey(addDaysToKey(todayKey, 1))
  const weekday = getWeekday(now)

  const [profile, exerciseRows, plans, todayMeals, recentMeals, workoutHistory, stats, settings, bodyWeights, waterToday, frequentMeals] = await Promise.all([
    db
      .prepare(
        `SELECT u.id, u.name, u.height_cm as heightCm, u.weight_kg as weightKg,
          g.calories, g.protein, g.carbs, g.fat
         FROM users u
         LEFT JOIN nutrition_goals g ON g.user_id = u.id
         WHERE u.id = ?`,
      )
      .bind(defaultUserId)
      .first<Record<string, number | string | null>>(),
    allRows(
      db,
      "SELECT id, user_id as userId, name, muscle_group as muscleGroup, default_sets as defaultSets, default_reps as defaultReps, default_weight as defaultWeight, is_builtin as isBuiltin, kind FROM exercise_library ORDER BY is_builtin ASC, name ASC",
    ),
    getPlans(db),
    getMealsForRange(db, todayStart, tomorrowStart),
    getRecentMeals(db),
    getWorkoutHistory(db),
    getStats(db, todayKey),
    getSettings(db),
    getBodyWeights(db, defaultUserId),
    getWater(db, defaultUserId, todayKey),
    getFrequentMeals(db, defaultUserId),
  ])

  return {
    profile: {
      id: defaultUserId,
      name: String(profile?.name ?? defaultName),
      heightCm: nullableNumber(profile?.heightCm),
      weightKg: nullableNumber(profile?.weightKg),
      goals: {
        calories: toNumber(profile?.calories, defaultGoals.calories),
        protein: toNumber(profile?.protein, defaultGoals.protein),
        carbs: toNumber(profile?.carbs, defaultGoals.carbs),
        fat: toNumber(profile?.fat, defaultGoals.fat),
      },
    },
    exerciseLibrary: exerciseRows.map((row) => ({
      id: String(row.id),
      userId: row.userId ? String(row.userId) : null,
      name: String(row.name),
      muscleGroup: String(row.muscleGroup),
      defaultSets: toNumber(row.defaultSets, 3),
      defaultReps: toNumber(row.defaultReps, 10),
      defaultWeight: toNumber(row.defaultWeight, 0),
      isBuiltin: Boolean(row.isBuiltin),
      kind: normalizeKind(row.kind),
    })),
    plans,
    todayKey,
    todayPlan: await resolvePlanForDate(db, plans, settings, todayKey, todayKey),
    nextRotationPlanId: settings.planMode === "rotation" ? ((await nextRotationPlan(db, plans, settings))?.id ?? null) : null,
    todayMacro: sumMacros(todayMeals),
    todayMeals,
    recentMeals,
    workoutHistory,
    stats,
    settings,
    bodyWeights,
    waterToday,
    frequentMeals,
  }
}

async function getDayData(db: D1Database, dateInput: string | null) {
  const date = normalizeDateKey(dateInput) ?? formatDateKey(Date.now())
  const dayStart = startOfDateKey(date)
  const dayEnd = startOfDateKey(addDaysToKey(date, 1))
  const weekday = getWeekday(dayStart)
  const [plans, meals, workoutSessions, settings] = await Promise.all([
    getPlans(db),
    getMealsForRange(db, dayStart, dayEnd),
    getWorkoutHistory(db, dayStart, dayEnd),
    getSettings(db),
  ])
  void weekday

  return {
    date,
    plan: await resolvePlanForDate(db, plans, settings, date, formatDateKey(Date.now())),
    macro: sumMacros(meals),
    meals,
    workoutSessions,
  }
}

type PlanList = Awaited<ReturnType<typeof getPlans>>
type SettingsData = Awaited<ReturnType<typeof getSettings>>

function activeRotationPlans(plans: PlanList, settings: SettingsData) {
  return plans.filter((plan) => plan.weekday > 100 && plan.weekday <= 100 + settings.rotationSlots && plan.exercises.length > 0)
}

/** Rotation: the slot after the one used most recently (A → B → C → A …). */
async function nextRotationPlan(db: D1Database, plans: PlanList, settings: SettingsData) {
  const slots = activeRotationPlans(plans, settings)
  if (slots.length === 0) return null
  const last = await db
    .prepare(
      `SELECT p.weekday FROM workout_sessions s JOIN workout_plans p ON p.id = s.plan_id
       WHERE s.user_id = ? AND p.weekday > 100 ORDER BY s.started_at DESC LIMIT 1`,
    )
    .bind(defaultUserId)
    .first<{ weekday: number }>()
  if (!last) return slots[0]
  return slots.find((plan) => plan.weekday > last.weekday) ?? slots[0]
}

/** The plan shown for a date: by weekday, or for rotation the slot done that day / the next slot. */
async function resolvePlanForDate(db: D1Database, plans: PlanList, settings: SettingsData, date: string, today: string) {
  if (settings.planMode !== "rotation") {
    const weekday = getWeekday(startOfDateKey(date))
    return plans.find((plan) => plan.weekday === weekday) ?? null
  }

  const done = await db
    .prepare(
      `SELECT p.id FROM workout_sessions s JOIN workout_plans p ON p.id = s.plan_id
       WHERE s.user_id = ? AND p.weekday > 100 AND s.started_at >= ? AND s.started_at < ?
       ORDER BY s.started_at DESC LIMIT 1`,
    )
    .bind(defaultUserId, startOfDateKey(date), startOfDateKey(addDaysToKey(date, 1)))
    .first<{ id: string }>()
  if (done) return plans.find((plan) => plan.id === done.id) ?? null
  return date >= today ? await nextRotationPlan(db, plans, settings) : null
}

async function getSettings(db: D1Database) {
  const rows = await allRows(db, "SELECT key, value FROM app_settings WHERE user_id = ? AND key IN ('reminders', 'timezone', 'water_goal', 'plan_mode', 'rotation_slots')", [
    defaultUserId,
  ])
  const byKey = new Map(rows.map((row) => [String(row.key), row.value]))
  const timezone = parseJson<string>(byKey.get("timezone"))

  return {
    reminders: normalizeReminders(parseJson<ReminderSettings>(byKey.get("reminders")) ?? defaultReminders),
    timezone: isValidTimeZone(timezone) ? timezone : getActiveTimeZone(),
    planMode: (parseJson<string>(byKey.get("plan_mode")) === "rotation" ? "rotation" : "weekly") as "weekly" | "rotation",
    rotationSlots: Math.max(2, Math.min(6, toNumber(parseJson<number>(byKey.get("rotation_slots")), 3))),
    waterGoal: Math.max(500, Math.min(6000, toNumber(parseJson<number>(byKey.get("water_goal")), 2000))),
    ai: publicAiConfig(await loadAiConfig(db, defaultUserId)),
  }
}

async function getPlans(db: D1Database) {
  const [planRows, exerciseRows] = await Promise.all([
    allRows(
      db,
      "SELECT id, weekday, title, created_at as createdAt FROM workout_plans WHERE user_id = ? AND (weekday BETWEEN 1 AND 7 OR weekday BETWEEN 101 AND 106) ORDER BY weekday ASC",
      [defaultUserId],
    ),
    allRows(
      db,
      `SELECT id, plan_id as planId, library_exercise_id as libraryExerciseId, name, muscle_group as muscleGroup,
        target_sets as sets, target_reps as reps, target_weight as weight, sort_order as sortOrder, kind
       FROM workout_exercises WHERE archived_at IS NULL ORDER BY sort_order ASC`,
    ),
  ])

  return planRows.map((plan) => ({
    id: String(plan.id),
    weekday: toNumber(plan.weekday),
    title: String(plan.title),
    createdAt: toNumber(plan.createdAt),
    exercises: exerciseRows
      .filter((exercise) => exercise.planId === plan.id)
      .map((exercise, index) => ({
        id: String(exercise.id),
        libraryExerciseId: exercise.libraryExerciseId ? String(exercise.libraryExerciseId) : null,
        name: String(exercise.name),
        muscle: String(exercise.muscleGroup),
        sets: toNumber(exercise.sets, 3),
        reps: toNumber(exercise.reps, 10),
        weight: toNumber(exercise.weight, 0),
        order: index + 1,
        kind: normalizeKind(exercise.kind),
      })),
  }))
}

async function saveProfile(db: D1Database, input: ProfileInput) {
  const now = Date.now()
  const name = normalizeText(input.name, defaultName).slice(0, 40)

  await db
    .prepare("UPDATE users SET name = ?, height_cm = ?, weight_kg = ?, updated_at = ? WHERE id = ?")
    .bind(name, positiveOrNull(input.heightCm), positiveOrNull(input.weightKg), now, defaultUserId)
    .run()

  if (input.goals) {
    await db
      .prepare(
        `INSERT INTO nutrition_goals (user_id, calories, protein, carbs, fat, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET calories = excluded.calories, protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat, updated_at = excluded.updated_at`,
      )
      .bind(
        defaultUserId,
        positiveOr(input.goals.calories, defaultGoals.calories),
        positiveOr(input.goals.protein, defaultGoals.protein),
        positiveOr(input.goals.carbs, defaultGoals.carbs),
        positiveOr(input.goals.fat, defaultGoals.fat),
        now,
      )
      .run()
  }

  if (input.timezone !== undefined) {
    await saveSettings(db, { timezone: input.timezone })
  }
}

async function saveSettings(db: D1Database, input: SettingsInput) {
  if (input.planMode !== undefined) {
    await upsertSetting(db, "plan_mode", JSON.stringify(input.planMode === "rotation" ? "rotation" : "weekly"))
  }
  if (input.rotationSlots !== undefined) {
    const slots = Math.round(toNumber(input.rotationSlots, 3))
    if (slots < 2 || slots > 6) throw new HttpError(400, "循环天数需在 2–6 之间")
    await upsertSetting(db, "rotation_slots", JSON.stringify(slots))
  }
  if (input.waterGoal !== undefined) {
    const goal = Math.round(toNumber(input.waterGoal, 2000))
    if (goal < 500 || goal > 6000) {
      throw new HttpError(400, "饮水目标需在 500–6000 ml 之间")
    }
    await upsertSetting(db, "water_goal", JSON.stringify(goal))
  }

  if (input.timezone === undefined) {
    return
  }

  if (!isValidTimeZone(input.timezone)) {
    throw new HttpError(400, "无效的时区")
  }

  await upsertSetting(db, "timezone", JSON.stringify(input.timezone))
  setActiveTimeZone(input.timezone)
}

async function upsertSetting(db: D1Database, key: string, value: string) {
  await db
    .prepare(
      `INSERT INTO app_settings (key, user_id, value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, defaultUserId, value, Date.now())
    .run()
}

async function createLibraryExercise(db: D1Database, input: ExerciseInput) {
  const name = normalizeText(input.name, "").slice(0, 60)
  const muscle = normalizeText(input.muscleGroup, "").slice(0, 20)

  if (!name || !muscle) {
    throw new HttpError(400, "需要填写动作名称和肌群")
  }

  const id = crypto.randomUUID()

  await db
    .prepare(
      "INSERT INTO exercise_library (id, user_id, name, muscle_group, default_sets, default_reps, default_weight, is_builtin, created_at, kind) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
    )
    .bind(
      id,
      defaultUserId,
      name,
      muscle,
      Math.max(1, Math.round(toNumber(input.defaultSets, 3))),
      Math.max(1, Math.round(toNumber(input.defaultReps, 10))),
      Math.max(0, toNumber(input.defaultWeight, 0)),
      Date.now(),
      normalizeKind(input.kind),
    )
    .run()

  return id
}

async function deleteLibraryExercise(db: D1Database, id: string) {
  const existing = await db.prepare("SELECT is_builtin as isBuiltin FROM exercise_library WHERE id = ?").bind(id).first<{ isBuiltin: number }>()

  if (!existing) {
    throw new HttpError(404, "动作不存在")
  }

  if (existing.isBuiltin) {
    throw new HttpError(400, "内置动作不能删除")
  }

  await db.batch([
    db.prepare("UPDATE workout_exercises SET library_exercise_id = NULL WHERE library_exercise_id = ?").bind(id),
    db.prepare("DELETE FROM exercise_library WHERE id = ? AND is_builtin = 0").bind(id),
  ])
}

async function savePlan(db: D1Database, weekday: number, input: PlanInput) {
  if (!Number.isInteger(weekday) || !((weekday >= 1 && weekday <= 7) || (weekday >= 101 && weekday <= 106))) {
    throw new HttpError(400, "Invalid weekday")
  }

  const now = Date.now()
  const planId = `plan-${defaultUserId}-${weekday}`
  const exercises = (Array.isArray(input.exercises) ? input.exercises : []).slice(0, 40)
  const withIds = exercises.map((exercise) => ({
    ...exercise,
    id: typeof exercise.id === "string" && exercise.id.trim() ? exercise.id.trim() : crypto.randomUUID(),
  }))
  const keepIds = withIds.map((exercise) => exercise.id)

  await db
    .prepare(
      `INSERT INTO workout_plans (id, user_id, weekday, title, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title`,
    )
    .bind(planId, defaultUserId, weekday, normalizeText(input.title, weekday > 100 ? `训练 ${String.fromCharCode(64 + weekday - 100)}` : `周${weekdayLabel(weekday)}训练`).slice(0, 40), now)
    .run()

  // Exercises removed from the plan: keep the ones that have logged sets (archived, so history keeps
  // its names and foreign keys stay valid), delete the rest.
  const notKept = keepIds.length ? `AND id NOT IN (${keepIds.map(() => "?").join(", ")})` : ""
  await db.batch([
    db
      .prepare(
        `UPDATE workout_exercises SET archived_at = ?
         WHERE plan_id = ? AND archived_at IS NULL ${notKept}
         AND id IN (SELECT exercise_id FROM workout_sets)`,
      )
      .bind(now, planId, ...keepIds),
    db
      .prepare(
        `DELETE FROM workout_exercises
         WHERE plan_id = ? ${notKept}
         AND id NOT IN (SELECT exercise_id FROM workout_sets)`,
      )
      .bind(planId, ...keepIds),
  ])

  if (withIds.length === 0) {
    return
  }

  const libraryRows = await allRows(db, "SELECT id, kind FROM exercise_library")
  const libraryIds = new Set(libraryRows.map((row) => String(row.id)))
  const libraryKinds = new Map(libraryRows.map((row) => [String(row.id), String(row.kind)]))

  await db.batch(
    withIds.map((exercise, index) =>
      db
        .prepare(
          `INSERT INTO workout_exercises (id, plan_id, library_exercise_id, name, muscle_group, target_sets, target_reps, target_weight, sort_order, archived_at, kind)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
           ON CONFLICT(id) DO UPDATE SET
            plan_id = excluded.plan_id,
            library_exercise_id = excluded.library_exercise_id,
            name = excluded.name,
            muscle_group = excluded.muscle_group,
            target_sets = excluded.target_sets,
            target_reps = excluded.target_reps,
            target_weight = excluded.target_weight,
            sort_order = excluded.sort_order,
            archived_at = NULL,
            kind = excluded.kind`,
        )
        .bind(
          exercise.id,
          planId,
          exercise.libraryExerciseId && libraryIds.has(exercise.libraryExerciseId) ? exercise.libraryExerciseId : null,
          normalizeText(exercise.name, "动作").slice(0, 60),
          normalizeText(exercise.muscleGroup, "训练").slice(0, 20),
          Math.max(1, Math.round(toNumber(exercise.defaultSets, 3))),
          Math.max(1, Math.round(toNumber(exercise.defaultReps, 10))),
          Math.max(0, toNumber(exercise.defaultWeight, 0)),
          index + 1,
          normalizeKind(exercise.kind ?? (exercise.libraryExerciseId ? libraryKinds.get(exercise.libraryExerciseId) : undefined)),
        ),
    ),
  )
}

async function saveMeal(db: D1Database, input: MealInput) {
  const now = Date.now()
  const createdAt = timestampOnDate(input.date, now)
  const mealId = crypto.randomUUID()
  const items = Array.isArray(input.items) ? input.items.slice(0, 50) : []
  const totals = normalizeMealTotals(input, items)

  await db.batch([
    db
      .prepare(
        "INSERT INTO meals (id, user_id, meal_type, raw_text, calories, protein, carbs, fat, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        mealId,
        defaultUserId,
        normalizeMealType(input.mealType, createdAt),
        normalizeText(input.rawText, "AI JSON").slice(0, 2000),
        totals.calories,
        totals.protein,
        totals.carbs,
        totals.fat,
        createdAt,
      ),
    ...items.map((item) => {
      const normalized = normalizeMealItem(item)
      return db
        .prepare("INSERT INTO meal_items (id, meal_id, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), mealId, normalized.name, normalized.calories, normalized.protein, normalized.carbs, normalized.fat)
    }),
  ])
}

async function updateMeal(db: D1Database, mealId: string, input: MealInput) {
  const existing = await db
    .prepare("SELECT id, meal_type as mealType, raw_text as rawText, calories, protein, carbs, fat, created_at as createdAt FROM meals WHERE id = ? AND user_id = ?")
    .bind(mealId, defaultUserId)
    .first<Record<string, unknown>>()

  if (!existing) {
    throw new HttpError(404, "饮食记录不存在")
  }

  const items = Array.isArray(input.items) ? input.items.slice(0, 50) : []
  const totals = normalizeMealTotals(
    {
      calories: input.calories ?? toNumber(existing.calories),
      protein: input.protein ?? toNumber(existing.protein),
      carbs: input.carbs ?? toNumber(existing.carbs),
      fat: input.fat ?? toNumber(existing.fat),
    },
    items,
  )

  const statements = [
    db
      .prepare("UPDATE meals SET meal_type = ?, raw_text = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ? AND user_id = ?")
      .bind(
        normalizeMealType(input.mealType ?? existing.mealType, toNumber(existing.createdAt)),
        normalizeText(input.rawText ?? existing.rawText, "AI JSON").slice(0, 2000),
        totals.calories,
        totals.protein,
        totals.carbs,
        totals.fat,
        mealId,
        defaultUserId,
      ),
  ]

  if (Array.isArray(input.items)) {
    statements.push(db.prepare("DELETE FROM meal_items WHERE meal_id = ?").bind(mealId))
    for (const item of items) {
      const normalized = normalizeMealItem(item)
      statements.push(
        db
          .prepare("INSERT INTO meal_items (id, meal_id, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), mealId, normalized.name, normalized.calories, normalized.protein, normalized.carbs, normalized.fat),
      )
    }
  }

  await db.batch(statements)
}

async function deleteMeal(db: D1Database, mealId: string) {
  const existing = await db.prepare("SELECT id FROM meals WHERE id = ? AND user_id = ?").bind(mealId, defaultUserId).first()

  if (!existing) {
    throw new HttpError(404, "饮食记录不存在")
  }

  await db.batch([
    db.prepare("DELETE FROM meal_items WHERE meal_id = ?").bind(mealId),
    db.prepare("DELETE FROM meals WHERE id = ? AND user_id = ?").bind(mealId, defaultUserId),
  ])
}

async function validExerciseIds(db: D1Database, sets: WorkoutSetInput[]) {
  const ids = [...new Set(sets.map((set) => String(set.exerciseId)))]

  if (ids.length === 0) {
    return new Set<string>()
  }

  const rows = await allRows(db, `SELECT id FROM workout_exercises WHERE id IN (${ids.map(() => "?").join(", ")})`, ids)
  return new Set(rows.map((row) => String(row.id)))
}

async function saveWorkoutSession(db: D1Database, input: WorkoutSessionInput) {
  const now = Date.now()
  const sessionId = crypto.randomUUID()
  const rawSets = Array.isArray(input.sets) ? input.sets.filter((set) => set.exerciseId).slice(0, 300) : []
  const known = await validExerciseIds(db, rawSets)
  const sets = rawSets.filter((set) => known.has(String(set.exerciseId)))
  const startedAt = timestampOnDate(input.date, toNumber(input.startedAt, now))
  const finishedAt = timestampOnDate(input.date, toNumber(input.finishedAt, now))
  const planId = typeof input.planId === "string" && input.planId ? input.planId : null
  const planExists = planId ? await db.prepare("SELECT id FROM workout_plans WHERE id = ?").bind(planId).first() : null

  await db.batch([
    db
      .prepare("INSERT INTO workout_sessions (id, user_id, plan_id, started_at, finished_at) VALUES (?, ?, ?, ?, ?)")
      .bind(sessionId, defaultUserId, planExists ? planId : null, startedAt, Math.max(finishedAt, startedAt)),
    ...sets.map((set, index) =>
      db
        .prepare(
          "INSERT INTO workout_sets (id, session_id, exercise_id, set_index, actual_reps, actual_weight, completed_at, duration_sec, distance_m, is_warmup, rpe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          crypto.randomUUID(),
          sessionId,
          String(set.exerciseId),
          Math.round(toNumber(set.setIndex, index + 1)),
          Math.max(0, Math.round(toNumber(set.actualReps, 0))),
          Math.max(0, toNumber(set.actualWeight, 0)),
          timestampOnDate(input.date, toNumber(set.completedAt, now)),
          optionalPositive(set.durationSec, true),
          optionalPositive(set.distanceM),
          set.isWarmup ? 1 : 0,
          normalizeRpe(set.rpe),
        ),
    ),
  ])

  return sessionId
}

async function getWorkoutSessionDetail(db: D1Database, sessionId: string) {
  const session = await db
    .prepare(
      `SELECT s.id, s.plan_id as planId, s.started_at as startedAt, s.finished_at as finishedAt,
      COALESCE(p.title, '自由训练') as title, SUM(CASE WHEN ws.id IS NOT NULL AND ws.is_warmup = 0 THEN 1 ELSE 0 END) as sets, COALESCE(SUM(CASE WHEN ws.is_warmup = 0 THEN ws.actual_weight * ws.actual_reps ELSE 0 END), 0) as volume
     FROM workout_sessions s
     LEFT JOIN workout_plans p ON p.id = s.plan_id
     LEFT JOIN workout_sets ws ON ws.session_id = s.id
     WHERE s.user_id = ? AND s.id = ?
     GROUP BY s.id`,
    )
    .bind(defaultUserId, sessionId)
    .first<Record<string, unknown>>()

  if (!session) {
    throw new HttpError(404, "训练记录不存在")
  }

  const setRows = await allRows(
    db,
    `SELECT ws.id, ws.exercise_id as exerciseId, COALESCE(e.name, '已删除动作') as exerciseName, COALESCE(e.kind, 'strength') as kind,
      ws.set_index as setIndex, ws.actual_reps as actualReps, ws.actual_weight as actualWeight, ws.completed_at as completedAt,
      ws.duration_sec as durationSec, ws.distance_m as distanceM, ws.is_warmup as isWarmup, ws.rpe as rpe
     FROM workout_sets ws
     LEFT JOIN workout_exercises e ON e.id = ws.exercise_id
     WHERE ws.session_id = ?
     ORDER BY ws.set_index ASC, ws.completed_at ASC`,
    [sessionId],
  )

  return {
    id: String(session.id),
    planId: session.planId === null || session.planId === undefined ? null : String(session.planId),
    date: formatMonthDay(toNumber(session.startedAt)),
    title: String(session.title),
    volume: formatVolume(toNumber(session.volume)),
    sets: setRows.map((set) => ({
      id: String(set.id),
      exerciseId: String(set.exerciseId),
      exerciseName: String(set.exerciseName),
      setIndex: toNumber(set.setIndex),
      actualReps: toNumber(set.actualReps),
      actualWeight: toNumber(set.actualWeight),
      completedAt: toNumber(set.completedAt),
      kind: normalizeKind(set.kind),
      durationSec: nullableNumber(set.durationSec),
      distanceM: nullableNumber(set.distanceM),
      isWarmup: Boolean(set.isWarmup),
      rpe: nullableNumber(set.rpe),
    })),
    startedAt: toNumber(session.startedAt),
    finishedAt: nullableNumber(session.finishedAt),
  }
}

async function updateWorkoutSession(db: D1Database, sessionId: string, input: WorkoutSessionInput) {
  const session = await db
    .prepare("SELECT id, started_at as startedAt, finished_at as finishedAt FROM workout_sessions WHERE id = ? AND user_id = ?")
    .bind(sessionId, defaultUserId)
    .first<Record<string, unknown>>()

  if (!session) {
    throw new HttpError(404, "训练记录不存在")
  }

  const dateKey = normalizeDateKey(input.date) ?? formatDateKey(toNumber(session.startedAt))
  const startedAt = input.startedAt === undefined ? toNumber(session.startedAt) : timestampOnDate(dateKey, input.startedAt)
  const finishedAt =
    input.finishedAt === null ? null : timestampOnDate(dateKey, input.finishedAt ?? nullableNumber(session.finishedAt) ?? Date.now())
  const rawSets = Array.isArray(input.sets) ? input.sets.filter((set) => set.exerciseId).slice(0, 300) : []
  const known = await validExerciseIds(db, rawSets)
  const sets = rawSets.filter((set) => known.has(String(set.exerciseId)))

  await db.batch([
    db
      .prepare("UPDATE workout_sessions SET started_at = ?, finished_at = ? WHERE id = ? AND user_id = ?")
      .bind(startedAt, finishedAt, sessionId, defaultUserId),
    db.prepare("DELETE FROM workout_sets WHERE session_id = ?").bind(sessionId),
    ...sets.map((set, index) =>
      db
        .prepare(
          "INSERT INTO workout_sets (id, session_id, exercise_id, set_index, actual_reps, actual_weight, completed_at, duration_sec, distance_m, is_warmup, rpe) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          typeof set.id === "string" && set.id.trim() ? set.id.trim() : crypto.randomUUID(),
          sessionId,
          String(set.exerciseId),
          Math.round(toNumber(set.setIndex, index + 1)),
          Math.max(0, Math.round(toNumber(set.actualReps, 0))),
          Math.max(0, toNumber(set.actualWeight, 0)),
          timestampOnDate(dateKey, toNumber(set.completedAt, Date.now())),
          optionalPositive(set.durationSec, true),
          optionalPositive(set.distanceM),
          set.isWarmup ? 1 : 0,
          normalizeRpe(set.rpe),
        ),
    ),
  ])
}

async function deleteWorkoutSession(db: D1Database, sessionId: string) {
  const session = await db.prepare("SELECT id FROM workout_sessions WHERE id = ? AND user_id = ?").bind(sessionId, defaultUserId).first()

  if (!session) {
    throw new HttpError(404, "训练记录不存在")
  }

  await db.batch([
    db.prepare("DELETE FROM workout_sets WHERE session_id = ?").bind(sessionId),
    db.prepare("DELETE FROM workout_sessions WHERE id = ? AND user_id = ?").bind(sessionId, defaultUserId),
  ])
}

async function saveReminders(db: D1Database, input: ReminderSettings) {
  await upsertSetting(db, "reminders", JSON.stringify(normalizeReminders(input)))
}

// ---------------------------------------------------------------------------
// Backup: export / import
// ---------------------------------------------------------------------------

// Insert order respects foreign keys; delete order is the reverse.
const backupTables: Array<{ key: string; table: string; columns: string[]; required: string[] }> = [
  { key: "users", table: "users", columns: ["id", "name", "height_cm", "weight_kg", "created_at", "updated_at"], required: ["id", "name"] },
  {
    key: "nutritionGoals",
    table: "nutrition_goals",
    columns: ["user_id", "calories", "protein", "carbs", "fat", "updated_at"],
    required: ["user_id"],
  },
  { key: "appSettings", table: "app_settings", columns: ["key", "user_id", "value", "updated_at"], required: ["key", "user_id", "value"] },
  {
    key: "exerciseLibrary",
    table: "exercise_library",
    columns: ["id", "user_id", "name", "muscle_group", "default_sets", "default_reps", "default_weight", "is_builtin", "created_at", "kind"],
    required: ["id", "name", "muscle_group"],
  },
  { key: "workoutPlans", table: "workout_plans", columns: ["id", "user_id", "weekday", "title", "created_at"], required: ["id", "weekday"] },
  {
    key: "workoutExercises",
    table: "workout_exercises",
    columns: ["id", "plan_id", "library_exercise_id", "name", "muscle_group", "target_sets", "target_reps", "target_weight", "sort_order", "archived_at", "kind"],
    required: ["id", "plan_id", "name"],
  },
  { key: "workoutSessions", table: "workout_sessions", columns: ["id", "user_id", "plan_id", "started_at", "finished_at"], required: ["id", "started_at"] },
  {
    key: "workoutSets",
    table: "workout_sets",
    columns: ["id", "session_id", "exercise_id", "set_index", "actual_reps", "actual_weight", "completed_at", "duration_sec", "distance_m", "is_warmup", "rpe"],
    required: ["id", "session_id", "exercise_id"],
  },
  {
    key: "meals",
    table: "meals",
    columns: ["id", "user_id", "meal_type", "raw_text", "calories", "protein", "carbs", "fat", "created_at"],
    required: ["id", "created_at"],
  },
  { key: "mealItems", table: "meal_items", columns: ["id", "meal_id", "name", "calories", "protein", "carbs", "fat"], required: ["id", "meal_id"] },
  { key: "bodyWeights", table: "body_weights", columns: ["id", "user_id", "date_key", "weight", "created_at"], required: ["id", "date_key", "weight"] },
  { key: "waterLogs", table: "water_logs", columns: ["id", "user_id", "date_key", "ml", "updated_at"], required: ["id", "date_key"] },
]

const columnDefaults: Record<string, unknown> = {
  name: "",
  height_cm: null,
  weight_kg: null,
  created_at: 0,
  updated_at: 0,
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  user_id: defaultUserId,
  muscle_group: "训练",
  default_sets: 3,
  default_reps: 10,
  default_weight: 0,
  is_builtin: 0,
  title: "训练",
  library_exercise_id: null,
  target_sets: 3,
  target_reps: 10,
  target_weight: 0,
  sort_order: 0,
  archived_at: null,
  kind: "strength",
  duration_sec: null,
  is_warmup: 0,
  rpe: null,
  distance_m: null,
  ml: 0,
  plan_id: null,
  finished_at: null,
  set_index: 0,
  actual_reps: 0,
  actual_weight: 0,
  completed_at: 0,
  meal_type: "lunch",
  raw_text: "导入",
}

async function exportData(db: D1Database) {
  const rows = await Promise.all(backupTables.map((spec) => allRows(db, `SELECT * FROM ${spec.table}`)))
  // Never put the model API key into a backup file.
  const settingsIndex = backupTables.findIndex((spec) => spec.table === "app_settings")
  rows[settingsIndex] = rows[settingsIndex].map((row) => {
    if (row.key !== "ai") return row
    const value = parseJson<Record<string, unknown>>(row.value) ?? {}
    return { ...row, value: JSON.stringify({ ...value, apiKey: "" }) }
  })

  return {
    app: "fitnote",
    exportedAt: new Date().toISOString(),
    version: 2,
    schema: SCHEMA_VERSION,
    timezone: getActiveTimeZone(),
    data: Object.fromEntries(backupTables.map((spec, index) => [spec.key, rows[index]])),
  }
}

async function importData(db: D1Database, input: ImportInput) {
  const data = input?.data

  if (!data || typeof data !== "object") {
    throw new HttpError(400, "不是 FitNote 备份文件")
  }

  const prepared = backupTables.map((spec) => {
    const raw = (data as Record<string, unknown>)[spec.key]
    const rows = Array.isArray(raw) ? raw : []

    for (const row of rows) {
      if (!row || typeof row !== "object") {
        throw new HttpError(400, `备份中 ${spec.key} 数据格式错误`)
      }

      for (const column of spec.required) {
        const value = (row as Record<string, unknown>)[column]
        if (value === undefined || value === null || value === "") {
          throw new HttpError(400, `备份中 ${spec.key} 缺少 ${column}`)
        }
      }
    }

    return { spec, rows: rows as Array<Record<string, unknown>> }
  })

  if (!prepared.some((item) => item.rows.length > 0)) {
    throw new HttpError(400, "备份文件里没有数据")
  }

  await clearUserData(db)

  const statements: D1PreparedStatement[] = []

  for (const { spec, rows } of prepared) {
    const sql = `INSERT OR REPLACE INTO ${spec.table} (${spec.columns.join(", ")}) VALUES (${spec.columns.map(() => "?").join(", ")})`

    for (const row of rows) {
      statements.push(
        db.prepare(sql).bind(
          ...spec.columns.map((column) => {
            const value = row[column] === undefined ? (columnDefaults[column] ?? null) : row[column]
            return typeof value === "boolean" ? Number(value) : (value as string | number | null)
          }),
        ),
      )
    }
  }

  for (let index = 0; index < statements.length; index += 80) {
    await db.batch([db.prepare("PRAGMA defer_foreign_keys = on"), ...statements.slice(index, index + 80)])
  }

  // Re-apply the current built-in catalog on top of whatever the backup had.
  await syncBuiltinExercises(db)

  return Object.fromEntries(prepared.map(({ spec, rows }) => [spec.key, rows.length]))
}

async function clearUserData(db: D1Database) {
  await db.batch([
    db.prepare("DELETE FROM body_weights"),
    db.prepare("DELETE FROM water_logs"),
    db.prepare("DELETE FROM meal_items"),
    db.prepare("DELETE FROM meals"),
    db.prepare("DELETE FROM workout_sets"),
    db.prepare("DELETE FROM workout_sessions"),
    db.prepare("DELETE FROM workout_exercises"),
    db.prepare("DELETE FROM workout_plans"),
    db.prepare("DELETE FROM exercise_library WHERE is_builtin = 0"),
    db.prepare("DELETE FROM app_settings"),
    db.prepare("DELETE FROM nutrition_goals"),
    db.prepare("DELETE FROM users"),
  ])
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

async function getRecentMeals(db: D1Database) {
  const meals = await allRows(
    db,
    "SELECT id, meal_type as mealType, raw_text as rawText, calories, protein, carbs, fat, created_at as createdAt FROM meals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
    [defaultUserId],
  )

  return mapMealRows(meals, await getMealItemsByMealId(db, meals))
}

async function getMealsForRange(db: D1Database, start: number, end: number) {
  const meals = await allRows(
    db,
    "SELECT id, meal_type as mealType, raw_text as rawText, calories, protein, carbs, fat, created_at as createdAt FROM meals WHERE user_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at ASC",
    [defaultUserId, start, end],
  )

  return mapMealRows(meals, await getMealItemsByMealId(db, meals))
}

type MealItemRow = { name: string; calories: number; protein: number; carbs: number; fat: number }

async function getMealItemsByMealId(db: D1Database, meals: Array<Record<string, unknown>>) {
  const mealIds = meals.map((meal) => String(meal.id)).filter(Boolean)
  const itemMap = new Map<string, MealItemRow[]>()

  if (mealIds.length === 0) {
    return itemMap
  }

  const rows = await allRows(
    db,
    `SELECT meal_id as mealId, name, calories, protein, carbs, fat
     FROM meal_items
     WHERE meal_id IN (${mealIds.map(() => "?").join(", ")})`,
    mealIds,
  )

  for (const row of rows) {
    const mealId = String(row.mealId)
    const items = itemMap.get(mealId) ?? []
    items.push({
      name: String(row.name),
      calories: toNumber(row.calories),
      protein: toNumber(row.protein),
      carbs: toNumber(row.carbs),
      fat: toNumber(row.fat),
    })
    itemMap.set(mealId, items)
  }

  return itemMap
}

const mealOrder: Record<string, number> = {
  breakfast: 1,
  breakfastSnack: 2,
  lunch: 3,
  lunchSnack: 4,
  dinner: 5,
  dinnerSnack: 6,
}

function mapMealRows(meals: Array<Record<string, unknown>>, itemsByMealId: Map<string, MealItemRow[]>) {
  return meals
    .map((meal) => ({
      id: String(meal.id),
      mealType: normalizeMealType(meal.mealType, toNumber(meal.createdAt)),
      title: mealTypeLabel(normalizeMealType(meal.mealType, toNumber(meal.createdAt))),
      note: String(meal.rawText),
      calories: toNumber(meal.calories),
      protein: toNumber(meal.protein),
      carbs: toNumber(meal.carbs),
      fat: toNumber(meal.fat),
      createdAt: toNumber(meal.createdAt),
      items: itemsByMealId.get(String(meal.id)) ?? [],
    }))
    .sort((a, b) => (mealOrder[a.mealType] ?? 9) - (mealOrder[b.mealType] ?? 9) || a.createdAt - b.createdAt)
}

async function getWorkoutHistory(db: D1Database, start?: number, end?: number) {
  const ranged = start !== undefined && end !== undefined
  const params: Array<string | number | null> = [defaultUserId]

  if (ranged) {
    params.push(start, end)
  }

  const rows = await allRows(
    db,
    `SELECT s.id, s.started_at as startedAt, s.finished_at as finishedAt, COALESCE(p.title, '自由训练') as title,
      SUM(CASE WHEN ws.id IS NOT NULL AND ws.is_warmup = 0 THEN 1 ELSE 0 END) as sets, COALESCE(SUM(CASE WHEN ws.is_warmup = 0 THEN ws.actual_weight * ws.actual_reps ELSE 0 END), 0) as volume
     FROM workout_sessions s
     LEFT JOIN workout_plans p ON p.id = s.plan_id
     LEFT JOIN workout_sets ws ON ws.session_id = s.id
     WHERE s.user_id = ?
     ${ranged ? "AND s.started_at >= ? AND s.started_at < ?" : ""}
     GROUP BY s.id
     ORDER BY s.started_at DESC
     LIMIT ${ranged ? 50 : 60}`,
    params,
  )

  return rows.map((row) => ({
    id: String(row.id),
    date: formatMonthDay(toNumber(row.startedAt)),
    dateKey: formatDateKey(toNumber(row.startedAt)),
    title: String(row.title),
    volume: formatVolume(toNumber(row.volume)),
    sets: toNumber(row.sets),
    startedAt: toNumber(row.startedAt),
    finishedAt: nullableNumber(row.finishedAt),
  }))
}

async function getStats(db: D1Database, todayKey: string) {
  const dayKeys = Array.from({ length: 7 }, (_, index) => addDaysToKey(todayKey, index - 6))
  const weekStart = startOfDateKey(dayKeys[0])
  const [mealRows, sessionRows, setRows] = await Promise.all([
    allRows(db, "SELECT calories, protein, carbs, fat, created_at as createdAt FROM meals WHERE user_id = ? AND created_at >= ?", [
      defaultUserId,
      weekStart,
    ]),
    allRows(
      db,
      "SELECT id, started_at as startedAt FROM workout_sessions WHERE user_id = ? AND started_at >= ? ORDER BY started_at ASC",
      [defaultUserId, weekStart],
    ),
    allRows(
      db,
      `SELECT e.name as name, COALESCE('lib:' || e.library_exercise_id, 'name:' || e.name) as key,
         MAX(ws.actual_weight) as weight, MAX(s.started_at) as completedAt
       FROM workout_sets ws
       JOIN workout_sessions s ON s.id = ws.session_id
       JOIN workout_exercises e ON e.id = ws.exercise_id
       WHERE s.user_id = ? AND COALESCE(e.kind, 'strength') = 'strength' AND ws.is_warmup = 0
       GROUP BY s.id, key
       ORDER BY completedAt ASC`,
      [defaultUserId],
    ),
  ])

  const foodTrend = dayKeys.map((key) => {
    const start = startOfDateKey(key)
    const end = startOfDateKey(addDaysToKey(key, 1))
    const total = sumMacros(mealRows.filter((row) => toNumber(row.createdAt) >= start && toNumber(row.createdAt) < end))

    return {
      day: weekdayLabel(getWeekday(start)),
      date: key,
      calories: total.calories,
      protein: total.protein,
      carbs: total.carbs,
      fat: total.fat,
    }
  })

  const exerciseMap = new Map<string, { name: string; rows: Array<{ weight: number; completedAt: number }> }>()
  for (const row of setRows) {
    const key = String(row.key)
    const entry = exerciseMap.get(key) ?? { name: String(row.name), rows: [] }
    entry.rows.push({ weight: toNumber(row.weight), completedAt: toNumber(row.completedAt) })
    entry.name = String(row.name)
    exerciseMap.set(key, entry)
  }

  const exerciseTrends = Array.from(exerciseMap.entries())
    .map(([key, { name, rows }]) => {
      const first = rows[0]?.weight ?? 0
      const current = rows[rows.length - 1]?.weight ?? 0
      const best = Math.max(...rows.map((row) => row.weight), 0)
      const lastAt = rows[rows.length - 1]?.completedAt ?? 0

      return { key, name, current, best, change: Math.round((current - first) * 10) / 10, lastAt, points: rows.slice(-8) }
    })
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, 12)

  return {
    foodTrend,
    trainingCount7d: sessionRows.length,
    trainingDays: sessionRows.map((row, index) => ({
      id: String(row.id),
      date: formatMonthDay(toNumber(row.startedAt)),
      dateKey: formatDateKey(toNumber(row.startedAt)),
      order: index + 1,
    })),
    exerciseTrends,
  }
}

async function allRows(db: D1Database, sql: string, params: Array<string | number | null> = []) {
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>()
  return result.results ?? []
}

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function normalizeMealTotals(input: MacroInput, items: MacroInput[]) {
  const itemTotals = items.map(normalizeMealItem).reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return {
    calories: Math.max(0, toNumber(input.calories, itemTotals.calories)),
    protein: Math.max(0, toNumber(input.protein, itemTotals.protein)),
    carbs: Math.max(0, toNumber(input.carbs, itemTotals.carbs)),
    fat: Math.max(0, toNumber(input.fat, itemTotals.fat)),
  }
}

function normalizeMealItem(input: MacroInput & { name?: string }) {
  return {
    name: normalizeText(input?.name, "食物").slice(0, 60),
    calories: Math.max(0, toNumber(input?.calories)),
    protein: Math.max(0, toNumber(input?.protein)),
    carbs: Math.max(0, toNumber(input?.carbs)),
    fat: Math.max(0, toNumber(input?.fat)),
  }
}

function sumMacros(rows: Array<Record<string, unknown>>) {
  const total = rows.reduce<{ calories: number; protein: number; carbs: number; fat: number }>(
    (acc, row) => ({
      calories: acc.calories + toNumber(row.calories),
      protein: acc.protein + toNumber(row.protein),
      carbs: acc.carbs + toNumber(row.carbs),
      fat: acc.fat + toNumber(row.fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return {
    calories: round1(total.calories),
    protein: round1(total.protein),
    carbs: round1(total.carbs),
    fat: round1(total.fat),
  }
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

/** Parses a number, keeping up to 2 decimals (so 1.25 kg plates survive). */
function toNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback
  }

  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : fallback
}

function normalizeRpe(value: unknown) {
  const number = nullableNumber(value)
  return number !== null && number >= 1 && number <= 10 ? Math.round(number * 2) / 2 : null
}

function optionalPositive(value: unknown, integer = false) {
  const number = nullableNumber(value)
  if (number === null || number <= 0) return null
  return integer ? Math.round(number) : number
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  return toNumber(value)
}

function positiveOrNull(value: unknown) {
  const number = nullableNumber(value)
  return number !== null && number > 0 ? number : null
}

function positiveOr(value: unknown, fallback: number) {
  const number = toNumber(value, fallback)
  return number > 0 ? number : fallback
}

function normalizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function parseJson<T>(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function formatVolume(volume: number) {
  return `${Math.round(volume).toLocaleString("en-US")} kg`
}

function normalizeReminders(value: ReminderSettings) {
  return {
    workout: {
      enabled: Boolean(value?.workout?.enabled),
      time: normalizeTime(value?.workout?.time, defaultReminders.workout.time),
    },
    meal: {
      enabled: Boolean(value?.meal?.enabled),
      time: normalizeTime(value?.meal?.time, defaultReminders.meal.time),
    },
    weekly: {
      enabled: Boolean(value?.weekly?.enabled),
      day: Math.max(1, Math.min(7, Math.round(toNumber(value?.weekly?.day, defaultReminders.weekly.day)))),
      time: normalizeTime(value?.weekly?.time, defaultReminders.weekly.time),
    },
  }
}

function normalizeTime(value: unknown, fallback: string) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback
}

function weekdayLabel(weekday: number) {
  return ["一", "二", "三", "四", "五", "六", "日"][Math.max(0, Math.min(6, weekday - 1))]
}

const mealTypes = ["breakfast", "lunch", "dinner", "breakfastSnack", "lunchSnack", "dinnerSnack"]

/** Unknown meal types fall back to the meal matching the time of day. */
function normalizeMealType(value: unknown, timestamp: number) {
  if (typeof value === "string" && mealTypes.includes(value)) {
    return value
  }

  const hour = hourOf(timestamp || Date.now())
  if (hour < 10) return "breakfast"
  if (hour < 16) return "lunch"
  return "dinner"
}

function mealTypeLabel(type: string) {
  const labels: Record<string, string> = {
    breakfast: "早餐",
    lunch: "午餐",
    dinner: "晚餐",
    breakfastSnack: "早加餐",
    lunchSnack: "午加餐",
    dinnerSnack: "晚加餐",
  }

  return labels[type] ?? "饮食"
}
