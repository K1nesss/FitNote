import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const nutritionGoals = sqliteTable("nutrition_goals", {
  userId: text("user_id").primaryKey().references(() => users.id),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const exerciseLibrary = sqliteTable("exercise_library", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  defaultSets: integer("default_sets").notNull(),
  defaultReps: integer("default_reps").notNull(),
  defaultWeight: real("default_weight").notNull(),
  isBuiltin: integer("is_builtin", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  // "strength" | "cardio" | "duration"
  kind: text("kind").notNull().default("strength"),
})

export const workoutPlans = sqliteTable("workout_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  weekday: integer("weekday").notNull(),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const workoutExercises = sqliteTable("workout_exercises", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => workoutPlans.id),
  libraryExerciseId: text("library_exercise_id").references(() => exerciseLibrary.id),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  targetSets: integer("target_sets").notNull(),
  targetReps: integer("target_reps").notNull(),
  targetWeight: real("target_weight").notNull(),
  sortOrder: integer("sort_order").notNull(),
  // Set when an exercise is removed from a plan but still has logged sets.
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  kind: text("kind").notNull().default("strength"),
}, (table) => [index("workout_exercises_plan_idx").on(table.planId)])

export const workoutSessions = sqliteTable("workout_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  planId: text("plan_id").references(() => workoutPlans.id),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
}, (table) => [index("workout_sessions_user_started_idx").on(table.userId, table.startedAt)])

export const workoutSets = sqliteTable("workout_sets", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => workoutSessions.id),
  exerciseId: text("exercise_id").notNull().references(() => workoutExercises.id),
  setIndex: integer("set_index").notNull(),
  actualReps: integer("actual_reps").notNull(),
  actualWeight: real("actual_weight").notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }).notNull(),
  durationSec: integer("duration_sec"),
  distanceM: real("distance_m"),
  isWarmup: integer("is_warmup", { mode: "boolean" }).notNull().default(false),
  rpe: real("rpe"),
}, (table) => [index("workout_sets_session_idx").on(table.sessionId)])

export const meals = sqliteTable("meals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  mealType: text("meal_type").notNull(),
  rawText: text("raw_text").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("meals_user_created_idx").on(table.userId, table.createdAt)])

export const mealItems = sqliteTable("meal_items", {
  id: text("id").primaryKey(),
  mealId: text("meal_id").notNull().references(() => meals.id),
  name: text("name").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
}, (table) => [index("meal_items_meal_idx").on(table.mealId)])

// Internal bookkeeping for the self-migrating schema (see runtime-schema.ts).
export const fitnoteMeta = sqliteTable("fitnote_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const bodyWeights = sqliteTable(
  "body_weights",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    dateKey: text("date_key").notNull(),
    weight: real("weight").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [uniqueIndex("body_weights_user_date_idx").on(table.userId, table.dateKey)],
)

export const waterLogs = sqliteTable("water_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  dateKey: text("date_key").notNull(),
  ml: integer("ml").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})
