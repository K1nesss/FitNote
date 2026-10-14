import { useCallback, useEffect, useRef, useState } from "react"

import { getDayData, type DayData } from "@/lib/api"

export function useDayData(date: string) {
  const [dayData, setDayData] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)

    try {
      const next = await getDayData(date)
      if (id === requestId.current) {
        setDayData(next)
      }
    } catch (caught) {
      if (id === requestId.current) {
        setError(caught instanceof Error ? caught.message : "加载失败")
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false)
      }
    }
  }, [date])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Only the very first load (or a date switch with nothing to show) should blank the page.
  const showSkeleton = loading && (!dayData || dayData.date !== date)

  return { dayData: dayData?.date === date ? dayData : null, loading, showSkeleton, error, refresh }
}
