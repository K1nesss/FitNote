// Self-migrating schema.
//
// Every deploy (yours, a fork's, or a fresh one) brings the D1 database up to the
// current schema on the first request, without any manual `wrangler d1 migrations`
// step. All statements are additive and idempotent: tables are created only if
// missing, columns are added only if missing, and no user row is ever overwritten.
//
// The SQL files in ./migrations are kept for drizzle/wrangler tooling. Names of
// migrations covered here are recorded in `d1_migrations`, so running
// `wrangler d1 migrations apply` afterwards is a harmless no-op.

import { BUILTIN_CATALOG_VERSION, builtinExercises } from "../builtin-exercises"

export const SCHEMA_VERSION = 7

const knownMigrations = [
  "0000_quiet_leopardon.sql",
  "0001_purple_zuras.sql",
  "0002_rapid_roulette.sql",
  "0003_bitter_energizer.sql",
  "0004_durable_storage.sql",
  "0005_progress_tracking.sql",
  "0006_warmup_rpe.sql",
]

const createTables = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    height_cm real,
    weight_kg real,
    created_at integer NOT NULL,
    updated_at integer DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS nutrition_goals (
    user_id text PRIMARY KEY NOT NULL,
    calories real NOT NULL,
    protein real NOT NULL,
    carbs real NOT NULL,
    fat real NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    value text NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS exercise_library (
    id text PRIMARY KEY NOT NULL,
    user_id text,
    name text NOT NULL,
    muscle_group text NOT NULL,
    default_sets integer NOT NULL,
    default_reps integer NOT NULL,
    default_weight real NOT NULL,
    is_builtin integer NOT NULL,
    created_at integer NOT NULL,
    kind text DEFAULT 'strength' NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS workout_plans (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    weekday integer NOT NULL,
    title text NOT NULL,
    created_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS workout_exercises (
    id text PRIMARY KEY NOT NULL,
    plan_id text NOT NULL,
    library_exercise_id text REFERENCES exercise_library(id),
    name text NOT NULL,
    muscle_group text NOT NULL,
    target_sets integer NOT NULL,
    target_reps integer NOT NULL,
    target_weight real NOT NULL,
    sort_order integer NOT NULL,
    archived_at integer,
    kind text DEFAULT 'strength' NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS workout_sessions (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    plan_id text,
    started_at integer NOT NULL,
    finished_at integer,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS workout_sets (
    id text PRIMARY KEY NOT NULL,
    session_id text NOT NULL,
    exercise_id text NOT NULL,
    set_index integer NOT NULL,
    actual_reps integer NOT NULL,
    actual_weight real NOT NULL,
    completed_at integer NOT NULL,
    duration_sec integer,
    distance_m real,
    is_warmup integer DEFAULT 0 NOT NULL,
    rpe real,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON UPDATE no action ON DELETE no action,
    FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS meals (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    meal_type text DEFAULT 'lunch' NOT NULL,
    raw_text text NOT NULL,
    calories real NOT NULL,
    protein real NOT NULL,
    carbs real NOT NULL,
    fat real NOT NULL,
    created_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS meal_items (
    id text PRIMARY KEY NOT NULL,
    meal_id text NOT NULL,
    name text NOT NULL,
    calories real NOT NULL,
    protein real NOT NULL,
    carbs real NOT NULL,
    fat real NOT NULL,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS body_weights (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    date_key text NOT NULL,
    weight real NOT NULL,
    created_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS body_weights_user_date_idx ON body_weights (user_id, date_key)",
  `CREATE TABLE IF NOT EXISTS water_logs (
    id text PRIMARY KEY NOT NULL,
    user_id text NOT NULL,
    date_key text NOT NULL,
    ml integer NOT NULL,
    updated_at integer NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
  )`,
  `CREATE TABLE IF NOT EXISTS fitnote_meta (
    key text PRIMARY KEY NOT NULL,
    value text NOT NULL,
    updated_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS d1_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS meals_user_created_idx ON meals (user_id, created_at)",
  "CREATE INDEX IF NOT EXISTS meal_items_meal_idx ON meal_items (meal_id)",
  "CREATE INDEX IF NOT EXISTS workout_sessions_user_started_idx ON workout_sessions (user_id, started_at)",
  "CREATE INDEX IF NOT EXISTS workout_sets_session_idx ON workout_sets (session_id)",
  "CREATE INDEX IF NOT EXISTS workout_exercises_plan_idx ON workout_exercises (plan_id)",
]

// Columns added after a table was first created. Order matters only within a table.
const addedColumns: Array<{ table: string; column: string; ddl: string }> = [
  { table: "users", column: "height_cm", ddl: "ALTER TABLE users ADD height_cm real" },
  { table: "users", column: "weight_kg", ddl: "ALTER TABLE users ADD weight_kg real" },
  { table: "users", column: "updated_at", ddl: "ALTER TABLE users ADD updated_at integer DEFAULT 0 NOT NULL" },
  {
    table: "workout_exercises",
    column: "library_exercise_id",
    ddl: "ALTER TABLE workout_exercises ADD library_exercise_id text REFERENCES exercise_library(id)",
  },
  { table: "workout_exercises", column: "archived_at", ddl: "ALTER TABLE workout_exercises ADD archived_at integer" },
  { table: "exercise_library", column: "kind", ddl: "ALTER TABLE exercise_library ADD kind text DEFAULT 'strength' NOT NULL" },
  { table: "workout_exercises", column: "kind", ddl: "ALTER TABLE workout_exercises ADD kind text DEFAULT 'strength' NOT NULL" },
  { table: "workout_sets", column: "duration_sec", ddl: "ALTER TABLE workout_sets ADD duration_sec integer" },
  { table: "workout_sets", column: "distance_m", ddl: "ALTER TABLE workout_sets ADD distance_m real" },
  { table: "workout_sets", column: "is_warmup", ddl: "ALTER TABLE workout_sets ADD is_warmup integer DEFAULT 0 NOT NULL" },
  { table: "workout_sets", column: "rpe", ddl: "ALTER TABLE workout_sets ADD rpe real" },
  { table: "meals", column: "meal_type", ddl: "ALTER TABLE meals ADD meal_type text DEFAULT 'lunch' NOT NULL" },
]

// One-time data clean-ups. Each runs once per database, ever.
const dataFixups: Array<{ key: string; statements: string[] }> = [
  {
    // Seed the weight log with the profile weight so the trend has a starting point.
    key: "fixup.seed_body_weight.v1",
    statements: [
      `INSERT OR IGNORE INTO body_weights (id, user_id, date_key, weight, created_at)
       SELECT 'bw-' || id || '-initial', id, strftime('%Y-%m-%d', updated_at / 1000, 'unixepoch', '+8 hours'), weight_kg, updated_at
       FROM users WHERE weight_kg IS NOT NULL AND weight_kg > 0 AND updated_at > 0`,
    ],
  },
  {
    key: "fixup.meal_type_and_rounding.v1",
    statements: [
      "UPDATE meals SET meal_type = 'lunch' WHERE meal_type IS NULL OR meal_type = '' OR meal_type = 'meal'",
      "UPDATE meal_items SET calories = ROUND(calories, 1), protein = ROUND(protein, 1), carbs = ROUND(carbs, 1), fat = ROUND(fat, 1)",
      "UPDATE meals SET calories = ROUND(calories, 1), protein = ROUND(protein, 1), carbs = ROUND(carbs, 1), fat = ROUND(fat, 1)",
    ],
  },
]

let readyPromise: Promise<void> | null = null

/** Runs schema setup once per Worker isolate. */
export function ensureSchema(db: D1Database) {
  if (!readyPromise) {
    readyPromise = migrate(db).catch((error) => {
      readyPromise = null
      throw error
    })
  }

  return readyPromise
}

async function migrate(db: D1Database) {
  const meta = await readMeta(db).catch(() => new Map<string, string>())

  if (meta.get("schema_version") === String(SCHEMA_VERSION) && meta.get("builtin_catalog_version") === BUILTIN_CATALOG_VERSION) {
    return
  }

  await db.batch(createTables.map((sql) => db.prepare(sql)))

  for (const table of new Set(addedColumns.map((item) => item.table))) {
    const columns = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>()
    const existing = new Set((columns.results ?? []).map((column) => column.name))

    for (const item of addedColumns.filter((candidate) => candidate.table === table)) {
      if (!existing.has(item.column)) {
        await runIgnoringDuplicateColumn(db, item.ddl)
      }
    }
  }

  const fresh = await readMeta(db)

  for (const fixup of dataFixups) {
    if (!fresh.has(fixup.key)) {
      await db.batch([...fixup.statements.map((sql) => db.prepare(sql)), metaUpsert(db, fixup.key, "done")])
    }
  }

  if (fresh.get("builtin_catalog_version") !== BUILTIN_CATALOG_VERSION) {
    await syncBuiltinExercises(db)
  }

  await db.batch([
    ...knownMigrations.map((name) => db.prepare("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)").bind(name)),
    metaUpsert(db, "schema_version", String(SCHEMA_VERSION)),
    metaUpsert(db, "builtin_catalog_version", BUILTIN_CATALOG_VERSION),
  ])
}

async function readMeta(db: D1Database) {
  const rows = await db.prepare("SELECT key, value FROM fitnote_meta").all<{ key: string; value: string }>()
  return new Map((rows.results ?? []).map((row) => [row.key, row.value]))
}

function metaUpsert(db: D1Database, key: string, value: string) {
  return db
    .prepare(
      `INSERT INTO fitnote_meta (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, value, Date.now())
}

async function runIgnoringDuplicateColumn(db: D1Database, sql: string) {
  try {
    await db.prepare(sql).run()
  } catch (error) {
    // Another isolate may have added it concurrently.
    if (!(error instanceof Error && /duplicate column/i.test(error.message))) {
      throw error
    }
  }
}

/** Upserts the built-in catalog and removes retired built-ins nobody references. */
export async function syncBuiltinExercises(db: D1Database) {
  const now = Date.now()
  const statements = builtinExercises.map(([id, name, muscle, sets, reps, weight, kind]) =>
    db
      .prepare(
        `INSERT INTO exercise_library (id, user_id, name, muscle_group, default_sets, default_reps, default_weight, is_builtin, created_at, kind)
         VALUES (?, NULL, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, muscle_group = excluded.muscle_group,
           default_sets = excluded.default_sets, default_reps = excluded.default_reps,
           default_weight = excluded.default_weight, is_builtin = 1, kind = excluded.kind
         WHERE exercise_library.is_builtin = 1`,
      )
      .bind(id, name, muscle, sets, reps, weight, now, kind ?? "strength"),
  )

  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50))
  }

  const ids = builtinExercises.map(([id]) => id)
  await db
    .prepare(
      `DELETE FROM exercise_library
       WHERE is_builtin = 1
       AND id NOT IN (${ids.map(() => "?").join(", ")})
       AND id NOT IN (SELECT library_exercise_id FROM workout_exercises WHERE library_exercise_id IS NOT NULL)`,
    )
    .bind(...ids)
    .run()
}
