import { Check, ChevronRight, CloudUpload, Droplet, Dumbbell, Minus, Plus, Scale, Utensils } from "lucide-react"
import { useRef, useState } from "react"
import { Link } from "react-router-dom"

import { averageWeight, WeightDialog } from "@/components/body/WeightDialog"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ProgressBar, SectionHeader } from "@/components/ui/controls"
import { useToast } from "@/components/ui/toast"
import { slotLabel } from "@/lib/api"
import { useAppData } from "@/lib/app-data"
import { addDays, todayKey } from "@/lib/date"
import { useSubmitLock } from "@/lib/use-submit-lock"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

export function DashboardPage() {
  const { data, pendingSessions, syncPendingSessions, saveWater } = useAppData()
  const [weightOpen, setWeightOpen] = useState(false)
  const waterSubmit = useSubmitLock()
  const { showToast } = useToast()
  const queuedNotice = useRef(false)

  if (!data) {
    return null
  }

  const localToday = todayKey()
  const latestWeight = data.bodyWeights[data.bodyWeights.length - 1]
  const avg7 = averageWeight(data.bodyWeights, localToday, 7)
  const avgPrev = averageWeight(data.bodyWeights, addDays(localToday, -7), 7)
  const weightChange = avg7 !== null && avgPrev !== null ? Math.round((avg7 - avgPrev) * 10) / 10 : null
  const loggedDays = data.stats.foodTrend.filter((day) => day.calories > 0)
  const avgCalories = loggedDays.length ? loggedDays.reduce((sum, day) => sum + day.calories, 0) / loggedDays.length : 0
  const waterGoal = data.settings.waterGoal
  const water = data.waterToday

  function addWater(delta: number) {
    void waterSubmit.run(async () => {
      const result = await saveWater({ date: localToday, ml: Math.max(0, water + delta) })
      navigator.vibrate?.(15)
      if (result === "queued" && !queuedNotice.current) {
        queuedNotice.current = true
        showToast({ title: "离线中，饮水已记在本机", description: "联网后会自动同步" })
      }
    })
  }

  const today = new Date()
  const todayMacro = data.todayMacro
  const goals = data.profile.goals
  const remaining = Math.round(goals.calories - todayMacro.calories)
  const todayPlan = data.todayPlan
  const trainedToday = data.workoutHistory.some((session) => session.dateKey === data.todayKey)
  const trainedKeys = new Set(data.stats.trainingDays.map((day) => day.dateKey))
  const macroItems = [
    { label: "蛋白质", value: todayMacro.protein, goal: goals.protein },
    { label: "碳水", value: todayMacro.carbs, goal: goals.carbs },
    { label: "脂肪", value: todayMacro.fat, goal: goals.fat },
  ]

  return (
    <div className="space-y-5">
      {pendingSessions > 0 ? (
        <button
          type="button"
          onClick={() => void syncPendingSessions()}
          className="flex w-full items-center gap-3 rounded-[1.5rem] bg-warning/14 px-4 py-3 text-left text-sm"
        >
          <CloudUpload className="h-5 w-5 shrink-0 text-warning" />
          <span className="flex-1">{pendingSessions} 条记录保存在本机，联网后会自动同步</span>
          <span className="font-medium text-primary">立即同步</span>
        </button>
      ) : null}

      <p className="-mt-1 px-1 text-sm font-medium text-muted-foreground">
        {today.getMonth() + 1}月{today.getDate()}日 · 周{"日一二三四五六"[today.getDay()]} · 你好，{data.profile.name}
      </p>

      <Card>
        <CardContent className="p-5">
          <Link to="/food" className="flex items-center gap-5" aria-label="查看今日饮食">
            <CalorieRing value={todayMacro.calories} goal={goals.calories} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">{remaining >= 0 ? "还可以吃" : "已超出"}</p>
              <p className={cn("mt-0.5 text-[34px] font-bold leading-none tracking-tight tabular-nums", remaining < 0 && "text-warning")}>
                {formatNumber(Math.abs(remaining), 0)}
                <span className="ml-1 text-base font-medium text-muted-foreground">kcal</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                已摄入 {formatNumber(todayMacro.calories, 0)} / 目标 {formatNumber(goals.calories, 0)}
              </p>
            </div>
          </Link>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {macroItems.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-baseline justify-between gap-1">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <ProgressBar value={item.value} max={item.goal} />
                <p className="mt-1.5 text-sm font-semibold tabular-nums">
                  {formatNumber(item.value)}
                  <span className="font-normal text-muted-foreground">/{formatNumber(item.goal)}g</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <SectionHeader
          title="今日训练"
          action={
            <Link to="/workout/plan" className="flex h-11 items-center gap-0.5 text-sm font-medium text-primary">
              计划
              <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />
        <Card>
          <CardContent className="p-5">
            {todayPlan?.exercises.length ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{todayPlan.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {todayPlan.weekday > 100 ? `循环 ${slotLabel(todayPlan.weekday)} · ` : ""}
                      {todayPlan.exercises.length} 个动作 · {todayPlan.exercises.reduce((sum, item) => sum + item.sets, 0)} 组
                    </p>
                  </div>
                  {trainedToday ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
                      <Check className="h-3.5 w-3.5" />
                      已完成
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {todayPlan.exercises.slice(0, 4).map((exercise) => (
                    <span key={exercise.id} className="rounded-full bg-muted/60 px-3 py-1 text-[13px] font-medium">
                      {exercise.name}
                    </span>
                  ))}
                  {todayPlan.exercises.length > 4 ? (
                    <span className="rounded-full bg-muted/40 px-3 py-1 text-[13px] text-muted-foreground">+{todayPlan.exercises.length - 4}</span>
                  ) : null}
                </div>
                <Button asChild size="lg" className="mt-4 w-full" variant={trainedToday ? "secondary" : "default"}>
                  <Link to="/workout/session">
                    <Dumbbell className="h-5 w-5" />
                    {trainedToday ? "再练一次" : "开始训练"}
                  </Link>
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">今天是休息日</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">没有安排训练动作</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button asChild size="sm">
                    <Link to="/workout/session">自由训练</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/workout/plan">安排计划</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionHeader
          title="今日饮食"
          action={
            <Link to="/food" className="flex h-11 items-center gap-1 text-sm font-medium text-primary">
              <Plus className="h-4 w-4" />
              记录
            </Link>
          }
        />
        <Card>
          <CardContent className="p-2">
            {data.todayMeals.length ? (
              data.todayMeals.map((meal) => (
                <Link
                  key={meal.id}
                  to="/food"
                  className="pressable flex items-center justify-between gap-3 rounded-[1.4rem] px-3 py-3 transition"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/60">
                      <Utensils className="h-[18px] w-[18px] text-muted-foreground" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{meal.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {meal.items.length ? meal.items.map((item) => item.name).join("、") : `蛋白质 ${formatNumber(meal.protein)}g`}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatNumber(meal.calories, 0)} kcal</span>
                </Link>
              ))
            ) : (
              <Link to="/food" className="pressable flex items-center justify-between gap-3 rounded-[1.4rem] px-3 py-4">
                <span className="text-sm text-muted-foreground">今天还没有记录</span>
                <span className="text-sm font-medium text-primary">去记录</span>
              </Link>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between">
              <Link to="/stats/weight" className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Scale className="h-4 w-4 text-primary" />
                体重
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary active:scale-90" onClick={() => setWeightOpen(true)} aria-label="记录体重">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {latestWeight ? formatNumber(latestWeight.weight, 1) : "–"}
              <span className="ml-1 text-xs font-medium text-muted-foreground">kg</span>
            </p>
            <p className="mt-auto pt-1 text-xs text-muted-foreground tabular-nums">
              {weightChange !== null ? `7 天均值 ${weightChange > 0 ? "+" : ""}${formatNumber(weightChange, 1)} kg` : latestWeight?.date === localToday ? "今天已记录" : "点 + 记录今天体重"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col p-4">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Droplet className="h-4 w-4 text-primary" />
              饮水
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {formatNumber(water, 0)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">/ {formatNumber(waterGoal, 0)} ml</span>
            </p>
            <ProgressBar className="mt-2" value={water} max={waterGoal} />
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-1.5">
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground active:scale-90 disabled:opacity-40" onClick={() => addWater(-250)} disabled={water <= 0 || waterSubmit.pending} aria-label="减少 250 毫升">
                <Minus className="h-4 w-4" />
              </button>
              <button type="button" className="h-8 rounded-full bg-primary/12 text-xs font-semibold text-primary active:scale-95 disabled:opacity-60" onClick={() => addWater(250)} disabled={waterSubmit.pending}>
                +250 ml
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <SectionHeader title="近 7 天" />
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["训练", `${data.stats.trainingCount7d} 次`],
                ["日均热量", loggedDays.length ? `${formatNumber(avgCalories, 0)}` : "–"],
                ["体重变化", weightChange !== null ? `${weightChange > 0 ? "+" : ""}${formatNumber(weightChange, 1)}` : "–"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-muted/45 py-2.5">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {data.stats.foodTrend.map((day) => {
                const trained = trainedKeys.has(day.date)
                const isToday = day.date === data.todayKey
                const ratio = goals.calories > 0 ? Math.min(day.calories / goals.calories, 1) : 0
                return (
                  <Link key={day.date} to={`/food?date=${day.date}`} className="flex flex-col items-center gap-1.5" aria-label={`${day.date} ${formatNumber(day.calories, 0)} kcal${trained ? "，已训练" : ""}`}>
                    <span className={cn("text-[11px] font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{day.day}</span>
                    <span className="relative flex h-9 w-9 items-center justify-center">
                      <MiniRing ratio={ratio} />
                      {trained ? <Dumbbell className="absolute h-3.5 w-3.5 text-primary" /> : null}
                    </span>
                  </Link>
                )
              })}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">圆环为当天热量完成度，哑铃表示当天有训练</p>
          </CardContent>
        </Card>
      </section>

      <WeightDialog open={weightOpen} onClose={() => setWeightOpen(false)} />
    </div>
  )
}

function CalorieRing({ value, goal }: { value: number; goal: number }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const ratio = goal > 0 ? value / goal : 0
  const offset = circumference * (1 - Math.min(ratio, 1))

  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("ring-progress", ratio > 1 ? "stroke-warning" : "stroke-primary")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none tabular-nums">{Math.round(ratio * 100)}%</span>
        <span className="mt-1 text-[10px] text-muted-foreground">热量</span>
      </div>
    </div>
  )
}

function MiniRing({ ratio }: { ratio: number }) {
  const radius = 15
  const circumference = 2 * Math.PI * radius
  return (
    <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
      <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="4" className="stroke-muted" />
      {ratio > 0 ? (
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="stroke-primary/70"
        />
      ) : null}
    </svg>
  )
}
