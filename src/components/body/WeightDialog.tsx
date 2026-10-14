import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, Stepper } from "@/components/ui/controls"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"
import { todayKey } from "@/lib/date"
import { parseDecimal } from "@/lib/format"
import { useSubmitLock } from "@/lib/use-submit-lock"

export function WeightDialog({ open, onClose, initialDate }: { open: boolean; onClose: () => void; initialDate?: string }) {
  const { data, saveBodyWeight } = useAppData()
  const { showToast } = useToast()
  const submit = useSubmitLock()
  const last = data?.bodyWeights[data.bodyWeights.length - 1]?.weight ?? data?.profile.weightKg ?? 70
  const [date, setDate] = useState(initialDate ?? todayKey())
  const [weight, setWeight] = useState(String(last))

  useEffect(() => {
    if (open) {
      const existing = data?.bodyWeights.find((entry) => entry.date === (initialDate ?? todayKey()))
      setDate(initialDate ?? todayKey())
      setWeight(String(existing?.weight ?? last))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function save() {
    const value = parseDecimal(weight, 0, 1)
    if (value < 20 || value > 400) {
      showToast({ title: "请输入有效体重", tone: "error" })
      return
    }
    await submit.run(async () => {
      const result = await saveBodyWeight({ date, weight: value })
      showToast(result === "queued" ? { title: "体重已保存在本机", description: "联网后会自动同步" } : { title: "体重已记录" })
      onClose()
    })
  }

  return (
    <Dialog
      open={open}
      title="记录体重"
      description="建议每天早上空腹、如厕后称重，看 7 天平均更准确。"
      onClose={onClose}
      footer={
        <Button className="w-full" size="lg" onClick={save} disabled={submit.pending}>
          {submit.pending ? "保存中…" : "保存"}
        </Button>
      }
    >
      <Stepper label="体重" unit="kg" value={weight} onChange={setWeight} step={0.1} decimal />
      <Field label="日期">
        <Input type="date" value={date} max={todayKey()} onChange={(event) => setDate(event.target.value || todayKey())} />
      </Field>
    </Dialog>
  )
}

/** Average of the entries within the last `days` days ending at `endDate` (inclusive). */
export function averageWeight(entries: Array<{ date: string; weight: number }>, endDate: string, days = 7) {
  const end = new Date(`${endDate}T00:00:00`).getTime()
  const start = end - (days - 1) * 86400000
  const inRange = entries.filter((entry) => {
    const time = new Date(`${entry.date}T00:00:00`).getTime()
    return time >= start && time <= end
  })
  if (!inRange.length) return null
  return Math.round((inRange.reduce((sum, entry) => sum + entry.weight, 0) / inRange.length) * 10) / 10
}
