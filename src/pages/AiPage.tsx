import { ArrowUp, CalendarRange, Check, ChefHat, Dumbbell, LineChart, Loader2, RotateCcw, Settings2, Sparkles } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { createPortal } from "react-dom"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, SegmentedControl, Stepper } from "@/components/ui/controls"
import { ConfirmDialog, Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import * as api from "@/lib/api"
import { useAppData } from "@/lib/app-data"
import { todayKey } from "@/lib/date"
import { Markdown } from "@/lib/markdown"
import { cn } from "@/lib/utils"
import { mealDraftStorageKey, mealTypeOptions } from "@/pages/FoodPage"

// ---------------------------------------------------------------------------
// Conversation model (kept on this device only)
// ---------------------------------------------------------------------------

type AiMessage =
  | { id: string; role: "user"; kind: "text"; content: string }
  | { id: string; role: "assistant"; kind: "text"; content: string }
  | { id: string; role: "assistant"; kind: "error"; content: string; retry?: RetryAction }
  | { id: string; role: "assistant"; kind: "plan"; content: string; plan: api.GeneratedPlan; applied?: boolean }
  | { id: string; role: "assistant"; kind: "meals"; content: string; meals: api.MealSuggestionResult }
  | { id: string; role: "assistant"; kind: "review"; content: string; review: api.MonthlyReviewResult }

type RetryAction = { type: "chat" } | { type: "plan"; input: api.PlanGeneratorInput } | { type: "meals"; note: string } | { type: "review" }

const chatStorageKey = "fitnote.aiChat"
const maxStoredMessages = 60

function readChat(): AiMessage[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(chatStorageKey) ?? "[]") as AiMessage[]
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : []
  } catch {
    return []
  }
}

function writeChat(messages: AiMessage[]) {
  try {
    localStorage.setItem(chatStorageKey, JSON.stringify(messages.slice(-maxStoredMessages)))
  } catch {
    // Storage full or blocked: the conversation just won't survive a reload.
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** What the model sees as history: text turns plus one-line summaries of tool results. */
function toHistory(messages: AiMessage[]): api.ChatTurn[] {
  return messages
    .filter((message) => message.kind !== "error")
    .map((message) => ({ role: message.role, content: message.content }))
    .filter((turn) => turn.content.trim())
}

const goalOptions = ["增肌", "减脂", "力量", "保持健康"] as const
const levelOptions = ["新手", "有基础", "进阶"] as const
const equipmentOptions = ["健身房", "哑铃", "徒手"] as const
const weekdayNames = ["一", "二", "三", "四", "五", "六", "日"]

const quickPrompts = ["我最近哪个动作卡住了？", "今天练什么比较好？", "蛋白质每天吃够了吗？"]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AiPage() {
  const { data } = useAppData()
  const { showToast } = useToast()
  const [messages, setMessages] = useState<AiMessage[]>(readChat)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState<null | "chat" | "plan" | "meals" | "review">(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [mealOpen, setMealOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const configured = Boolean(data?.settings.ai?.hasKey)

  useEffect(() => writeChat(messages), [messages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, busy])

  function push(message: AiMessage) {
    setMessages((current) => [...current, message])
  }

  function fail(error: unknown, retry: RetryAction) {
    push({ id: newId(), role: "assistant", kind: "error", content: error instanceof Error ? error.message : "请求失败，请稍后再试", retry })
  }

  async function sendChat(text: string, base?: AiMessage[]) {
    const content = text.trim()
    if (!content || busy) return
    const userMessage: AiMessage = { id: newId(), role: "user", kind: "text", content }
    const next = [...(base ?? messages), userMessage]
    setMessages(next)
    setInput("")
    await runChat(next)
  }

  async function runChat(thread: AiMessage[]) {
    setBusy("chat")
    try {
      const result = await api.aiChat(toHistory(thread))
      push({ id: newId(), role: "assistant", kind: "text", content: result.text })
    } catch (error) {
      fail(error, { type: "chat" })
    } finally {
      setBusy(null)
    }
  }

  async function runPlan(planInput: api.PlanGeneratorInput) {
    setPlanOpen(false)
    push({ id: newId(), role: "user", kind: "text", content: describePlanRequest(planInput) })
    setBusy("plan")
    try {
      const plan = await api.aiWorkoutPlan(planInput)
      push({ id: newId(), role: "assistant", kind: "plan", content: summarizePlan(plan), plan })
    } catch (error) {
      fail(error, { type: "plan", input: planInput })
    } finally {
      setBusy(null)
    }
  }

  async function runMeals(note: string) {
    setMealOpen(false)
    push({ id: newId(), role: "user", kind: "text", content: note ? `今天剩下的额度怎么吃？${note}` : "今天剩下的额度怎么吃？" })
    setBusy("meals")
    try {
      const meals = await api.aiMealSuggestions(note || undefined)
      push({ id: newId(), role: "assistant", kind: "meals", content: summarizeMeals(meals), meals })
    } catch (error) {
      fail(error, { type: "meals", note })
    } finally {
      setBusy(null)
    }
  }

  async function runReview() {
    push({ id: newId(), role: "user", kind: "text", content: "帮我做一份最近 30 天的月度复盘" })
    setBusy("review")
    try {
      const review = await api.aiMonthlyReview()
      push({ id: newId(), role: "assistant", kind: "review", content: review.text, review })
    } catch (error) {
      fail(error, { type: "review" })
    } finally {
      setBusy(null)
    }
  }

  function retry(message: Extract<AiMessage, { kind: "error" }>) {
    if (busy || !message.retry) return
    // Drop the error bubble (and the user prompt the tool pushed) before retrying.
    const index = messages.findIndex((item) => item.id === message.id)
    const action = message.retry
    if (action.type === "chat") {
      const thread = messages.slice(0, index)
      setMessages(thread)
      void runChat(thread)
      return
    }
    setMessages(messages.slice(0, Math.max(0, index - 1)))
    if (action.type === "plan") void runPlan(action.input)
    if (action.type === "meals") void runMeals(action.note)
    if (action.type === "review") void runReview()
  }

  function markApplied(id: string) {
    setMessages((current) => current.map((item) => (item.id === id && item.kind === "plan" ? { ...item, applied: true } : item)))
  }

  if (!data) return null

  const tools = [
    { key: "plan" as const, label: "生成训练计划", hint: "按目标和时间排课", icon: CalendarRange, onClick: () => setPlanOpen(true) },
    { key: "meals" as const, label: "今天剩下怎么吃", hint: "按剩余热量和蛋白质", icon: ChefHat, onClick: () => setMealOpen(true) },
    { key: "review" as const, label: "月度复盘", hint: "最近 30 天训练和饮食", icon: LineChart, onClick: () => void runReview() },
  ]

  return (
    <div className="space-y-4">
      {!configured ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Settings2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">先连接一个 AI 模型</p>
              <p className="mt-0.5 text-sm text-muted-foreground">选择服务商并填入密钥后，就能在这里聊天、排计划和复盘。</p>
              <Button asChild size="sm" className="mt-3">
                <Link to="/profile/settings/ai">去设置</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {messages.length === 0 ? (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold">你的训练和饮食助手</p>
              <p className="text-sm text-muted-foreground">它能看到你的记录、计划和目标。</p>
            </div>
          </div>
          <div className="grid gap-2.5">
            {tools.map((tool) => (
              <button
                key={tool.key}
                type="button"
                disabled={!configured || Boolean(busy)}
                onClick={tool.onClick}
                className="liquid-glass flex items-center gap-3 rounded-[1.6rem] p-4 text-left transition active:scale-[0.98] disabled:opacity-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <tool.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{tool.label}</span>
                  <span className="block text-xs text-muted-foreground">{tool.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={!configured || Boolean(busy)}
                onClick={() => void sendChat(prompt)}
                className="rounded-full bg-muted/60 px-3.5 py-2 text-sm text-foreground transition active:scale-95 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition active:scale-95"
              onClick={() => setClearOpen(true)}
              disabled={Boolean(busy)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              新对话
            </button>
          </div>
          {messages.map((message) => (
            <MessageView key={message.id} message={message} onRetry={retry} onApplied={markApplied} />
          ))}
          {busy ? <ThinkingBubble kind={busy} /> : null}
        </div>
      )}
      <div ref={endRef} className="h-px" />

      {/* Composer, pinned above the dock. Portaled to <body>: the page wrapper keeps a transform from its
          entry animation, which would otherwise make "fixed" relative to the page instead of the screen. */}
      {createPortal(
        <>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 mx-auto h-[calc(11rem+env(safe-area-inset-bottom))] max-w-lg bg-gradient-to-t from-background via-background/85 to-transparent" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-lg px-4">
          {messages.length > 0 ? (
            <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
              {tools.map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  disabled={!configured || Boolean(busy)}
                  onClick={tool.onClick}
                  className="liquid-glass flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95 disabled:opacity-50"
                >
                  <tool.icon className="h-4 w-4 text-primary" />
                  {tool.label}
                </button>
              ))}
            </div>
          ) : null}
          <form
            className="liquid-glass flex items-end gap-2 rounded-[1.6rem] p-1.5 pl-4"
            onSubmit={(event) => {
              event.preventDefault()
              void sendChat(input)
            }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                  event.preventDefault()
                  void sendChat(input)
                }
              }}
              rows={1}
              placeholder={configured ? "问问训练、饮食或你的数据…" : "先在设置里连接 AI 模型"}
              disabled={!configured}
              aria-label="消息"
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base outline-none placeholder:text-muted-foreground"
              style={{ fieldSizing: "content" } as CSSProperties}
            />
            <Button type="submit" size="icon" className="shrink-0" disabled={!configured || !input.trim() || Boolean(busy)} aria-label="发送">
              <ArrowUp className="h-5 w-5" />
            </Button>
          </form>
        </div>
  
        </>,
        document.body,
      )}
      <PlanGeneratorDialog open={planOpen} onClose={() => setPlanOpen(false)} onSubmit={(value) => void runPlan(value)} />
      <MealNoteDialog open={mealOpen} onClose={() => setMealOpen(false)} onSubmit={(note) => void runMeals(note)} />
      <ConfirmDialog
        open={clearOpen}
        title="开始新对话？"
        description="当前对话会从这台设备上清除，已应用的计划和记录不受影响。"
        confirmLabel="清除"
        destructive
        onClose={() => setClearOpen(false)}
        onConfirm={() => {
          setMessages([])
          setClearOpen(false)
          showToast({ title: "已开始新对话" })
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

function MessageView({
  message,
  onRetry,
  onApplied,
}: {
  message: AiMessage
  onRetry: (message: Extract<AiMessage, { kind: "error" }>) => void
  onApplied: (id: string) => void
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-[1.4rem] rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.kind === "error") {
    return (
      <Bubble>
        <p className="text-sm text-danger">{message.content}</p>
        {message.retry ? (
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => onRetry(message)}>
            <RotateCcw className="h-4 w-4" />
            重试
          </Button>
        ) : null}
      </Bubble>
    )
  }

  if (message.kind === "plan") return <PlanResult message={message} onApplied={onApplied} />
  if (message.kind === "meals") return <MealResult result={message.meals} />
  if (message.kind === "review") return <ReviewResult review={message.review} />

  return (
    <Bubble>
      <Markdown text={message.content} />
    </Bubble>
  )
}

function Bubble({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex">
      <div className={cn("liquid-glass rounded-[1.4rem] rounded-bl-md px-4 py-3", wide ? "w-full" : "max-w-[92%]")}>{children}</div>
    </div>
  )
}

function ThinkingBubble({ kind }: { kind: "chat" | "plan" | "meals" | "review" }) {
  const label = { chat: "思考中", plan: "正在排计划", meals: "正在搭配", review: "正在整理这个月的数据" }[kind]
  return (
    <Bubble>
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}…
      </p>
    </Bubble>
  )
}

function PlanResult({ message, onApplied }: { message: Extract<AiMessage, { kind: "plan" }>; onApplied: (id: string) => void }) {
  const { data, applyPlans } = useAppData()
  const { showToast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const plan = message.plan
  const existing = data?.plans.filter((item) => (plan.mode === "rotation" ? item.weekday > 100 : item.weekday >= 1 && item.weekday <= 7) && item.exercises.length > 0).length ?? 0

  async function apply() {
    setPending(true)
    try {
      await applyPlans({
        mode: plan.mode,
        rotationSlots: plan.rotationSlots,
        plans: plan.plans.map((day) => ({
          weekday: day.weekday,
          title: day.title,
          exercises: day.exercises.map((exercise) => ({
            kind: exercise.kind,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            defaultSets: exercise.defaultSets,
            defaultReps: exercise.defaultReps,
            defaultWeight: exercise.defaultWeight,
            libraryExerciseId: exercise.libraryExerciseId,
          })),
        })),
      })
      onApplied(message.id)
      setConfirmOpen(false)
      showToast({ title: "计划已应用", description: plan.mode === "rotation" ? "已切换为循环模式" : "已按星期更新" })
    } catch (error) {
      showToast({ title: "应用失败", description: error instanceof Error ? error.message : undefined, tone: "error" })
    } finally {
      setPending(false)
    }
  }

  return (
    <Bubble wide>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{plan.mode === "rotation" ? `循环计划 · ${plan.plans.length} 天一轮` : `每周 ${plan.plans.length} 练`}</p>
        </div>
        {plan.summary ? <Markdown text={plan.summary} className="space-y-2 text-sm text-muted-foreground" /> : null}
        <div className="space-y-2">
          {plan.plans.map((day) => (
            <div key={day.weekday} className="rounded-2xl bg-muted/45 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">
                  <span className="mr-1.5 text-primary">{api.slotLabel(day.weekday)}</span>
                  {day.title}
                </p>
                {day.focus ? <span className="truncate text-xs text-muted-foreground">{day.focus}</span> : null}
              </div>
              <ul className="mt-1.5 space-y-1 text-sm">
                {day.exercises.map((exercise, index) => (
                  <li key={index} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">{exercise.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{describeTarget(exercise)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {plan.tips.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground marker:text-muted-foreground">
            {plan.tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        ) : null}
        {message.applied ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Check className="h-4 w-4" />
            已应用到训练计划
          </p>
        ) : (
          <Button className="w-full" onClick={() => setConfirmOpen(true)}>
            应用到计划
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="应用这份计划？"
        description={
          existing > 0
            ? `会覆盖现有的 ${existing} 个${plan.mode === "rotation" ? "循环" : "每周"}训练日，并切换为${plan.mode === "rotation" ? "循环" : "按星期"}模式。训练历史不受影响。`
            : `会写入训练计划，并切换为${plan.mode === "rotation" ? "循环" : "按星期"}模式。`
        }
        confirmLabel={pending ? "应用中…" : "应用"}
        pending={pending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void apply()}
      />
    </Bubble>
  )
}

function describeTarget(exercise: { kind?: api.ExerciseKind; defaultSets: number; defaultReps: number; defaultWeight: number }) {
  if (exercise.kind === "cardio") return `${exercise.defaultReps} 分钟`
  if (exercise.kind === "duration") return `${exercise.defaultSets} × ${exercise.defaultReps} 秒`
  const weight = exercise.defaultWeight > 0 ? ` · ${exercise.defaultWeight} kg` : ""
  return `${exercise.defaultSets} × ${exercise.defaultReps}${weight}`
}

function MealResult({ result }: { result: api.MealSuggestionResult }) {
  const navigate = useNavigate()

  function record(option: api.MealSuggestion) {
    const date = todayKey()
    sessionStorage.setItem(
      mealDraftStorageKey,
      JSON.stringify({
        date,
        mealType: option.mealType,
        calories: option.calories,
        protein: option.protein,
        carbs: option.carbs,
        fat: option.fat,
        items: option.items,
      }),
    )
    navigate(`/food/confirm?date=${date}`)
  }

  const remaining = result.remaining

  return (
    <Bubble wide>
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[
            { label: "剩余热量", value: Math.round(remaining.calories), unit: "kcal" },
            { label: "蛋白质", value: Math.round(remaining.protein), unit: "g" },
            { label: "碳水", value: Math.round(remaining.carbs), unit: "g" },
            { label: "脂肪", value: Math.round(remaining.fat), unit: "g" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-muted/45 px-1 py-2">
              <p className={cn("text-base font-semibold tabular-nums", item.value < 0 && "text-warning")}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground">
                {item.label} {item.unit}
              </p>
            </div>
          ))}
        </div>
        {result.advice ? <Markdown text={result.advice} className="space-y-2 text-sm" /> : null}
        <div className="space-y-2">
          {result.options.map((option, index) => (
            <div key={index} className="rounded-2xl bg-muted/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{option.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {mealTypeOptions.find((item) => item.value === option.mealType)?.label ?? "加餐"} · {Math.round(option.calories)} kcal · 蛋白质{" "}
                    {Math.round(option.protein)} g
                  </p>
                </div>
                <Button size="sm" variant="secondary" className="shrink-0" onClick={() => record(option)}>
                  记录
                </Button>
              </div>
              {option.items.length ? <p className="mt-1.5 text-sm">{option.items.map((item) => item.name).join("、")}</p> : null}
              {option.reason ? <p className="mt-1 text-xs text-muted-foreground">{option.reason}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </Bubble>
  )
}

function ReviewResult({ review }: { review: api.MonthlyReviewResult }) {
  const stats = review.stats
  const tiles = [
    { label: "训练", value: `${stats.sessions} 次`, sub: `每周 ${stats.perWeek}` },
    { label: "日均热量", value: stats.avgCalories ? `${stats.avgCalories}` : "—", sub: `记录 ${stats.loggedDays} 天` },
    { label: "日均蛋白", value: stats.avgProtein ? `${stats.avgProtein} g` : "—", sub: "已记录日" },
    {
      label: "体重变化",
      value: stats.weightChange === null ? "—" : `${stats.weightChange > 0 ? "+" : ""}${stats.weightChange} kg`,
      sub: "30 天",
    },
  ]

  return (
    <Bubble wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl bg-muted/45 px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">{tile.label}</p>
              <p className="text-lg font-semibold tabular-nums">{tile.value}</p>
              <p className="text-[11px] text-muted-foreground">{tile.sub}</p>
            </div>
          ))}
        </div>
        <Markdown text={review.text} />
      </div>
    </Bubble>
  )
}

// ---------------------------------------------------------------------------
// Tool forms
// ---------------------------------------------------------------------------

function PlanGeneratorDialog({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (input: api.PlanGeneratorInput) => void }) {
  const { data } = useAppData()
  const [goal, setGoal] = useState<string>("增肌")
  const [mode, setMode] = useState<"weekly" | "rotation">(data?.settings.planMode ?? "weekly")
  const [days, setDays] = useState<number[]>([1, 3, 5])
  const [slots, setSlots] = useState(String(data?.settings.rotationSlots ?? 3))
  const [minutes, setMinutes] = useState(60)
  const [level, setLevel] = useState<string>("有基础")
  const [equipment, setEquipment] = useState<string>("健身房")
  const [notes, setNotes] = useState("")

  const slotCount = Math.min(6, Math.max(2, Math.round(Number(slots) || 3)))
  const valid = mode === "rotation" || days.length > 0

  const footer = useMemo(
    () => (
      <Button
        className="w-full"
        size="lg"
        disabled={!valid}
        onClick={() =>
          onSubmit({ goal, mode, days: [...days].sort((a, b) => a - b), rotationSlots: slotCount, minutes, level, equipment, notes: notes.trim() })
        }
      >
        <Sparkles className="h-4 w-4" />
        生成计划
      </Button>
    ),
    [valid, goal, mode, days, slotCount, minutes, level, equipment, notes, onSubmit],
  )

  return (
    <Dialog open={open} title="生成训练计划" description="生成后可以先预览，再决定是否应用。" onClose={onClose} footer={footer}>
      <div className="space-y-4">
        <Group label="目标">
          <SegmentedControl options={goalOptions.map((value) => ({ value, label: value }))} value={goal} onChange={setGoal} />
        </Group>
        <Group label="安排方式">
          <SegmentedControl
            options={[
              { value: "weekly", label: "固定星期" },
              { value: "rotation", label: "循环 A/B/C" },
            ]}
            value={mode}
            onChange={setMode}
          />
        </Group>
        {mode === "weekly" ? (
          <div className="space-y-1.5">
            <p className="px-1 text-xs font-medium text-muted-foreground">训练日（已选 {days.length} 天）</p>
            <div className="grid grid-cols-7 gap-1.5">
              {weekdayNames.map((name, index) => {
                const weekday = index + 1
                const active = days.includes(weekday)
                return (
                  <button
                    key={weekday}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDays((current) => (active ? current.filter((day) => day !== weekday) : [...current, weekday]))}
                    className={cn(
                      "h-11 rounded-full text-sm font-semibold transition active:scale-95",
                      active ? "bg-primary text-primary-foreground" : "bg-muted/55 text-muted-foreground",
                    )}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <Stepper label="一轮几天（2–6）" value={slots} onChange={setSlots} step={1} min={2} unit="天" />
        )}
        <Group label="每次时长">
          <SegmentedControl
            options={[30, 45, 60, 90].map((value) => ({ value, label: `${value} 分` }))}
            value={minutes}
            onChange={setMinutes}
          />
        </Group>
        <Group label="训练水平">
          <SegmentedControl options={levelOptions.map((value) => ({ value, label: value }))} value={level} onChange={setLevel} />
        </Group>
        <Group label="器械">
          <SegmentedControl options={equipmentOptions.map((value) => ({ value, label: value }))} value={equipment} onChange={setEquipment} />
        </Group>
        <Field label="补充说明（可选）">
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="例如：膝盖不好、想练臀腿" maxLength={200} />
        </Field>
      </div>
    </Dialog>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5" role="group" aria-label={label}>
      <p className="px-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function MealNoteDialog({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState("")
  const presets = ["只有便利店", "在外面吃", "想吃清淡点", "晚上要训练"]

  return (
    <Dialog
      open={open}
      title="今天剩下怎么吃"
      description="根据今天已记录的饮食和你的目标给出 2–3 个方案。"
      onClose={onClose}
      footer={
        <Button className="w-full" size="lg" onClick={() => onSubmit(note.trim())}>
          <Sparkles className="h-4 w-4" />
          给我建议
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="有什么限制吗？（可选）">
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：公司食堂、不吃辣" maxLength={200} />
        </Field>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="rounded-full bg-muted/60 px-3 py-1.5 text-sm transition active:scale-95"
              onClick={() => setNote((current) => (current.includes(preset) ? current : [current, preset].filter(Boolean).join("，")))}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Summaries that become chat history for follow-up questions
// ---------------------------------------------------------------------------

function describePlanRequest(input: api.PlanGeneratorInput) {
  const schedule = input.mode === "rotation" ? `循环 ${input.rotationSlots} 天一轮` : `每周${input.days.map((day) => weekdayNames[day - 1]).join("、")}`
  const extra = input.notes ? `，${input.notes}` : ""
  return `帮我生成训练计划：${input.goal}，${schedule}，每次 ${input.minutes} 分钟，${input.level}，${input.equipment}${extra}`
}

function summarizePlan(plan: api.GeneratedPlan) {
  const days = plan.plans
    .map((day) => `${api.slotLabel(day.weekday)} ${day.title}：${day.exercises.map((exercise) => `${exercise.name} ${describeTarget(exercise)}`).join("；")}`)
    .join("\n")
  return `${plan.summary}\n${days}`.trim()
}

function summarizeMeals(result: api.MealSuggestionResult) {
  const options = result.options.map((option) => `${option.title}（${Math.round(option.calories)} kcal，蛋白质 ${Math.round(option.protein)} g）`).join("；")
  return `${result.advice}\n方案：${options}`.trim()
}
