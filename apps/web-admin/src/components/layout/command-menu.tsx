import * as React from "react"
import {
    Settings,
    User,
    LayoutDashboard,
    FileQuestion, // questions
    Video, // rooms
    FileEdit, // blogs
    DollarSign, // payments
    BarChart, // analytics
    Bot, // ai-service
    Bell, // notifications
    Shield,
    FileSearch, // audit-logs
    Search,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

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

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const navigate = useNavigate()

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
                className="inline-flex items-center gap-2 whitespace-nowrap transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border-none sm:border border-border/50 hover:border-primary/50 hover:bg-muted/50 relative h-9 justify-center sm:justify-start rounded-lg bg-transparent sm:bg-background text-xs font-medium text-muted-foreground w-9 sm:w-auto sm:px-3 md:w-40 lg:w-64 group shadow-none sm:shadow-sm"
            >
                <Search className="size-4 shrink-0 opacity-80 sm:opacity-50 group-hover:text-primary transition-colors" />
                <span className="hidden sm:inline-flex lg:hidden">Tìm kiếm...</span>
                <span className="hidden lg:inline-flex">Tìm kiếm nhanh...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex text-muted-foreground">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Nhập từ khóa để tìm kiếm..." />
                <CommandList>
                    <CommandEmpty>Không tìm thấy kết quả phù hợp.</CommandEmpty>

                    <CommandGroup heading="Giao thức chính">
                        <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Tổng quan hệ thống</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/finance/revenue-analytics"))}>
                            <BarChart className="mr-2 h-4 w-4" />
                            <span>Thống kê doanh thu</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Quản lý thực thể">
                        <CommandItem onSelect={() => runCommand(() => navigate("/users"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Quản lý người dùng</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Kho tài nguyên">
                        <CommandItem onSelect={() => runCommand(() => navigate("/academy/assessment/questions"))}>
                            <FileQuestion className="mr-2 h-4 w-4" />
                            <span>Ngân hàng câu hỏi</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Công cụ & Tiện ích">
                        <CommandItem onSelect={() => runCommand(() => navigate("/academy/live-classes"))}>
                            <Video className="mr-2 h-4 w-4" />
                            <span>Quản lý lớp trực tiếp</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/blogs"))}>
                            <FileEdit className="mr-2 h-4 w-4" />
                            <span>Bài viết</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/academy/ai-subscriptions"))}>
                            <Bot className="mr-2 h-4 w-4" />
                            <span>Gói dịch vụ AI</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Tài chính">
                        <CommandItem onSelect={() => runCommand(() => navigate("/orders"))}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            <span>Quản lý đơn hàng</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Hệ thống & Bảo mật">
                        <CommandItem onSelect={() => runCommand(() => navigate("/permissions"))}>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Phân quyền vai trò</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/audit-logs"))}>
                            <FileSearch className="mr-2 h-4 w-4" />
                            <span>Nhật ký hoạt động</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/notifications"))}>
                            <Bell className="mr-2 h-4 w-4" />
                            <span>Thông báo</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Cài đặt hệ thống</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                    <div className="h-4" />
                </CommandList>
            </CommandDialog>
        </>
    )
}

