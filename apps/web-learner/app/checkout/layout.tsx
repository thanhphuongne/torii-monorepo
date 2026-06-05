import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Thanh toán khóa học",
    description: "Xác nhận thông tin và hoàn tất thanh toán khóa học.",
    robots: {
        index: false,
        follow: false,
    },
}

export default function CheckoutLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <main className="min-h-screen bg-background">{children}</main>
    )
}
