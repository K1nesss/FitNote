import { ChevronLeft, Dumbbell, Home, PieChart, Sparkles, Utensils } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"

import { useAppData } from "@/lib/app-data"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", label: "今日", icon: Home },
  { to: "/workout", label: "训练", icon: Dumbbell },
  { to: "/ai", label: "AI", icon: Sparkles },
  { to: "/food", label: "饮食", icon: Utensils },
  { to: "/stats", label: "统计", icon: PieChart },
]

const tabPaths = navItems.map((item) => item.to)

const settingsTitles: Record<string, string> = {
  profile: "身体数据",
  goals: "营养目标",
  ai: "AI 识别",
  reminders: "提醒",
  appearance: "外观",
  data: "数据与备份",
  privacy: "访问保护",
}

function pageTitle(pathname: string) {
  if (pathname === "/") return "今日"
  if (pathname === "/workout") return "训练"
  if (pathname === "/food") return "饮食"
  if (pathname === "/stats") return "统计"
  if (pathname === "/ai") return "AI 助手"
  if (pathname === "/profile") return "我的"
  if (pathname === "/onboarding") return "欢迎使用"
  if (pathname === "/workout/session") return "训练中"
  if (pathname === "/workout/summary") return "训练完成"
  if (pathname === "/workout/plan") return "训练计划"
  if (pathname === "/workout/history") return "训练历史"
  if (pathname === "/workout/library") return "动作库"
  if (pathname === "/food/confirm") return "确认这一餐"
  if (pathname === "/food/image") return "拍照估算"
  if (pathname === "/stats/nutrition") return "营养趋势"
  if (pathname === "/stats/training") return "训练频率"
  if (pathname === "/stats/exercises") return "重量变化"
  if (pathname === "/stats/weight") return "体重"
  if (pathname.startsWith("/workout/library/")) return "动作详情"
  if (pathname.startsWith("/profile/settings/")) return settingsTitles[pathname.split("/").pop() ?? ""] ?? "设置"
  return "FitNote"
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { data } = useAppData()
  const isTab = tabPaths.includes(location.pathname)
  const isRoot = isTab || location.pathname === "/onboarding"
  const showBottomNav = isTab && Boolean(data)
  const activeIndex = navItems.findIndex((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)))
  const title = pageTitle(location.pathname)
  const initial = (data?.profile.name ?? "").trim().slice(0, 1).toUpperCase() || "我"
  const scrolled = useScrolled()

  useEffect(() => {
    document.title = title === "FitNote" ? "FitNote" : `${title} · FitNote`
  }, [title])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  function goBack() {
    const historyState = window.history.state as { idx?: number } | null

    if (historyState?.idx && historyState.idx > 0) {
      navigate(-1)
      return
    }

    navigate(getFallbackBackPath(location.pathname), { replace: true })
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        <header
          className={cn(
            "pt-safe sticky top-0 z-20 px-5 pb-2 transition-[background-color,box-shadow,backdrop-filter] duration-300",
            scrolled ? "bg-background/72 shadow-[0_1px_0_var(--surface-border)] backdrop-blur-2xl" : "bg-transparent",
          )}
        >
          {isRoot ? (
            <div className="flex h-12 items-center justify-between gap-3">
              <h1 className="truncate text-[28px] font-bold leading-none tracking-tight">{title}</h1>
              {location.pathname !== "/onboarding" ? (
                <NavLink
                  to="/profile"
                  className="liquid-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95"
                  aria-label="我的"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {initial}
                  </span>
                </NavLink>
              ) : null}
            </div>
          ) : (
            <div className="grid h-12 grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2">
              <button
                type="button"
                className="liquid-control flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95"
                onClick={goBack}
                aria-label="返回"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="truncate text-center text-[17px] font-semibold">{title}</h1>
              <span aria-hidden="true" />
            </div>
          )}
        </header>

        <main
          key={location.pathname}
          className={cn("page-motion flex-1 px-5 pt-2", showBottomNav ? (location.pathname === "/ai" ? "pb-[calc(13rem+env(safe-area-inset-bottom))]" : "pb-[calc(6.5rem+env(safe-area-inset-bottom))]") : "pb-[max(2rem,env(safe-area-inset-bottom))]")}
        >
          {children}
        </main>

        {showBottomNav ? (
          <nav className="bottom-nav-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4" aria-label="主导航">
            <div className="liquid-glass nav-glass relative grid h-[4.25rem] grid-cols-5 items-center rounded-[2.15rem] p-1.5">
              {activeIndex >= 0 ? (
                <div className="pointer-events-none absolute inset-1.5 z-0 grid grid-cols-5" aria-hidden="true">
                  <div
                    className="liquid-control col-start-1 h-full rounded-[1.75rem] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                    style={{ transform: `translateX(${activeIndex * 100}%)` }}
                  />
                </div>
              ) : null}
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "relative z-10 flex h-full flex-col items-center justify-center gap-0.5 rounded-[1.75rem] text-muted-foreground transition-colors duration-300 active:scale-95",
                      isActive && "text-primary",
                    )
                  }
                >
                  <item.icon className="h-[22px] w-[22px]" aria-hidden="true" />
                  <span className="text-[11px] font-semibold leading-none">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  )
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  const frame = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => setScrolled(window.scrollY > 4))
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame.current)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return scrolled
}

function getFallbackBackPath(pathname: string) {
  if (pathname.startsWith("/profile/settings")) return "/profile"
  if (pathname.startsWith("/stats/")) return "/stats"
  if (pathname.startsWith("/workout/session")) return "/workout"
  if (pathname.startsWith("/workout/summary")) return "/workout"
  if (pathname.startsWith("/workout/library/")) return "/workout/library"
  if (pathname.startsWith("/workout/")) return "/workout"
  if (pathname.startsWith("/food/")) return "/food"

  return "/"
}
