import { Plus, Search, Utensils } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/state"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"

const foods = [
  ["鸡胸肉", "165 kcal / 100g"],
  ["米饭", "130 kcal / 100g"],
  ["鸡蛋", "70 kcal / 个"],
  ["牛奶", "62 kcal / 100ml"],
]

export function FoodLibraryPage() {
  const { showToast } = useToast()
  const [query, setQuery] = useState("")
  const filteredFoods = useMemo(
    () => foods.filter(([name]) => name.toLowerCase().includes(query.trim().toLowerCase())),
    [query],
  )

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">食物库</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" placeholder="搜索" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          {filteredFoods.map(([name, meta]) => (
            <div key={name} className="flex items-center justify-between rounded-3xl bg-white/70 p-4">
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-sm text-muted-foreground">{meta}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="添加食物"
                onClick={() => showToast({ title: "已添加", description: name })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {filteredFoods.length === 0 ? <EmptyState icon={Utensils} title="无结果" /> : null}
        </CardContent>
      </Card>
      <EmptyState icon={Utensils} title="没有更多" description="常用食物会出现在这里。" />
    </div>
  )
}
