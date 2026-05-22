import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(32,33,36,0.18)] hover:bg-primary/90 hover:shadow-[0_18px_42px_rgba(32,33,36,0.22)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_14px_34px_rgba(31,52,40,0.12)] hover:bg-secondary/80",
        quiet:
          "liquid-glass text-foreground hover:bg-white/55",
        ghost: "hover:bg-white/42 text-muted-foreground hover:text-foreground",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-11 px-4 text-xs",
        lg: "h-13 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)

Button.displayName = "Button"

export { Button, buttonVariants }
