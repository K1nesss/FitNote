export function Sparkline({ values, className = "h-8 w-24" }: { values: number[]; className?: string }) {
  if (values.length < 2) {
    return null
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100
    const y = 28 - ((value - min) / span) * 24
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg viewBox="-2 0 104 32" className={className} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points.join(" ")} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={points[points.length - 1].split(",")[0]} cy={points[points.length - 1].split(",")[1]} r="3" className="fill-primary" />
    </svg>
  )
}
