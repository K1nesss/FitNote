import type { FoodTrendItem } from "@/lib/api"

type LiquidNutritionBarsProps = {
  trend: FoodTrendItem[]
  maxCalories: number
  heightClassName?: string
}

export function LiquidNutritionBars({ trend, maxCalories, heightClassName = "h-32" }: LiquidNutritionBarsProps) {
  return (
    <>
      {trend.map((item) => {
        const percent = Math.min((item.calories / Math.max(maxCalories, 1)) * 100, 100)
        const height = item.calories > 0 ? Math.max(percent, 7) : 0

        return (
          <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
            <div className={`liquid-bar-track flex w-full items-end rounded-full p-1 ${heightClassName}`}>
              <div className="liquid-bar-fill w-full rounded-full" style={{ height: `${height}%` }}>
                <span className="liquid-bar-wave" aria-hidden="true" />
                <span className="liquid-bar-shine" aria-hidden="true" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{item.day}</span>
          </div>
        )
      })}
    </>
  )
}
