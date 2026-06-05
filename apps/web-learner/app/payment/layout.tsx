import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Kết quả thanh toán",
    description: "Theo dõi trạng thái giao dịch thanh toán khóa học.",
    robots: {
        index: false,
        follow: false,
    },
}

export default function PaymentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 bg-neutral-50/50">
                {children}
            </main>
            <Footer />
        </div>
    )
}
