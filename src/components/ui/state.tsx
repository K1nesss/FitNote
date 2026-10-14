import type { LucideIcon } from "lucide-react"
import { AlertCircle, RotateCw } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Inline empty placeholder, meant to sit inside a card or section. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center rounded-[1.75rem] bg-muted/40 px-5 py-6 text-center", className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-card/70 text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-72 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/** Skeleton placeholder shaped like the page that is loading. */
export function LoadingState({ title = "加载中", rows = 3 }: { title?: string; rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={title}>
      <div className="skeleton h-40 rounded-[2rem]" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton h-20 rounded-[1.75rem]" style={{ animationDelay: `${index * 120}ms` }} />
      ))}
    </div>
  )
}

export function ErrorState({
  title = "加载失败",
  description = "请检查网络后重试。",
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/12 text-danger">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            <RotateCw className="h-4 w-4" />
            重试
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
