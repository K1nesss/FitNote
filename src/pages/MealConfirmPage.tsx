import { Check, Minus, Plus, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"
import { mealDraftStorageKey, type MealDraft, type MealDraftItem } from "@/pages/FoodPage"

type MealItem = MealDraftItem & {
  id: string
}

const fallbackMealItems: MealItem[] = [{ id: "manual", name: "食物", calories: 0, protein: 0, carbs: 0, fat: 0 }]

export function MealConfirmPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { saveMeal } = useAppData()
  const [mealItems, setMealItems] = useState<MealItem[]>(() => loadMealItems())
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 })
  const total = useMemo(
    () =>
      mealItems.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [mealItems],
  )

  function updateItem(id: string, key: keyof Omit<MealItem, "id" | "name">, value: number) {
    setMealItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: Number.isFinite(value) ? value : 0 } : item)),
    )
  }

  function addItem() {
    if (!draft.name.trim()) {
      return
    }

    setMealItems((current) => [...current, { ...draft, id: crypto.randomUUID(), name: draft.name.trim() }])
    setDraft({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 })
    setAdding(false)
    showToast({ title: "已添加" })
  }

  async function saveCurrentMeal() {
    await saveMeal({
      rawText: "AI JSON",
      calories: total.calories,
      protein: total.protein,
      carbs: total.carbs,
      fat: total.fat,
      items: mealItems.map(({ id: _id, ...item }) => item),
    })
    sessionStorage.removeItem(mealDraftStorageKey)
    showToast({ title: "已保存" })
    navigate("/food")
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">确认</CardTitle>
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-accent text-accent-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["热量", total.calories, "kcal"],
              ["蛋白质", total.protein, "g"],
              ["碳水", total.carbs, "g"],
              ["脂肪", total.fat, "g"],
            ].map(([label, value, unit]) => (
              <div key={label} className="rounded-3xl bg-muted/70 p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-semibold">
                  {value}
                  <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">食物</h2>
          <Button size="sm" variant="quiet" aria-label="添加" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {mealItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.calories} kcal</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="删除"
                  onClick={() => setMealItems((current) => current.filter((meal) => meal.id !== item.id))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">kcal</span>
                  <Input
                    value={item.calories}
                    inputMode="decimal"
                    onChange={(event) => updateItem(item.id, "calories", Number(event.target.value))}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">P</span>
                  <Input
                    value={item.protein}
                    inputMode="decimal"
                    onChange={(event) => updateItem(item.id, "protein", Number(event.target.value))}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">C</span>
                  <Input
                    value={item.carbs}
                    inputMode="decimal"
                    onChange={(event) => updateItem(item.id, "carbs", Number(event.target.value))}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">F</span>
                  <Input
                    value={item.fat}
                    inputMode="decimal"
                    onChange={(event) => updateItem(item.id, "fat", Number(event.target.value))}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Button className="w-full rounded-3xl" size="lg" onClick={saveCurrentMeal}>
        <Check className="h-5 w-5" />
        保存
      </Button>

      <Dialog open={adding} title="添加" onClose={() => setAdding(false)}>
        <Input
          placeholder="名称"
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
        <Input
          placeholder="kcal"
          inputMode="numeric"
          value={draft.calories}
          onChange={(event) => setDraft((current) => ({ ...current, calories: Number(event.target.value) || 0 }))}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="P"
            value={draft.protein}
            onChange={(event) => setDraft((current) => ({ ...current, protein: Number(event.target.value) || 0 }))}
          />
          <Input
            placeholder="C"
            value={draft.carbs}
            onChange={(event) => setDraft((current) => ({ ...current, carbs: Number(event.target.value) || 0 }))}
          />
          <Input
            placeholder="F"
            value={draft.fat}
            onChange={(event) => setDraft((current) => ({ ...current, fat: Number(event.target.value) || 0 }))}
          />
        </div>
        <Button className="w-full" onClick={addItem}>
          添加
        </Button>
      </Dialog>
    </div>
  )
}

function loadMealItems() {
  const draft = readMealDraft()

  if (!draft) {
    return fallbackMealItems
  }

  if (draft.items.length > 0) {
    return draft.items.map((item, index) => ({ ...item, id: `ai-${index}` }))
  }

  return [
    {
      id: "ai-total",
      name: "AI 估算",
      calories: draft.calories,
      protein: draft.protein,
      carbs: draft.carbs,
      fat: draft.fat,
    },
  ]
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

    return parsed
  } catch {
    return null
  }
}
