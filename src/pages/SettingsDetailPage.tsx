import { Bell, Download, Globe, Lock, LogOut, Moon, Smartphone, Sun, Trash2, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, InputWithSuffix, SegmentedControl, SectionHeader, Switch } from "@/components/ui/controls"
import { ConfirmDialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import * as api from "@/lib/api"
import type { ReminderSettings } from "@/lib/api"
import { useAppData } from "@/lib/app-data"
import { formatNumber, parseDecimal } from "@/lib/format"
import { requestNotificationPermission } from "@/lib/reminders"
import { useSubmitLock } from "@/lib/use-submit-lock"
import { useTheme, type ThemeMode } from "@/lib/theme"
import { AiSettingsPanel } from "@/pages/AiSettingsPanel"

export function SettingsDetailPage() {
  const section = useParams().section ?? "goals"
  const { data } = useAppData()

  if (!data) {
    return null
  }

  if (section === "profile") return <ProfileSettings />
  if (section === "ai") return <AiSettingsPanel />
  if (section === "reminders") return <ReminderSettingsPanel />
  if (section === "appearance") return <AppearanceSettings />
  if (section === "data") return <DataSettings />
  if (section === "privacy") return <PrivacySettings />
  return <GoalSettings />
}

function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  } catch {
    return ""
  }
}

function ProfileSettings() {
  const { data, saveProfile } = useAppData()
  const { showToast } = useToast()
  const saveSubmit = useSubmitLock()
  const profile = data!.profile
  const [form, setForm] = useState({
    name: profile.name,
    height: profile.heightCm ? String(profile.heightCm) : "",
    weight: profile.weightKg ? String(profile.weightKg) : "",
  })
  const deviceZone = deviceTimeZone()
  const timezone = data!.settings.timezone

  async function save(nextTimezone?: string) {
    await saveSubmit.run(async () => {
      await saveProfile({
        name: form.name.trim() || "我",
        heightCm: parseDecimal(form.height, 0, 1) || null,
        weightKg: parseDecimal(form.weight, 0, 1) || null,
        goals: profile.goals,
        timezone: nextTimezone,
      })
      showToast({ title: "已保存" })
    })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <Field label="昵称">
            <Input value={form.name} maxLength={40} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="身高">
              <InputWithSuffix suffix="cm" inputMode="decimal" value={form.height} onChange={(event) => setForm((current) => ({ ...current, height: event.target.value }))} />
            </Field>
            <Field label="体重">
              <InputWithSuffix suffix="kg" inputMode="decimal" value={form.weight} onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))} />
            </Field>
          </div>
          <Button className="w-full" onClick={() => save()} disabled={saveSubmit.pending}>
            保存
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <SectionHeader title="时区" />
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary" />
              <div className="min-w-0">
                <p className="font-medium">{timezone}</p>
                <p className="text-xs text-muted-foreground">用于划分「每天」的起止时间</p>
              </div>
            </div>
            {deviceZone && deviceZone !== timezone ? (
              <Button variant="secondary" className="w-full" onClick={() => save(deviceZone)} disabled={saveSubmit.pending}>
                改用本机时区（{deviceZone}）
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function GoalSettings() {
  const { data, saveProfile, saveSettings } = useAppData()
  const { showToast } = useToast()
  const profile = data!.profile
  const [goals, setGoals] = useState({
    calories: String(profile.goals.calories),
    protein: String(profile.goals.protein),
    carbs: String(profile.goals.carbs),
    fat: String(profile.goals.fat),
  })
  const saveSubmit = useSubmitLock()
  const macroCalories = parseDecimal(goals.protein) * 4 + parseDecimal(goals.carbs) * 4 + parseDecimal(goals.fat) * 9
  const [waterGoal, setWaterGoal] = useState(String(data!.settings.waterGoal))

  async function saveGoals() {
    await saveSubmit.run(async () => {
      await saveProfile({
        name: profile.name,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        goals: {
          calories: parseDecimal(goals.calories) || 2200,
          protein: parseDecimal(goals.protein) || 150,
          carbs: parseDecimal(goals.carbs) || 240,
          fat: parseDecimal(goals.fat) || 70,
        },
      })
      const water = Math.round(parseDecimal(waterGoal))
      if (water !== data!.settings.waterGoal && water >= 500 && water <= 6000) {
        await saveSettings({ waterGoal: water })
      }
      showToast({ title: "目标已保存" })
    })
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <Field label="每日热量">
          <InputWithSuffix suffix="kcal" inputMode="numeric" value={goals.calories} onChange={(event) => setGoals((current) => ({ ...current, calories: event.target.value }))} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["protein", "蛋白质"],
              ["carbs", "碳水"],
              ["fat", "脂肪"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <InputWithSuffix suffix="g" inputMode="numeric" value={goals[key]} onChange={(event) => setGoals((current) => ({ ...current, [key]: event.target.value }))} />
            </Field>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 px-4 py-3 text-sm">
          <span className="text-muted-foreground">按三大营养素折算</span>
          <span className="font-semibold tabular-nums">{formatNumber(macroCalories, 0)} kcal</span>
        </div>
        {Math.abs(macroCalories - parseDecimal(goals.calories)) > 150 ? (
          <Button variant="ghost" className="w-full text-primary" onClick={() => setGoals((current) => ({ ...current, calories: String(Math.round(macroCalories)) }))}>
            用折算值作为热量目标
          </Button>
        ) : null}
        <Field label="每日饮水" hint="500–6000 ml">
          <InputWithSuffix suffix="ml" inputMode="numeric" value={waterGoal} onChange={(event) => setWaterGoal(event.target.value)} />
        </Field>
        <Button className="w-full" onClick={saveGoals} disabled={saveSubmit.pending}>
          保存
        </Button>
      </CardContent>
    </Card>
  )
}

function ReminderSettingsPanel() {
  const { data, saveReminders } = useAppData()
  const { showToast } = useToast()
  const [reminders, setReminders] = useState<ReminderSettings>(data!.settings.reminders)
  const [permission, setPermission] = useState<string>(() => ("Notification" in window ? Notification.permission : "unsupported"))
  const saveSubmit = useSubmitLock()

  async function enableNotifications() {
    const result = await requestNotificationPermission()
    setPermission(result)
    showToast(result === "granted" ? { title: "通知已开启" } : { title: "未获得通知权限", description: "可在浏览器或系统设置中允许。", tone: "error" })
  }

  async function save() {
    await saveSubmit.run(async () => {
      await saveReminders(reminders)
      showToast({ title: "已保存" })
    })
  }

  const rows = [
    { key: "workout" as const, label: "训练提醒" },
    { key: "meal" as const, label: "饮食提醒" },
  ]

  return (
    <div className="space-y-5">
      {permission !== "granted" ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Bell className="h-5 w-5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              {permission === "unsupported" ? "当前浏览器不支持通知。iPhone 需先「添加到主屏幕」。" : "需要允许通知才能收到提醒。"}
            </p>
            {permission !== "unsupported" ? (
              <Button size="sm" onClick={enableNotifications}>
                允许
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 px-3 py-3">
              <span className="font-medium">{row.label}</span>
              <span className="flex items-center gap-3">
                <Input
                  className="h-10 w-28 text-center"
                  type="time"
                  value={reminders[row.key].time}
                  disabled={!reminders[row.key].enabled}
                  onChange={(event) => setReminders((current) => ({ ...current, [row.key]: { ...current[row.key], time: event.target.value } }))}
                />
                <Switch
                  label={row.label}
                  checked={reminders[row.key].enabled}
                  onChange={(enabled) => setReminders((current) => ({ ...current, [row.key]: { ...current[row.key], enabled } }))}
                />
              </span>
            </div>
          ))}
          <div className="space-y-3 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">每周回顾</span>
              <span className="flex items-center gap-3">
                <Input
                  className="h-10 w-28 text-center"
                  type="time"
                  value={reminders.weekly.time}
                  disabled={!reminders.weekly.enabled}
                  onChange={(event) => setReminders((current) => ({ ...current, weekly: { ...current.weekly, time: event.target.value } }))}
                />
                <Switch
                  label="每周回顾"
                  checked={reminders.weekly.enabled}
                  onChange={(enabled) => setReminders((current) => ({ ...current, weekly: { ...current.weekly, enabled } }))}
                />
              </span>
            </div>
            {reminders.weekly.enabled ? (
              <SegmentedControl
                options={["一", "二", "三", "四", "五", "六", "日"].map((label, index) => ({ value: index + 1, label }))}
                value={reminders.weekly.day}
                onChange={(day) => setReminders((current) => ({ ...current, weekly: { ...current.weekly, day } }))}
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">提醒由本机浏览器发出，需要 FitNote 在后台保持打开（例如已添加到主屏幕）。</p>

      <Button className="w-full" size="lg" onClick={save} disabled={saveSubmit.pending}>
        保存
      </Button>
    </div>
  )
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const options: Array<{ value: ThemeMode; label: React.ReactNode }> = [
    { value: "system", label: <span className="flex items-center justify-center gap-1"><Smartphone className="h-4 w-4" />自动</span> },
    { value: "light", label: <span className="flex items-center justify-center gap-1"><Sun className="h-4 w-4" />浅色</span> },
    { value: "dark", label: <span className="flex items-center justify-center gap-1"><Moon className="h-4 w-4" />深色</span> },
  ]

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <SegmentedControl options={options} value={theme} onChange={setTheme} />
        <p className="px-1 text-xs text-muted-foreground">外观设置仅保存在这台设备上。</p>
      </CardContent>
    </Card>
  )
}

function DataSettings() {
  const { exportData, importData, clearData } = useAppData()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [pendingImport, setPendingImport] = useState<unknown>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const exportSubmit = useSubmitLock()
  const importSubmit = useSubmitLock()
  const clearSubmit = useSubmitLock()

  async function exportJson() {
    await exportSubmit.run(async () => {
      const payload = await exportData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const now = new Date()
      link.href = url
      link.download = `fitnote-export-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast({ title: "备份已导出" })
    }, "导出失败")
  }

  async function pickFile(file: File | undefined) {
    if (!file) {
      return
    }
    try {
      const parsed = JSON.parse(await file.text())
      if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
        throw new Error("不是 FitNote 备份文件")
      }
      setPendingImport(parsed)
    } catch (caught) {
      showToast({ title: "无法读取文件", description: caught instanceof Error ? caught.message : "", tone: "error" })
    } finally {
      if (fileRef.current) {
        fileRef.current.value = ""
      }
    }
  }

  async function runImport() {
    await importSubmit.run(async () => {
      const counts = await importData(pendingImport)
      setPendingImport(null)
      showToast({ title: "恢复完成", description: `训练 ${counts.workoutSessions ?? 0} 次 · 饮食 ${counts.meals ?? 0} 条` })
    }, "恢复失败")
  }

  async function clear() {
    await clearSubmit.run(async () => {
      await clearData()
      setConfirmClear(false)
      showToast({ title: "已清除" })
    }, "清除失败")
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
          <p>所有记录保存在你自己 Cloudflare 账号下的 D1 数据库里。更新代码、重新部署都不会影响这些数据。</p>
          <p>建议定期导出备份；换账号或迁移部署时，用「从备份恢复」导回。</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
          <button type="button" className="pressable flex w-full items-center gap-3 rounded-[1.25rem] px-3 py-3.5 text-left" onClick={exportJson} disabled={exportSubmit.pending}>
            <Download className="h-5 w-5 text-primary" />
            <span className="flex-1">
              <span className="block font-medium">导出备份</span>
              <span className="block text-xs text-muted-foreground">下载包含全部数据的 JSON 文件</span>
            </span>
          </button>
          <button type="button" className="pressable flex w-full items-center gap-3 rounded-[1.25rem] px-3 py-3.5 text-left" onClick={() => fileRef.current?.click()}>
            <Upload className="h-5 w-5 text-primary" />
            <span className="flex-1">
              <span className="block font-medium">从备份恢复</span>
              <span className="block text-xs text-muted-foreground">用导出的 JSON 替换当前数据</span>
            </span>
          </button>
          <button type="button" className="pressable flex w-full items-center gap-3 rounded-[1.25rem] px-3 py-3.5 text-left" onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-5 w-5 text-danger" />
            <span className="flex-1">
              <span className="block font-medium text-danger">清除所有数据</span>
              <span className="block text-xs text-muted-foreground">训练、饮食、计划、自定义动作和设置</span>
            </span>
          </button>
        </CardContent>
      </Card>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void pickFile(event.target.files?.[0])} />

      <ConfirmDialog
        open={pendingImport !== null}
        title="用备份替换当前数据？"
        description="当前的所有记录会被备份文件中的内容替换。建议先导出一份当前数据。"
        confirmLabel="恢复"
        destructive
        pending={importSubmit.pending}
        onConfirm={runImport}
        onClose={() => setPendingImport(null)}
      />
      <ConfirmDialog
        open={confirmClear}
        title="清除所有数据？"
        description="此操作无法撤销。建议先导出备份。"
        confirmLabel="清除"
        destructive
        pending={clearSubmit.pending}
        onConfirm={clear}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  )
}

function PrivacySettings() {
  const { lock } = useAppData()
  const [session, setSession] = useState<api.SessionInfo | null>(null)

  useEffect(() => {
    api.getSession().then(setSession, () => setSession(null))
  }, [])

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <span className={session?.authRequired ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/14 text-primary" : "flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/18 text-warning"}>
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">{session ? (session.authRequired ? "已开启访问密码" : "未开启访问密码") : "检查中…"}</p>
            <p className="text-sm text-muted-foreground">
              {session?.authRequired ? "没有密码的人无法读取或修改数据。" : "知道网址的人都能看到你的数据。"}
            </p>
          </div>
        </CardContent>
      </Card>

      {session && !session.authRequired ? (
        <Card>
          <CardContent className="space-y-2 p-5 text-sm">
            <p className="font-semibold">如何开启</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
              <li>打开 Cloudflare 控制台 → Workers & Pages → fitnote</li>
              <li>设置 → 变量和机密 → 添加，类型选「机密 Secret」</li>
              <li>
                名称填 <code className="rounded bg-muted px-1 font-mono text-foreground">APP_PASSCODE</code>，值填你的密码，保存
              </li>
            </ol>
            <p className="pt-1 text-xs text-muted-foreground">机密保存在 Cloudflare，不在代码仓库里，重新部署也会保留。</p>
          </CardContent>
        </Card>
      ) : null}

      {session?.authRequired ? (
        <Button variant="secondary" className="w-full" onClick={lock}>
          <LogOut className="h-4 w-4" />
          在这台设备上退出
        </Button>
      ) : null}
    </div>
  )
}
