export interface Env {
  ASSETS: Fetcher
  DB?: D1Database
  AI_API_KEY?: string
}

const defaultUserId = "default"
const tzOffsetMs = 8 * 60 * 60 * 1000

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
}

const defaultReminders = {
  workout: { enabled: true, time: "19:00" },
  meal: { enabled: true, time: "12:30" },
  weekly: { enabled: false, day: 7, time: "20:30" },
}

const builtinExercises = [
  ["barbell-bench-press", "杠铃卧推", "胸", 4, 8, 60],
  ["incline-barbell-bench-press", "上斜杠铃卧推", "胸", 4, 8, 50],
  ["decline-barbell-bench-press", "下斜杠铃卧推", "胸", 3, 10, 50],
  ["dumbbell-bench-press", "哑铃卧推", "胸", 4, 10, 24],
  ["incline-dumbbell-press", "上斜哑铃卧推", "胸", 4, 10, 22],
  ["machine-chest-press", "坐姿推胸器", "胸", 4, 10, 45],
  ["smith-machine-bench-press", "史密斯卧推", "胸", 4, 8, 55],
  ["pec-deck-fly", "蝴蝶机夹胸", "胸", 3, 12, 35],
  ["cable-fly-high", "高位绳索夹胸", "胸", 3, 12, 15],
  ["cable-fly-low", "低位绳索夹胸", "胸", 3, 12, 12.5],
  ["dumbbell-fly", "哑铃飞鸟", "胸", 3, 12, 12],
  ["assisted-dip-machine", "辅助双杠臂屈伸", "胸", 3, 10, 35],
  ["lat-pulldown", "高位下拉", "背", 4, 10, 45],
  ["close-grip-lat-pulldown", "窄握高位下拉", "背", 4, 10, 42.5],
  ["straight-arm-pulldown", "直臂下压", "背", 3, 12, 25],
  ["seated-cable-row", "坐姿绳索划船", "背", 4, 10, 50],
  ["chest-supported-row", "俯身支撑划船器", "背", 4, 10, 40],
  ["t-bar-row", "T 杠划船", "背", 4, 8, 45],
  ["machine-row", "坐姿划船器", "背", 4, 10, 45],
  ["barbell-row", "杠铃划船", "背", 4, 8, 50],
  ["one-arm-dumbbell-row", "单臂哑铃划船", "背", 3, 10, 28],
  ["smith-machine-row", "史密斯划船", "背", 4, 10, 50],
  ["barbell-deadlift", "杠铃硬拉", "背", 3, 5, 100],
  ["rack-pull", "架上硬拉", "背", 3, 6, 120],
  ["assisted-pull-up-machine", "辅助引体向上", "背", 4, 8, 40],
  ["barbell-overhead-press", "杠铃推举", "肩", 4, 6, 40],
  ["dumbbell-shoulder-press", "哑铃肩推", "肩", 4, 10, 20],
  ["machine-shoulder-press", "肩推器", "肩", 4, 10, 35],
  ["smith-machine-shoulder-press", "史密斯肩推", "肩", 4, 8, 35],
  ["dumbbell-lateral-raise", "哑铃侧平举", "肩", 4, 15, 8],
  ["cable-lateral-raise", "绳索侧平举", "肩", 3, 12, 7.5],
  ["machine-lateral-raise", "侧平举器", "肩", 3, 12, 25],
  ["reverse-pec-deck", "反向蝴蝶机", "肩", 4, 15, 30],
  ["cable-face-pull", "绳索面拉", "肩", 3, 15, 22.5],
  ["dumbbell-rear-delt-fly", "哑铃俯身飞鸟", "肩", 3, 15, 8],
  ["barbell-squat", "杠铃深蹲", "腿", 4, 6, 80],
  ["front-squat", "杠铃前蹲", "腿", 4, 6, 60],
  ["smith-machine-squat", "史密斯深蹲", "腿", 4, 8, 70],
  ["hack-squat", "哈克深蹲", "腿", 4, 10, 80],
  ["leg-press", "腿举", "腿", 4, 10, 120],
  ["pendulum-squat", "钟摆深蹲器", "腿", 4, 10, 60],
  ["belt-squat", "腰带深蹲器", "腿", 4, 10, 60],
  ["dumbbell-lunge", "哑铃弓步蹲", "腿", 3, 12, 20],
  ["barbell-lunge", "杠铃弓步蹲", "腿", 3, 10, 40],
  ["bulgarian-split-squat", "哑铃保加利亚分腿蹲", "腿", 3, 10, 18],
  ["leg-extension", "腿屈伸", "腿", 3, 12, 45],
  ["seated-leg-curl", "坐姿腿弯举", "腿", 3, 12, 35],
  ["lying-leg-curl", "俯卧腿弯举", "腿", 3, 12, 35],
  ["romanian-deadlift", "罗马尼亚硬拉", "腿", 4, 8, 70],
  ["barbell-hip-thrust", "杠铃臀推", "臀", 4, 10, 80],
  ["hip-thrust-machine", "臀推器", "臀", 4, 10, 70],
  ["cable-kickback", "绳索后踢腿", "臀", 3, 12, 10],
  ["hip-abduction-machine", "髋外展器", "臀", 3, 15, 45],
  ["hip-adduction-machine", "髋内收器", "腿", 3, 15, 45],
  ["standing-calf-raise-machine", "站姿提踵器", "小腿", 4, 15, 50],
  ["seated-calf-raise-machine", "坐姿提踵器", "小腿", 4, 15, 35],
  ["barbell-curl", "杠铃弯举", "二头", 3, 10, 25],
  ["ez-bar-curl", "EZ 杠弯举", "二头", 3, 10, 22.5],
  ["dumbbell-curl", "哑铃弯举", "二头", 3, 12, 12],
  ["incline-dumbbell-curl", "上斜哑铃弯举", "二头", 3, 12, 10],
  ["hammer-curl", "锤式弯举", "二头", 3, 12, 12],
  ["preacher-curl-machine", "牧师凳弯举器", "二头", 3, 12, 25],
  ["cable-curl", "绳索弯举", "二头", 3, 12, 20],
  ["triceps-pushdown", "绳索下压", "三头", 3, 12, 25],
  ["rope-pushdown", "绳索下压绳", "三头", 3, 12, 22.5],
  ["overhead-cable-extension", "过顶绳索臂屈伸", "三头", 3, 12, 17.5],
  ["ez-bar-skull-crusher", "EZ 杠仰卧臂屈伸", "三头", 3, 10, 25],
  ["machine-triceps-extension", "三头臂屈伸器", "三头", 3, 12, 30],
  ["smith-close-grip-bench", "史密斯窄握卧推", "三头", 3, 8, 45],
  ["cable-crunch", "绳索卷腹", "核心", 3, 15, 30],
  ["machine-crunch", "卷腹器", "核心", 3, 15, 35],
  ["captains-chair-leg-raise", "罗马椅举腿", "核心", 3, 12, 0],
  ["ab-wheel", "健腹轮", "核心", 3, 10, 0],
  ["cable-woodchop", "绳索伐木", "核心", 3, 12, 15],
  ["landmine-press", "地雷管推举", "肩", 3, 10, 25],
  ["landmine-row", "地雷管划船", "背", 3, 10, 35],
  ["landmine-squat", "地雷管深蹲", "腿", 3, 10, 30],
  ["kettlebell-goblet-squat", "壶铃杯式深蹲", "腿", 3, 12, 24],
  ["kettlebell-swing", "壶铃摆动", "臀", 3, 15, 20],
] as const

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    try {
      if (url.pathname === "/api/health") {
        return json({ ok: true, service: "fitnote", db: Boolean(env.DB) })
      }

      if (url.pathname === "/api/bootstrap" && request.method === "GET") {
        const db = getDB(env)
        await ensureDefaults(db)
        return json(await getBootstrap(db))
      }

      if (url.pathname === "/api/day" && request.method === "GET") {
        const db = getDB(env)
        await ensureDefaults(db)
        return json(await getDayData(db, url.searchParams.get("date")))
      }

      if (url.pathname === "/api/profile" && request.method === "PUT") {
        const db = getDB(env)
        await ensureDefaults(db)
        const body = await readBody<ProfileInput>(request)
        await saveProfile(db, body)
        return json(await getBootstrap(db))
      }

      if (url.pathname === "/api/exercises" && request.method === "POST") {
        const db = getDB(env)
        await ensureDefaults(db)
        const body = await readBody<ExerciseInput>(request)
        await createLibraryExercise(db, body)
        return json(await getBootstrap(db))
      }

      if (url.pathname.startsWith("/api/plans/") && request.method === "PUT") {
        const db = getDB(env)
        await ensureDefaults(db)
        const weekday = Number(url.pathname.replace("/api/plans/", ""))
        const body = await readBody<PlanInput>(request)
        await savePlan(db, weekday, body)
        return json(await getBootstrap(db))
      }

      if (url.pathname === "/api/meals" && request.method === "POST") {
        const db = getDB(env)
        await ensureDefaults(db)
        const body = await readBody<MealInput>(request)
        await saveMeal(db, body)
        return json(await getBootstrap(db))
      }

      if (url.pathname.startsWith("/api/meals/") && request.method === "PUT") {
        const db = getDB(env)
        await ensureDefaults(db)
        const mealId = decodeURIComponent(url.pathname.replace("/api/meals/", ""))
        const body = await readBody<MealInput>(request)
        await updateMeal(db, mealId, body)
        return json(await getBootstrap(db))
      }

      if (url.pathname.startsWith("/api/meals/") && request.method === "DELETE") {
        const db = getDB(env)
        await ensureDefaults(db)
        const mealId = decodeURIComponent(url.pathname.replace("/api/meals/", ""))
        await deleteMeal(db, mealId)
        return json(await getBootstrap(db))
      }

      if (url.pathname === "/api/workout-sessions" && request.method === "POST") {
        const db = getDB(env)
        await ensureDefaults(db)
        const body = await readBody<WorkoutSessionInput>(request)
        await saveWorkoutSession(db, body)
        return json(await getBootstrap(db))
      }

      if (url.pathname.startsWith("/api/workout-sessions/") && request.method === "GET") {
        const db = getDB(env)
        await ensureDefaults(db)
        const sessionId = decodeURIComponent(url.pathname.replace("/api/workout-sessions/", ""))
        return json(await getWorkoutSessionDetail(db, sessionId))
      }

      if (url.pathname.startsWith("/api/workout-sessions/") && request.method === "PUT") {
        const db = getDB(env)
        await ensureDefaults(db)
        const sessionId = decodeURIComponent(url.pathname.replace("/api/workout-sessions/", ""))
        const body = await readBody<WorkoutSessionInput>(request)
        await updateWorkoutSession(db, sessionId, body)
        return json(await getBootstrap(db))
      }

      if (url.pathname.startsWith("/api/workout-sessions/") && request.method === "DELETE") {
        const db = getDB(env)
        await ensureDefaults(db)
        const sessionId = decodeURIComponent(url.pathname.replace("/api/workout-sessions/", ""))
        await deleteWorkoutSession(db, sessionId)
        return json(await getBootstrap(db))
      }

      if (url.pathname === "/api/reminders" && request.method === "PUT") {
        const db = getDB(env)
        await ensureDefaults(db)
        const body = await readBody<ReminderSettings>(request)
        await saveReminders(db, body)
        return json(await getBootstrap(db))
      }

      if (url.pathname === "/api/export" && request.method === "GET") {
        const db = getDB(env)
        await ensureDefaults(db)
        return json(await exportData(db))
      }

      if (url.pathname === "/api/data" && request.method === "DELETE") {
        const db = getDB(env)
        await clearUserData(db)
        await ensureDefaults(db)
        return json(await getBootstrap(db))
      }

      if (url.pathname.startsWith("/api/")) {
        return json({ error: "Not found" }, 404)
      }

      return env.ASSETS.fetch(request)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return json({ error: message }, 500)
    }
  },
} satisfies ExportedHandler<Env>

type ProfileInput = {
  name?: string
  heightCm?: number | string | null
  weightKg?: number | string | null
  goals?: MacroInput
}

type MacroInput = {
  calories?: number | string
  protein?: number | string
  carbs?: number | string
  fat?: number | string
}

type ExerciseInput = {
  name?: string
  muscleGroup?: string
  defaultSets?: number | string
  defaultReps?: number | string
  defaultWeight?: number | string
}

type PlanInput = {
  title?: string
  exercises?: Array<ExerciseInput & { id?: string; libraryExerciseId?: string; sortOrder?: number }>
}

type MealInput = MacroInput & {
  date?: string
  mealType?: string
  rawText?: string
  items?: Array<MacroInput & { name?: string }>
}

type WorkoutSessionInput = {
  date?: string
  planId?: string
  startedAt?: number
  finishedAt?: number | null
  sets?: WorkoutSetInput[]
}

type WorkoutSetInput = {
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

function getDB(env: Env) {
  if (!env.DB) {
    throw new Error("D1 binding DB is not configured")
  }

  return env.DB
}

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: jsonHeaders })
}

async function readBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new Error("Invalid JSON body")
  }
}

async function ensureRuntimeSchema(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS d1_migrations(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`,
    )
    .run()

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS app_settings (
        key text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        value text NOT NULL,
        updated_at integer NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
      )`,
    )
    .run()

  const mealColumns = await allRows(db, "PRAGMA table_info(meals)")

  if (!mealColumns.some((column) => column.name === "meal_type")) {
    await db.prepare("ALTER TABLE meals ADD meal_type text DEFAULT 'meal' NOT NULL").run()
  }

  await db.prepare("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)").bind("0002_rapid_roulette.sql").run()
  await db.prepare("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)").bind("0003_bitter_energizer.sql").run()
}

async function ensureDefaults(db: D1Database) {
  const now = Date.now()

  await ensureRuntimeSchema(db)

  await db.prepare("UPDATE meals SET meal_type = 'lunch' WHERE meal_type IS NULL OR meal_type = '' OR meal_type = 'meal'").run()

  await db
    .prepare(
      "UPDATE meal_items SET calories = ROUND(calories, 1), protein = ROUND(protein, 1), carbs = ROUND(carbs, 1), fat = ROUND(fat, 1)",
    )
    .run()

  await db
    .prepare("UPDATE meals SET calories = ROUND(calories, 1), protein = ROUND(protein, 1), carbs = ROUND(carbs, 1), fat = ROUND(fat, 1)")
    .run()

  await db
    .prepare(
      "INSERT OR IGNORE INTO users (id, name, height_cm, weight_kg, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(defaultUserId, "Sean", null, null, now, now)
    .run()

  await db
    .prepare(
      "INSERT OR IGNORE INTO nutrition_goals (user_id, calories, protein, carbs, fat, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(defaultUserId, 2200, 150, 240, 70, now)
    .run()

  await db
    .prepare("INSERT OR IGNORE INTO app_settings (key, user_id, value, updated_at) VALUES (?, ?, ?, ?)")
    .bind("reminders", defaultUserId, JSON.stringify(defaultReminders), now)
    .run()

  await db.batch(
    builtinExercises.map(([id, name, muscle, sets, reps, weight]) =>
      db
        .prepare(
          `INSERT INTO exercise_library (id, user_id, name, muscle_group, default_sets, default_reps, default_weight, is_builtin, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, muscle_group = excluded.muscle_group, default_sets = excluded.default_sets, default_reps = excluded.default_reps, default_weight = excluded.default_weight, is_builtin = 1`,
        )
        .bind(id, null, name, muscle, sets, reps, weight, 1, now),
    ),
  )

  await pruneObsoleteBuiltinExercises(db)
}

async function getBootstrap(db: D1Database) {
  const now = Date.now()
  const todayStart = startOfDay(now)
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000
  const weekday = getChinaWeekday(now)

  const profile = await db
    .prepare(
      `SELECT u.id, u.name, u.height_cm as heightCm, u.weight_kg as weightKg,
        g.calories, g.protein, g.carbs, g.fat
       FROM users u
       LEFT JOIN nutrition_goals g ON g.user_id = u.id
       WHERE u.id = ?`,
    )
    .bind(defaultUserId)
    .first<Record<string, number | string | null>>()

  const exerciseRows = await allRows(db, "SELECT id, user_id as userId, name, muscle_group as muscleGroup, default_sets as defaultSets, default_reps as defaultReps, default_weight as defaultWeight, is_builtin as isBuiltin FROM exercise_library ORDER BY is_builtin DESC, name ASC")

  const plans = await getPlans(db)
  const todayPlan = plans.find((plan) => plan.weekday === weekday) ?? null
  const todayMeals = await getMealsForRange(db, todayStart, tomorrowStart)
  const todayMacro = sumMacros(todayMeals)
  const recentMeals = await getRecentMeals(db)
  const workoutHistory = await getWorkoutHistory(db)
  const stats = await getStats(db, weekStart, todayStart)
  const settings = await getSettings(db)

  return {
    profile: {
      id: defaultUserId,
      name: String(profile?.name ?? "Sean"),
      heightCm: nullableNumber(profile?.heightCm),
      weightKg: nullableNumber(profile?.weightKg),
      goals: {
        calories: toNumber(profile?.calories, 2200),
        protein: toNumber(profile?.protein, 150),
        carbs: toNumber(profile?.carbs, 240),
        fat: toNumber(profile?.fat, 70),
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
    })),
    plans,
    todayPlan,
    todayMacro,
    todayMeals,
    recentMeals,
    workoutHistory,
    stats,
    settings,
  }
}

async function getDayData(db: D1Database, dateInput: string | null) {
  const plans = await getPlans(db)
  const date = normalizeDateKey(dateInput) ?? formatDateKey(Date.now())
  const dayStart = startOfDateKey(date)
  const dayEnd = dayStart + 24 * 60 * 60 * 1000
  const weekday = getChinaWeekday(dayStart)
  const meals = await getMealsForRange(db, dayStart, dayEnd)
  const workoutSessions = await getWorkoutHistory(db, dayStart, dayEnd)

  return {
    date,
    plan: plans.find((plan) => plan.weekday === weekday) ?? null,
    macro: sumMacros(meals),
    meals,
    workoutSessions,
  }
}

async function getSettings(db: D1Database) {
  const reminderRow = await db
    .prepare("SELECT value FROM app_settings WHERE key = ? AND user_id = ?")
    .bind("reminders", defaultUserId)
    .first<{ value: string }>()

  return {
    reminders: normalizeReminders(parseJson<ReminderSettings>(reminderRow?.value) ?? defaultReminders),
  }
}

async function pruneObsoleteBuiltinExercises(db: D1Database) {
  const ids = builtinExercises.map(([id]) => id)
  const placeholders = ids.map(() => "?").join(", ")

  await db
    .prepare(
      `DELETE FROM exercise_library
       WHERE is_builtin = 1
       AND id NOT IN (${placeholders})
       AND id NOT IN (
         SELECT library_exercise_id FROM workout_exercises WHERE library_exercise_id IS NOT NULL
       )`,
    )
    .bind(...ids)
    .run()
}

async function getPlans(db: D1Database) {
  const planRows = await allRows(
    db,
    "SELECT id, weekday, title, created_at as createdAt FROM workout_plans WHERE user_id = ? ORDER BY weekday ASC",
    [defaultUserId],
  )
  const exerciseRows = await allRows(
    db,
    "SELECT id, plan_id as planId, library_exercise_id as libraryExerciseId, name, muscle_group as muscleGroup, target_sets as sets, target_reps as reps, target_weight as weight, sort_order as sortOrder FROM workout_exercises ORDER BY sort_order ASC",
  )

  return planRows.map((plan) => ({
    id: String(plan.id),
    weekday: toNumber(plan.weekday),
    title: String(plan.title),
    createdAt: toNumber(plan.createdAt),
    exercises: exerciseRows
      .filter((exercise) => exercise.planId === plan.id)
      .map((exercise) => ({
        id: String(exercise.id),
        libraryExerciseId: exercise.libraryExerciseId ? String(exercise.libraryExerciseId) : null,
        name: String(exercise.name),
        muscle: String(exercise.muscleGroup),
        sets: toNumber(exercise.sets, 3),
        reps: toNumber(exercise.reps, 10),
        weight: toNumber(exercise.weight, 0),
        order: toNumber(exercise.sortOrder, 1),
      })),
  }))
}

async function saveProfile(db: D1Database, input: ProfileInput) {
  const now = Date.now()
  const name = normalizeText(input.name, "Sean")

  await db
    .prepare("UPDATE users SET name = ?, height_cm = ?, weight_kg = ?, updated_at = ? WHERE id = ?")
    .bind(name, nullableNumber(input.heightCm), nullableNumber(input.weightKg), now, defaultUserId)
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
        toNumber(input.goals.calories, 2200),
        toNumber(input.goals.protein, 150),
        toNumber(input.goals.carbs, 240),
        toNumber(input.goals.fat, 70),
        now,
      )
      .run()
  }
}

async function createLibraryExercise(db: D1Database, input: ExerciseInput) {
  const name = normalizeText(input.name, "")
  const muscle = normalizeText(input.muscleGroup, "")

  if (!name || !muscle) {
    throw new Error("Exercise name and muscle group are required")
  }

  await db
    .prepare(
      "INSERT INTO exercise_library (id, user_id, name, muscle_group, default_sets, default_reps, default_weight, is_builtin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      defaultUserId,
      name,
      muscle,
      Math.max(1, toNumber(input.defaultSets, 3)),
      Math.max(1, toNumber(input.defaultReps, 10)),
      Math.max(0, toNumber(input.defaultWeight, 0)),
      0,
      Date.now(),
    )
    .run()
}

async function savePlan(db: D1Database, weekday: number, input: PlanInput) {
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    throw new Error("Invalid weekday")
  }

  const now = Date.now()
  const planId = `plan-${defaultUserId}-${weekday}`
  const exercises = Array.isArray(input.exercises) ? input.exercises : []

  await db
    .prepare(
      `INSERT INTO workout_plans (id, user_id, weekday, title, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title`,
    )
    .bind(planId, defaultUserId, weekday, normalizeText(input.title, `周${weekdayLabel(weekday)}训练`), now)
    .run()

  const incomingIds = exercises
    .map((exercise) => (typeof exercise.id === "string" && exercise.id.trim() ? exercise.id.trim() : null))
    .filter((id): id is string => Boolean(id))

  if (incomingIds.length > 0) {
    await db
      .prepare(`DELETE FROM workout_exercises WHERE plan_id = ? AND id NOT IN (${incomingIds.map(() => "?").join(", ")})`)
      .bind(planId, ...incomingIds)
      .run()
  } else {
    await db.prepare("DELETE FROM workout_exercises WHERE plan_id = ?").bind(planId).run()
  }

  if (exercises.length > 0) {
    await db.batch(
      exercises.map((exercise, index) => {
        const exerciseId = typeof exercise.id === "string" && exercise.id.trim() ? exercise.id.trim() : crypto.randomUUID()

        return db
          .prepare(
            `INSERT INTO workout_exercises (id, plan_id, library_exercise_id, name, muscle_group, target_sets, target_reps, target_weight, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
              library_exercise_id = excluded.library_exercise_id,
              name = excluded.name,
              muscle_group = excluded.muscle_group,
              target_sets = excluded.target_sets,
              target_reps = excluded.target_reps,
              target_weight = excluded.target_weight,
              sort_order = excluded.sort_order`,
          )
          .bind(
            exerciseId,
            planId,
            exercise.libraryExerciseId ?? null,
            normalizeText(exercise.name, "动作"),
            normalizeText(exercise.muscleGroup, "训练"),
            Math.max(1, toNumber(exercise.defaultSets, 3)),
            Math.max(1, toNumber(exercise.defaultReps, 10)),
            Math.max(0, toNumber(exercise.defaultWeight, 0)),
            index + 1,
          )
      }),
    )
  }
}

async function saveMeal(db: D1Database, input: MealInput) {
  const now = Date.now()
  const createdAt = timestampOnDate(input.date, now)
  const mealId = crypto.randomUUID()
  const items = Array.isArray(input.items) ? input.items : []
  const totals = normalizeMealTotals(input, items)

  await db
    .prepare(
      "INSERT INTO meals (id, user_id, meal_type, raw_text, calories, protein, carbs, fat, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(
      mealId,
      defaultUserId,
      normalizeMealType(input.mealType),
      normalizeText(input.rawText, "AI JSON"),
      totals.calories,
      totals.protein,
      totals.carbs,
      totals.fat,
      createdAt,
    )
    .run()

  if (items.length > 0) {
    await db.batch(
      items.map((item) => {
        const normalized = normalizeMealItem(item)
        return db
          .prepare("INSERT INTO meal_items (id, meal_id, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), mealId, normalized.name, normalized.calories, normalized.protein, normalized.carbs, normalized.fat)
      }),
    )
  }
}

async function updateMeal(db: D1Database, mealId: string, input: MealInput) {
  const existing = await db
    .prepare("SELECT id, meal_type as mealType, raw_text as rawText, calories, protein, carbs, fat FROM meals WHERE id = ? AND user_id = ?")
    .bind(mealId, defaultUserId)
    .first<Record<string, unknown>>()

  if (!existing) {
    throw new Error("Meal not found")
  }

  const items = Array.isArray(input.items) ? input.items : []
  const totals = normalizeMealTotals(
    {
      calories: input.calories ?? toNumber(existing.calories),
      protein: input.protein ?? toNumber(existing.protein),
      carbs: input.carbs ?? toNumber(existing.carbs),
      fat: input.fat ?? toNumber(existing.fat),
    },
    items,
  )

  await db
    .prepare(
      "UPDATE meals SET meal_type = ?, raw_text = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ? AND user_id = ?",
    )
    .bind(
      normalizeMealType(input.mealType ?? existing.mealType),
      normalizeText(input.rawText ?? existing.rawText, "AI JSON"),
      totals.calories,
      totals.protein,
      totals.carbs,
      totals.fat,
      mealId,
      defaultUserId,
    )
    .run()

  if (Array.isArray(input.items)) {
    await db.prepare("DELETE FROM meal_items WHERE meal_id = ?").bind(mealId).run()

    if (items.length > 0) {
      await db.batch(
        items.map((item) => {
          const normalized = normalizeMealItem(item)
          return db
            .prepare("INSERT INTO meal_items (id, meal_id, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(crypto.randomUUID(), mealId, normalized.name, normalized.calories, normalized.protein, normalized.carbs, normalized.fat)
        }),
      )
    }
  }
}

async function deleteMeal(db: D1Database, mealId: string) {
  const existing = await db
    .prepare("SELECT id FROM meals WHERE id = ? AND user_id = ?")
    .bind(mealId, defaultUserId)
    .first()

  if (!existing) {
    throw new Error("Meal not found")
  }

  await db.batch([
    db.prepare("DELETE FROM meal_items WHERE meal_id = ?").bind(mealId),
    db.prepare("DELETE FROM meals WHERE id = ? AND user_id = ?").bind(mealId, defaultUserId),
  ])
}

async function saveWorkoutSession(db: D1Database, input: WorkoutSessionInput) {
  const now = Date.now()
  const sessionId = crypto.randomUUID()
  const sets = Array.isArray(input.sets) ? input.sets.filter((set) => set.exerciseId) : []
  const startedAt = timestampOnDate(input.date, input.startedAt ?? now)
  const finishedAt = timestampOnDate(input.date, input.finishedAt ?? now)

  await db
    .prepare("INSERT INTO workout_sessions (id, user_id, plan_id, started_at, finished_at) VALUES (?, ?, ?, ?, ?)")
    .bind(sessionId, defaultUserId, input.planId ?? null, startedAt, finishedAt)
    .run()

  if (sets.length > 0) {
    await db.batch(
      sets.map((set, index) =>
        db
          .prepare(
            "INSERT INTO workout_sets (id, session_id, exercise_id, set_index, actual_reps, actual_weight, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            crypto.randomUUID(),
            sessionId,
            String(set.exerciseId),
            set.setIndex ?? index + 1,
            Math.max(0, toNumber(set.actualReps, 0)),
            Math.max(0, toNumber(set.actualWeight, 0)),
            timestampOnDate(input.date, now),
          ),
      ),
    )
  }
}

async function getWorkoutSessionDetail(db: D1Database, sessionId: string) {
  const session = await db
    .prepare(
      `SELECT s.id, s.plan_id as planId, s.started_at as startedAt, s.finished_at as finishedAt,
      COALESCE(p.title, '训练') as title, COUNT(ws.id) as sets, COALESCE(SUM(ws.actual_weight * ws.actual_reps), 0) as volume
     FROM workout_sessions s
     LEFT JOIN workout_plans p ON p.id = s.plan_id
     LEFT JOIN workout_sets ws ON ws.session_id = s.id
     WHERE s.user_id = ? AND s.id = ?
     GROUP BY s.id`,
    )
    .bind(defaultUserId, sessionId)
    .first<Record<string, unknown>>()

  if (!session) {
    throw new Error("Workout session not found")
  }

  const setRows = await allRows(
    db,
    `SELECT ws.id, ws.exercise_id as exerciseId, COALESCE(e.name, '已删除动作') as exerciseName,
      ws.set_index as setIndex, ws.actual_reps as actualReps, ws.actual_weight as actualWeight, ws.completed_at as completedAt
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
    volume: `${Math.round(toNumber(session.volume)).toLocaleString("en-US")} kg`,
    sets: setRows.map((set) => ({
      id: String(set.id),
      exerciseId: String(set.exerciseId),
      exerciseName: String(set.exerciseName),
      setIndex: toNumber(set.setIndex),
      actualReps: toNumber(set.actualReps),
      actualWeight: toNumber(set.actualWeight),
      completedAt: toNumber(set.completedAt),
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
    throw new Error("Workout session not found")
  }

  const dateKey = normalizeDateKey(input.date) ?? formatDateKey(toNumber(session.startedAt))
  const startedAt = input.startedAt === undefined ? toNumber(session.startedAt) : timestampOnDate(dateKey, input.startedAt)
  const finishedAt =
    input.finishedAt === null
      ? null
      : timestampOnDate(dateKey, input.finishedAt ?? nullableNumber(session.finishedAt) ?? Date.now())
  const sets = Array.isArray(input.sets) ? input.sets.filter((set) => set.exerciseId) : []

  await db
    .prepare("UPDATE workout_sessions SET started_at = ?, finished_at = ? WHERE id = ? AND user_id = ?")
    .bind(startedAt, finishedAt, sessionId, defaultUserId)
    .run()

  await db.prepare("DELETE FROM workout_sets WHERE session_id = ?").bind(sessionId).run()

  if (sets.length > 0) {
    await db.batch(
      sets.map((set, index) =>
        db
          .prepare(
            "INSERT INTO workout_sets (id, session_id, exercise_id, set_index, actual_reps, actual_weight, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            typeof set.id === "string" && set.id.trim() ? set.id.trim() : crypto.randomUUID(),
            sessionId,
            String(set.exerciseId),
            set.setIndex ?? index + 1,
            Math.max(0, Math.round(toNumber(set.actualReps, 0))),
            Math.max(0, toNumber(set.actualWeight, 0)),
            timestampOnDate(dateKey, set.completedAt ?? Date.now()),
          ),
      ),
    )
  }
}

async function deleteWorkoutSession(db: D1Database, sessionId: string) {
  const session = await db
    .prepare("SELECT id FROM workout_sessions WHERE id = ? AND user_id = ?")
    .bind(sessionId, defaultUserId)
    .first()

  if (!session) {
    throw new Error("Workout session not found")
  }

  await db.batch([
    db.prepare("DELETE FROM workout_sets WHERE session_id = ?").bind(sessionId),
    db.prepare("DELETE FROM workout_sessions WHERE id = ? AND user_id = ?").bind(sessionId, defaultUserId),
  ])
}

async function saveReminders(db: D1Database, input: ReminderSettings) {
  const now = Date.now()

  await db
    .prepare(
      `INSERT INTO app_settings (key, user_id, value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind("reminders", defaultUserId, JSON.stringify(normalizeReminders(input)), now)
    .run()
}

async function exportData(db: D1Database) {
  const [
    users,
    nutritionGoals,
    appSettings,
    exerciseLibrary,
    workoutPlans,
    workoutExercises,
    workoutSessions,
    workoutSets,
    meals,
    mealItems,
  ] = await Promise.all([
    allRows(db, "SELECT * FROM users ORDER BY created_at ASC"),
    allRows(db, "SELECT * FROM nutrition_goals ORDER BY user_id ASC"),
    allRows(db, "SELECT * FROM app_settings ORDER BY key ASC"),
    allRows(db, "SELECT * FROM exercise_library ORDER BY is_builtin DESC, name ASC"),
    allRows(db, "SELECT * FROM workout_plans ORDER BY weekday ASC"),
    allRows(db, "SELECT * FROM workout_exercises ORDER BY sort_order ASC"),
    allRows(db, "SELECT * FROM workout_sessions ORDER BY started_at DESC"),
    allRows(db, "SELECT * FROM workout_sets ORDER BY completed_at DESC"),
    allRows(db, "SELECT * FROM meals ORDER BY created_at DESC"),
    allRows(db, "SELECT * FROM meal_items ORDER BY name ASC"),
  ])

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      users,
      nutritionGoals,
      appSettings,
      exerciseLibrary,
      workoutPlans,
      workoutExercises,
      workoutSessions,
      workoutSets,
      meals,
      mealItems,
    },
  }
}

async function clearUserData(db: D1Database) {
  await db.batch([
    db.prepare("DELETE FROM meal_items"),
    db.prepare("DELETE FROM meals"),
    db.prepare("DELETE FROM workout_sets"),
    db.prepare("DELETE FROM workout_sessions"),
    db.prepare("DELETE FROM workout_exercises"),
    db.prepare("DELETE FROM workout_plans"),
    db.prepare("DELETE FROM exercise_library WHERE is_builtin = 0 OR user_id = ?").bind(defaultUserId),
    db.prepare("DELETE FROM app_settings WHERE user_id = ?").bind(defaultUserId),
    db.prepare("DELETE FROM nutrition_goals WHERE user_id = ?").bind(defaultUserId),
    db.prepare("DELETE FROM users WHERE id = ?").bind(defaultUserId),
  ])
}

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
    "SELECT id, meal_type as mealType, raw_text as rawText, calories, protein, carbs, fat, created_at as createdAt FROM meals WHERE user_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at DESC",
    [defaultUserId, start, end],
  )

  return mapMealRows(meals, await getMealItemsByMealId(db, meals))
}

async function getMealItemsByMealId(db: D1Database, meals: Array<Record<string, unknown>>) {
  const mealIds = meals.map((meal) => String(meal.id)).filter(Boolean)
  const itemMap = new Map<string, Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>>()

  if (mealIds.length === 0) {
    return itemMap
  }

  const rows = await allRows(
    db,
    `SELECT meal_id as mealId, name, calories, protein, carbs, fat
     FROM meal_items
     WHERE meal_id IN (${mealIds.map(() => "?").join(", ")})
     ORDER BY name ASC`,
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

function mapMealRows(
  meals: Array<Record<string, unknown>>,
  itemsByMealId: Map<string, Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>>,
) {
  return meals.map((meal) => ({
    id: String(meal.id),
    mealType: normalizeMealType(meal.mealType),
    title: mealTypeLabel(String(meal.mealType)),
    note: String(meal.rawText),
    calories: toNumber(meal.calories),
    protein: toNumber(meal.protein),
    carbs: toNumber(meal.carbs),
    fat: toNumber(meal.fat),
    createdAt: toNumber(meal.createdAt),
    items: itemsByMealId.get(String(meal.id)) ?? [],
  }))
}

async function getWorkoutHistory(db: D1Database, start?: number, end?: number) {
  const rangeClause = start !== undefined && end !== undefined ? "AND s.started_at >= ? AND s.started_at < ?" : ""
  const params: Array<string | number | null> = [defaultUserId]

  if (start !== undefined && end !== undefined) {
    params.push(start, end)
  }

  const rows = await allRows(
    db,
    `SELECT s.id, s.started_at as startedAt, s.finished_at as finishedAt, COALESCE(p.title, '训练') as title,
      COUNT(ws.id) as sets, COALESCE(SUM(ws.actual_weight * ws.actual_reps), 0) as volume
     FROM workout_sessions s
     LEFT JOIN workout_plans p ON p.id = s.plan_id
     LEFT JOIN workout_sets ws ON ws.session_id = s.id
     WHERE s.user_id = ?
     ${rangeClause}
     GROUP BY s.id
     ORDER BY s.started_at DESC
     LIMIT 20`,
    params,
  )

  return rows.map((row) => ({
    id: String(row.id),
    date: formatMonthDay(toNumber(row.startedAt)),
    title: String(row.title),
    volume: `${Math.round(toNumber(row.volume)).toLocaleString("en-US")} kg`,
    sets: toNumber(row.sets),
    startedAt: toNumber(row.startedAt),
    finishedAt: nullableNumber(row.finishedAt),
  }))
}

async function getStats(db: D1Database, weekStart: number, todayStart: number) {
  const mealRows = await allRows(
    db,
    "SELECT calories, protein, carbs, fat, created_at as createdAt FROM meals WHERE user_id = ? AND created_at >= ?",
    [defaultUserId, weekStart],
  )
  const sessionRows = await allRows(
    db,
    "SELECT id, started_at as startedAt FROM workout_sessions WHERE user_id = ? AND started_at >= ? ORDER BY started_at ASC",
    [defaultUserId, weekStart],
  )
  const setRows = await allRows(
    db,
    `SELECT COALESCE(e.name, '已删除动作') as name, MAX(ws.actual_weight) as weight, MAX(ws.completed_at) as completedAt
     FROM workout_sets ws
     JOIN workout_sessions s ON s.id = ws.session_id
     LEFT JOIN workout_exercises e ON e.id = ws.exercise_id
     WHERE s.user_id = ?
     GROUP BY s.id, ws.exercise_id
     ORDER BY ws.completed_at ASC`,
    [defaultUserId],
  )

  const foodTrend = Array.from({ length: 7 }, (_, index) => {
    const start = todayStart - (6 - index) * 24 * 60 * 60 * 1000
    const end = start + 24 * 60 * 60 * 1000
    const rows = mealRows.filter((row) => toNumber(row.createdAt) >= start && toNumber(row.createdAt) < end)
    const total = sumMacros(rows)

    return {
      day: weekdayLabel(getChinaWeekday(start)),
      calories: total.calories,
      protein: total.protein,
      carbs: total.carbs,
      fat: total.fat,
    }
  })

  const exerciseMap = new Map<string, Array<{ weight: number; completedAt: number }>>()
  for (const row of setRows) {
    const name = String(row.name)
    const list = exerciseMap.get(name) ?? []
    list.push({ weight: toNumber(row.weight), completedAt: toNumber(row.completedAt) })
    exerciseMap.set(name, list)
  }

  const exerciseTrends = Array.from(exerciseMap.entries())
    .map(([name, rows]) => {
      const first = rows[0]?.weight ?? 0
      const current = rows[rows.length - 1]?.weight ?? 0
      const best = Math.max(...rows.map((row) => row.weight), 0)

      return { name, current, best, change: Math.round((current - first) * 10) / 10, points: rows.slice(-8) }
    })
    .sort((a, b) => b.best - a.best)
    .slice(0, 6)

  return {
    foodTrend,
    trainingCount7d: sessionRows.length,
    trainingDays: sessionRows.map((row, index) => ({
      id: String(row.id),
      date: formatMonthDay(toNumber(row.startedAt)),
      order: index + 1,
    })),
    exerciseTrends,
  }
}

async function allRows(db: D1Database, sql: string, params: Array<string | number | null> = []) {
  const result = await db.prepare(sql).bind(...params).all<Record<string, unknown>>()
  return result.results ?? []
}

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
    calories: toNumber(input.calories, itemTotals.calories),
    protein: toNumber(input.protein, itemTotals.protein),
    carbs: toNumber(input.carbs, itemTotals.carbs),
    fat: toNumber(input.fat, itemTotals.fat),
  }
}

function normalizeMealItem(input: MacroInput & { name?: string }) {
  return {
    name: normalizeText(input.name, "食物"),
    calories: toNumber(input.calories),
    protein: toNumber(input.protein),
    carbs: toNumber(input.carbs),
    fat: toNumber(input.fat),
  }
}

function sumMacros(rows: Array<Record<string, unknown>>) {
  return rows.reduce<{ calories: number; protein: number; carbs: number; fat: number }>(
    (acc, row) => ({
      calories: Math.round((acc.calories + toNumber(row.calories)) * 10) / 10,
      protein: Math.round((acc.protein + toNumber(row.protein)) * 10) / 10,
      carbs: Math.round((acc.carbs + toNumber(row.carbs)) * 10) / 10,
      fat: Math.round((acc.fat + toNumber(row.fat)) * 10) / 10,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

function toNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? Math.round(number * 10) / 10 : fallback
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  return toNumber(value)
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

function normalizeReminders(value: ReminderSettings) {
  return {
    workout: {
      enabled: Boolean(value.workout?.enabled),
      time: normalizeTime(value.workout?.time, defaultReminders.workout.time),
    },
    meal: {
      enabled: Boolean(value.meal?.enabled),
      time: normalizeTime(value.meal?.time, defaultReminders.meal.time),
    },
    weekly: {
      enabled: Boolean(value.weekly?.enabled),
      day: Math.max(1, Math.min(7, Math.round(toNumber(value.weekly?.day, defaultReminders.weekly.day)))),
      time: normalizeTime(value.weekly?.time, defaultReminders.weekly.time),
    },
  }
}

function normalizeTime(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback
  }

  return /^\d{2}:\d{2}$/.test(value) ? value : fallback
}

function normalizeDateKey(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return value
}

function startOfDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return Date.UTC(year, month - 1, day) - tzOffsetMs
}

function formatDateKey(timestamp: number) {
  const date = new Date(timestamp + tzOffsetMs)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

function timestampOnDate(dateInput: unknown, fallback: number) {
  const date = normalizeDateKey(dateInput)

  if (!date) {
    return fallback
  }

  const fallbackDayStart = startOfDay(fallback)
  const elapsed = Math.max(0, Math.min(24 * 60 * 60 * 1000 - 1, fallback - fallbackDayStart))
  return startOfDateKey(date) + elapsed
}

function startOfDay(timestamp: number) {
  const shifted = new Date(timestamp + tzOffsetMs)
  shifted.setUTCHours(0, 0, 0, 0)
  return shifted.getTime() - tzOffsetMs
}

function getChinaWeekday(timestamp: number) {
  const day = new Date(timestamp + tzOffsetMs).getUTCDay()
  return day === 0 ? 7 : day
}

function weekdayLabel(weekday: number) {
  return ["一", "二", "三", "四", "五", "六", "日"][Math.max(0, Math.min(6, weekday - 1))]
}

function formatMonthDay(timestamp: number) {
  const date = new Date(timestamp + tzOffsetMs)
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`
}

function mealTitle(timestamp: number) {
  const hour = new Date(timestamp + tzOffsetMs).getUTCHours()

  if (hour < 10) return "早餐"
  if (hour < 15) return "午餐"
  if (hour < 20) return "晚餐"
  return "加餐"
}

function normalizeMealType(value: unknown) {
  const type = typeof value === "string" ? value : ""
  const allowed = ["breakfast", "lunch", "dinner", "breakfastSnack", "lunchSnack", "dinnerSnack"]
  return allowed.includes(type) ? type : "meal"
}

function mealTypeLabel(type: string) {
  const labels: Record<string, string> = {
    breakfast: "早餐",
    lunch: "午餐",
    dinner: "晚餐",
    breakfastSnack: "加早餐",
    lunchSnack: "加午餐",
    dinnerSnack: "加晚餐",
  }

  return labels[type] ?? "饮食"
}
