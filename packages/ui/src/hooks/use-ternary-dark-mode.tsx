import * as React from "react";

// ============================================================================

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const LOCAL_STORAGE_KEY = "use-ternary-dark-mode";

export type TernaryDarkMode = "system" | "dark" | "light";

export type TernaryDarkModeOptions = {
  defaultValue?: TernaryDarkMode;
  localStorageKey?: string;
  initializeWithValue?: boolean;
};

export type TernaryDarkModeReturn = {
  isDarkMode: boolean;
  ternaryDarkMode: TernaryDarkMode;
  setTernaryDarkMode: React.Dispatch<React.SetStateAction<TernaryDarkMode>>;
  toggleTernaryDarkMode: () => void;
};

const IS_SERVER = typeof window === "undefined";

function useMediaQueryInternal(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = React.useState<boolean>(() => {
    if (IS_SERVER) return defaultValue;
    return window.matchMedia(query).matches;
  });

  React.useEffect(() => {
    const matchMedia = window.matchMedia(query);
    const handleChange = () => setMatches(matchMedia.matches);
    handleChange();
    matchMedia.addEventListener("change", handleChange);
    return () => matchMedia.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function useLocalStorageInternal<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    if (IS_SERVER) return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = React.useCallback(
    (value) => {
      const newValue = value instanceof Function ? value(storedValue) : value;
      setStoredValue(newValue);
      if (!IS_SERVER) {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

export function useTernaryDarkMode({
  defaultValue = "system",
  localStorageKey = LOCAL_STORAGE_KEY,
}: TernaryDarkModeOptions = {}): TernaryDarkModeReturn {
  const isDarkOS = useMediaQueryInternal(COLOR_SCHEME_QUERY);
  const [mode, setMode] = useLocalStorageInternal<TernaryDarkMode>(
    localStorageKey,
    defaultValue
  );

  const isDarkMode = mode === "dark" || (mode === "system" && isDarkOS);

  const toggleTernaryDarkMode = React.useCallback(() => {
    const modes: TernaryDarkMode[] = ["light", "system", "dark"];
    setMode((prevMode): TernaryDarkMode => {
      const nextIndex = (modes.indexOf(prevMode) + 1) % modes.length;
      return modes[nextIndex];
    });
  }, [setMode]);

  return {
    isDarkMode,
    ternaryDarkMode: mode,
    setTernaryDarkMode: setMode,
    toggleTernaryDarkMode,
  };
}

// ============================================================================