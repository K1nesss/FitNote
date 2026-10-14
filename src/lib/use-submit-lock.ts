import { useCallback, useRef, useState } from "react"

import { useToast } from "@/components/ui/toast"

/**
 * Prevents double submits and turns failures into an error toast,
 * so every save button gives feedback even when the network drops.
 */
export function useSubmitLock() {
  const lockedRef = useRef(false)
  const [pending, setPending] = useState(false)
  const { showToast } = useToast()

  const run = useCallback(
    async (action: () => Promise<void>, failureTitle = "保存失败") => {
      if (lockedRef.current) {
        return false
      }

      lockedRef.current = true
      setPending(true)

      try {
        await action()
        return true
      } catch (caught) {
        showToast({
          title: failureTitle,
          description: caught instanceof Error && caught.message ? caught.message : "请稍后重试",
          tone: "error",
        })
        return false
      } finally {
        lockedRef.current = false
        setPending(false)
      }
    },
    [showToast],
  )

  return { pending, run }
}
