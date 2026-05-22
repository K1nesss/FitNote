import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
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
  name: text("name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  targetSets: integer("target_sets").notNull(),
  targetReps: integer("target_reps").notNull(),
  targetWeight: real("target_weight").notNull(),
  sortOrder: integer("sort_order").notNull(),
})

export const workoutSessions = sqliteTable("workout_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  planId: text("plan_id").references(() => workoutPlans.id),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
})

export const workoutSets = sqliteTable("workout_sets", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => workoutSessions.id),
  exerciseId: text("exercise_id").notNull().references(() => workoutExercises.id),
  setIndex: integer("set_index").notNull(),
  actualReps: integer("actual_reps").notNull(),
  actualWeight: real("actual_weight").notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }).notNull(),
})

export const meals = sqliteTable("meals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  rawText: text("raw_text").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

export const mealItems = sqliteTable("meal_items", {
  id: text("id").primaryKey(),
  mealId: text("meal_id").notNull().references(() => meals.id),
  name: text("name").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
})
