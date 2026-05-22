import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-32 w-full resize-none rounded-[1.75rem] border border-white/70 bg-white/58 px-4 py-4 text-base outline-none transition placeholder:text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = "Textarea"

export { Textarea }
