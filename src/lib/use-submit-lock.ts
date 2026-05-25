import { useCallback, useRef, useState } from "react"

export function useSubmitLock() {
  const lockedRef = useRef(false)
  const [pending, setPending] = useState(false)

  const run = useCallback(async (action: () => Promise<void>) => {
    if (lockedRef.current) {
      return
    }

    lockedRef.current = true
    setPending(true)

    try {
      await action()
    } finally {
      lockedRef.current = false
      setPending(false)
    }
  }, [])

  return { pending, run }
}
