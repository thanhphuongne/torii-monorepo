import { PropsWithChildren } from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Học tập",
    description: "Khu vực học tập cá nhân với nội dung bài học, quiz và bài thi.",
    robots: {
        index: false,
        follow: false,
    },
}

export default function LearningLayout({ children }: PropsWithChildren) {
    return (
        <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/10 selection:text-primary">

            <main className="relative z-10 w-full flex-1">
                {children}
            </main>
        </div>
    )
}
