import { Check, Minus, Plus, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"

type MealItem = {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

const initialMealItems: MealItem[] = [
  { id: "rice", name: "米饭", calories: 260, protein: 5, carbs: 58, fat: 1 },
  { id: "chicken", name: "鸡胸肉", calories: 220, protein: 42, carbs: 0, fat: 5 },
  { id: "egg", name: "鸡蛋", calories: 210, protein: 11, carbs: 10, fat: 13 },
]

export function MealConfirmPage() {
  const { showToast } = useToast()
  const [mealItems, setMealItems] = useState(initialMealItems)
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

    setMealItems((current) => [...current, { ...draft, id: crypto.randomUUID() }])
    setDraft({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 })
    setAdding(false)
    showToast({ title: "已添加", description: "食物已加入本次记录。" })
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
          <Button size="sm" variant="quiet" aria-label="添加食物" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {mealItems.map((item) => (
          <Card key={item.name}>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.calories} kcal</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="删除食物"
                  onClick={() => setMealItems((current) => current.filter((meal) => meal.id !== item.id))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
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

      <Button asChild className="w-full rounded-3xl" size="lg" onClick={() => showToast({ title: "已保存" })}>
        <Link to="/food">
          <Check className="h-5 w-5" />
          保存
        </Link>
      </Button>

      <Dialog open={adding} title="添加食物" onClose={() => setAdding(false)}>
        <Input
          placeholder="名称"
          value={draft.name}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
        />
        <Input
          placeholder="热量"
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
