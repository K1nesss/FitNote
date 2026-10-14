import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, InputWithSuffix, SectionHeader } from "@/components/ui/controls"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"
import { parseDecimal } from "@/lib/format"
import { useSubmitLock } from "@/lib/use-submit-lock"

export function OnboardingPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { data, saveProfile } = useAppData()
  const saveSubmit = useSubmitLock()
  // Initialise once from saved data; later data refreshes must not overwrite what the user is typing.
  const [form, setForm] = useState(() => ({
    name: data?.profile.name && data.profile.name !== "我" ? data.profile.name : "",
    height: data?.profile.heightCm ? String(data.profile.heightCm) : "",
    weight: data?.profile.weightKg ? String(data.profile.weightKg) : "",
    calories: String(data?.profile.goals.calories ?? 2200),
    protein: String(data?.profile.goals.protein ?? 150),
    carbs: String(data?.profile.goals.carbs ?? 240),
    fat: String(data?.profile.goals.fat ?? 70),
  }))
  const height = parseDecimal(form.height, 0, 1)
  const weight = parseDecimal(form.weight, 0, 1)
  const ready = height > 0 && weight > 0

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function finish() {
    if (!ready) {
      showToast({ title: "请填写身高和体重", tone: "error" })
      return
    }

    await saveSubmit.run(async () => {
      let timezone: string | undefined
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
      } catch {
        timezone = undefined
      }
      await saveProfile({
        name: form.name.trim() || "我",
        heightCm: height,
        weightKg: weight,
        goals: {
          calories: parseDecimal(form.calories) || 2200,
          protein: parseDecimal(form.protein) || 150,
          carbs: parseDecimal(form.carbs) || 240,
          fat: parseDecimal(form.fat) || 70,
        },
        timezone,
      })
      showToast({ title: "设置完成", description: "接下来安排每周的训练计划。" })
      navigate("/workout/plan", { replace: true })
    })
  }

  return (
    <div className="space-y-5">
      <p className="px-1 text-sm text-muted-foreground">只需填写一次，之后可在「我的」中修改。数据保存在你自己的 Cloudflare 数据库中。</p>

      <section className="space-y-2">
        <SectionHeader title="关于你" />
        <Card>
          <CardContent className="space-y-3 p-5">
            <Field label="昵称">
              <Input placeholder="怎么称呼你" value={form.name} maxLength={40} onChange={(event) => set("name", event.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="身高">
                <InputWithSuffix suffix="cm" placeholder="175" inputMode="decimal" value={form.height} onChange={(event) => set("height", event.target.value)} />
              </Field>
              <Field label="体重">
                <InputWithSuffix suffix="kg" placeholder="70" inputMode="decimal" value={form.weight} onChange={(event) => set("weight", event.target.value)} />
              </Field>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-2">
        <SectionHeader title="每日营养目标" />
        <Card>
          <CardContent className="space-y-3 p-5">
            <Field label="热量">
              <InputWithSuffix suffix="kcal" inputMode="numeric" value={form.calories} onChange={(event) => set("calories", event.target.value)} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="蛋白质">
                <InputWithSuffix suffix="g" inputMode="numeric" value={form.protein} onChange={(event) => set("protein", event.target.value)} />
              </Field>
              <Field label="碳水">
                <InputWithSuffix suffix="g" inputMode="numeric" value={form.carbs} onChange={(event) => set("carbs", event.target.value)} />
              </Field>
              <Field label="脂肪">
                <InputWithSuffix suffix="g" inputMode="numeric" value={form.fat} onChange={(event) => set("fat", event.target.value)} />
              </Field>
            </div>
            {weight > 0 ? (
              <button
                type="button"
                className="w-full rounded-2xl bg-muted/45 px-4 py-3 text-left text-sm text-muted-foreground"
                onClick={() => setForm((current) => ({ ...current, protein: String(Math.round(weight * 2)) }))}
              >
                参考：增肌期蛋白质约 2 g/kg，即 <span className="font-semibold text-primary">{Math.round(weight * 2)} g</span>（点此填入）
              </button>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <div className="sticky-actions">
        <Button className="w-full" size="lg" onClick={finish} disabled={saveSubmit.pending || !ready}>
          {saveSubmit.pending ? "保存中…" : "完成"}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
