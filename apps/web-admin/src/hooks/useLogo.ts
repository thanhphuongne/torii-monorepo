"use client"

import { useTheme } from "@/lib/providers/theme-provider"
import { useEffect, useState } from "react"

export function useLogo() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isSystemDark, setIsSystemDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches)

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  // During SSR or initial render, return light logo as default
  if (!mounted) {
    return "/logo_light.png"
  }

  const isDark = theme === "dark" || (theme === "system" && isSystemDark)

  return isDark ? "/logo_dark.png" : "/logo_light.png"
}
