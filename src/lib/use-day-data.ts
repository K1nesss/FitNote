import { useCallback, useEffect, useState } from "react"

import { getDayData, type DayData } from "@/lib/api"

export function useDayData(date: string) {
  const [dayData, setDayData] = useState<DayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setDayData(await getDayData(date))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { dayData, loading, error, refresh }
}
