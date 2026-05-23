import { useSearchParams } from "react-router-dom"

import { isDateKey, todayKey } from "@/lib/date"

export function useSelectedDateParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawDate = searchParams.get("date")
  const selectedDate = isDateKey(rawDate) ? rawDate : todayKey()

  function setSelectedDate(date: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)

      if (date === todayKey()) {
        next.delete("date")
      } else {
        next.set("date", date)
      }

      return next
    })
  }

  return { selectedDate, setSelectedDate }
}
