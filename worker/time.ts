// Time-zone aware day helpers.
// The app stores UTC timestamps and buckets them into "days" using the owner's
// IANA time zone (saved in app_settings, default Asia/Shanghai).

export const DEFAULT_TIMEZONE = "Asia/Shanghai"
const dayMs = 24 * 60 * 60 * 1000
const formatterCache = new Map<string, Intl.DateTimeFormat>()

let activeTimeZone = DEFAULT_TIMEZONE

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 64) {
    return false
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function setActiveTimeZone(value: unknown) {
  activeTimeZone = isValidTimeZone(value) ? value : DEFAULT_TIMEZONE
}

export function getActiveTimeZone() {
  return activeTimeZone
}

function formatter(timeZone: string) {
  let cached = formatterCache.get(timeZone)

  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    formatterCache.set(timeZone, cached)
  }

  return cached
}

/** Milliseconds to add to a UTC timestamp to get wall-clock time in the active zone. */
function offsetAt(timestamp: number) {
  const parts = formatter(activeTimeZone).formatToParts(new Date(timestamp))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"))
  return asUtc - (timestamp - (((timestamp % 1000) + 1000) % 1000))
}

/** A Date whose UTC fields equal the wall-clock fields in the active zone. */
function wallClock(timestamp: number) {
  return new Date(timestamp + offsetAt(timestamp))
}

export function startOfDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  const utcMidnight = Date.UTC(year, month - 1, day)
  const guess = utcMidnight - offsetAt(utcMidnight)
  return utcMidnight - offsetAt(guess)
}

export function formatDateKey(timestamp: number) {
  const date = wallClock(timestamp)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

export function startOfDay(timestamp: number) {
  return startOfDateKey(formatDateKey(timestamp))
}

export function addDaysToKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day) + days * dayMs)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
}

/** 1 = Monday … 7 = Sunday, in the active zone. */
export function getWeekday(timestamp: number) {
  const day = wallClock(timestamp).getUTCDay()
  return day === 0 ? 7 : day
}

export function formatMonthDay(timestamp: number) {
  const date = wallClock(timestamp)
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`
}

export function hourOf(timestamp: number) {
  return wallClock(timestamp).getUTCHours()
}

export function normalizeDateKey(value: unknown) {
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

/** Moves `fallback`'s time-of-day onto `dateInput` (a YYYY-MM-DD key). */
export function timestampOnDate(dateInput: unknown, fallback: number) {
  const date = normalizeDateKey(dateInput)

  if (!date) {
    return fallback
  }

  const elapsed = Math.max(0, Math.min(dayMs - 1, fallback - startOfDay(fallback)))
  return startOfDateKey(date) + elapsed
}

export { dayMs }
