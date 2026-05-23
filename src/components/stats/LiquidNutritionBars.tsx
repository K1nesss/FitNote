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
        const height = item.calories > 0 ? Math.max(percent, 8) : 0
        const overTarget = item.calories > maxCalories

        return (
          <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
            <div className={`liquid-bar-track ${overTarget ? "is-over" : ""} ${heightClassName}`}>
              <svg className="liquid-bar-svg" viewBox="0 0 42 160" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <clipPath id={`liquid-clip-${item.day}`}>
                    <rect x="0" y={160 - (height / 100) * 160} width="42" height={(height / 100) * 160} />
                  </clipPath>
                </defs>
                {height > 0 ? (
                  <g clipPath={`url(#liquid-clip-${item.day})`}>
                    <path
                      className="liquid-bar-body"
                      d="M0 0 H42 V160 H0 Z"
                    />
                    <path
                      className="liquid-bar-surface liquid-bar-surface-a"
                      d="M-42 11 C-32 5 -24 5 -14 11 C-4 17 4 17 14 11 C24 5 32 5 42 11 C52 17 60 17 70 11 C80 5 88 5 98 11 V160 H-42 Z"
                      style={{ transform: `translateY(${160 - (height / 100) * 160 - 11}px)` }}
                    />
                    <path
                      className="liquid-bar-surface liquid-bar-surface-b"
                      d="M-42 12 C-30 18 -20 18 -8 12 C4 6 14 6 26 12 C38 18 48 18 60 12 C72 6 82 6 94 12 V160 H-42 Z"
                      style={{ transform: `translateY(${160 - (height / 100) * 160 - 11}px)` }}
                    />
                    <path className="liquid-bar-highlight" d="M10 16 C7 54 7 106 11 144" />
                  </g>
                ) : null}
              </svg>
            </div>
            <span className="text-xs text-muted-foreground">{item.day}</span>
          </div>
        )
      })}
    </>
  )
}
