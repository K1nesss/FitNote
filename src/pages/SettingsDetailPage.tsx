import { Bell, Database, Download, Moon, Shield, Target, Trash2 } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorState, LoadingState } from "@/components/ui/state"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"

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
    return (
      <div className="grid grid-cols-3 gap-2">
        {["系统", "浅色", "深色"].map((item) => (
          <button
            key={item}
            className="rounded-3xl bg-white/70 p-4 text-center font-medium transition active:scale-95"
            onClick={() => showToast({ title: "外观已更新", description: item })}
          >
            <Moon className="mx-auto mb-2 h-5 w-5" />
            {item}
          </button>
        ))}
      </div>
    )
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
          <Button variant="ghost" onClick={() => showToast({ title: "已清除本地缓存" })}>
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
