const dayMs = 24 * 60 * 60 * 1000

export function todayKey() {
  return dateKeyFromDate(new Date())
}

export function isDateKey(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = dateFromKey(value)
  return dateKeyFromDate(date) === value
}

export function dateKeyFromDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)

  if (!year || !month || !day) {
    return new Date()
  }

  return new Date(year, month - 1, day)
}

export function addDays(dateKey: string, days: number) {
  const date = dateFromKey(dateKey)
  date.setDate(date.getDate() + days)
  return dateKeyFromDate(date)
}

export function weekdayLabel(dateKey: string) {
  const weekday = dateFromKey(dateKey).getDay()
  return `周${["日", "一", "二", "三", "四", "五", "六"][weekday]}`
}

export function weekdayNumber(dateKey: string) {
  const weekday = dateFromKey(dateKey).getDay()
  return weekday === 0 ? 7 : weekday
}

export function shortMonthDay(dateKey: string) {
  const date = dateFromKey(dateKey)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function relativeDateLabel(dateKey: string) {
  const today = todayKey()

  if (dateKey === today) {
    return "今天"
  }

  if (dateKey === addDays(today, -1)) {
    return "昨天"
  }

  return weekdayLabel(dateKey)
}

export function recentDateKeys() {
  const today = todayKey()
  return [-3, -2, -1, 0].map((offset) => addDays(today, offset))
}

export function timestampOnDate(dateKey: string, timestamp = Date.now()) {
  const source = new Date(timestamp)
  const target = dateFromKey(dateKey)
  target.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), source.getMilliseconds())
  return target.getTime()
}

export function monthGrid(dateKey: string) {
  const active = dateFromKey(dateKey)
  const first = new Date(active.getFullYear(), active.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getTime() + index * dayMs)
    return {
      key: dateKeyFromDate(date),
      day: date.getDate(),
      muted: date.getMonth() !== active.getMonth(),
    }
  })
}
