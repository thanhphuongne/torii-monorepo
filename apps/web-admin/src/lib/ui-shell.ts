import { cn } from "@workspace/ui/lib/utils"

/** Panel / card biểu đồ — nền phẳng, không gradient, không hover động */
export const elevatedPanelClass = cn(
    "overflow-hidden rounded-xl border bg-card shadow-sm",
    "py-0 gap-0",
)

export const elevatedPanelContentClass = "pb-5 pt-4"

/** Bọc bảng */
export const dataTableShellClass = cn("overflow-hidden rounded-xl border bg-card shadow-sm")

/**
 * Toolbar trang danh sách (mobile-first):
 * - Mobile: cột — tìm kiếm full width, rồi từng filter/nút mỗi hàng (flex-col).
 * - md+: một hàng — ô tìm kiếm flex-1, nhóm filter co theo nội dung (w-auto), wrap khi quá chật.
 */
export const listPageToolbarRootClass = cn(
  "flex w-full flex-col gap-3",
  "md:flex-row md:flex-wrap md:items-center md:gap-3",
)
export const listPageSearchWrapClass = cn(
  "relative w-full min-w-0",
  "md:min-w-[12rem] md:flex-1",
)
export const listPageFiltersRowClass = cn(
  "flex w-full min-w-0 flex-col gap-3",
  "md:w-auto md:max-w-full md:flex-none md:flex-row md:flex-wrap md:items-center md:gap-2",
)

/** Icon Search trong ô tìm — dùng chung mọi toolbar danh sách */
export const listPageSearchIconClass = cn(
  "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
)

/** Input tìm kiếm chuẩn (cùng hệ với icon trên) */
export const listPageSearchInputClass = cn("h-10 w-full pl-9 shadow-sm")

/** Hàng tiêu đề bảng */
export const dataTableHeaderClass = "bg-muted/50"

const panelHeaderBase =
    "space-y-1 border-b border-border bg-muted/40 pt-5 pb-4 rounded-t-xl"

export const elevatedCardHeaderPrimary = panelHeaderBase
export const elevatedCardHeaderInfo = panelHeaderBase
export const elevatedCardHeaderSuccess = panelHeaderBase
export const elevatedCardHeaderFinance = panelHeaderBase
export const elevatedCardHeaderOps = panelHeaderBase

/** Empty state trong chart */
export const emptyStateBoxClass =
    "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-12 text-xs text-muted-foreground"
