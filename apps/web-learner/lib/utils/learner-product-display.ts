/**
 * Quy tắc hiển thị tên sản phẩm cho học viên (Product/Cohort/Package):
 * - VOD: ưu tiên tên gói (VodPackage.name), tên lớp là dòng phụ.
 * - LIVE: tên đợt (Cohort.name) là chính; thêm dòng ngữ cảnh kỳ nếu có.
 */
export type LearnerProductDisplay = {
  learnerDisplayTitle: string
  /** VOD: tên gói marketing */
  learnerMarketingSubtitle: string | null
  /** LIVE: một dòng mô tả kỳ (nếu có) */
  liveContextLine: string | null
}

export function computeLearnerProductDisplay(
  item: any,
  opts: {
    isLive: boolean
    primaryClass: any | null
    profile: any | null
    /** Lớp cùng đợt (LIVE/COHORT) hoặc [primaryClass] */
    classesForCohort: any[]
  },
): LearnerProductDisplay {
  const productName = String(item?.name ?? item?.title ?? "").trim()
  const className = String(opts.primaryClass?.name ?? "").trim()
  const profileTitle = String(opts.profile?.title ?? "").trim()

  if (opts.isLive) {
    const firstWithTerm =
      opts.classesForCohort?.find((c: any) => c?.term) ?? opts.primaryClass
    const term = item?.term ?? firstWithTerm?.term ?? null
    let liveContextLine: string | null = null
    if (term) {
      const label = String(term.name ?? "").trim() || String(term.code ?? "").trim()
      if (label) {
        liveContextLine = `Đợt: ${label}`
      } else if (term.startDate) {
        liveContextLine = `Khai giảng: ${new Date(term.startDate).toLocaleDateString("vi-VN")}`
      }
    }

    return {
      learnerDisplayTitle: productName || profileTitle || className || "Khóa học",
      learnerMarketingSubtitle: null,
      liveContextLine,
    }
  }

  const learnerDisplayTitle =
    productName || className || profileTitle || "Khóa học"
  const learnerMarketingSubtitle =
    className && productName && className !== productName
      ? productName
      : null

  return {
    learnerDisplayTitle,
    learnerMarketingSubtitle,
    liveContextLine: null,
  }
}
