import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type DialogProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  placement?: "sheet" | "center"
}

export function Dialog({ open, title, children, onClose, placement = "sheet" }: DialogProps) {
  if (!open) {
    return null
  }

  return createPortal(
    <div
      className={
        placement === "center"
          ? "fixed inset-0 z-[100] grid place-items-center bg-foreground/18 p-4 backdrop-blur-sm"
          : "fixed inset-0 z-[100] flex items-end bg-foreground/18 px-3 pb-3 backdrop-blur-sm sm:items-center sm:p-4"
      }
    >
      <button className="absolute inset-0 cursor-default" type="button" aria-label="关闭" onClick={onClose} />
      <Card
        className={
          placement === "center"
            ? "relative mx-auto flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-[2rem]"
            : "relative mx-auto flex max-h-[86dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]"
        }
      >
        <CardHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Button size="icon" variant="ghost" onClick={onClose} aria-label="关闭">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </CardContent>
      </Card>
    </div>,
    document.body,
  )
}
