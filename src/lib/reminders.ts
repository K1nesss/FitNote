import { useEffect } from "react"

import type { ReminderSettings } from "@/lib/api"

const firedKey = "fitnote.reminders.fired"

export function useReminderScheduler(reminders: ReminderSettings | null | undefined) {
  useEffect(() => {
    if (!reminders || !("Notification" in window)) {
      return
    }

    const check = () => {
      if (Notification.permission !== "granted") {
        return
      }

      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const weekday = now.getDay() === 0 ? 7 : now.getDay()
      const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`

      if (reminders.workout.enabled && reminders.workout.time === currentTime) {
        notifyOnce(`workout-${dateKey}`, "训练", "开始今天的训练。")
      }

      if (reminders.meal.enabled && reminders.meal.time === currentTime) {
        notifyOnce(`meal-${dateKey}`, "饮食", "记录这一餐。")
      }

      if (reminders.weekly.enabled && reminders.weekly.day === weekday && reminders.weekly.time === currentTime) {
        notifyOnce(`weekly-${dateKey}`, "周报", "看看本周趋势。")
      }
    }

    check()
    const interval = window.setInterval(check, 60_000)

    return () => window.clearInterval(interval)
  }, [reminders])
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return "unsupported" as const
  }

  if (Notification.permission === "granted") {
    return "granted" as const
  }

  return Notification.requestPermission()
}

function notifyOnce(key: string, title: string, body: string) {
  const fired = readFired()

  if (fired.includes(key)) {
    return
  }

  try {
    new Notification(title, { body, tag: key, icon: "/icon.svg" })
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
    void navigator.serviceWorker?.ready.then((registration) => registration.showNotification(title, { body, tag: key, icon: "/icon.svg" }))
  }

  try {
    localStorage.setItem(firedKey, JSON.stringify([...fired.slice(-20), key]))
  } catch {
    // ignore
  }
}

function readFired() {
  try {
    const parsed = JSON.parse(localStorage.getItem(firedKey) ?? "[]") as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}
