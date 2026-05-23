import { ChevronLeft, Dumbbell, Home, PieChart, Utensils } from "lucide-react"
import type { ReactNode } from "react"
import { useRef } from "react"
import LiquidGlass from "liquid-glass-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"

import { cn } from "@/lib/utils"

const navItems = [
  { to: "/", label: "今日", icon: Home },
  { to: "/workout", label: "训练", icon: Dumbbell },
  { to: "/food", label: "饮食", icon: Utensils },
  { to: "/stats", label: "统计", icon: PieChart },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const navRef = useRef<HTMLElement | null>(null)
  const rootPaths = ["/", "/workout", "/food", "/stats", "/profile", "/onboarding"]
  const tabPaths = ["/", "/workout", "/food", "/stats"]
  const isRootPage = rootPaths.includes(location.pathname)
  const showBottomNav = tabPaths.includes(location.pathname)
  const activeIndex = navItems.findIndex((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to),
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
        <header className="sticky top-0 z-20 bg-background/58 px-5 pb-3 pt-4 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            {isRootPage ? (
              <h1 className="text-2xl font-semibold tracking-normal">FitNote</h1>
            ) : (
              <button
                type="button"
                className="liquid-control flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95"
                onClick={() => navigate(-1)}
                aria-label="返回"
              >
                <ChevronLeft className="relative z-10 h-5 w-5" />
              </button>
            )}
            {isRootPage ? (
              <NavLink
                to="/profile"
                className="liquid-control flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-all duration-300 ease-out active:scale-95"
                aria-label="个人设置"
              >
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  S
                </span>
              </NavLink>
            ) : (
              <div className="h-11 w-11" aria-hidden="true" />
            )}
          </div>
        </header>

        <main key={location.pathname} className={`page-motion flex-1 px-5 ${showBottomNav ? "pb-28" : "pb-8"}`}>
          {children}
        </main>

        {showBottomNav ? (
          <nav ref={navRef} className="bottom-nav-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-3xl px-4">
            <div className="relative h-[4.5rem]">
              <LiquidGlass
                className="fitnote-liquid-nav"
                displacementScale={78}
                blurAmount={0.035}
                saturation={180}
                aberrationIntensity={2.2}
                elasticity={0.28}
                cornerRadius={34}
                padding="0"
                mouseContainer={navRef}
                mode="prominent"
                style={{ position: "absolute", top: "50%", left: "50%", width: "100%" }}
              >
                <div className="relative grid h-[4.5rem] w-full grid-cols-4 items-center rounded-[2.15rem] p-2">
                  {activeIndex >= 0 ? (
                    <div className="pointer-events-none absolute inset-2 z-0 grid grid-cols-4" aria-hidden="true">
                      <div
                        className="nav-active-glass col-start-1 h-14 rounded-[1.65rem] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
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
                          "relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-[1.65rem] text-muted-foreground opacity-80 transition-all duration-500 ease-out hover:opacity-100 active:scale-95",
                          isActive && "scale-105 text-foreground opacity-100",
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </LiquidGlass>
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  )
}
