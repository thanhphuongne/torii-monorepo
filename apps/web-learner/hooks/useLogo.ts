"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function useLogo() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR or initial render, return light logo as default
  if (!mounted) {
    return "/logo_light.png"
  }

  // Use resolvedTheme to get the actual applied theme (respects system preference)
  const currentTheme = resolvedTheme || theme
  
  return currentTheme === "dark" ? "/logo_dark.png" : "/logo_light.png"
}
