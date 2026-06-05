import * as React from "react"
import {
    LayoutDashboard,
    BookOpen,
    BrainCircuit,
    TrendingUp,
    Trophy,
    Gift,
    Award,
    Clock,
    User,
    Wallet,
    MessageSquare,
    Receipt,
    LifeBuoy,
    Settings,
    Bot,
    Users,
    MessagesSquare,
    Languages,
    Search,
    MonitorPlay,
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@workspace/ui/components/command"
import { useAppSelector } from "@/hooks/hooks"

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()
    const { user } = useAppSelector((state) => state.auth)
    const isStaffOrAdmin = false

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 whitespace-nowrap transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border-none sm:border border-border/50 hover:border-primary/50 hover:bg-muted/50 relative h-9 justify-center sm:justify-start rounded-lg bg-transparent sm:bg-background text-xs font-medium text-muted-foreground w-9 sm:w-auto sm:px-3 lg:w-64 group shadow-none sm:shadow-sm"
            >
                <Search className="size-4 shrink-0 opacity-80 sm:opacity-50 group-hover:text-primary transition-colors" />
                <span className="hidden sm:inline-flex lg:hidden">Tìm kiếm...</span>
                <span className="hidden lg:inline-flex">Tìm kiếm bài học, kanji... (⌘K)</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex text-muted-foreground">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Nhập từ khóa hoặc lệnh..." />
                <CommandList className="scrollbar-none">
                    <CommandEmpty>Không tìm thấy kết quả phù hợp.</CommandEmpty>

                    <CommandGroup heading="Học tập">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Trang chủ</span>
                        </CommandItem>
                        {!isStaffOrAdmin && (
                            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/my-courses"))}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                <span>Khóa học của tôi</span>
                            </CommandItem>
                        )}
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/flashcards"))}>
                            <BrainCircuit className="mr-2 h-4 w-4" />
                            <span>Kho Thẻ Nhớ</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="AI Sensei">
                        <CommandItem onSelect={() => runCommand(() => router.push("/ai-sensei/chat"))}>
                            <Bot className="mr-2 h-4 w-4" />
                            <span>Chat với AI</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/ai-sensei/roleplay/interactive"))}>
                            <MessagesSquare className="mr-2 h-4 w-4" />
                            <span>Hội thoại chủ đề</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/ai-sensei/roleplay/voice"))}>
                            <MonitorPlay className="mr-2 h-4 w-4" />
                            <span>Luyện hội thoại giọng nói trực tiếp</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/ai-sensei/translate"))}>
                            <Languages className="mr-2 h-4 w-4" />
                            <span>Dịch thuật & Ngữ pháp</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Tiến độ & Thành tích">
                        <CommandItem onSelect={() => runCommand(() => router.push("/analytics"))}>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            <span>Phân tích học tập</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/achievements"))}>
                            <Trophy className="mr-2 h-4 w-4" />
                            <span>Thành tích</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/rewards"))}>
                            <Gift className="mr-2 h-4 w-4" />
                            <span>Cửa hàng quà tặng</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Cá nhân">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/profile"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Hồ sơ cá nhân</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Cài đặt</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Cộng đồng & Hỗ trợ">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/support"))}>
                            <LifeBuoy className="mr-2 h-4 w-4" />
                            <span>Hỗ trợ</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
