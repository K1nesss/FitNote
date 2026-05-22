import * as React from "react"

import { cn } from "@/lib/utils"

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/58 bg-white/62 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  )
}
