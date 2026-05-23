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
        const waterTop = 160 - (height / 100) * 160

        return (
          <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
            <div className={`liquid-bar-track ${overTarget ? "is-over" : ""} ${heightClassName}`}>
              <svg className="liquid-bar-svg" viewBox="0 0 42 160" preserveAspectRatio="none" aria-hidden="true">
                {height > 0 ? (
                  <>
                    <rect className="liquid-bar-body" x="0" y={waterTop + 5} width="42" height={160 - waterTop} />
                    <g className="liquid-bar-surface-group" style={{ transform: `translateY(${waterTop}px)` }}>
                      <path
                        className="liquid-bar-surface liquid-bar-surface-a"
                        d="M-84 9 C-73 0 -62 0 -51 9 C-40 18 -29 18 -18 9 C-7 0 4 0 15 9 C26 18 37 18 48 9 C59 0 70 0 81 9 C92 18 103 18 114 9 C125 0 136 0 147 9 V170 H-84 Z"
                      />
                      <path
                        className="liquid-bar-surface liquid-bar-surface-b"
                        d="M-84 12 C-71 20 -58 20 -45 12 C-32 4 -19 4 -6 12 C7 20 20 20 33 12 C46 4 59 4 72 12 C85 20 98 20 111 12 C124 4 137 4 150 12 V170 H-84 Z"
                      />
                    </g>
                    <path className="liquid-bar-highlight" d="M10 18 C7 52 7 108 11 143" />
                  </>
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
