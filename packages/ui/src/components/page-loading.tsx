import { cn } from "@workspace/ui/lib/utils"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"

interface PageLoadingProps {
    className?: string
}

export function PageLoading({ className }: PageLoadingProps) {
    return (
        <div className={cn("flex h-full w-full min-h-[80vh] items-center justify-center bg-background", className)}>
            <DotLottieReact
                src="https://lottie.host/445490c0-adf1-42dd-a6f7-34de161fbbcb/UPQtzly8nf.lottie"
                loop
                autoplay
                className="h-48 w-48"
            />
        </div>
    )
}
