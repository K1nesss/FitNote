import { Camera, Check, Clipboard, Trash2 } from "lucide-react"
import type { ComponentProps } from "react"
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { DateStrip } from "@/components/ui/date-strip"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"
import type { MealRecord, MealType } from "@/lib/api"
import { useSubmitLock } from "@/lib/use-submit-lock"
import { useDayData } from "@/lib/use-day-data"
import { useSelectedDateParam } from "@/lib/use-selected-date"
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
  { value: "breakfastSnack", label: "加早餐" },
  { value: "lunch", label: "午餐" },
  { value: "lunchSnack", label: "加午餐" },
  { value: "dinner", label: "晚餐" },
  { value: "dinnerSnack", label: "加晚餐" },
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

const aiPrompt = `请根据我提供的饮食文字或图片，估算热量、蛋白质、碳水、脂肪，并只返回合法 JSON，不要解释。

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

export function FoodPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { updateMeal, deleteMeal } = useAppData()
  const { selectedDate, setSelectedDate } = useSelectedDateParam()
  const { dayData, refresh } = useDayData(selectedDate)
  const [jsonText, setJsonText] = useState("")
  const [mealType, setMealType] = useState<MealType>("lunch")
  const [editingMeal, setEditingMeal] = useState<MealEditDraft | null>(null)
  const [activeMealItem, setActiveMealItem] = useState<MealDraftItem | null>(null)
  const saveEdit = useSubmitLock()
  const deleteEdit = useSubmitLock()
  const parsedMeal = useMemo(() => parseMealJson(jsonText), [jsonText])

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
    setActiveMealItem(null)
  }

  async function saveEditingMeal() {
    if (!editingMeal) {
      return
    }

    await saveEdit.run(async () => {
      await updateMeal(editingMeal.id, {
        mealType: editingMeal.mealType,
        rawText: "手动编辑",
        calories: toNumber(editingMeal.calories),
        protein: toNumber(editingMeal.protein),
        carbs: toNumber(editingMeal.carbs),
        fat: toNumber(editingMeal.fat),
      })
      await refresh()
      setEditingMeal(null)
      showToast({ title: "已保存" })
    })
  }

  async function deleteEditingMeal() {
    if (!editingMeal) {
      return
    }

    await deleteEdit.run(async () => {
      await deleteMeal(editingMeal.id)
      await refresh()
      setEditingMeal(null)
      showToast({ title: "已删除" })
    })
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(aiPrompt)
    showToast({ title: "已复制", description: "粘贴到 AI 应用即可。" })
  }

  function openConfirm() {
    if (!parsedMeal) {
      showToast({ title: "需要 JSON", description: "先粘贴 AI 返回的结果。" })
      return
    }

    sessionStorage.setItem(mealDraftStorageKey, JSON.stringify({ ...parsedMeal, date: selectedDate, mealType }))
    navigate(`/food/confirm?date=${selectedDate}`)
  }

  return (
    <div className="space-y-5">
      <DateStrip value={selectedDate} onChange={setSelectedDate} />

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">饮食</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            placeholder='{"calories":690,"protein":58,"carbs":68,"fat":19,"items":[]}'
          />
          <MealTypeControl value={mealType} onChange={setMealType} />
          {jsonText ? (
            <p className={`text-sm ${parsedMeal ? "text-muted-foreground" : "text-red-500"}`}>
              {parsedMeal ? "JSON 已识别" : "JSON 格式不正确"}
            </p>
          ) : null}
          <Button className="w-full rounded-3xl" size="lg" onClick={copyPrompt}>
            <Clipboard className="h-5 w-5" />
            提示词
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="quiet" className="rounded-3xl" size="lg">
              <Link to="/food/image" aria-label="图片">
                <Camera className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="quiet" className="rounded-3xl" size="lg" onClick={openConfirm} aria-label="确认">
              <Check className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">记录</h2>
        {(dayData?.meals ?? []).map((meal) => (
          <Card key={meal.id}>
            <CardContent
              className="flex items-center justify-between gap-4 p-4 transition active:scale-[0.99]"
              role="button"
              tabIndex={0}
              onClick={() => openMealEditor(meal)}
            >
              <div>
                <p className="font-medium">{meal.title}</p>
                <p className="text-sm text-muted-foreground">
                  {meal.items.length > 0 ? `${meal.items.length} 个食物` : meal.note}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <p>{meal.calories} kcal</p>
                  <p className="text-muted-foreground">{meal.protein}g P</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {dayData?.meals.length === 0 ? (
          <div className="rounded-[28px] bg-muted/35 p-5 text-sm font-medium text-muted-foreground">暂无</div>
        ) : null}
      </section>

      <Dialog
        open={Boolean(editingMeal)}
        title="饮食记录"
        onClose={() => {
          setEditingMeal(null)
          setActiveMealItem(null)
        }}
      >
        {editingMeal ? (
          <>
            <MealTypeControl
              value={editingMeal.mealType}
              onChange={(mealType) => setEditingMeal((current) => (current ? { ...current, mealType } : current))}
            />
            <MacroGrid
              calories={toNumber(editingMeal.calories)}
              protein={toNumber(editingMeal.protein)}
              carbs={toNumber(editingMeal.carbs)}
              fat={toNumber(editingMeal.fat)}
            />
            <div className="grid grid-cols-2 gap-2">
              <InputWithSuffix
                suffix="kcal"
                inputMode="decimal"
                value={editingMeal.calories}
                onChange={(event) => setEditingMeal((current) => (current ? { ...current, calories: event.target.value } : current))}
              />
              <InputWithSuffix
                suffix="蛋白 g"
                inputMode="decimal"
                value={editingMeal.protein}
                onChange={(event) => setEditingMeal((current) => (current ? { ...current, protein: event.target.value } : current))}
              />
              <InputWithSuffix
                suffix="碳水 g"
                inputMode="decimal"
                value={editingMeal.carbs}
                onChange={(event) => setEditingMeal((current) => (current ? { ...current, carbs: event.target.value } : current))}
              />
              <InputWithSuffix
                suffix="脂肪 g"
                inputMode="decimal"
                value={editingMeal.fat}
                onChange={(event) => setEditingMeal((current) => (current ? { ...current, fat: event.target.value } : current))}
              />
            </div>
            <div className="space-y-2">
              {editingMeal.items.map((item, index) => (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-3xl p-4 text-left transition active:scale-[0.99] ${
                    activeMealItem === item ? "bg-primary text-primary-foreground" : "bg-muted/55"
                  }`}
                  onClick={() => setActiveMealItem((current) => (current === item ? null : item))}
                >
                  <span className="font-medium">{item.name}</span>
                  <span className={activeMealItem === item ? "text-primary-foreground/80" : "text-muted-foreground"}>
                    {formatMacro(item.calories)} kcal
                  </span>
                </button>
              ))}
              {editingMeal.items.length === 0 ? (
                <div className="rounded-3xl bg-muted/55 p-4 text-sm text-muted-foreground">无单项</div>
              ) : null}
            </div>
            {activeMealItem ? (
              <MacroGrid
                calories={activeMealItem.calories}
                protein={activeMealItem.protein}
                carbs={activeMealItem.carbs}
                fat={activeMealItem.fat}
              />
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" className="rounded-3xl" onClick={deleteEditingMeal} disabled={deleteEdit.pending || saveEdit.pending}>
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
              <Button className="rounded-3xl" onClick={saveEditingMeal} disabled={saveEdit.pending || deleteEdit.pending}>
                <Check className="h-4 w-4" />
                保存
              </Button>
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  )
}

export function parseMealJson(value: string): MealDraft | null {
  const cleanValue = value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim()

  if (!cleanValue) {
    return null
  }

  try {
    const parsed = JSON.parse(cleanValue) as Partial<MealDraft>
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((item) => normalizeMealItem(item))
          .filter((item): item is MealDraftItem => Boolean(item))
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

    if (![calories, protein, carbs, fat].every(Number.isFinite)) {
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
  if (type === "breakfastSnack") {
    return { main: "breakfast", snack: true }
  }

  if (type === "lunchSnack") {
    return { main: "lunch", snack: true }
  }

  if (type === "dinnerSnack") {
    return { main: "dinner", snack: true }
  }

  return { main: type, snack: false }
}

function composeMealType(main: MainMealType, snack: boolean): MealType {
  if (!snack) {
    return main
  }

  if (main === "breakfast") {
    return "breakfastSnack"
  }

  if (main === "lunch") {
    return "lunchSnack"
  }

  return "dinnerSnack"
}

function MealTypeControl({ value, onChange }: { value: MealType; onChange: (value: MealType) => void }) {
  const mealState = splitMealType(value)
  const mainMealIndex = mainMealOptions.findIndex((item) => item.value === mealState.main)

  function selectMainMeal(main: MainMealType) {
    onChange(composeMealType(main, mealState.snack))
  }

  function toggleSnack() {
    onChange(composeMealType(mealState.main, !mealState.snack))
  }

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <div className="relative grid grid-cols-3 rounded-full bg-muted/45 p-1">
        <div
          className="absolute left-1 top-1 h-10 w-[calc((100%-0.5rem)/3)] rounded-full bg-primary shadow-[0_8px_18px_rgba(23,105,166,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ transform: `translateX(${Math.max(mainMealIndex, 0) * 100}%)` }}
          aria-hidden="true"
        />
        {mainMealOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn(
              "relative z-10 h-10 rounded-full text-sm font-semibold transition active:scale-95",
              mealState.main === item.value ? "text-primary-foreground" : "text-muted-foreground",
            )}
            onClick={() => selectMainMeal(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={cn(
          "flex h-12 min-w-20 items-center justify-center rounded-full px-4 text-sm font-semibold transition active:scale-95",
          mealState.snack
            ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(23,105,166,0.2)]"
            : "bg-muted/45 text-muted-foreground",
        )}
        aria-pressed={mealState.snack}
        onClick={toggleSnack}
      >
        加餐
      </button>
    </div>
  )
}

function toNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? Math.round(number * 10) / 10 : fallback
}

function formatMacro(value: number) {
  const rounded = toNumber(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function MacroGrid({ calories, protein, carbs, fat }: { calories: number; protein: number; carbs: number; fat: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        ["热量", calories, "kcal"],
        ["蛋白", protein, "g"],
        ["碳水", carbs, "g"],
        ["脂肪", fat, "g"],
      ].map(([label, value, unit]) => (
        <div key={label} className="rounded-3xl bg-muted/60 p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-xl font-semibold">
            {formatMacro(Number(value))}
            <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>
          </p>
        </div>
      ))}
    </div>
  )
}

function InputWithSuffix({ suffix, className, ...props }: ComponentProps<typeof Input> & { suffix: string }) {
  return (
    <div className="relative">
      <Input className={`pr-16 ${className ?? ""}`} {...props} />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
        {suffix}
      </span>
    </div>
  )
}
