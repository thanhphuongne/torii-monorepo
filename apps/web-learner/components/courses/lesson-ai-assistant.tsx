"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import { nanoid } from "nanoid"
import { toast } from "sonner"
import { Sparkles, Send, Clock, Info, X, Minus, MessageSquare, Maximize2, Minimize2, Bot } from "lucide-react"
import { extractErrorMessage } from "@/lib/api/api-client"
import { agentApi } from "@/lib/api/services/agent-api"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Badge } from "@workspace/ui/components/badge"
import {
    Message,
    MessageContent,
    MessageResponse,
} from "@workspace/ui/components/ai/message"
import {
    PromptInput,
    PromptInputBody,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputFooter,
} from "@workspace/ui/components/ai/prompt-input"
import { Suggestion, Suggestions } from "@workspace/ui/components/ai/suggestion"

interface MessageType {
    id: string
    from: "user" | "assistant"
    content: string
    timestamp?: string
}

interface LessonAIAssistantProps {
    lessonId: string
    courseId?: string
    currentTime?: number
    lessonTitle?: string
    lessonType?: 'VIDEO' | 'READING'
}

export function LessonAIAssistant({ lessonId, courseId, currentTime, lessonTitle, lessonType }: LessonAIAssistantProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [text, setText] = useState<string>("")
    const [selectedContext, setSelectedContext] = useState<string | null>(null)
    const [status, setStatus] = useState<"idle" | "submitting" | "streaming">("idle")
    const [messages, setMessages] = useState<MessageType[]>([
        {
            id: "welcome",
            from: "assistant",
            content: `Chào bạn! Mình là Trợ lý AI. Bạn có thắc mắc gì về bài học **${lessonTitle || 'này'}** không?`
        }
    ])



    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current && isOpen && !isMinimized) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isOpen, isMinimized])

    // Handle incoming text selection from global event
    useEffect(() => {
        const handleAddSelection = (e: any) => {
            const selectedText = e.detail?.text
            if (!selectedText) return

            setIsOpen(true)
            setIsMinimized(false)

            // Buffer the selection as hidden context
            setSelectedContext(selectedText.trim())
            setText("") // Keep input clean as requested

            // Focus the textarea
            setTimeout(() => {
                const textarea = document.querySelector('textarea[placeholder*="Sensei"]') as HTMLTextAreaElement
                if (textarea) {
                    textarea.focus()
                }
            }, 100)
        }

        window.addEventListener('sensei-add-to-chat', handleAddSelection)
        return () => window.removeEventListener('sensei-add-to-chat', handleAddSelection)
    }, [])

    const formatTime = (seconds?: number) => {
        if (seconds === undefined) return ""
        const m = Math.floor(seconds / 60)
        const s = Math.floor(seconds % 60)
        return `${m}:${String(s).padStart(2, '0')}`
    }

    const handleSend = async (content: string) => {
        const trimmedContent = content.trim()
        if (!trimmedContent || status !== "idle") return

        const currentTimestampStr = currentTime !== undefined ? formatTime(currentTime) : undefined

        setStatus("submitting")
        const userMsg: MessageType = {
            id: nanoid(),
            from: "user",
            content: trimmedContent,
            timestamp: currentTimestampStr
        }

        setMessages(prev => [...prev, userMsg])
        setText("")

        try {
            const aiId = nanoid()
            setMessages(prev => [...prev, {
                id: aiId,
                from: "assistant",
                content: "..."
            }])

            const history = messages.slice(-6).map(m => ({
                role: m.from === 'assistant' ? 'model' : 'user',
                content: m.content
            }))

            // Prepend context if target selection exists
            const finalMessage = selectedContext
                ? `> ${selectedContext}\n\n${trimmedContent}`
                : trimmedContent

            const response = await agentApi.sensei.lessonChat({
                lessonId,
                courseId,
                currentTimestamp: currentTimestampStr,
                message: finalMessage,
                history
            })

            if (response) {
                setSelectedContext(null) // Clear context after success
                setStatus("streaming")
                let i = 0
                const fullText = response.message
                const interval = setInterval(() => {
                    setMessages(prev => prev.map(m =>
                        m.id === aiId ? { ...m, content: fullText.slice(0, i + 1) } : m
                    ))
                    i++
                    if (i >= fullText.length) {
                        clearInterval(interval)
                        setStatus("idle")
                    }
                }, 10)
            }
        } catch (error: any) {
            console.error("Lesson AI Error:", error)
            const errorMessage = extractErrorMessage(error) || "Lỗi kết nối tới Trợ lý AI"
            toast.error(errorMessage)
            setMessages(prev => prev.map(m =>
                (m.from === "assistant" && m.content === "...") ? { ...m, content: errorMessage } : m
            ))
            setStatus("idle")
        }
    }

    if (!isOpen) {
        return (
            <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-700">
                <Button
                    className="h-16 px-6 rounded-full shadow-[0_10px_40px_rgba(37,99,235,0.25)] hover:shadow-[0_15px_50px_rgba(37,99,235,0.4)] hover:-translate-y-1.5 active:scale-95 transition-all bg-primary hover:bg-primary/95 border-none group flex items-center gap-4"
                    onClick={() => setIsOpen(true)}
                >
                    <div className="size-10 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/10">
                        <Bot className="size-6 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col items-start pr-2">
                        <span className="text-[10px] uppercase font-black tracking-[0.15em] opacity-80 leading-none mb-1 text-primary-foreground/90">Sensei AI</span>
                        <span className="text-sm font-bold leading-none text-primary-foreground tracking-tight">Giải đáp bài học</span>
                    </div>
                    <div className="absolute right-3 top-3">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                    </div>
                </Button>
            </div>
        )
    }

    return (
        <div
            className={cn(
                "fixed right-6 z-[100] transition-all duration-300 ease-in-out shadow-2xl rounded-xl bg-background border flex flex-col overflow-hidden",
                isMinimized
                    ? "bottom-6 w-[280px] h-14"
                    : "bottom-6 w-[380px] max-w-[calc(100vw-32px)] h-[580px] max-h-[calc(100vh-80px)]",
            )}
        >
            {/* Header */}
            <div
                className="shrink-0 px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between cursor-pointer"
                onClick={() => isMinimized && setIsMinimized(false)}
            >
                <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                        <Bot className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold leading-tight truncate">Giải đáp bài học AI</h3>
                        <div className="flex items-center gap-1.5 leading-none">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] opacity-80 font-medium">Sẵn sàng hỗ trợ</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 hover:bg-white/10 text-primary-foreground"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsMinimized(!isMinimized)
                        }}
                    >
                        {isMinimized ? <Maximize2 className="size-4" /> : <Minus className="size-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 hover:bg-white/10 text-primary-foreground"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsOpen(false)
                        }}
                    >
                        <X className="size-4" />
                    </Button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Chat Area */}
                    <ScrollArea className="flex-1 min-h-0 p-4 bg-muted/5 font-medium" ref={scrollRef}>
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <Message
                                    key={msg.id}
                                    from={msg.from}
                                    className={cn(
                                        "max-w-[85%]",
                                        msg.from === 'assistant' ? "mr-auto" : "ml-auto"
                                    )}
                                >
                                    <div className="space-y-1">
                                        {msg.from === 'user' && lessonType !== 'READING' && msg.timestamp && msg.timestamp !== "0:00" && !msg.content.toLowerCase().includes("tóm tắt") && (
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1 font-medium px-1 justify-end">
                                                <Clock className="size-3" />
                                                <span>Xem tại {msg.timestamp}</span>
                                            </div>
                                        )}
                                        <MessageContent className={cn(
                                            "p-3 rounded-2xl text-[13px] leading-relaxed break-words [word-break:normal]",
                                            msg.from === 'assistant'
                                                ? "bg-muted/50 border text-foreground"
                                                : "bg-primary text-primary-foreground rounded-tr-none"
                                        )}>
                                            {msg.content === "..." ? (
                                                <div className="flex gap-1.5 py-1.5 px-1">
                                                    <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:-0.32s]"></span>
                                                    <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:-0.16s]"></span>
                                                    <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce"></span>
                                                </div>
                                            ) : (
                                                <MessageResponse className="break-words [word-break:normal]">
                                                    {msg.content}
                                                </MessageResponse>
                                            )}
                                        </MessageContent>
                                    </div>
                                </Message>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="shrink-0 p-3 border-t bg-card space-y-3">
                        {selectedContext && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2 py-1 flex items-center gap-1.5 h-7">
                                    <MessageSquare className="size-3" />
                                    <span className="text-[10px] font-bold">Văn bản đã chọn</span>
                                    <button
                                        onClick={() => setSelectedContext(null)}
                                        className="hover:bg-primary/10 rounded-full p-0.5 transition-colors ml-1"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                                <span className="text-[10px] text-muted-foreground truncate italic max-w-[200px]">
                                    "{selectedContext.substring(0, 40)}{selectedContext.length > 40 ? '...' : ''}"
                                </span>
                            </div>
                        )}
                        <div className="relative">
                            <PromptInput multiple onSubmit={(m) => handleSend(m.text)} className="border-border shadow-sm">
                                <PromptInputBody className="p-1">
                                    <PromptInputTextarea
                                        placeholder="Hỏi Sensei về bài học này..."
                                        className="min-h-[44px] max-h-[120px] text-[13.5px] py-2 px-3 font-medium placeholder:font-normal"
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        disabled={status !== "idle"}
                                    />
                                </PromptInputBody>
                                <PromptInputFooter className="p-1 pr-2">
                                    <div className="flex-1 flex items-center gap-2 pl-2">
                                        {lessonType !== 'READING' && (
                                            <Badge variant="secondary" className="text-[9px] px-1.5 h-4 font-mono font-bold bg-muted/50 border-none">
                                                {currentTime && currentTime > 0 ? `Video: ${formatTime(currentTime)}` : 'Toàn bộ bài học'}
                                            </Badge>
                                        )}
                                    </div>
                                    <PromptInputSubmit
                                        className="size-8"
                                        disabled={!text.trim() || status !== "idle"}
                                    />
                                </PromptInputFooter>
                            </PromptInput>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-[9px] text-muted-foreground font-semibold pb-1 opacity-70">
                            <Info className="size-3" />
                            {lessonType === 'READING' ? 'Đang dựa trên ngữ cảnh bài học' : 'Đang dựa trên ngữ cảnh bài học và thời gian video'}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
