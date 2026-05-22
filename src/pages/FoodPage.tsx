import { BookOpen, Camera, Sparkles } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { recentMeals } from "@/data/mock"

export function FoodPage() {
  const [text, setText] = useState("一碗米饭、一份鸡胸肉、两个鸡蛋")
  const estimate = useMemo(() => {
    const base = text.trim().length > 0 ? 1 : 0

    return {
      calories: base * 690,
      protein: base * 58,
      carbs: base * 68,
      fat: base * 19,
    }
  }, [text])

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">饮食</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="例如：一碗米饭、一份鸡胸肉、两个鸡蛋"
          />
          <Button asChild className="w-full rounded-3xl" size="lg">
            <Link to="/food/confirm">
              <Sparkles className="h-5 w-5" />
              估算
            </Link>
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="quiet" className="rounded-3xl" size="lg">
              <Link to="/food/image" aria-label="图片识别">
                <Camera className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="quiet" className="rounded-3xl" size="lg">
              <Link to="/food/library" aria-label="食物库">
                <BookOpen className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>估算</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["热量", estimate.calories, "kcal"],
              ["蛋白质", estimate.protein, "g"],
              ["碳水", estimate.carbs, "g"],
              ["脂肪", estimate.fat, "g"],
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
          <Button asChild variant="secondary" className="w-full rounded-3xl">
            <Link to="/food/confirm">确认</Link>
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">今日记录</h2>
        {recentMeals.map((meal) => (
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
