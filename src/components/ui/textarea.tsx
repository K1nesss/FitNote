import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-32 w-full resize-none rounded-[1.75rem] border border-white/60 bg-white/72 px-4 py-4 text-base outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-xl transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = "Textarea"

export { Textarea }
