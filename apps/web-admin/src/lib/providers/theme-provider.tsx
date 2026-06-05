import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useTernaryDarkMode, type TernaryDarkMode } from "@workspace/ui/hooks/use-ternary-dark-mode"

type Theme = TernaryDarkMode

type ThemeProviderProps = {
    children: ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
    toggleTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const {
        isDarkMode,
        ternaryDarkMode,
        setTernaryDarkMode,
        toggleTernaryDarkMode,
    } = useTernaryDarkMode({
        defaultValue: defaultTheme,
        localStorageKey: storageKey,
        initializeWithValue: true,
    })

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark")

        if (isDarkMode) {
            root.classList.add("dark")
        }
    }, [isDarkMode])

    const value = {
        theme: ternaryDarkMode,
        setTheme: setTernaryDarkMode,
        toggleTheme: toggleTernaryDarkMode,
    }

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}

