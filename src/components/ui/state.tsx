import type { LucideIcon } from "lucide-react"
import { AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type StateBlockProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: string
}

export function EmptyState({ icon: Icon, title, description, action }: StateBlockProps) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-muted">
          <Icon className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="mx-auto mt-2 max-w-64 text-sm text-muted-foreground">{description}</p> : null}
        {action ? (
          <Button variant="quiet" className="mt-5">
            {action}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function LoadingState({ title = "加载中" }: { title?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <p className="font-medium">{title}</p>
      </CardContent>
    </Card>
  )
}

export function ErrorState({ title = "出错了", description = "稍后再试。" }: Partial<StateBlockProps>) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          重试
        </Button>
      </CardContent>
    </Card>
  )
}
