import { useMemo, useRef, useState } from "react"

import { formatNumber } from "@/lib/format"

export type TrendPoint = { label: string; value: number; detail?: string }

/**
 * Single-series line chart (2px line, recessive grid, end marker, tap/hover tooltip).
 * One series, so no legend: the surrounding title names it.
 */
export function TrendChart({ points, unit, height = 160, digits = 1 }: { points: TrendPoint[]; unit: string; height?: number; digits?: number }) {
  const [active, setActive] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement | null>(null)
  const width = 320
  const pad = { top: 14, right: 12, bottom: 22, left: 34 }

  const geometry = useMemo(() => {
    if (points.length === 0) return null
    const values = points.map((point) => point.value)
    let min = Math.min(...values)
    let max = Math.max(...values)
    if (min === max) {
      min -= 1
      max += 1
    }
    const span = max - min
    min -= span * 0.12
    max += span * 0.12
    const innerW = width - pad.left - pad.right
    const innerH = height - pad.top - pad.bottom
    const x = (index: number) => pad.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW)
    const y = (value: number) => pad.top + (1 - (value - min) / (max - min)) * innerH
    const ticks = [min + (max - min) * 0.15, (min + max) / 2, max - (max - min) * 0.15]
    return { x, y, ticks, innerW }
  }, [points, height])

  if (!geometry || points.length === 0) {
    return null
  }

  const path = points.map((point, index) => `${index ? "L" : "M"}${geometry.x(index).toFixed(1)},${geometry.y(point.value).toFixed(1)}`).join(" ")
  const last = points.length - 1
  const shown = active ?? last
  const labelIndexes = points.length <= 2 ? points.map((_, index) => index) : [0, Math.floor(last / 2), last]

  function pick(clientX: number) {
    const svg = ref.current
    if (!svg || !geometry) return
    const rect = svg.getBoundingClientRect()
    const localX = ((clientX - rect.left) / rect.width) * width
    let best = 0
    let bestDistance = Infinity
    points.forEach((_, index) => {
      const distance = Math.abs(geometry.x(index) - localX)
      if (distance < bestDistance) {
        best = index
        bestDistance = distance
      }
    })
    setActive(best)
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <p className="text-sm text-muted-foreground">{points[shown].label}</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatNumber(points[shown].value, digits)}
          <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>
          {points[shown].detail ? <span className="ml-2 text-xs font-normal text-muted-foreground">{points[shown].detail}</span> : null}
        </p>
      </div>
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-pan-y select-none"
        role="img"
        aria-label={`趋势：${points.map((point) => `${point.label} ${formatNumber(point.value, digits)}${unit}`).join("，")}`}
        onPointerMove={(event) => pick(event.clientX)}
        onPointerDown={(event) => pick(event.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        {geometry.ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={geometry.y(tick)} y2={geometry.y(tick)} className="stroke-border" strokeWidth="1" strokeDasharray="2 4" />
            <text x={pad.left - 6} y={geometry.y(tick) + 3} textAnchor="end" className="fill-muted-foreground text-[9px] tabular-nums">
              {formatNumber(tick, digits > 0 ? 1 : 0)}
            </text>
          </g>
        ))}
        {labelIndexes.map((index) => (
          <text key={index} x={geometry.x(index)} y={height - 6} textAnchor={index === 0 ? "start" : index === last ? "end" : "middle"} className="fill-muted-foreground text-[9px]">
            {points[index].label}
          </text>
        ))}
        <path d={path} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {active !== null ? (
          <line x1={geometry.x(active)} x2={geometry.x(active)} y1={pad.top} y2={height - pad.bottom} className="stroke-muted-foreground/50" strokeWidth="1" />
        ) : null}
        {points.length <= 24
          ? points.map((point, index) => (
              <circle key={index} cx={geometry.x(index)} cy={geometry.y(point.value)} r={index === shown ? 4.5 : 2.5} className={index === shown ? "fill-primary stroke-card" : "fill-primary/70"} strokeWidth={index === shown ? 2 : 0} />
            ))
          : <circle cx={geometry.x(shown)} cy={geometry.y(points[shown].value)} r="4.5" className="fill-primary stroke-card" strokeWidth="2" />}
      </svg>
    </div>
  )
}
