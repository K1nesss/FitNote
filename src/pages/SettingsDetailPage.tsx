import { Bell, Check, Database, Download, Moon, Shield, Sun, Target, Trash2 } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorState, LoadingState } from "@/components/ui/state"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
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
  const title = titles[section] ?? "设置"

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>{renderSection(section, showToast)}</CardContent>
      </Card>

      <Button asChild variant="quiet" className="w-full">
        <Link to="/profile">返回</Link>
      </Button>
    </div>
  )
}

function renderSection(section: string, showToast: (toast: { title: string; description?: string }) => void) {
  if (section === "goals") {
    return <GoalSettings onSave={() => showToast({ title: "目标已保存" })} />
  }

  if (section === "reminders") {
    return (
      <div className="space-y-3">
        {[
          ["训练提醒", "19:00", Bell],
          ["饮食记录", "12:30", Bell],
          ["周报", "周日", Bell],
        ].map(([label, value, Icon]) => (
          <div key={label as string} className="flex items-center justify-between rounded-3xl bg-white/70 p-4">
            <span className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              <span className="font-medium">{label as string}</span>
            </span>
            <span className="text-sm text-muted-foreground">{value as string}</span>
          </div>
        ))}
      </div>
    )
  }

  if (section === "appearance") {
    return <AppearanceSettings showToast={showToast} />
  }

  if (section === "data") {
    return (
      <div className="space-y-3">
        <LoadingState title="同步检查" />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="quiet" onClick={() => showToast({ title: "已导出" })}>
            <Download className="h-4 w-4" />
            导出
          </Button>
          <Button variant="ghost" onClick={() => showToast({ title: "已清除" })}>
            <Trash2 className="h-4 w-4" />
            清除
          </Button>
        </div>
        <div className="rounded-3xl bg-white/70 p-4 text-sm text-muted-foreground">
          <Database className="mb-3 h-5 w-5" />
          D1 / 本地缓存 / AI 估算记录
        </div>
      </div>
    )
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

function GoalSettings({ onSave }: { onSave: () => void }) {
  const [goals, setGoals] = useState({ calories: "2200", protein: "150", carbs: "240", fat: "70" })

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
      <Button className="w-full rounded-3xl" onClick={onSave}>
        <Target className="h-4 w-4" />
        保存
      </Button>
    </div>
  )
}
