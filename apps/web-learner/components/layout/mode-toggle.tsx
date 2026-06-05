"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@workspace/ui/components/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export function ModeToggle() {
    const { setTheme } = useTheme()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg h-9 w-9 transition-all group"
                >
                    <Sun className="size-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 group-hover:rotate-45" />
                    <Moon className="absolute size-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 group-hover:-rotate-12" />
                    <span className="sr-only">Chuyển giao diện</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-40 border-border/20 shadow-xl bg-background/95 backdrop-blur-xl p-1.5 rounded-xl animate-in slide-in-from-top-2 duration-300"
            >
                <div className="space-y-0.5">
                    <DropdownMenuItem
                        onClick={() => setTheme("light")}
                        className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer focus:bg-primary/10 focus:text-primary transition-all flex items-center justify-between group/mode"
                    >
                        <span>Sáng</span>
                        <Sun className="size-3.5 opacity-50 group-hover/mode:opacity-100 transition-opacity" />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setTheme("dark")}
                        className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer focus:bg-primary/10 focus:text-primary transition-all flex items-center justify-between group/mode"
                    >
                        <span>Tối</span>
                        <Moon className="size-3.5 opacity-50 group-hover/mode:opacity-100 transition-opacity" />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => setTheme("system")}
                        className="rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer focus:bg-primary/10 focus:text-primary transition-all flex items-center justify-between group/mode"
                    >
                        <span>Hệ thống</span>
                        <div className="size-1 rounded-full bg-border group-hover/mode:bg-primary transition-colors" />
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
