/** Author: Romeo <zzsuper@qq.com> */
import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";

/** Chiều cao chart: thấp hơn trên mobile */
export const DASHBOARD_CHART_H = "h-[220px] sm:h-56";

export function useNarrowMobile() {
  const query = "(max-width: 639px)";
  return React.useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false),
    () => false,
  );
}

export function DashboardChartScroll({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      <div className="min-w-[min(100%,280px)] sm:min-w-0">{children}</div>
    </div>
  );
}
