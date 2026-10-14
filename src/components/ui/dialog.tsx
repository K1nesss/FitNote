import { useEffect, useId } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DialogProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  placement?: "sheet" | "center"
  /** Sticky footer, e.g. the primary action. Stays visible above the keyboard/scroll. */
  footer?: ReactNode
}

let openDialogs = 0

export function Dialog({ open, title, description, children, onClose, placement = "sheet", footer }: DialogProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    openDialogs += 1
    document.documentElement.classList.add("dialog-open")

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      openDialogs -= 1
      if (openDialogs <= 0) {
        openDialogs = 0
        document.documentElement.classList.remove("dialog-open")
      }
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  const sheet = placement === "sheet"

  return createPortal(
    <div
      className={cn(
        "dialog-backdrop fixed inset-0 z-[100] flex bg-foreground/22 backdrop-blur-[3px]",
        sheet ? "items-end justify-center sm:items-center sm:p-4" : "items-center justify-center p-4",
      )}
      role="presentation"
    >
      <button className="absolute inset-0 cursor-default" type="button" aria-label="关闭" tabIndex={-1} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "soft-surface relative flex w-full max-w-md flex-col overflow-hidden border border-[var(--surface-border)] text-card-foreground",
          sheet ? "dialog-sheet max-h-[88dvh] rounded-t-[2rem] sm:rounded-[2rem]" : "dialog-center max-h-[82dvh] rounded-[2rem]",
        )}
      >
        {sheet ? <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden" aria-hidden="true" /> : null}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold leading-tight">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button size="icon" variant="ghost" className="-mr-2 -mt-1 shrink-0" onClick={onClose} aria-label="关闭">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-2 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
        {footer ? (
          <div className={cn("shrink-0 border-t border-[var(--surface-border)] px-5 pt-3", sheet ? "pb-[max(1rem,env(safe-area-inset-bottom))]" : "pb-4")}>
            {footer}
          </div>
        ) : sheet ? (
          <div className="h-[env(safe-area-inset-bottom)] shrink-0" aria-hidden="true" />
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel, destructive, pending, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog open={open} title={title} description={description} placement="center" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button variant={destructive ? "danger" : "default"} onClick={onConfirm} disabled={pending}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
