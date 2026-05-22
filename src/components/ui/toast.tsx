import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { CheckCircle2, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type Toast = {
  id: number
  title: string
  description?: string
  state: "open" | "closing"
}

type ToastInput = {
  title: string
  description?: string
}

type ToastContextValue = {
  showToast: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, state: "closing" } : toast)),
    )
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 240)
  }, [])

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = Date.now()
      setToasts((current) => [...current, { ...toast, id, state: "open" }])
      window.setTimeout(() => dismissToast(id), 2400)
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-3xl flex-col gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-state={toast.state}
            className="toast-motion liquid-glass pointer-events-auto flex items-center gap-3 rounded-[1.5rem] p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{toast.title}</p>
              {toast.description ? <p className="text-sm text-muted-foreground">{toast.description}</p> : null}
            </div>
            <Button size="icon" variant="ghost" onClick={() => dismissToast(toast.id)} aria-label="关闭">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider")
  }

  return context
}
