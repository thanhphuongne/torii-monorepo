import { Montserrat } from "next/font/google"
import type { Metadata } from "next"

import "@workspace/ui/styles/globals.css"
import { Providers } from "@/lib/providers/providers"
import { Toaster } from "@workspace/ui/components/sonner"
import { FacebookSDK } from "@/components/auth/facebook-sdk"

const fontSans = Montserrat({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: {
    default: "Torii Learner",
    template: "%s | Torii Learner",
  },
  description:
    "Nền tảng học tiếng Nhật trực tuyến với lộ trình học cá nhân hóa, luyện JLPT, lớp học trực tuyến và công cụ AI hỗ trợ học tập.",
  keywords: [
    "học tiếng Nhật",
    "luyện JLPT",
    "khóa học tiếng Nhật online",
    "Torii Learner",
    "nền tảng học trực tuyến",
  ],
  openGraph: {
    title: "Torii Learner",
    description:
      "Nền tảng học tiếng Nhật trực tuyến với lộ trình học cá nhân hóa, luyện JLPT, lớp học trực tuyến và công cụ AI hỗ trợ học tập.",
    type: "website",
    locale: "vi_VN",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <FacebookSDK />
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  )
}
