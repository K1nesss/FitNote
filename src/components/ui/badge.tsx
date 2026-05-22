import * as React from "react"

import { cn } from "@/lib/utils"

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "surface-pill inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}
