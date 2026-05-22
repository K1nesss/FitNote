import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-[1.35rem] border border-white/70 bg-white/58 px-4 text-base outline-none transition placeholder:text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = "Input"

export { Input }
