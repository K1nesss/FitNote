import { ChevronRight, Copy, ClipboardCopy, ClipboardPaste, PenLine, Trash2, Utensils } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { MealPhotoCapture, mealPhotoStorageKey } from "@/components/food/MealPhotoCapture"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, InputWithSuffix, ProgressBar, SectionHeader } from "@/components/ui/controls"
import { DateStrip } from "@/components/ui/date-strip"
import { ConfirmDialog, Dialog } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/state"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"
import { todayKey } from "@/lib/date"
import type { MealRecord, MealType } from "@/lib/api"
import { copyText, formatNumber, parseDecimal, readClipboardText } from "@/lib/format"
import { useDayData } from "@/lib/use-day-data"
import { useSelectedDateParam } from "@/lib/use-selected-date"
import { useSubmitLock } from "@/lib/use-submit-lock"
import { cn } from "@/lib/utils"

export type MealDraftItem = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type MealDraft = {
  date: string
  mealType: MealType
  calories: number
  protein: number
  carbs: number
  fat: number
  items: MealDraftItem[]
}

export const mealDraftStorageKey = "fitnote.mealDraft"

export const mealTypeOptions: Array<{ value: MealType; label: string }> = [
  { value: "breakfast", label: "早餐" },
  { value: "breakfastSnack", label: "早加餐" },
  { value: "lunch", label: "午餐" },
  { value: "lunchSnack", label: "午加餐" },
  { value: "dinner", label: "晚餐" },
  { value: "dinnerSnack", label: "晚加餐" },
]

const mainMealOptions = [
  { value: "breakfast", label: "早餐" },
  { value: "lunch", label: "午餐" },
  { value: "dinner", label: "晚餐" },
] as const

type MainMealType = (typeof mainMealOptions)[number]["value"]

type MealEditDraft = {
  id: string
  mealType: MealType
  calories: string
  protein: string
  carbs: string
  fat: string
  items: MealDraftItem[]
}

export const aiPrompt = `请根据我提供的饮食文字或图片，估算热量、蛋白质、碳水、脂肪，并只返回合法 JSON，不要解释。

JSON 格式：
{
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "items": [
    {
      "name": "食物名称",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0
    }
  ]
}

单位：calories 为 kcal，protein/carbs/fat 为 g。`

export function defaultMealType(date = new Date()): MealType {
  const hour = date.getHours()
  if (hour < 10) return "breakfast"
  if (hour < 16) return "lunch"
  return "dinner"
}

export function FoodPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data, updateMeal, deleteMeal, copyMeal } = useAppData()
  const copySubmit = useSubmitLock()
  const { selectedDate, setSelectedDate } = useSelectedDateParam()
  const { dayData, showSkeleton, error, refresh } = useDayData(selectedDate)
  const [jsonText, setJsonText] = useState("")
  const [mealType, setMealType] = useState<MealType>(() => defaultMealType())
  const [editingMeal, setEditingMeal] = useState<MealEditDraft | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saveEdit = useSubmitLock()
  const deleteEdit = useSubmitLock()
  const parsedMeal = useMemo(() => parseMealJson(jsonText), [jsonText])
  const goals = data?.profile.goals
  const aiReady = Boolean(data?.settings.ai?.hasKey)
  const macro = dayData?.macro

  function openMealEditor(meal: MealRecord) {
    setEditingMeal({
      id: meal.id,
      mealType: meal.mealType,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
      items: meal.items,
    })
  }

  async function saveEditingMeal() {
    if (!editingMeal) {
      return
    }

    await saveEdit.run(async () => {
      await updateMeal(editingMeal.id, {
        mealType: editingMeal.mealType,
        rawText: "手动编辑",
        calories: parseDecimal(editingMeal.calories, 0, 1),
        protein: parseDecimal(editingMeal.protein, 0, 1),
        carbs: parseDecimal(editingMeal.carbs, 0, 1),
        fat: parseDecimal(editingMeal.fat, 0, 1),
      })
      await refresh()
      setEditingMeal(null)
      showToast({ title: "已保存" })
    })
  }

  async function copyExistingMeal(mealId: string, targetDate: string, targetType: MealType | undefined, label: string) {
    await copySubmit.run(async () => {
      await copyMeal(mealId, { date: targetDate, mealType: targetType })
      if (targetDate === selectedDate) {
        await refresh()
      }
      setEditingMeal(null)
      showToast({ title: `已记录：${label}` })
    }, "记录失败")
  }

  async function deleteEditingMeal() {
    if (!editingMeal) {
      return
    }

    await deleteEdit.run(async () => {
      await deleteMeal(editingMeal.id)
      await refresh()
      setConfirmDelete(false)
      setEditingMeal(null)
      showToast({ title: "已删除" })
    }, "删除失败")
  }

  async function copyPrompt() {
    const ok = await copyText(aiPrompt)
    showToast(ok ? { title: "提示词已复制", description: "粘贴到任意 AI 应用，连同文字或照片一起发送。" } : { title: "复制失败", tone: "error" })
  }

  async function pasteJson() {
    const text = await readClipboardText()
    if (text === null) {
      showToast({ title: "无法读取剪贴板", description: "请长按输入框手动粘贴。", tone: "error" })
      return
    }
    setJsonText(text)
  }

  function openRecognized(draft: MealDraft, image: string, model: string) {
    try {
      sessionStorage.setItem(mealPhotoStorageKey, JSON.stringify({ image, model }))
    } catch {
      sessionStorage.removeItem(mealPhotoStorageKey)
    }
    openConfirm(draft, true)
  }

  function openConfirm(draft: MealDraft | null, fromPhoto = false) {
    if (!fromPhoto) {
      sessionStorage.removeItem(mealPhotoStorageKey)
    }
    sessionStorage.setItem(
      mealDraftStorageKey,
      JSON.stringify(draft ? { ...draft, date: selectedDate, mealType } : { date: selectedDate, mealType, calories: 0, protein: 0, carbs: 0, fat: 0, items: [] }),
    )
    setJsonText("")
    navigate(`/food/confirm?date=${selectedDate}`)
  }

  return (
    <div className="space-y-5">
      <DateStrip value={selectedDate} onChange={setSelectedDate} />

      {goals ? (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">已摄入</p>
                <p className="mt-0.5 text-3xl font-bold tracking-tight tabular-nums">
                  {macro ? formatNumber(macro.calories, 0) : "–"}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">/ {formatNumber(goals.calories, 0)} kcal</span>
                </p>
              </div>
            </div>
            <ProgressBar className="mt-3" value={macro?.calories ?? 0} max={goals.calories} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ["蛋白质", macro?.protein ?? 0, goals.protein],
                ["碳水", macro?.carbs ?? 0, goals.carbs],
                ["脂肪", macro?.fat ?? 0, goals.fat],
              ].map(([label, value, goal]) => (
                <div key={label} className="rounded-2xl bg-muted/45 px-2 py-2.5">
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatNumber(Number(value))}
                    <span className="font-normal text-muted-foreground">/{formatNumber(Number(goal))}g</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-2">
        <SectionHeader title="添加一餐" />
        <Card>
          <CardContent className="space-y-4 p-5">
            <MealTypeControl value={mealType} onChange={setMealType} />

            {data?.frequentMeals.length ? (
              <div className="space-y-1.5">
                <p className="px-1 text-xs font-medium text-muted-foreground">常吃 · 点一下直接记录为{mealTypeOptions.find((item) => item.value === mealType)?.label}</p>
                <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
                  <div className="flex w-max gap-2">
                    {data.frequentMeals.map((meal) => (
                      <button
                        key={meal.mealId}
                        type="button"
                        disabled={copySubmit.pending}
                        onClick={() => void copyExistingMeal(meal.mealId, selectedDate, mealType, meal.label)}
                        className="pressable flex max-w-[12rem] flex-col items-start rounded-[1.1rem] bg-muted/50 px-3.5 py-2 text-left disabled:opacity-60"
                      >
                        <span className="w-full truncate text-sm font-medium">{meal.label}</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatNumber(meal.calories, 0)} kcal{meal.count > 1 ? ` · 吃过 ${meal.count} 次` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <MealPhotoCapture onRecognized={openRecognized} />

            <details className="group rounded-[1.4rem] bg-muted/35 px-4 py-1" open={!aiReady || Boolean(jsonText)}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-medium text-muted-foreground">
                用其他 AI 应用（复制提示词 / 粘贴结果）
                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <ol className="space-y-3 pb-3 pt-1">
                <li className="flex items-center gap-3">
                  <StepBadge n={1} />
                  <Button variant="secondary" className="flex-1 justify-start" onClick={copyPrompt}>
                    <ClipboardCopy className="h-4 w-4" />
                    复制 AI 提示词
                  </Button>
                </li>
                <li className="flex items-start gap-3">
                  <StepBadge n={2} className="mt-2.5" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="relative">
                      <Textarea
                        value={jsonText}
                        onChange={(event) => setJsonText(event.target.value)}
                        placeholder="把 AI 返回的 JSON 粘贴到这里"
                        className="min-h-28 pr-14 font-mono text-sm"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-card/80 text-muted-foreground shadow-sm active:scale-95"
                        onClick={pasteJson}
                        aria-label="从剪贴板粘贴"
                      >
                        <ClipboardPaste className="h-4 w-4" />
                      </button>
                    </div>
                    {jsonText.trim() ? (
                      <p className={cn("px-1 text-sm", parsedMeal ? "text-primary" : "text-danger")}>
                        {parsedMeal
                          ? `已识别：${formatNumber(parsedMeal.calories, 0)} kcal · ${parsedMeal.items.length || 1} 项`
                          : "无法识别，请确认粘贴的是 AI 返回的 JSON"}
                      </p>
                    ) : null}
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <StepBadge n={3} />
                  <Button className="flex-1" disabled={!parsedMeal} onClick={() => openConfirm(parsedMeal)}>
                    核对并保存
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </li>
              </ol>
            </details>

            <Button variant="ghost" className="w-full text-foreground" onClick={() => openConfirm(null)}>
              <PenLine className="h-4 w-4" />
              手动填写
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionHeader title="当天记录" />
        {showSkeleton ? <div className="skeleton h-20 rounded-[1.75rem]" /> : null}
        {error && !dayData ? (
          <Button variant="secondary" className="w-full" onClick={() => void refresh()}>
            加载失败，点此重试
          </Button>
        ) : null}
        {(dayData?.meals ?? []).map((meal) => (
          <Card key={meal.id} role="button" tabIndex={0} onClick={() => openMealEditor(meal)} onKeyDown={(event) => event.key === "Enter" && openMealEditor(meal)}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-semibold">{meal.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {meal.items.length > 0 ? meal.items.map((item) => item.name).join("、") : meal.note}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm tabular-nums">
                <p className="font-semibold">{formatNumber(meal.calories, 0)} kcal</p>
                <p className="text-muted-foreground">
                  P {formatNumber(meal.protein)} · C {formatNumber(meal.carbs)} · F {formatNumber(meal.fat)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {dayData && dayData.meals.length === 0 ? <EmptyState icon={Utensils} title="这一天还没有记录" /> : null}
      </section>

      <Dialog
        open={Boolean(editingMeal)}
        title="编辑这一餐"
        onClose={() => setEditingMeal(null)}
        footer={
          <div className="grid grid-cols-[auto_auto_1fr] gap-2">
            <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)} disabled={deleteEdit.pending || saveEdit.pending}>
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
            <Button
              variant="secondary"
              disabled={copySubmit.pending || !editingMeal}
              onClick={() =>
                editingMeal &&
                void copyExistingMeal(editingMeal.id, todayKey(), selectedDate === todayKey() ? editingMeal.mealType : defaultMealType(), "复制成功")
              }
            >
              <Copy className="h-4 w-4" />
              {selectedDate === todayKey() ? "再记一份" : "复制到今天"}
            </Button>
            <Button onClick={saveEditingMeal} disabled={saveEdit.pending || deleteEdit.pending}>
              {saveEdit.pending ? "保存中…" : "保存"}
            </Button>
          </div>
        }
      >
        {editingMeal ? (
          <>
            <MealTypeControl
              value={editingMeal.mealType}
              onChange={(mealType) => setEditingMeal((current) => (current ? { ...current, mealType } : current))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="热量">
                <InputWithSuffix
                  suffix="kcal"
                  inputMode="decimal"
                  value={editingMeal.calories}
                  onChange={(event) => setEditingMeal((current) => (current ? { ...current, calories: event.target.value } : current))}
                />
              </Field>
              <Field label="蛋白质">
                <InputWithSuffix
                  suffix="g"
                  inputMode="decimal"
                  value={editingMeal.protein}
                  onChange={(event) => setEditingMeal((current) => (current ? { ...current, protein: event.target.value } : current))}
                />
              </Field>
              <Field label="碳水">
                <InputWithSuffix
                  suffix="g"
                  inputMode="decimal"
                  value={editingMeal.carbs}
                  onChange={(event) => setEditingMeal((current) => (current ? { ...current, carbs: event.target.value } : current))}
                />
              </Field>
              <Field label="脂肪">
                <InputWithSuffix
                  suffix="g"
                  inputMode="decimal"
                  value={editingMeal.fat}
                  onChange={(event) => setEditingMeal((current) => (current ? { ...current, fat: event.target.value } : current))}
                />
              </Field>
            </div>
            {editingMeal.items.length > 0 ? (
              <div className="space-y-1.5">
                <p className="px-1 text-xs font-medium text-muted-foreground">包含的食物</p>
                {editingMeal.items.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 px-4 py-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{item.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {formatNumber(item.calories, 0)} kcal · P {formatNumber(item.protein)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="删除这一餐？"
        description="删除后无法恢复。"
        confirmLabel="删除"
        destructive
        pending={deleteEdit.pending}
        onConfirm={deleteEditingMeal}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}

function StepBadge({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/14 text-xs font-bold text-primary", className)}>
      {n}
    </span>
  )
}

export function parseMealJson(value: string): MealDraft | null {
  let cleanValue = value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim()

  if (!cleanValue) {
    return null
  }

  // AI apps often wrap the JSON in prose; take the outermost {...} block.
  const start = cleanValue.indexOf("{")
  const end = cleanValue.lastIndexOf("}")
  if (start > 0 || (end >= 0 && end < cleanValue.length - 1)) {
    if (start < 0 || end <= start) {
      return null
    }
    cleanValue = cleanValue.slice(start, end + 1)
  }

  try {
    const parsed = JSON.parse(cleanValue.replace(/[“”]/g, '"')) as Partial<MealDraft>

    if (!parsed || typeof parsed !== "object") {
      return null
    }

    const items = Array.isArray(parsed.items)
      ? parsed.items.map((item) => normalizeMealItem(item)).filter((item): item is MealDraftItem => Boolean(item))
      : []

    const totalsFromItems = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )

    const calories = toNumber(parsed.calories, totalsFromItems.calories)
    const protein = toNumber(parsed.protein, totalsFromItems.protein)
    const carbs = toNumber(parsed.carbs, totalsFromItems.carbs)
    const fat = toNumber(parsed.fat, totalsFromItems.fat)

    if (![calories, protein, carbs, fat].every(Number.isFinite) || (calories === 0 && items.length === 0)) {
      return null
    }

    return { date: "", mealType: "lunch", calories, protein, carbs, fat, items }
  } catch {
    return null
  }
}

function normalizeMealItem(value: unknown): MealDraftItem | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const item = value as Partial<MealDraftItem>

  return {
    name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "食物",
    calories: toNumber(item.calories),
    protein: toNumber(item.protein),
    carbs: toNumber(item.carbs),
    fat: toNumber(item.fat),
  }
}

function splitMealType(type: MealType): { main: MainMealType; snack: boolean } {
  if (type === "breakfastSnack") return { main: "breakfast", snack: true }
  if (type === "lunchSnack") return { main: "lunch", snack: true }
  if (type === "dinnerSnack") return { main: "dinner", snack: true }
  return { main: type, snack: false }
}

function composeMealType(main: MainMealType, snack: boolean): MealType {
  if (!snack) return main
  if (main === "breakfast") return "breakfastSnack"
  if (main === "lunch") return "lunchSnack"
  return "dinnerSnack"
}

export function MealTypeControl({ value, onChange }: { value: MealType; onChange: (value: MealType) => void }) {
  const mealState = splitMealType(value)
  const mainMealIndex = mainMealOptions.findIndex((item) => item.value === mealState.main)

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <div className="relative grid grid-cols-3 rounded-full bg-muted/55 p-1" role="radiogroup" aria-label="餐次">
        <div
          className="absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-primary shadow-[0_6px_14px_rgba(23,105,166,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ transform: `translateX(${Math.max(mainMealIndex, 0) * 100}%)` }}
          aria-hidden="true"
        />
        {mainMealOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={mealState.main === item.value}
            className={cn(
              "relative z-10 h-10 rounded-full text-sm font-semibold transition-colors",
              mealState.main === item.value ? "text-primary-foreground" : "text-muted-foreground",
            )}
            onClick={() => onChange(composeMealType(item.value, mealState.snack))}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={cn(
          "flex h-12 min-w-[4.5rem] items-center justify-center rounded-full px-4 text-sm font-semibold transition active:scale-95",
          mealState.snack ? "bg-primary text-primary-foreground" : "bg-muted/55 text-muted-foreground",
        )}
        aria-pressed={mealState.snack}
        onClick={() => onChange(composeMealType(mealState.main, !mealState.snack))}
      >
        加餐
      </button>
    </div>
  )
}

function toNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) && value !== null && value !== "" ? Math.max(0, Math.round(number * 10) / 10) : fallback
}
