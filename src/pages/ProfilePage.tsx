import { Bell, ChevronRight, Database, Lock, Moon, Sparkles, Target, UserRound } from "lucide-react"
import { Link } from "react-router-dom"

import { Card, CardContent } from "@/components/ui/card"
import { useAppData } from "@/lib/app-data"
import { formatNumber } from "@/lib/format"
import { useTheme } from "@/lib/theme"

export function ProfilePage() {
  const { theme } = useTheme()
  const { data } = useAppData()

  if (!data) {
    return null
  }

  const reminders = data.settings.reminders
  const reminderCount = [reminders.workout.enabled, reminders.meal.enabled, reminders.weekly.enabled].filter(Boolean).length
  const groups = [
    [
      {
        label: "身体数据",
        value: data.profile.heightCm && data.profile.weightKg ? `${formatNumber(data.profile.heightCm)}cm · ${formatNumber(data.profile.weightKg)}kg` : "未填写",
        icon: UserRound,
        href: "/profile/settings/profile",
      },
      { label: "营养目标", value: `${formatNumber(data.profile.goals.calories, 0)} kcal`, icon: Target, href: "/profile/settings/goals" },
      { label: "AI 识别", value: data.settings.ai?.hasKey ? data.settings.ai.model : "未设置", icon: Sparkles, href: "/profile/settings/ai" },
    ],
    [
      { label: "提醒", value: reminderCount ? `${reminderCount} 项开启` : "关闭", icon: Bell, href: "/profile/settings/reminders" },
      { label: "外观", value: theme === "system" ? "跟随系统" : theme === "dark" ? "深色" : "浅色", icon: Moon, href: "/profile/settings/appearance" },
    ],
    [
      { label: "数据与备份", value: "导出 / 恢复", icon: Database, href: "/profile/settings/data" },
      { label: "访问保护", value: "", icon: Lock, href: "/profile/settings/privacy" },
    ],
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-primary text-2xl font-semibold text-primary-foreground">
            {data.profile.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold">{data.profile.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              累计训练 {data.workoutHistory.length} 次 · 时区 {data.settings.timezone}
            </p>
          </div>
        </CardContent>
      </Card>

      {groups.map((items, index) => (
        <Card key={index}>
          <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
            {items.map((item) => (
              <Link key={item.label} to={item.href} className="pressable flex items-center justify-between gap-3 rounded-[1.25rem] px-3 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="font-medium">{item.label}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                  <span className="truncate">{item.value}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ))}

      <p className="pb-2 text-center text-xs text-muted-foreground">FitNote · 数据保存在你自己的 Cloudflare D1 数据库</p>
    </div>
  )
}
