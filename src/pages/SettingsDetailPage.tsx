import { Bell, Check, Database, Download, Moon, Shield, Sun, Target, Trash2 } from "lucide-react"
import { useState } from "react"
import { useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { ErrorState, LoadingState } from "@/components/ui/state"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import type { ReminderSettings } from "@/lib/api"
import { useAppData } from "@/lib/app-data"
import { requestNotificationPermission } from "@/lib/reminders"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

const titles: Record<string, string> = {
  goals: "目标",
  reminders: "提醒",
  appearance: "外观",
  data: "数据",
  privacy: "隐私",
}

export function SettingsDetailPage() {
  const section = useParams().section ?? "goals"
  const { showToast } = useToast()
  const appData = useAppData()
  const title = titles[section] ?? "设置"

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>{renderSection(section, showToast, appData)}</CardContent>
      </Card>
    </div>
  )
}

function renderSection(
  section: string,
  showToast: (toast: { title: string; description?: string }) => void,
  appData: ReturnType<typeof useAppData>,
) {
  if (section === "goals") {
    return <GoalSettings data={appData.data} onSave={appData.saveProfile} onSaved={() => showToast({ title: "目标已保存" })} />
  }

  if (section === "reminders") {
    return <ReminderSettingsPanel appData={appData} showToast={showToast} />
  }

  if (section === "appearance") {
    return <AppearanceSettings showToast={showToast} />
  }

  if (section === "data") {
    return <DataSettings appData={appData} showToast={showToast} />
  }

  if (section === "privacy") {
    return (
      <div className="space-y-3">
        <div className="rounded-3xl bg-white/70 p-4">
          <Shield className="mb-3 h-5 w-5" />
          <p className="font-medium">仅自己可见</p>
          <p className="mt-1 text-sm text-muted-foreground">数据默认不公开。</p>
        </div>
        <ErrorState title="权限检查失败" description="离线时会使用本地策略。" />
      </div>
    )
  }

  return null
}

function ReminderSettingsPanel({
  appData,
  showToast,
}: {
  appData: ReturnType<typeof useAppData>
  showToast: (toast: { title: string; description?: string }) => void
}) {
  const [reminders, setReminders] = useState<ReminderSettings>(
    appData.data?.settings.reminders ?? {
      workout: { enabled: true, time: "19:00" },
      meal: { enabled: true, time: "12:30" },
      weekly: { enabled: false, day: 7, time: "20:30" },
    },
  )

  async function enableNotifications() {
    const permission = await requestNotificationPermission()
    showToast({ title: permission === "granted" ? "已开启" : "未开启" })
  }

  async function save() {
    await appData.saveReminders(reminders)
    showToast({ title: "已保存" })
  }

  return (
    <div className="space-y-3">
      <ReminderRow
        label="训练"
        enabled={reminders.workout.enabled}
        time={reminders.workout.time}
        onToggle={() =>
          setReminders((current) => ({ ...current, workout: { ...current.workout, enabled: !current.workout.enabled } }))
        }
        onTime={(time) => setReminders((current) => ({ ...current, workout: { ...current.workout, time } }))}
      />
      <ReminderRow
        label="饮食"
        enabled={reminders.meal.enabled}
        time={reminders.meal.time}
        onToggle={() => setReminders((current) => ({ ...current, meal: { ...current.meal, enabled: !current.meal.enabled } }))}
        onTime={(time) => setReminders((current) => ({ ...current, meal: { ...current.meal, time } }))}
      />
      <div className="rounded-3xl bg-white/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-3 font-medium">
            <Bell className="h-5 w-5" />
            周报
          </span>
          <button
            type="button"
            className={cn("h-8 w-14 rounded-full p-1 transition", reminders.weekly.enabled ? "bg-primary" : "bg-muted")}
            onClick={() => setReminders((current) => ({ ...current, weekly: { ...current.weekly, enabled: !current.weekly.enabled } }))}
            aria-label="周报"
          >
            <span className={cn("block h-6 w-6 rounded-full bg-card transition", reminders.weekly.enabled && "translate-x-6")} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            inputMode="numeric"
            value={reminders.weekly.day}
            onChange={(event) =>
              setReminders((current) => ({ ...current, weekly: { ...current.weekly, day: Number(event.target.value) || 7 } }))
            }
          />
          <Input
            type="time"
            value={reminders.weekly.time}
            onChange={(event) => setReminders((current) => ({ ...current, weekly: { ...current.weekly, time: event.target.value } }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="quiet" onClick={enableNotifications}>
          <Bell className="h-4 w-4" />
          权限
        </Button>
        <Button onClick={save}>
          <Check className="h-4 w-4" />
          保存
        </Button>
      </div>
    </div>
  )
}

function ReminderRow({
  label,
  enabled,
  time,
  onToggle,
  onTime,
}: {
  label: string
  enabled: boolean
  time: string
  onToggle: () => void
  onTime: (time: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl bg-white/70 p-4">
      <span className="flex items-center gap-3 font-medium">
        <Bell className="h-5 w-5" />
        {label}
      </span>
      <span className="flex items-center gap-2">
        <Input className="h-10 w-28" type="time" value={time} onChange={(event) => onTime(event.target.value)} />
        <button
          type="button"
          className={cn("h-8 w-14 rounded-full p-1 transition", enabled ? "bg-primary" : "bg-muted")}
          onClick={onToggle}
          aria-label={label}
        >
          <span className={cn("block h-6 w-6 rounded-full bg-card transition", enabled && "translate-x-6")} />
        </button>
      </span>
    </div>
  )
}

function DataSettings({
  appData,
  showToast,
}: {
  appData: ReturnType<typeof useAppData>
  showToast: (toast: { title: string; description?: string }) => void
}) {
  const [confirming, setConfirming] = useState(false)

  async function exportJson() {
    const data = await appData.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `fitnote-export-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    showToast({ title: "已导出" })
  }

  async function clear() {
    await appData.clearData()
    setConfirming(false)
    showToast({ title: "已清除" })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-white/70 p-4 text-sm text-muted-foreground">
        <Database className="mb-3 h-5 w-5" />
        D1 / JSON / 本机通知
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="quiet" onClick={exportJson}>
          <Download className="h-4 w-4" />
          导出
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(true)}>
          <Trash2 className="h-4 w-4" />
          清除
        </Button>
      </div>
      <Dialog open={confirming} title="清除数据" onClose={() => setConfirming(false)}>
        <p className="text-sm text-muted-foreground">训练、饮食、计划和自定义动作会被清除。</p>
        <Button variant="ghost" className="w-full rounded-3xl" onClick={clear}>
          <Trash2 className="h-4 w-4" />
          清除
        </Button>
      </Dialog>
    </div>
  )
}

function AppearanceSettings({ showToast }: { showToast: (toast: { title: string; description?: string }) => void }) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  function selectTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme)
    showToast({ title: nextTheme === "dark" ? "Apple Dark" : "Aqua / Porcelain" })
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-3xl bg-white/70 p-4 text-left transition active:scale-[0.99]"
        onClick={() => selectTheme(isDark ? "light" : "dark")}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </span>
          <span>
            <span className="block font-medium">深色模式</span>
            <span className="block text-sm text-muted-foreground">{isDark ? "Apple Dark" : "Aqua / Porcelain"}</span>
          </span>
        </span>
        <span
          className={cn(
            "relative flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-300",
            isDark ? "bg-primary" : "bg-muted",
          )}
          aria-hidden="true"
        >
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full bg-card shadow-[0_2px_8px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-out",
              isDark && "translate-x-6",
            )}
          >
            {isDark ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
          </span>
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <ThemePreview
          active={!isDark}
          title="Aqua"
          subtitle="Porcelain"
          tone="light"
          onClick={() => selectTheme("light")}
        />
        <ThemePreview
          active={isDark}
          title="Apple"
          subtitle="Dark"
          tone="dark"
          onClick={() => selectTheme("dark")}
        />
      </div>
    </div>
  )
}

function ThemePreview({
  active,
  title,
  subtitle,
  tone,
  onClick,
}: {
  active: boolean
  title: string
  subtitle: string
  tone: "light" | "dark"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-3xl p-3 text-left transition active:scale-95",
        active ? "ring-2 ring-ring" : "ring-1 ring-transparent",
        tone === "light" ? "bg-[#edf9fa] text-[#1b3035]" : "bg-[#111113] text-[#f2f2f7]",
      )}
      onClick={onClick}
    >
      <div className="mb-3 flex h-20 flex-col justify-end rounded-[1.35rem] border border-white/30 bg-white/40 p-2 backdrop-blur-xl">
        <span
          className={cn(
            "mb-2 block h-2 w-12 rounded-full",
            tone === "light" ? "bg-[#45a7bd]" : "bg-[#0a84ff]",
          )}
        />
        <span className="block h-2 w-20 rounded-full bg-current opacity-20" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs opacity-70">{subtitle}</span>
        </span>
        {active ? <Check className="h-4 w-4" /> : null}
      </div>
    </button>
  )
}

function GoalSettings({
  data,
  onSave,
  onSaved,
}: {
  data: ReturnType<typeof useAppData>["data"]
  onSave: ReturnType<typeof useAppData>["saveProfile"]
  onSaved: () => void
}) {
  const [goals, setGoals] = useState({
    calories: String(data?.profile.goals.calories ?? 2200),
    protein: String(data?.profile.goals.protein ?? 150),
    carbs: String(data?.profile.goals.carbs ?? 240),
    fat: String(data?.profile.goals.fat ?? 70),
  })

  async function saveGoals() {
    if (!data) {
      return
    }

    await onSave({
      name: data.profile.name,
      heightCm: data.profile.heightCm,
      weightKg: data.profile.weightKg,
      goals: {
        calories: Number(goals.calories) || 2200,
        protein: Number(goals.protein) || 150,
        carbs: Number(goals.carbs) || 240,
        fat: Number(goals.fat) || 70,
      },
    })
    onSaved()
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="热量 kcal"
        value={goals.calories}
        onChange={(event) => setGoals((current) => ({ ...current, calories: event.target.value }))}
      />
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="P"
          value={goals.protein}
          onChange={(event) => setGoals((current) => ({ ...current, protein: event.target.value }))}
        />
        <Input
          placeholder="C"
          value={goals.carbs}
          onChange={(event) => setGoals((current) => ({ ...current, carbs: event.target.value }))}
        />
        <Input
          placeholder="F"
          value={goals.fat}
          onChange={(event) => setGoals((current) => ({ ...current, fat: event.target.value }))}
        />
      </div>
      <Button className="w-full rounded-3xl" onClick={saveGoals}>
        <Target className="h-4 w-4" />
        保存
      </Button>
    </div>
  )
}
