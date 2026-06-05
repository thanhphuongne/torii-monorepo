/**
 * Màu biểu đồ dashboard — theo nghĩa nghiệp vụ (không xoay palette chart cho trạng thái đơn hàng).
 */

function normKey(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, '_')
}

/** Pie "Đơn hàng theo trạng thái" — `name` từ Prisma groupBy (OrderStatus) */
export function orderStatusPieFill(statusName: string): string {
  const k = normKey(statusName)

  if (k === 'PAID') return 'var(--success)'
  if (k === 'PENDING' || k === 'PROCESSING') return 'var(--warning)'
  if (k === 'CANCELLED' || k === 'CANCELED' || k.includes('CANCEL')) return 'var(--muted-foreground)'
  if (k === 'FAILED') return 'var(--destructive)'
  if (k === 'REFUNDED') return 'var(--info)'

  return 'var(--chart-2)'
}

/** Badge trạng thái đơn — đồng bộ palette với pie */
export function orderStatusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'secondary' | 'destructive' | 'info' | 'outline' {
  const k = normKey(status)
  if (k === 'PAID') return 'success'
  if (k === 'PENDING' || k === 'PROCESSING') return 'warning'
  if (k === 'CANCELLED' || k === 'CANCELED' || k.includes('CANCEL')) return 'secondary'
  if (k === 'FAILED') return 'destructive'
  if (k === 'REFUNDED') return 'info'
  return 'outline'
}

export function orderStatusLabelVi(status: string): string {
  const k = normKey(status)
  const map: Record<string, string> = {
    PAID: 'Đã thanh toán',
    PENDING: 'Chờ thanh toán',
    PROCESSING: 'Đang xử lý',
    CANCELLED: 'Đã hủy',
    REFUNDED: 'Hoàn tiền',
    FAILED: 'Thất bại',
  }
  return map[k] ?? status
}

/** Pie "Duyệt theo loại" — nhãn cố định từ API */
export function pendingApprovalTypePieFill(typeName: string): string {
  const k = normKey(typeName)
  if (k.includes('COURSE') && k.includes('PROFILE')) return 'var(--primary)'
  if (k.includes('COHORT')) return 'var(--info)'
  if (k.includes('VOD')) return 'var(--success)'
  return 'var(--chart-3)'
}

export function academyPipelineStatusLabelVi(statusName: string): string {
  const k = normKey(statusName)
  const map: Record<string, string> = {
    PENDING_APPROVAL: 'Chờ duyệt',
    DRAFT: 'Nháp',
    PUBLISHED: 'Đã xuất bản',
    ARCHIVED: 'Lưu trữ',
    OPENING: 'Đang mở',
    COMPLETED: 'Hoàn thành',
    IN_PROGRESS: 'Đang diễn ra',
  }
  return map[k] ?? statusName.replace(/_/g, ' ')
}

/** Bar "Pipeline theo status" — CourseProfile / Cohort / Vod status (Prisma enum) */
export function academyPipelineBarFill(statusName: string): string {
  const k = normKey(statusName)

  if (k === 'PENDING_APPROVAL') return 'var(--warning)'
  if (k === 'DRAFT') return 'var(--muted-foreground)'
  if (k === 'PUBLISHED') return 'var(--success)'
  if (k === 'ARCHIVED') return 'var(--muted-foreground)'
  if (k === 'OPENING') return 'var(--primary)'
  if (k === 'COMPLETED') return 'var(--success)'
  if (k === 'IN_PROGRESS') return 'var(--info)'

  return 'var(--chart-2)'
}

/**
 * Màu lát pie cố định (hex) — tránh trùng nhau khi theme không định nghĩa --chart-* khác biệt.
 */
const DISTINCT_PIE_FILLS = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#65a30d',
] as const

/** Mỗi lát pie theo thứ tự (doanh thu Level, duyệt chờ, …) */
export function distinctPieSliceFill(index: number): string {
  return DISTINCT_PIE_FILLS[index % DISTINCT_PIE_FILLS.length]
}

export function revenueLevelPieFill(_levelName: string, index: number): string {
  return distinctPieSliceFill(index)
}

/** Cột doanh thu theo level (dashboard khác) — một metric, một màu brand */
export const revenueBarFill = 'var(--primary)'
