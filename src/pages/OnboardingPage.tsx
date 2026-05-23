import { Activity, ArrowRight, Dumbbell, Flame, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { useAppData } from "@/lib/app-data"

const steps = [
  { label: "资料", icon: UserRound },
  { label: "目标", icon: Flame },
  { label: "训练", icon: Dumbbell },
  { label: "完成", icon: Activity },
]

export function OnboardingPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { data, saveProfile } = useAppData()
  const [profile, setProfile] = useState({
    name: "Sean",
    height: "",
    weight: "",
    calories: "2200",
    protein: "150",
    carbs: "240",
    fat: "70",
    days: "4 天",
  })

  useEffect(() => {
    if (data) {
      setProfile((current) => ({
        ...current,
        name: data.profile.name,
        height: data.profile.heightCm ? String(data.profile.heightCm) : current.height,
        weight: data.profile.weightKg ? String(data.profile.weightKg) : current.weight,
        calories: String(data.profile.goals.calories),
        protein: String(data.profile.goals.protein),
        carbs: String(data.profile.goals.carbs),
        fat: String(data.profile.goals.fat),
      }))
    }
  }, [data])

  async function finish() {
    await saveProfile({
      name: profile.name,
      heightCm: Number(profile.height) || null,
      weightKg: Number(profile.weight) || null,
      goals: {
        calories: Number(profile.calories) || 2200,
        protein: Number(profile.protein) || 150,
        carbs: Number(profile.carbs) || 240,
        fat: Number(profile.fat) || 70,
      },
    })
    showToast({ title: "已保存" })
    navigate("/workout/plan", { replace: true })
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">开始</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((step, index) => (
              <div key={step.label} className="rounded-3xl bg-white/70 p-3 text-center">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-muted">
                  <step.icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground">{index + 1}</p>
              </div>
            ))}
          </div>
          <Input
            placeholder="昵称"
            value={profile.name}
            onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="身高 cm"
              inputMode="numeric"
              value={profile.height}
              onChange={(event) => setProfile((current) => ({ ...current, height: event.target.value }))}
            />
            <Input
              placeholder="体重 kg"
              inputMode="decimal"
              value={profile.weight}
              onChange={(event) => setProfile((current) => ({ ...current, weight: event.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>营养目标</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="热量 kcal"
            value={profile.calories}
            inputMode="numeric"
            onChange={(event) => setProfile((current) => ({ ...current, calories: event.target.value }))}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="P"
              value={profile.protein}
              inputMode="numeric"
              onChange={(event) => setProfile((current) => ({ ...current, protein: event.target.value }))}
            />
            <Input
              placeholder="C"
              value={profile.carbs}
              inputMode="numeric"
              onChange={(event) => setProfile((current) => ({ ...current, carbs: event.target.value }))}
            />
            <Input
              placeholder="F"
              value={profile.fat}
              inputMode="numeric"
              onChange={(event) => setProfile((current) => ({ ...current, fat: event.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>训练偏好</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          {["3 天", "4 天", "5 天"].map((item) => (
            <button
              key={item}
              className={`h-14 rounded-3xl font-medium transition active:scale-95 ${
                profile.days === item ? "bg-primary text-primary-foreground" : "bg-white/70"
              }`}
              onClick={() => setProfile((current) => ({ ...current, days: item }))}
            >
              {item}
            </button>
          ))}
        </CardContent>
      </Card>

      <Button className="w-full rounded-3xl" size="lg" onClick={finish}>
        完成
        <ArrowRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
