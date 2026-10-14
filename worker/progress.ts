// Progress-tracking features: per-exercise history (last session, PRs), ad-hoc exercises
// during a workout, frequent meals / copying meals, body weight and water logs.

import { addDaysToKey, formatDateKey, formatMonthDay, normalizeDateKey, startOfDateKey, timestampOnDate } from "./time"

export class ProgressError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export type ExerciseKind = "strength" | "cardio" | "duration"

export function normalizeKind(value: unknown): ExerciseKind {
  return value === "cardio" || value === "duration" ? value : "strength"
}

type Row = Record<string, unknown>

async function rows(db: D1Database, sql: string, params: Array<string | number | null> = []) {
  const result = await db.prepare(sql).bind(...params).all<Row>()
  return result.results ?? []
}

function num(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : fallback
}

/** Epley estimate; only meaningful for 1–12 reps. */
export function estimateOneRepMax(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + Math.min(reps, 12) / 30) * 10) / 10
}

/**
 * An exercise's identity across plans: the library id when it came from the library,
 * otherwise its name. Plan rows are per plan/day, so history has to be merged by this key.
 */
const keyExpression = "COALESCE('lib:' || e.library_exercise_id, 'name:' || e.name)"

export function exerciseKey(libraryExerciseId: string | null | undefined, name: string) {
  return libraryExerciseId ? `lib:${libraryExerciseId}` : `name:${name}`
}

/** Last completed session + all-time bests for each requested exercise key. */
export async function getExerciseHistory(db: D1Database, userId: string, keys: string[], excludeSessionId?: string | null) {
  const wanted = [...new Set(keys.filter(Boolean))].slice(0, 60)
  if (wanted.length === 0) return {}

  const setRows = await rows(
    db,
    `SELECT ${keyExpression} as key, s.id as sessionId, s.started_at as startedAt, ws.set_index as setIndex,
       ws.actual_reps as reps, ws.actual_weight as weight, ws.duration_sec as durationSec, ws.distance_m as distanceM
     FROM workout_sets ws
     JOIN workout_sessions s ON s.id = ws.session_id
     JOIN workout_exercises e ON e.id = ws.exercise_id
     WHERE s.user_id = ? AND ws.is_warmup = 0 AND ${keyExpression} IN (${wanted.map(() => "?").join(", ")})
       ${excludeSessionId ? "AND s.id != ?" : ""}
     ORDER BY s.started_at DESC, ws.set_index ASC`,
    [userId, ...wanted, ...(excludeSessionId ? [excludeSessionId] : [])],
  )

  const result: Record<
    string,
    {
      lastDate: string
      lastSets: Array<{ weight: number; reps: number; durationSec: number | null; distanceM: number | null }>
      bestWeight: number
      bestOneRepMax: number
      bestVolumeSet: number
      sessions: number
    }
  > = {}

  for (const row of setRows) {
    const key = String(row.key)
    const entry =
      result[key] ??
      (result[key] = { lastDate: "", lastSets: [], bestWeight: 0, bestOneRepMax: 0, bestVolumeSet: 0, sessions: 0 })
    const weight = num(row.weight)
    const reps = num(row.reps)
    const sessionId = String(row.sessionId)

    if (!entry.lastDate) {
      entry.lastDate = formatMonthDay(num(row.startedAt))
      ;(entry as Record<string, unknown>)._last = sessionId
    }
    if ((entry as Record<string, unknown>)._last === sessionId) {
      entry.lastSets.push({
        weight,
        reps,
        durationSec: row.durationSec === null ? null : num(row.durationSec),
        distanceM: row.distanceM === null ? null : num(row.distanceM),
      })
    }
    entry.bestWeight = Math.max(entry.bestWeight, weight)
    entry.bestOneRepMax = Math.max(entry.bestOneRepMax, estimateOneRepMax(weight, reps))
    entry.bestVolumeSet = Math.max(entry.bestVolumeSet, weight * reps)
  }

  // Count distinct sessions per key.
  const counts = await rows(
    db,
    `SELECT ${keyExpression} as key, COUNT(DISTINCT ws.session_id) as sessions
     FROM workout_sets ws JOIN workout_exercises e ON e.id = ws.exercise_id
     JOIN workout_sessions s ON s.id = ws.session_id
     WHERE s.user_id = ? AND ${keyExpression} IN (${wanted.map(() => "?").join(", ")})
     GROUP BY key`,
    [userId, ...wanted],
  )
  for (const row of counts) {
    const entry = result[String(row.key)]
    if (entry) entry.sessions = num(row.sessions)
  }

  for (const entry of Object.values(result)) {
    delete (entry as Record<string, unknown>)._last
  }

  return result
}

/** Full history of one exercise for the detail page. */
export async function getExerciseDetail(db: D1Database, userId: string, key: string) {
  const setRows = await rows(
    db,
    `SELECT s.id as sessionId, s.started_at as startedAt, ws.actual_reps as reps, ws.actual_weight as weight,
       ws.duration_sec as durationSec, ws.distance_m as distanceM, e.name as name, e.muscle_group as muscle, e.kind as kind
     FROM workout_sets ws
     JOIN workout_sessions s ON s.id = ws.session_id
     JOIN workout_exercises e ON e.id = ws.exercise_id
     WHERE s.user_id = ? AND ws.is_warmup = 0 AND ${keyExpression} = ?
     ORDER BY s.started_at ASC, ws.set_index ASC`,
    [userId, key],
  )

  const sessions = new Map<
    string,
    { id: string; date: string; dateKey: string; startedAt: number; sets: Array<{ weight: number; reps: number; durationSec: number | null; distanceM: number | null }> }
  >()
  let name = ""
  let muscle = ""
  let kind: ExerciseKind = "strength"

  for (const row of setRows) {
    name = String(row.name)
    muscle = String(row.muscle)
    kind = normalizeKind(row.kind)
    const id = String(row.sessionId)
    const startedAt = num(row.startedAt)
    const entry = sessions.get(id) ?? { id, date: formatMonthDay(startedAt), dateKey: formatDateKey(startedAt), startedAt, sets: [] }
    entry.sets.push({
      weight: num(row.weight),
      reps: num(row.reps),
      durationSec: row.durationSec === null ? null : num(row.durationSec),
      distanceM: row.distanceM === null ? null : num(row.distanceM),
    })
    sessions.set(id, entry)
  }

  const list = [...sessions.values()].map((session) => {
    const best = session.sets.reduce((acc, set) => (set.weight > acc.weight || (set.weight === acc.weight && set.reps > acc.reps) ? set : acc), session.sets[0])
    return {
      ...session,
      bestWeight: best?.weight ?? 0,
      bestReps: best?.reps ?? 0,
      volume: Math.round(session.sets.reduce((sum, set) => sum + set.weight * set.reps, 0)),
      oneRepMax: Math.max(0, ...session.sets.map((set) => estimateOneRepMax(set.weight, set.reps))),
      totalDurationSec: session.sets.reduce((sum, set) => sum + (set.durationSec ?? 0), 0),
      totalDistanceM: session.sets.reduce((sum, set) => sum + (set.distanceM ?? 0), 0),
    }
  })

  return {
    key,
    name,
    muscle,
    kind,
    sessions: list.reverse().slice(0, 100),
    bestWeight: Math.max(0, ...list.map((session) => session.bestWeight)),
    bestOneRepMax: Math.max(0, ...list.map((session) => session.oneRepMax)),
    bestVolume: Math.max(0, ...list.map((session) => session.volume)),
    totalSets: setRows.length,
  }
}

/**
 * Adds an exercise during a workout. With `weekday`, it is appended to that day's plan;
 * otherwise it lives in a hidden "free workout" plan (weekday 0) so history keeps its name.
 */
export async function createSessionExercise(
  db: D1Database,
  userId: string,
  input: { name?: string; muscleGroup?: string; libraryExerciseId?: string | null; kind?: string; sets?: number; reps?: number; weight?: number; addToPlanWeekday?: number | null },
) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 60) : ""
  if (!name) throw new ProgressError(400, "需要动作名称")

  const kind = normalizeKind(input.kind)
  const weekday = Number(input.addToPlanWeekday)
  const toPlan = Number.isInteger(weekday) && ((weekday >= 1 && weekday <= 7) || (weekday >= 101 && weekday <= 106))
  const planId = toPlan ? `plan-${userId}-${weekday}` : `plan-${userId}-free`
  const now = Date.now()
  const id = crypto.randomUUID()
  const library = input.libraryExerciseId
    ? await db.prepare("SELECT id FROM exercise_library WHERE id = ?").bind(input.libraryExerciseId).first<{ id: string }>()
    : null
  const order = await db.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM workout_exercises WHERE plan_id = ?").bind(planId).first<{ next: number }>()

  await db.batch([
    db
      .prepare(
        `INSERT INTO workout_plans (id, user_id, weekday, title, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
      )
      .bind(planId, userId, toPlan ? weekday : 0, toPlan ? (weekday > 100 ? `训练 ${String.fromCharCode(64 + weekday - 100)}` : `周${"一二三四五六日"[weekday - 1]}训练`) : "自由训练", now),
    db
      .prepare(
        `INSERT INTO workout_exercises (id, plan_id, library_exercise_id, name, muscle_group, target_sets, target_reps, target_weight, sort_order, archived_at, kind)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        planId,
        library?.id ?? null,
        name,
        (typeof input.muscleGroup === "string" && input.muscleGroup.trim()) || "训练",
        Math.max(1, Math.round(num(input.sets, 3))),
        Math.max(1, Math.round(num(input.reps, 10))),
        Math.max(0, num(input.weight, 0)),
        num(order?.next, 1),
        toPlan ? null : now,
        kind,
      ),
  ])

  return {
    id,
    libraryExerciseId: library?.id ?? null,
    name,
    muscle: (typeof input.muscleGroup === "string" && input.muscleGroup.trim()) || "训练",
    sets: Math.max(1, Math.round(num(input.sets, 3))),
    reps: Math.max(1, Math.round(num(input.reps, 10))),
    weight: Math.max(0, num(input.weight, 0)),
    kind,
  }
}

// ---------------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------------

/** Meals eaten repeatedly in the last 90 days, grouped by their food items. */
export async function getFrequentMeals(db: D1Database, userId: string) {
  const since = Date.now() - 90 * 24 * 60 * 60 * 1000
  const mealRows = await rows(
    db,
    `SELECT m.id, m.meal_type as mealType, m.calories, m.protein, m.carbs, m.fat, m.created_at as createdAt,
       (SELECT GROUP_CONCAT(name, '、') FROM (SELECT name FROM meal_items WHERE meal_id = m.id ORDER BY name)) as names
     FROM meals m
     WHERE m.user_id = ? AND m.created_at >= ?
     ORDER BY m.created_at DESC
     LIMIT 400`,
    [userId, since],
  )

  const groups = new Map<string, { mealId: string; label: string; count: number; calories: number; protein: number; carbs: number; fat: number; mealType: string; lastAt: number }>()

  for (const row of mealRows) {
    const names = typeof row.names === "string" ? row.names : ""
    if (!names) continue
    const signature = names
    const existing = groups.get(signature)
    if (existing) {
      existing.count += 1
      continue
    }
    groups.set(signature, {
      mealId: String(row.id),
      label: names,
      count: 1,
      calories: num(row.calories),
      protein: num(row.protein),
      carbs: num(row.carbs),
      fat: num(row.fat),
      mealType: String(row.mealType),
      lastAt: num(row.createdAt),
    })
  }

  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
    .slice(0, 8)
}

/** Copies a meal (with items) to another date/meal type. Returns the new meal id. */
export async function copyMeal(db: D1Database, userId: string, mealId: string, input: { date?: string; mealType?: string }, normalizeMealType: (value: unknown, ts: number) => string) {
  const meal = await db
    .prepare("SELECT id, meal_type as mealType, raw_text as rawText, calories, protein, carbs, fat FROM meals WHERE id = ? AND user_id = ?")
    .bind(mealId, userId)
    .first<Row>()

  if (!meal) throw new ProgressError(404, "饮食记录不存在")

  const items = await rows(db, "SELECT name, calories, protein, carbs, fat FROM meal_items WHERE meal_id = ?", [mealId])
  const now = Date.now()
  const createdAt = timestampOnDate(input.date, now)
  const newId = crypto.randomUUID()

  await db.batch([
    db
      .prepare("INSERT INTO meals (id, user_id, meal_type, raw_text, calories, protein, carbs, fat, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(
        newId,
        userId,
        normalizeMealType(input.mealType ?? meal.mealType, createdAt),
        "复制",
        num(meal.calories),
        num(meal.protein),
        num(meal.carbs),
        num(meal.fat),
        createdAt,
      ),
    ...items.map((item) =>
      db
        .prepare("INSERT INTO meal_items (id, meal_id, name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), newId, String(item.name), num(item.calories), num(item.protein), num(item.carbs), num(item.fat)),
    ),
  ])

  return newId
}

// ---------------------------------------------------------------------------
// Body weight & water
// ---------------------------------------------------------------------------

export async function getBodyWeights(db: D1Database, userId: string) {
  const list = await rows(db, "SELECT date_key as date, weight FROM body_weights WHERE user_id = ? ORDER BY date_key DESC LIMIT 180", [userId])
  return list.map((row) => ({ date: String(row.date), weight: num(row.weight) })).reverse()
}

export async function saveBodyWeight(db: D1Database, userId: string, input: { date?: string; weight?: unknown }) {
  const date = normalizeDateKey(input.date) ?? formatDateKey(Date.now())
  const weight = num(input.weight)
  if (weight < 20 || weight > 400) throw new ProgressError(400, "体重需在 20–400 kg 之间")

  const now = Date.now()
  await db.batch([
    db
      .prepare(
        `INSERT INTO body_weights (id, user_id, date_key, weight, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, date_key) DO UPDATE SET weight = excluded.weight, created_at = excluded.created_at`,
      )
      .bind(crypto.randomUUID(), userId, date, weight, now),
  ])
  await syncProfileWeight(db, userId)
}

export async function deleteBodyWeight(db: D1Database, userId: string, date: string) {
  const key = normalizeDateKey(date)
  if (!key) throw new ProgressError(400, "日期格式不正确")
  await db.prepare("DELETE FROM body_weights WHERE user_id = ? AND date_key = ?").bind(userId, key).run()
  await syncProfileWeight(db, userId)
}

/** Keeps users.weight_kg equal to the latest logged weight. */
async function syncProfileWeight(db: D1Database, userId: string) {
  await db
    .prepare(
      `UPDATE users SET weight_kg = COALESCE((SELECT weight FROM body_weights WHERE user_id = ? ORDER BY date_key DESC LIMIT 1), weight_kg), updated_at = ?
       WHERE id = ?`,
    )
    .bind(userId, Date.now(), userId)
    .run()
}

export async function getWater(db: D1Database, userId: string, dateKey: string) {
  const row = await db.prepare("SELECT ml FROM water_logs WHERE user_id = ? AND date_key = ?").bind(userId, dateKey).first<{ ml: number }>()
  return num(row?.ml)
}

export async function getWaterRange(db: D1Database, userId: string, fromKey: string, toKey: string) {
  const list = await rows(db, "SELECT date_key as date, ml FROM water_logs WHERE user_id = ? AND date_key >= ? AND date_key <= ?", [userId, fromKey, toKey])
  return new Map(list.map((row) => [String(row.date), num(row.ml)]))
}

export async function saveWater(db: D1Database, userId: string, input: { date?: string; ml?: unknown }) {
  const date = normalizeDateKey(input.date) ?? formatDateKey(Date.now())
  const ml = Math.max(0, Math.min(10000, Math.round(num(input.ml))))
  await db
    .prepare(
      `INSERT INTO water_logs (id, user_id, date_key, ml, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET ml = excluded.ml, updated_at = excluded.updated_at`,
    )
    .bind(`${userId}-${date}`, userId, date, ml, Date.now())
    .run()
  return { date, ml }
}

export { addDaysToKey, startOfDateKey }
