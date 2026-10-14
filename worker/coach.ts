// AI coach: free chat plus three built-in tools (training plan generator, "what can I still eat
// today", monthly review). Every request is grounded in the owner's own data, summarised here.

import { AiError, callLlm, requireAiConfig, type AiConfig, type ChatMessage } from "./ai"
import { estimateOneRepMax, getBodyWeights, getFrequentMeals } from "./progress"
import { addDaysToKey, formatDateKey, getActiveTimeZone, hourOf, startOfDateKey } from "./time"

type Row = Record<string, unknown>

async function rows(db: D1Database, sql: string, params: Array<string | number | null> = []) {
  const result = await db.prepare(sql).bind(...params).all<Row>()
  return result.results ?? []
}

function num(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : fallback
}

const weekdayNames = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"]

function slotLabel(weekday: number) {
  return weekday > 100 ? `循环 ${String.fromCharCode(64 + weekday - 100)}` : weekdayNames[weekday] ?? String(weekday)
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type CoachContext = Awaited<ReturnType<typeof buildContext>>

export async function buildContext(db: D1Database, userId: string) {
  const now = Date.now()
  const today = formatDateKey(now)
  const todayStart = startOfDateKey(today)
  const tomorrowStart = startOfDateKey(addDaysToKey(today, 1))
  const monthStart = startOfDateKey(addDaysToKey(today, -29))

  const [profile, todayTotals, meals30, sessions30, exerciseRows, plans, settings, weights, frequent, library] = await Promise.all([
    db
      .prepare(
        `SELECT u.name, u.height_cm as height, u.weight_kg as weight, g.calories, g.protein, g.carbs, g.fat
         FROM users u LEFT JOIN nutrition_goals g ON g.user_id = u.id WHERE u.id = ?`,
      )
      .bind(userId)
      .first<Row>(),
    db
      .prepare(
        `SELECT COALESCE(SUM(calories),0) as calories, COALESCE(SUM(protein),0) as protein, COALESCE(SUM(carbs),0) as carbs, COALESCE(SUM(fat),0) as fat, COUNT(*) as meals
         FROM meals WHERE user_id = ? AND created_at >= ? AND created_at < ?`,
      )
      .bind(userId, todayStart, tomorrowStart)
      .first<Row>(),
    rows(db, "SELECT calories, protein, carbs, fat, created_at as createdAt, meal_type as mealType FROM meals WHERE user_id = ? AND created_at >= ?", [userId, monthStart]),
    rows(
      db,
      `SELECT s.id, s.started_at as startedAt, s.finished_at as finishedAt, COALESCE(p.title, '自由训练') as title,
         SUM(CASE WHEN ws.is_warmup = 0 THEN 1 ELSE 0 END) as sets,
         COALESCE(SUM(CASE WHEN ws.is_warmup = 0 THEN ws.actual_weight * ws.actual_reps ELSE 0 END), 0) as volume,
         AVG(ws.rpe) as rpe
       FROM workout_sessions s LEFT JOIN workout_plans p ON p.id = s.plan_id LEFT JOIN workout_sets ws ON ws.session_id = s.id
       WHERE s.user_id = ? AND s.started_at >= ? GROUP BY s.id ORDER BY s.started_at ASC`,
      [userId, monthStart],
    ),
    rows(
      db,
      `SELECT e.name, COALESCE(e.kind, 'strength') as kind, s.started_at as startedAt, ws.actual_weight as weight, ws.actual_reps as reps, ws.rpe as rpe
       FROM workout_sets ws JOIN workout_sessions s ON s.id = ws.session_id JOIN workout_exercises e ON e.id = ws.exercise_id
       WHERE s.user_id = ? AND ws.is_warmup = 0 AND s.started_at >= ?
       ORDER BY s.started_at ASC`,
      [userId, startOfDateKey(addDaysToKey(today, -90))],
    ),
    rows(
      db,
      `SELECT p.weekday, p.title, GROUP_CONCAT(e.name || ' ' || e.target_sets || 'x' || e.target_reps || CASE WHEN e.target_weight > 0 THEN ' ' || e.target_weight || 'kg' ELSE '' END, '；') as exercises
       FROM workout_plans p LEFT JOIN workout_exercises e ON e.plan_id = p.id AND e.archived_at IS NULL
       WHERE p.user_id = ? AND (p.weekday BETWEEN 1 AND 7 OR p.weekday BETWEEN 101 AND 106)
       GROUP BY p.id ORDER BY p.weekday`,
      [userId],
    ),
    rows(db, "SELECT key, value FROM app_settings WHERE user_id = ? AND key IN ('plan_mode', 'water_goal')", [userId]),
    getBodyWeights(db, userId),
    getFrequentMeals(db, userId),
    rows(db, "SELECT id, name, muscle_group as muscle, kind, default_sets as sets, default_reps as reps, default_weight as weight FROM exercise_library ORDER BY is_builtin ASC, muscle_group, name"),
  ])

  const goals = {
    calories: num(profile?.calories, 2200),
    protein: num(profile?.protein, 150),
    carbs: num(profile?.carbs, 240),
    fat: num(profile?.fat, 70),
  }
  const eaten = {
    calories: num(todayTotals?.calories),
    protein: num(todayTotals?.protein),
    carbs: num(todayTotals?.carbs),
    fat: num(todayTotals?.fat),
    meals: num(todayTotals?.meals),
  }
  const remaining = {
    calories: Math.round(goals.calories - eaten.calories),
    protein: Math.round(goals.protein - eaten.protein),
    carbs: Math.round(goals.carbs - eaten.carbs),
    fat: Math.round(goals.fat - eaten.fat),
  }

  // Nutrition over the last 30 days (only days with at least one meal count).
  const byDay = new Map<string, { calories: number; protein: number }>()
  for (const meal of meals30) {
    const key = formatDateKey(num(meal.createdAt))
    if (key === today) continue
    const entry = byDay.get(key) ?? { calories: 0, protein: 0 }
    entry.calories += num(meal.calories)
    entry.protein += num(meal.protein)
    byDay.set(key, entry)
  }
  const loggedDays = [...byDay.values()]
  const nutrition = {
    loggedDays: loggedDays.length,
    avgCalories: loggedDays.length ? Math.round(loggedDays.reduce((sum, day) => sum + day.calories, 0) / loggedDays.length) : 0,
    avgProtein: loggedDays.length ? Math.round(loggedDays.reduce((sum, day) => sum + day.protein, 0) / loggedDays.length) : 0,
    daysOverCalories: loggedDays.filter((day) => day.calories > goals.calories * 1.1).length,
    daysProteinHit: loggedDays.filter((day) => day.protein >= goals.protein * 0.9).length,
  }

  // Per-exercise progress (strength only): best set per session, first vs latest in 90 days.
  const progress = new Map<string, { sessions: Map<number, { weight: number; reps: number; rpe: number | null }>; best: number; bestE1rm: number }>()
  for (const row of exerciseRows) {
    if (String(row.kind) !== "strength") continue
    const name = String(row.name)
    const entry = progress.get(name) ?? { sessions: new Map(), best: 0, bestE1rm: 0 }
    const startedAt = num(row.startedAt)
    const weight = num(row.weight)
    const reps = num(row.reps)
    const current = entry.sessions.get(startedAt)
    if (!current || weight > current.weight || (weight === current.weight && reps > current.reps)) {
      entry.sessions.set(startedAt, { weight, reps, rpe: row.rpe === null ? null : num(row.rpe) })
    }
    entry.best = Math.max(entry.best, weight)
    entry.bestE1rm = Math.max(entry.bestE1rm, estimateOneRepMax(weight, reps))
    progress.set(name, entry)
  }
  const exercises = [...progress.entries()]
    .map(([name, entry]) => {
      const list = [...entry.sessions.entries()].sort((a, b) => a[0] - b[0]).map(([, set]) => set)
      const first = list[0]
      const last = list[list.length - 1]
      const lastThree = list.slice(-3)
      const stalled = lastThree.length === 3 && lastThree.every((set) => set.weight <= lastThree[0].weight && set.reps <= lastThree[0].reps)
      return {
        name,
        sessions: list.length,
        first: first ? `${first.weight}kg×${first.reps}` : "",
        last: last ? `${last.weight}kg×${last.reps}${last.rpe ? ` RPE${last.rpe}` : ""}` : "",
        best: entry.best,
        e1rm: Math.round(entry.bestE1rm),
        stalled,
      }
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 15)

  const weightsInMonth = weights.filter((entry) => entry.date >= addDaysToKey(today, -29))
  const avg = (list: Array<{ weight: number }>) => (list.length ? Math.round((list.reduce((sum, item) => sum + item.weight, 0) / list.length) * 10) / 10 : null)
  const weight = {
    latest: weights.length ? weights[weights.length - 1].weight : num(profile?.weight) || null,
    firstThisMonth: weightsInMonth[0]?.weight ?? null,
    lastThisMonth: weightsInMonth[weightsInMonth.length - 1]?.weight ?? null,
    avgLast7: avg(weights.filter((entry) => entry.date > addDaysToKey(today, -7))),
    avgPrev7: avg(weights.filter((entry) => entry.date <= addDaysToKey(today, -7) && entry.date > addDaysToKey(today, -14))),
    entries: weightsInMonth.length,
  }

  const settingMap = new Map(settings.map((row) => [String(row.key), String(row.value)]))

  return {
    today,
    hour: hourOf(now),
    timezone: getActiveTimeZone(),
    profile: { name: String(profile?.name ?? ""), height: num(profile?.height) || null },
    goals,
    eaten,
    remaining,
    nutrition,
    training: {
      sessions30: sessions30.length,
      perWeek: Math.round((sessions30.length / 30) * 7 * 10) / 10,
      totalVolume30: Math.round(sessions30.reduce((sum, row) => sum + num(row.volume), 0)),
      recent: sessions30.slice(-8).map((row) => ({
        date: formatDateKey(num(row.startedAt)),
        title: String(row.title),
        sets: num(row.sets),
        minutes: row.finishedAt ? Math.max(1, Math.round((num(row.finishedAt) - num(row.startedAt)) / 60000)) : null,
        rpe: row.rpe === null ? null : num(row.rpe),
      })),
    },
    exercises,
    weight,
    planMode: settingMap.get("plan_mode")?.includes("rotation") ? "rotation" : "weekly",
    plans: plans.map((row) => ({ slot: slotLabel(num(row.weekday)), weekday: num(row.weekday), title: String(row.title), exercises: String(row.exercises ?? "") })),
    frequentMeals: frequent.map((meal) => ({ label: meal.label, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, count: meal.count })),
    library: library.map((row) => ({ id: String(row.id), name: String(row.name), muscle: String(row.muscle), kind: String(row.kind ?? "strength") })),
  }
}

function contextText(context: CoachContext, options: { library?: boolean } = {}) {
  const lines = [
    `今天：${context.today}（${context.hour} 点，时区 ${context.timezone}）`,
    `用户：${context.profile.name || "未填写"}，身高 ${context.profile.height ?? "未知"} cm，最新体重 ${context.weight.latest ?? "未知"} kg`,
    `每日目标：${context.goals.calories} kcal，蛋白质 ${context.goals.protein} g，碳水 ${context.goals.carbs} g，脂肪 ${context.goals.fat} g`,
    `今天已吃（${context.eaten.meals} 餐）：${context.eaten.calories} kcal，P ${context.eaten.protein} / C ${context.eaten.carbs} / F ${context.eaten.fat} g；剩余 ${context.remaining.calories} kcal，P ${context.remaining.protein} / C ${context.remaining.carbs} / F ${context.remaining.fat} g`,
    `近 30 天饮食：记录 ${context.nutrition.loggedDays} 天，日均 ${context.nutrition.avgCalories} kcal、蛋白质 ${context.nutrition.avgProtein} g；超出热量目标 10% 的天数 ${context.nutrition.daysOverCalories}；蛋白质达标天数 ${context.nutrition.daysProteinHit}`,
    `近 30 天训练：${context.training.sessions30} 次（约每周 ${context.training.perWeek} 次），总容量 ${context.training.totalVolume30} kg`,
    `最近训练：${context.training.recent.map((item) => `${item.date} ${item.title} ${item.sets}组${item.minutes ? ` ${item.minutes}分钟` : ""}${item.rpe ? ` RPE${item.rpe}` : ""}`).join("；") || "无"}`,
    `主要动作（近 90 天，首次→最近，最佳）：${context.exercises.map((item) => `${item.name}: ${item.first}→${item.last}，最佳 ${item.best}kg，e1RM ${item.e1rm}kg${item.stalled ? "（近 3 次无进步）" : ""}`).join("；") || "无"}`,
    `体重：本月 ${context.weight.firstThisMonth ?? "-"} → ${context.weight.lastThisMonth ?? "-"} kg（${context.weight.entries} 次记录）；近 7 天均值 ${context.weight.avgLast7 ?? "-"}，再前 7 天均值 ${context.weight.avgPrev7 ?? "-"}`,
    `计划模式：${context.planMode === "rotation" ? "循环（A/B/C…）" : "按星期"}；当前计划：${context.plans.filter((plan) => plan.exercises).map((plan) => `${plan.slot}「${plan.title}」${plan.exercises}`).join(" | ") || "未设置"}`,
    `常吃：${context.frequentMeals.map((meal) => `${meal.label}（${meal.calories} kcal，P${meal.protein}/C${meal.carbs}/F${meal.fat}，${meal.count} 次）`).join("；") || "无"}`,
  ]

  if (options.library) {
    lines.push(`动作库（id|名称|肌群|类型）：\n${context.library.map((item) => `${item.id}|${item.name}|${item.muscle}|${item.kind}`).join("\n")}`)
  }

  return lines.join("\n")
}

const persona = `你是 FitNote 里的私人健身与营养助手，用简体中文回答。
- 依据下方「用户数据」给出具体、可执行的建议，引用真实数字；数据不足时直说。
- 回答简洁，多用短段落和列表，适合手机阅读；不要编造用户没有的数据。
- 你不是医生：涉及伤病、疼痛、疾病、药物、极端节食时，提醒用户咨询专业人士，不给治疗方案。`

function extractJson<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start < 0 || end <= start) {
    throw new AiError(502, "模型返回的内容不是有效的 JSON，请重试")
  }
  try {
    return JSON.parse(cleaned.slice(start, end + 1).replace(/[“”]/g, '"')) as T
  } catch {
    throw new AiError(502, "模型返回的 JSON 格式有误，请重试")
  }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export async function coachChat(config: AiConfig | null, context: CoachContext, history: unknown) {
  const cfg = requireAiConfig(config)
  const messages = (Array.isArray(history) ? history : [])
    .filter((item): item is ChatMessage => Boolean(item) && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim() !== "")
    .slice(-12)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 4000) }))

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    throw new AiError(400, "请输入问题")
  }
  // Providers require the conversation to start with a user turn.
  while (messages.length && messages[0].role !== "user") messages.shift()

  const text = await callLlm(cfg, { system: `${persona}\n\n用户数据：\n${contextText(context)}`, messages, maxTokens: 1800, temperature: 0.6 })
  return { text: text.trim() }
}

// ---------------------------------------------------------------------------
// Training plan generator
// ---------------------------------------------------------------------------

export type PlanRequest = {
  goal?: string
  mode?: "weekly" | "rotation"
  days?: number[]
  rotationSlots?: number
  minutes?: number
  level?: string
  equipment?: string
  notes?: string
}

type GeneratedExercise = { libraryId?: string | null; name?: string; muscle?: string; kind?: string; sets?: number; reps?: number; weight?: number; note?: string }
type GeneratedPlan = { slot?: number; title?: string; focus?: string; exercises?: GeneratedExercise[] }

export async function generateWorkoutPlan(config: AiConfig | null, context: CoachContext, input: PlanRequest) {
  const cfg = requireAiConfig(config)
  const mode = input.mode === "rotation" ? "rotation" : "weekly"
  const days = mode === "weekly" ? [...new Set((input.days ?? []).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))].sort() : []
  const slotCount = mode === "rotation" ? Math.max(2, Math.min(6, Math.round(input.rotationSlots ?? 3))) : days.length

  if (mode === "weekly" && days.length === 0) {
    throw new AiError(400, "请至少选择一天训练日")
  }

  const slots = mode === "weekly" ? days : Array.from({ length: slotCount }, (_, index) => 101 + index)
  const slotText = slots.map((slot) => `${slot}=${slotLabel(slot)}`).join("，")
  const prompt = `请为用户设计训练计划。
要求：
- 目标：${input.goal || "增肌"}；水平：${input.level || "中级"}；每次约 ${input.minutes || 60} 分钟；器械：${input.equipment || "商业健身房，器械齐全"}
- 计划类型：${mode === "weekly" ? "按星期" : `${slotCount} 天循环`}；需要输出的 slot（数字=含义）：${slotText}
- 补充说明 / 伤病：${input.notes?.trim() || "无"}
- 优先使用「动作库」中的动作并给出其 id；动作库没有的才用 libraryId: null 并写 name 与 muscle。
- 每个 slot 4–8 个动作，符合时长；组数、次数合理；weight 为建议起始重量（kg），有历史成绩的动作参考其最佳成绩，没有的保守估计，自重动作填 0。
- kind 取 strength / duration / cardio；duration 的 reps 表示每组秒数，cardio 的 reps 表示分钟数、sets 填 1。
- 有伤病时避开相关部位的高风险动作。

只返回 JSON，不要解释：
{"summary":"一句话说明计划思路","plans":[{"slot":数字,"title":"如 推 / 胸肩三头","focus":"本次重点","exercises":[{"libraryId":"动作库id或null","name":"动作名","muscle":"肌群","kind":"strength","sets":4,"reps":8,"weight":40,"note":"可选要点"}]}],"tips":["2-4 条执行建议"]}`

  const text = await callLlm(cfg, {
    system: `${persona}\n\n用户数据：\n${contextText(context, { library: true })}`,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 4000,
    temperature: 0.4,
  })
  const parsed = extractJson<{ summary?: string; plans?: GeneratedPlan[]; tips?: string[] }>(text)
  const libraryById = new Map(context.library.map((item) => [item.id, item]))
  const libraryByName = new Map(context.library.map((item) => [item.name, item]))

  const plans = slots.map((slot, index) => {
    const source = (parsed.plans ?? []).find((plan) => Number(plan.slot) === slot) ?? (parsed.plans ?? [])[index] ?? {}
    const exercises = (source.exercises ?? []).slice(0, 10).flatMap((exercise) => {
      const match = (exercise.libraryId && libraryById.get(String(exercise.libraryId))) || (exercise.name ? libraryByName.get(exercise.name.trim()) : undefined)
      const name = match?.name ?? (exercise.name ?? "").trim()
      if (!name) return []
      const kind = match?.kind ?? (exercise.kind === "cardio" || exercise.kind === "duration" ? exercise.kind : "strength")
      return [
        {
          libraryExerciseId: match?.id ?? null,
          name,
          muscleGroup: match?.muscle ?? (exercise.muscle || "训练"),
          kind,
          defaultSets: kind === "cardio" ? 1 : Math.max(1, Math.min(10, Math.round(num(exercise.sets, 3)))),
          defaultReps: Math.max(1, Math.min(kind === "duration" ? 600 : kind === "cardio" ? 180 : 50, Math.round(num(exercise.reps, 10)))),
          defaultWeight: Math.max(0, Math.min(500, num(exercise.weight, 0))),
          note: typeof exercise.note === "string" ? exercise.note.slice(0, 80) : "",
        },
      ]
    })
    return {
      weekday: slot,
      label: slotLabel(slot),
      title: (source.title || `${slotLabel(slot)}训练`).slice(0, 40),
      focus: (source.focus ?? "").slice(0, 80),
      exercises,
    }
  })

  if (!plans.some((plan) => plan.exercises.length)) {
    throw new AiError(502, "模型没有给出可用的动作，请重试或换一个模型")
  }

  return {
    mode,
    rotationSlots: mode === "rotation" ? slotCount : null,
    summary: (parsed.summary ?? "").slice(0, 300),
    tips: (parsed.tips ?? []).filter((tip) => typeof tip === "string").slice(0, 5),
    plans,
  }
}

// ---------------------------------------------------------------------------
// "What can I still eat today?"
// ---------------------------------------------------------------------------

type MealOption = { title?: string; mealType?: string; reason?: string; items?: Array<{ name?: string; calories?: number; protein?: number; carbs?: number; fat?: number }> }

export async function suggestMeals(config: AiConfig | null, context: CoachContext, input: { note?: string }) {
  const cfg = requireAiConfig(config)
  const hour = context.hour
  const nextMeal = hour < 10 ? "早餐" : hour < 15 ? "午餐" : hour < 21 ? "晚餐" : "夜宵 / 加餐"
  const prompt = `现在 ${hour} 点。根据用户今天剩余的热量与三大营养素，推荐接下来 3 个可选的${nextMeal}方案。
- 方案总量尽量贴近剩余额度（不要超过剩余热量 10%）；如果剩余热量很少或已超标，给出低热量高蛋白的轻食或建议不再进食。
- 优先使用用户「常吃」里的食物，其次是在中国容易买到 / 做的家常、外卖、便利店食物；每项写清份量。
- 3 个方案风格不同（如：家里做 / 外卖 / 便利店）。
- 用户补充：${input.note?.trim() || "无"}

只返回 JSON：
{"options":[{"title":"方案名","mealType":"breakfast|lunch|dinner|breakfastSnack|lunchSnack|dinnerSnack","reason":"一句话说明为什么适合","items":[{"name":"食物（份量）","calories":0,"protein":0,"carbs":0,"fat":0}]}],"advice":"一句总体建议"}`

  const text = await callLlm(cfg, {
    system: `${persona}\n\n用户数据：\n${contextText(context)}`,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 2500,
    temperature: 0.7,
  })
  const parsed = extractJson<{ options?: MealOption[]; advice?: string }>(text)
  const allowedTypes = ["breakfast", "lunch", "dinner", "breakfastSnack", "lunchSnack", "dinnerSnack"]
  const fallbackType = hour < 10 ? "breakfast" : hour < 15 ? "lunch" : hour < 21 ? "dinner" : "dinnerSnack"

  const options = (parsed.options ?? []).slice(0, 4).flatMap((option) => {
    const items = (option.items ?? [])
      .filter((item) => item && typeof item.name === "string" && item.name.trim())
      .slice(0, 8)
      .map((item) => ({
        name: String(item.name).trim().slice(0, 60),
        calories: Math.max(0, num(item.calories)),
        protein: Math.max(0, num(item.protein)),
        carbs: Math.max(0, num(item.carbs)),
        fat: Math.max(0, num(item.fat)),
      }))
    if (!items.length) return []
    const total = items.reduce(
      (acc, item) => ({ calories: acc.calories + item.calories, protein: acc.protein + item.protein, carbs: acc.carbs + item.carbs, fat: acc.fat + item.fat }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )
    return [
      {
        title: (option.title ?? "方案").slice(0, 30),
        mealType: allowedTypes.includes(String(option.mealType)) ? String(option.mealType) : fallbackType,
        reason: (option.reason ?? "").slice(0, 120),
        items,
        calories: Math.round(total.calories),
        protein: Math.round(total.protein * 10) / 10,
        carbs: Math.round(total.carbs * 10) / 10,
        fat: Math.round(total.fat * 10) / 10,
      },
    ]
  })

  if (!options.length) {
    throw new AiError(502, "模型没有给出可用的方案，请重试")
  }

  return { remaining: context.remaining, eaten: context.eaten, goals: context.goals, advice: (parsed.advice ?? "").slice(0, 200), options }
}

// ---------------------------------------------------------------------------
// Monthly review
// ---------------------------------------------------------------------------

export async function monthlyReview(config: AiConfig | null, context: CoachContext) {
  const cfg = requireAiConfig(config)
  const prompt = `请基于用户近 30 天的数据做一次月度复盘，用 Markdown 输出，结构如下（每部分 2–4 条，引用具体数字）：
## 本月概况
## 训练
（频率是否稳定、哪些动作在进步、哪些停滞以及原因推测）
## 饮食
（热量与蛋白质的达成情况、规律）
## 体重
（趋势是否符合目标；数据不足就说明需要更多记录）
## 下个月建议
（3–5 条具体可执行的调整，如：某动作减载一周、热量目标调整多少 kcal、每周训练次数）
不要编造数据；某项没有数据就简短说明。`

  const text = await callLlm(cfg, {
    system: `${persona}\n\n用户数据：\n${contextText(context)}`,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 2500,
    temperature: 0.4,
  })

  return {
    text: text.trim(),
    stats: {
      sessions: context.training.sessions30,
      perWeek: context.training.perWeek,
      avgCalories: context.nutrition.avgCalories,
      avgProtein: context.nutrition.avgProtein,
      loggedDays: context.nutrition.loggedDays,
      weightChange:
        context.weight.firstThisMonth !== null && context.weight.lastThisMonth !== null
          ? Math.round((context.weight.lastThisMonth - context.weight.firstThisMonth) * 10) / 10
          : null,
    },
  }
}
