import { Camera, Check, Clipboard, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"

export type MealDraftItem = {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type MealDraft = {
  calories: number
  protein: number
  carbs: number
  fat: number
  items: MealDraftItem[]
}

export const mealDraftStorageKey = "fitnote.mealDraft"

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
  const { data } = useAppData()
  const [jsonText, setJsonText] = useState("")
  const parsedMeal = useMemo(() => parseMealJson(jsonText), [jsonText])

  async function copyPrompt() {
    await navigator.clipboard.writeText(aiPrompt)
    showToast({ title: "已复制", description: "粘贴到 AI 应用即可。" })
  }

  function openConfirm() {
    if (!parsedMeal) {
      showToast({ title: "需要 JSON", description: "先粘贴 AI 返回的结果。" })
      return
    }

    sessionStorage.setItem(mealDraftStorageKey, JSON.stringify(parsedMeal))
    navigate("/food/confirm")
  }

  return (
    <div className="space-y-5">
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
          <p className={`text-sm ${jsonText && !parsedMeal ? "text-red-500" : "text-muted-foreground"}`}>
            {jsonText ? (parsedMeal ? "JSON 已识别" : "JSON 格式不正确") : "粘贴 AI JSON"}
          </p>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>估算</CardTitle>
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsedMeal ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["热量", parsedMeal.calories, "kcal"],
                  ["蛋白质", parsedMeal.protein, "g"],
                  ["碳水", parsedMeal.carbs, "g"],
                  ["脂肪", parsedMeal.fat, "g"],
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
              <Button className="w-full rounded-3xl" size="lg" onClick={openConfirm}>
                <Check className="h-5 w-5" />
                确认
              </Button>
            </>
          ) : (
            <div className="rounded-3xl bg-muted/70 p-5 text-sm text-muted-foreground">等待 AI JSON</div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">今日记录</h2>
        {(data?.recentMeals ?? []).map((meal) => (
          <Card key={meal.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{meal.title}</p>
                <p className="text-sm text-muted-foreground">{meal.note}</p>
              </div>
              <div className="text-right text-sm">
                <p>{meal.calories} kcal</p>
                <p className="text-muted-foreground">{meal.protein}g P</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
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

    return { calories, protein, carbs, fat, items }
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

function toNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? Math.round(number * 10) / 10 : fallback
}
