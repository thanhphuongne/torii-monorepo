import * as React from "react";
import debounce from "lodash.debounce";

// ============================================================================

type WindowSize<T extends number | undefined = number | undefined> = {
  width: T;
  height: T;
};

type UseWindowSizeOptions<InitializeWithValue extends boolean | undefined> = {
  initializeWithValue: InitializeWithValue;
  debounceDelay?: number;
};

const IS_SERVER = typeof window === "undefined";

// SSR version of useWindowSize.
export function useWindowSize(options: UseWindowSizeOptions<false>): WindowSize;
// CSR version of useWindowSize.
export function useWindowSize(
  options?: Partial<UseWindowSizeOptions<true>>
): WindowSize<number>;
export function useWindowSize(
  options: Partial<UseWindowSizeOptions<boolean>> = {}
): WindowSize | WindowSize<number> {
  let { initializeWithValue = true } = options;
  if (IS_SERVER) {
    initializeWithValue = false;
  }

  const [windowSize, setWindowSize] = React.useState<WindowSize>(() => {
    if (initializeWithValue) {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return {
      width: undefined,
      height: undefined,
    };
  });

  const debouncedSetWindowSize = React.useMemo(
    () =>
      options.debounceDelay
        ? debounce(setWindowSize, options.debounceDelay)
        : setWindowSize,
    [options.debounceDelay]
  );

  React.useEffect(() => {
    const handleSize = () => {
      debouncedSetWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleSize();
    window.addEventListener("resize", handleSize);

    return () => {
      window.removeEventListener("resize", handleSize);
    };
  }, [debouncedSetWindowSize]);

  return windowSize;
}

export type { WindowSize, UseWindowSizeOptions };

// ============================================================================