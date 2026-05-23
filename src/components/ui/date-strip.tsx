import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { addDays, dateFromKey, monthGrid, recentDateKeys, relativeDateLabel, shortMonthDay, todayKey } from "@/lib/date"
import { cn } from "@/lib/utils"

type DateStripProps = {
  value: string
  onChange: (dateKey: string) => void
}

export function DateStrip({ value, onChange }: DateStripProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(value)
  const dates = useMemo(() => recentDateKeys(), [])
  const calendarActive = !dates.includes(value)
  const calendarDays = monthGrid(visibleMonth)
  const monthDate = dateFromKey(visibleMonth)

  function shiftMonth(offset: number) {
    const next = dateFromKey(visibleMonth)
    next.setMonth(next.getMonth() + offset, 1)
    setVisibleMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`)
  }

  return (
    <>
      <div className="grid grid-cols-5 gap-2">
        {dates.map((dateKey) => {
          const active = dateKey === value
          return (
            <button
              key={dateKey}
              type="button"
              className={cn(
                "h-11 rounded-full text-sm font-semibold transition active:scale-95",
                active ? "bg-primary text-primary-foreground" : "bg-muted/45 text-muted-foreground",
              )}
              onClick={() => onChange(dateKey)}
            >
              {dateKey === todayKey() ? "今天" : relativeDateLabel(dateKey)}
            </button>
          )
        })}
        <Button
          type="button"
          size="icon"
          variant={calendarActive ? "default" : "quiet"}
          className={cn("w-full", calendarActive ? "text-primary-foreground" : "bg-muted/45")}
          aria-label="日历"
          onClick={() => {
            setVisibleMonth(value)
            setCalendarOpen(true)
          }}
        >
          {calendarActive ? (
            <span className="text-xs font-semibold">{shortMonthDay(value)}</span>
          ) : (
            <CalendarDays className="h-5 w-5" />
          )}
        </Button>
      </div>

      <Dialog open={calendarOpen} title="日期" placement="center" onClose={() => setCalendarOpen(false)}>
        <div className="flex items-center justify-between">
          <Button type="button" size="icon" variant="ghost" aria-label="上一月" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="font-semibold">
            {monthDate.getFullYear()}年{monthDate.getMonth() + 1}月
          </p>
          <Button type="button" size="icon" variant="ghost" aria-label="下一月" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["日", "一", "二", "三", "四", "五", "六"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((item) => {
            const active = item.key === value
            return (
              <button
                key={item.key}
                type="button"
                className={cn(
                  "flex aspect-square items-center justify-center rounded-2xl text-sm font-semibold transition active:scale-95",
                  active
                    ? "bg-primary text-primary-foreground"
                    : item.muted
                      ? "text-muted-foreground/45"
                      : "bg-white/56 text-foreground",
                )}
                onClick={() => {
                  onChange(item.key)
                  setCalendarOpen(false)
                }}
              >
                {item.day}
              </button>
            )
          })}
        </div>
      </Dialog>
    </>
  )
}
