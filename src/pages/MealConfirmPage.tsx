import { Check, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { mealPhotoStorageKey } from "@/components/food/MealPhotoCapture"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/controls"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"
import type { MealType } from "@/lib/api"
import { isDateKey, relativeDateLabel, shortMonthDay, todayKey } from "@/lib/date"
import { formatNumber, parseDecimal } from "@/lib/format"
import { useSubmitLock } from "@/lib/use-submit-lock"
import { defaultMealType, mealDraftStorageKey, MealTypeControl, type MealDraft } from "@/pages/FoodPage"

type MacroKey = "calories" | "protein" | "carbs" | "fat"

type ItemDraft = {
  id: string
  name: string
} & Record<MacroKey, string>

const macroFields: Array<{ key: MacroKey; label: string; unit: string }> = [
  { key: "calories", label: "热量", unit: "kcal" },
  { key: "protein", label: "蛋白", unit: "g" },
  { key: "carbs", label: "碳水", unit: "g" },
  { key: "fat", label: "脂肪", unit: "g" },
]

export function MealConfirmPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { saveMeal } = useAppData()
  const saveSubmit = useSubmitLock()
  const [initialDraft] = useState(readMealDraft)
  const [photo] = useState(readMealPhoto)
  const [items, setItems] = useState<ItemDraft[]>(() => loadItems(initialDraft))
  const [mealType, setMealType] = useState<MealType>(initialDraft?.mealType ?? defaultMealType())
  const selectedDate = initialDraft?.date ?? todayKey()

  const total = useMemo(
    () =>
      items.reduce(
        (acc, item) => ({
          calories: acc.calories + parseDecimal(item.calories, 0, 1),
          protein: acc.protein + parseDecimal(item.protein, 0, 1),
          carbs: acc.carbs + parseDecimal(item.carbs, 0, 1),
          fat: acc.fat + parseDecimal(item.fat, 0, 1),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [items],
  )

  function updateItem(id: string, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function addItem() {
    setItems((current) => [...current, emptyItem()])
  }

  async function saveCurrentMeal() {
    const valid = items.filter((item) => item.name.trim() || parseDecimal(item.calories) > 0)

    if (valid.length === 0) {
      showToast({ title: "至少填写一项食物", tone: "error" })
      return
    }

    await saveSubmit.run(async () => {
      const result = await saveMeal({
        date: selectedDate,
        rawText: photo ? `AI 拍照识别 · ${photo.model}` : initialDraft && initialDraft.items.length + initialDraft.calories > 0 ? "AI JSON" : "手动填写",
        mealType,
        calories: round1(total.calories),
        protein: round1(total.protein),
        carbs: round1(total.carbs),
        fat: round1(total.fat),
        items: valid.map((item) => ({
          name: item.name.trim() || "食物",
          calories: parseDecimal(item.calories, 0, 1),
          protein: parseDecimal(item.protein, 0, 1),
          carbs: parseDecimal(item.carbs, 0, 1),
          fat: parseDecimal(item.fat, 0, 1),
        })),
      })
      sessionStorage.removeItem(mealDraftStorageKey)
      sessionStorage.removeItem(mealPhotoStorageKey)
      showToast(result === "queued" ? { title: "已保存在本机", description: "联网后会自动同步" } : { title: "已保存" })
      navigate(`/food?date=${encodeURIComponent(selectedDate)}`, { replace: true })
    })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          {photo ? (
            <div className="flex items-center gap-3">
              <img src={photo.image} alt="这一餐的照片" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
              <p className="min-w-0 text-sm text-muted-foreground">
                由 <span className="font-medium text-foreground">{photo.model}</span> 识别，份量为估算值，请核对后保存。
              </p>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">
              {relativeDateLabel(selectedDate)} · {shortMonthDay(selectedDate)}
            </p>
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {formatNumber(total.calories, 0)}
              <span className="ml-1 text-sm font-medium text-muted-foreground">kcal</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["蛋白质", total.protein],
              ["碳水", total.carbs],
              ["脂肪", total.fat],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-muted/45 py-2.5">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="mt-0.5 font-semibold tabular-nums">{formatNumber(Number(value))} g</p>
              </div>
            ))}
          </div>
          <MealTypeControl value={mealType} onChange={setMealType} />
        </CardContent>
      </Card>

      <section className="space-y-2">
        <SectionHeader
          title={`食物 · ${items.length}`}
          action={
            <Button size="sm" variant="ghost" className="text-primary" onClick={addItem}>
              <Plus className="h-4 w-4" />
              添加
            </Button>
          }
        />
        {items.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Input
                  className="h-11 flex-1 font-medium"
                  placeholder={`食物 ${index + 1}`}
                  value={item.name}
                  onChange={(event) => updateItem(item.id, { name: event.target.value })}
                  aria-label="食物名称"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`删除 ${item.name || "这一项"}`}
                  onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {macroFields.map((field) => (
                  <label key={field.key} className="space-y-1">
                    <span className="block text-center text-[11px] text-muted-foreground">
                      {field.label} {field.unit}
                    </span>
                    <Input
                      className="h-11 px-1 text-center tabular-nums"
                      value={item[field.key]}
                      inputMode="decimal"
                      placeholder="0"
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => updateItem(item.id, { [field.key]: event.target.value } as Partial<ItemDraft>)}
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="sticky-actions">
        <Button className="w-full" size="lg" onClick={saveCurrentMeal} disabled={saveSubmit.pending}>
          <Check className="h-5 w-5" />
          {saveSubmit.pending ? "保存中…" : `保存 ${formatNumber(total.calories, 0)} kcal`}
        </Button>
      </div>
    </div>
  )
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function emptyItem(): ItemDraft {
  return { id: crypto.randomUUID(), name: "", calories: "", protein: "", carbs: "", fat: "" }
}

function loadItems(draft: MealDraft | null): ItemDraft[] {
  if (!draft) {
    return [emptyItem()]
  }

  const toDraft = (item: { name: string } & Record<MacroKey, number>, index: number): ItemDraft => ({
    id: `item-${index}`,
    name: item.name,
    calories: item.calories ? String(item.calories) : "",
    protein: item.protein ? String(item.protein) : "",
    carbs: item.carbs ? String(item.carbs) : "",
    fat: item.fat ? String(item.fat) : "",
  })

  if (draft.items.length > 0) {
    return draft.items.map(toDraft)
  }

  if (draft.calories > 0) {
    return [toDraft({ name: "AI 估算", calories: draft.calories, protein: draft.protein, carbs: draft.carbs, fat: draft.fat }, 0)]
  }

  return [emptyItem()]
}

function readMealPhoto(): { image: string; model: string } | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(mealPhotoStorageKey) ?? "null") as { image?: string; model?: string } | null
    return parsed?.image ? { image: parsed.image, model: parsed.model ?? "AI" } : null
  } catch {
    return null
  }
}

function readMealDraft(): MealDraft | null {
  try {
    const rawDraft = sessionStorage.getItem(mealDraftStorageKey)

    if (!rawDraft) {
      return null
    }

    const parsed = JSON.parse(rawDraft) as MealDraft

    if (
      typeof parsed.calories !== "number" ||
      typeof parsed.protein !== "number" ||
      typeof parsed.carbs !== "number" ||
      typeof parsed.fat !== "number" ||
      !Array.isArray(parsed.items)
    ) {
      return null
    }

    return {
      ...parsed,
      date: isDateKey(parsed.date) ? parsed.date : todayKey(),
    }
  } catch {
    return null
  }
}
