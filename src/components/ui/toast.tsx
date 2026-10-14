import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { AlertCircle, CheckCircle2, X } from "lucide-react"

import { cn } from "@/lib/utils"

type ToastTone = "success" | "error"

type Toast = {
  id: number
  title: string
  description?: string
  tone: ToastTone
  state: "open" | "closing"
}

type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
}

type ToastContextValue = {
  showToast: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, state: "closing" } : toast)))
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 240)
  }, [])

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++
      const tone = toast.tone ?? "success"
      setToasts((current) => [...current.slice(-2), { ...toast, tone, id, state: "open" }])
      window.setTimeout(() => dismissToast(id), tone === "error" ? 4200 : 2200)
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[120] mx-auto flex w-full max-w-lg flex-col gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-state={toast.state}
            role={toast.tone === "error" ? "alert" : "status"}
            className="toast-motion liquid-glass pointer-events-auto flex items-center gap-3 rounded-[1.5rem] p-2.5 pl-3"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                toast.tone === "error" ? "bg-danger/14 text-danger" : "bg-primary/14 text-primary",
              )}
            >
              {toast.tone === "error" ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight">{toast.title}</p>
              {toast.description ? <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{toast.description}</p> : null}
            </div>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground"
              onClick={() => dismissToast(toast.id)}
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
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
