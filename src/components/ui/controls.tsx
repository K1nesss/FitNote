import { Minus, Plus } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Label + control, with an optional hint. Tapping the label focuses the input. */
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block px-1 text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block px-1 text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export function InputWithSuffix({ suffix, className, ...props }: ComponentProps<typeof Input> & { suffix: string }) {
  return (
    <div className="relative">
      <Input className={cn("pr-14", className)} {...props} />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
        {suffix}
      </span>
    </div>
  )
}

/** Big +/- number control for one-handed use at the gym. Value is kept as a string so decimals can be typed. */
export function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  unit,
  decimal = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  step: number
  min?: number
  unit?: string
  decimal?: boolean
}) {
  function bump(direction: 1 | -1) {
    const current = Number(value)
    const base = Number.isFinite(current) ? current : 0
    const next = Math.max(min, Math.round((base + direction * step) * 100) / 100)
    onChange(String(next))
  }

  return (
    <div className="rounded-[1.6rem] bg-muted/50 p-2">
      <p className="px-2 pt-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-1">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card/80 text-foreground shadow-sm transition active:scale-90"
          onClick={() => bump(-1)}
          aria-label={`${label}减少`}
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <input
            className="h-9 w-full rounded-xl bg-transparent text-center text-2xl font-semibold leading-none tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            inputMode={decimal ? "decimal" : "numeric"}
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
            onFocus={(event) => event.target.select()}
            aria-label={label}
          />
          {unit ? <span className="pointer-events-none text-[10px] leading-none text-muted-foreground">{unit}</span> : null}
        </div>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card/80 text-foreground shadow-sm transition active:scale-90"
          onClick={() => bump(1)}
          aria-label={`${label}增加`}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn("relative h-8 w-[3.25rem] shrink-0 rounded-full p-1 transition-colors duration-300", checked ? "bg-primary" : "bg-muted")}
      onClick={() => onChange(!checked)}
    >
      <span
        className={cn(
          "block h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out",
          checked && "translate-x-5",
        )}
      />
    </button>
  )
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: ReactNode }>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  return (
    <div
      className={cn("relative grid rounded-full bg-muted/55 p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
    >
      <div
        className="absolute bottom-1 left-1 top-1 rounded-full bg-card shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
        aria-hidden="true"
      />
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={cn(
            "relative z-10 h-10 rounded-full px-2 text-sm font-semibold transition-colors",
            option.value === value ? "text-foreground" : "text-muted-foreground",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value, max, className, tone = "primary" }: { value: number; max: number; className?: string; tone?: "primary" | "accent" }) {
  const ratio = max > 0 ? value / max : 0
  const over = ratio > 1

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          over ? "bg-warning" : tone === "accent" ? "bg-accent-strong" : "bg-primary",
        )}
        style={{ width: `${Math.min(ratio, 1) * 100}%` }}
      />
    </div>
  )
}

/** Small uppercase-ish section heading with an optional trailing action. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-1">
      <h2 className="text-[15px] font-semibold text-muted-foreground">{title}</h2>
      {action}
    </div>
  )
}
