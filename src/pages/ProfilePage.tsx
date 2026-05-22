import { Bell, ChevronRight, Database, Moon, Shield, UserRound } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const settings = [
  { label: "目标", value: "2200 kcal", icon: UserRound, href: "/profile/settings/goals" },
  { label: "提醒", value: "开启", icon: Bell, href: "/profile/settings/reminders" },
  { label: "外观", value: "跟随系统", icon: Moon, href: "/profile/settings/appearance" },
  { label: "数据", value: "本地 D1", icon: Database, href: "/profile/settings/data" },
  { label: "隐私", value: "仅自己", icon: Shield, href: "/profile/settings/privacy" },
]

export function ProfilePage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="liquid-control flex h-20 w-20 shrink-0 items-center justify-center rounded-[2rem]">
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-[1.55rem] bg-primary text-2xl font-semibold text-primary-foreground">
              S
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-3xl font-semibold tracking-normal">Sean</h2>
            <p className="mt-1 text-sm text-muted-foreground">FitNote</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>设置</CardTitle>
            <Badge>个人</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {settings.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="flex w-full items-center justify-between gap-4 rounded-3xl bg-white/70 p-4 text-left transition active:scale-[0.99]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="font-medium">{item.label}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                {item.value}
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Button variant="quiet" className="w-full">
        导出数据
      </Button>
    </div>
  )
}
