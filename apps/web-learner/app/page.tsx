import { HomeLanding } from "@/components/home/home-landing"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Trang chủ",
  description:
    "Khám phá các khóa học tiếng Nhật, luyện thi JLPT, lớp học trực tuyến và công cụ AI giúp bạn học hiệu quả hơn mỗi ngày.",
  alternates: {
    canonical: "/",
  },
}

export default function RootPage() {
  return <HomeLanding />
}
