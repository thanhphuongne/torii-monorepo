"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { MessageSquarePlus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function TextSelectionToolbar() {
    const [isVisible, setIsVisible] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [selectedText, setSelectedText] = useState("")
    const toolbarRef = useRef<HTMLDivElement>(null)

    const updateSelection = useCallback(() => {
        const selection = window.getSelection()
        const text = selection?.toString().trim()

        if (!text || text.length < 3) {
            setIsVisible(false)
            return
        }

        const range = selection?.getRangeAt(0)
        if (!range) return

        const rect = range.getBoundingClientRect()

        // Calculate position: centered above the selection
        setPosition({
            x: rect.left + rect.width / 2 + window.scrollX,
            y: rect.top + window.scrollY - 45 // 45px above
        })
        setSelectedText(text)
        setIsVisible(true)
    }, [])

    useEffect(() => {
        const handleMouseUp = () => {
            // Delay slightly to allow selection state to settle
            setTimeout(updateSelection, 10)
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsVisible(false)
            } else {
                setTimeout(updateSelection, 10)
            }
        }

        const handleMouseDown = (e: MouseEvent) => {
            // Hide if clicking outside the toolbar
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setIsVisible(false)
            }
        }

        document.addEventListener("mouseup", handleMouseUp)
        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("mousedown", handleMouseDown)

        return () => {
            document.removeEventListener("mouseup", handleMouseUp)
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("mousedown", handleMouseDown)
        }
    }, [updateSelection])

    const handleAddToChat = () => {
        if (!selectedText) return

        // Emit custom event to notify LessonAIAssistant
        const event = new CustomEvent("sensei-add-to-chat", {
            detail: { text: selectedText }
        })
        window.dispatchEvent(event)

        // Clear selection and hide toolbar
        setIsVisible(false)
        window.getSelection()?.removeAllRanges()
    }

    if (!isVisible) return null

    return (
        <div
            ref={toolbarRef}
            className="fixed z-[9999] pointer-events-none"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: "translateX(-50%)"
            }}
        >
            <div className="pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
                <Button
                    size="sm"
                    className="h-9 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-xl flex items-center gap-2 border border-white/10"
                    onClick={handleAddToChat}
                >
                    <MessageSquarePlus className="size-4" />
                    <span className="text-[11px] font-bold uppercase tracking-tight">Add to chat</span>
                    {/* Tooltip triangle */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 rotate-45 border-r border-b border-white/10" />
                </Button>
            </div>
        </div>
    )
}
