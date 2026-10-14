import { Plus, Scale, Trash2 } from "lucide-react"
import { useState } from "react"

import { averageWeight, WeightDialog } from "@/components/body/WeightDialog"
import { TrendChart } from "@/components/stats/TrendChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/controls"
import { ConfirmDialog } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/state"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"
import { addDays, shortMonthDay, todayKey } from "@/lib/date"
import { formatNumber } from "@/lib/format"
import { useSubmitLock } from "@/lib/use-submit-lock"

export function BodyWeightPage() {
  const { data, deleteBodyWeight } = useAppData()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const removeSubmit = useSubmitLock()

  if (!data) return null

  const entries = data.bodyWeights
  const today = todayKey()
  const latest = entries[entries.length - 1]
  const avg7 = averageWeight(entries, today, 7)
  const avgPrev = averageWeight(entries, addDays(today, -7), 7)
  const weekChange = avg7 !== null && avgPrev !== null ? Math.round((avg7 - avgPrev) * 10) / 10 : null
  const height = data.profile.heightCm
  const bmi = latest && height ? Math.round((latest.weight / (height / 100) ** 2) * 10) / 10 : null

  async function remove() {
    if (!removing) return
    await removeSubmit.run(async () => {
      await deleteBodyWeight(removing)
      setRemoving(null)
      showToast({ title: "已删除" })
    }, "删除失败")
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">最近一次{latest ? ` · ${shortMonthDay(latest.date)}` : ""}</p>
              <p className="mt-0.5 text-4xl font-bold tracking-tight tabular-nums">
                {latest ? formatNumber(latest.weight, 1) : "–"}
                <span className="ml-1 text-base font-medium text-muted-foreground">kg</span>
              </p>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              记录
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["7 天平均", avg7 !== null ? `${formatNumber(avg7, 1)} kg` : "–"],
              ["较上周", weekChange !== null ? `${weekChange > 0 ? "+" : ""}${formatNumber(weekChange, 1)} kg` : "–"],
              ["BMI", bmi !== null ? formatNumber(bmi, 1) : "–"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-muted/45 py-2.5">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {entries.length >= 2 ? (
        <section className="space-y-2">
          <SectionHeader title="体重趋势" />
          <Card>
            <CardContent className="p-4">
              <TrendChart points={entries.slice(-60).map((entry) => ({ label: shortMonthDay(entry.date), value: entry.weight }))} unit="kg" />
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-2">
        <SectionHeader title={`记录 · ${entries.length}`} />
        {entries.length ? (
          <Card>
            <CardContent className="divide-y divide-[var(--surface-border)] p-1.5">
              {[...entries].reverse().slice(0, 60).map((entry) => (
                <div key={entry.date} className="flex items-center justify-between gap-3 py-1.5 pl-3 pr-1">
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold tabular-nums">{formatNumber(entry.weight, 1)} kg</span>
                    <Button size="icon" variant="ghost" aria-label={`删除 ${entry.date}`} onClick={() => setRemoving(entry.date)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <EmptyState icon={Scale} title="还没有体重记录" description="坚持记录，看 7 天平均的变化来判断热量目标是否合适。" />
        )}
      </section>

      <WeightDialog open={open} onClose={() => setOpen(false)} />
      <ConfirmDialog
        open={Boolean(removing)}
        title="删除这条体重记录？"
        confirmLabel="删除"
        destructive
        pending={removeSubmit.pending}
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </div>
  )
}
