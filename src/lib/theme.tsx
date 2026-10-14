import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

export type ThemeMode = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: ThemeMode
  resolvedTheme: "light" | "dark"
  setTheme: (theme: ThemeMode) => void
}

const storageKey = "fitnote.theme"
const themeColor = {
  light: "#edf9fa",
  dark: "#111113",
} as const
const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved === "dark" || saved === "light" ? saved : "system"
  } catch {
    return "system"
  }
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!query) {
      return
    }
    const onChange = () => setSystemDark(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    document.documentElement.style.colorScheme = resolvedTheme
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor[resolvedTheme])

    try {
      if (theme === "system") {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, theme)
      }
    } catch {
      // ignore
    }
  }, [theme, resolvedTheme])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider")
  }

  return context
}
