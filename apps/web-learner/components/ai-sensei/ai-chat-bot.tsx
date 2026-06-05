"use client"

import { useCallback, useState, useMemo } from "react"
import { nanoid } from "nanoid"
import { toast } from "sonner"
import { CheckIcon, GlobeIcon, MicIcon } from "lucide-react"
import { extractErrorMessage } from "@/lib/api/api-client"
import { agentApi } from "@/lib/api/services/agent-api"

import {
    Attachment,
    AttachmentPreview,
    AttachmentRemove,
    Attachments,
} from "@workspace/ui/components/ai/attachments"
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@workspace/ui/components/ai/conversation"
import {
    Message,
    MessageBranch,
    MessageBranchContent,
    MessageBranchNext,
    MessageBranchPage,
    MessageBranchPrevious,
    MessageBranchSelector,
    MessageContent,
    MessageResponse,
} from "@workspace/ui/components/ai/message"
import {
    ModelSelector,
    ModelSelectorContent,
    ModelSelectorEmpty,
    ModelSelectorGroup,
    ModelSelectorInput,
    ModelSelectorItem,
    ModelSelectorList,
    ModelSelectorLogo,
    ModelSelectorLogoGroup,
    ModelSelectorName,
    ModelSelectorTrigger,
} from "@workspace/ui/components/ai/model-selector"
import {
    PromptInput,
    PromptInputActionAddAttachments,
    PromptInputActionMenu,
    PromptInputActionMenuContent,
    PromptInputActionMenuTrigger,
    PromptInputBody,
    PromptInputButton,
    PromptInputFooter,
    PromptInputHeader,
    type PromptInputMessage,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputAttachments,
} from "@workspace/ui/components/ai/prompt-input"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@workspace/ui/components/ai/reasoning"
import { Source, Sources, SourcesContent, SourcesTrigger } from "@workspace/ui/components/ai/sources"
import { Suggestion, Suggestions } from "@workspace/ui/components/ai/suggestion"

interface MessageVersion {
    id: string
    content: string
}

interface MessageType {
    key: string
    from: "user" | "assistant" | "system"
    sources?: { href: string; title: string }[]
    versions: MessageVersion[]
    reasoning?: {
        content: string
        duration: number
    }
    tools?: {
        name: string
        description: string
        status: "inactive" | "running" | "result" | "error"
        parameters: Record<string, unknown>
        result: string | undefined
        error: string | undefined
    }[]
}

const models = [
    {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        chef: "Google",
        chefSlug: "google",
        providers: ["google"],
    },
    {
        id: "gpt-4o",
        name: "GPT-4o",
        chef: "OpenAI",
        chefSlug: "openai",
        providers: ["openai", "azure"],
    },
    {
        id: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        chef: "Anthropic",
        chefSlug: "anthropic",
        providers: ["anthropic"],
    },
]

const PromptInputAttachmentsDisplay = () => {
    const attachments = usePromptInputAttachments()

    if (attachments.files.length === 0) {
        return null
    }

    return (
        <Attachments variant="inline">
            {attachments.files.map(attachment => (
                <Attachment
                    data={attachment}
                    key={attachment.id}
                    onRemove={() => attachments.remove(attachment.id)}
                >
                    <AttachmentPreview />
                    <AttachmentRemove />
                </Attachment>
            ))}
        </Attachments>
    )
}

export function AiChatBot() {
    const [model, setModel] = useState<string>(models[0]?.id || "gemini-2.0-flash")
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
    const [text, setText] = useState<string>("")
    const [useWebSearch, setUseWebSearch] = useState<boolean>(false)
    const [useMicrophone, setUseMicrophone] = useState<boolean>(false)
    const [status, setStatus] = useState<"submitted" | "streaming" | "ready" | "error">("ready")

    const [messages, setMessages] = useState<MessageType[]>([
        {
            key: "welcome",
            from: "assistant",
            versions: [
                {
                    id: "welcome-v1",
                    content: "Konnichiwa! Mình là AI Sensei. Bạn muốn học gì hôm nay?"
                }
            ]
        }
    ])

    const [suggestions, setSuggestions] = useState<string[]>([
        "Giải thích ngữ pháp N3",
        "Luyện giao tiếp xin việc",
        "Dịch câu này",
        "Tạo bài tập từ vựng"
    ])

    const selectedModelData = useMemo(() => models.find(m => m.id === model), [model])

    const streamResponse = useCallback(async (messageKey: string, versionId: string, fullContent: string) => {
        setStatus("streaming")

        const chunks = fullContent.split("")
        let currentContent = ""

        // Initial empty state for the version being streamed
        setMessages(prev => prev.map(m =>
            m.key === messageKey
                ? { ...m, versions: m.versions.map(v => v.id === versionId ? { ...v, content: "" } : v) }
                : m
        ))

        for (const char of chunks) {
            currentContent += char
            setMessages(prev => prev.map(m =>
                m.key === messageKey
                    ? { ...m, versions: m.versions.map(v => v.id === versionId ? { ...v, content: currentContent } : v) }
                    : m
            ))
            await new Promise(resolve => setTimeout(resolve, 5))
        }

        setStatus("ready")
    }, [])

    const handleSend = async (content: string) => {
        const trimmedContent = content.trim()
        if (!trimmedContent) return

        setStatus("submitted")
        const userMsg: MessageType = {
            key: nanoid(),
            from: "user",
            versions: [{ id: nanoid(), content: trimmedContent }]
        }

        setMessages(prev => [...prev, userMsg])
        setText("")

        try {
            // Prepare history for API (last 10 messages, flattening versions to the latest one)
            const history = messages.slice(-10).map(m => ({
                role: m.from,
                content: m.versions[m.versions.length - 1]?.content || ""
            }))

            // Add assistant placeholder
            const aiKey = nanoid()
            const versionId = nanoid()
            setMessages(prev => [...prev, {
                key: aiKey,
                from: "assistant",
                versions: [{ id: versionId, content: "..." }]
            }])

            // API Call
            const response = await agentApi.sensei.chat(trimmedContent, history)

            if (response) {
                if (response.suggestions?.length) {
                    setSuggestions(response.suggestions)
                }

                await streamResponse(aiKey, versionId, response.message)
            } else {
                throw new Error("No response data")
            }
        } catch (error: any) {
            console.error("Chat error:", error)
            const errorMessage = extractErrorMessage(error) || "Lỗi kết nối tới Sensei";
            toast.error(errorMessage)
            setMessages(prev => prev.map(m =>
                (m.from === "assistant" && m.versions.some(v => v.content === "..."))
                    ? { ...m, versions: m.versions.map(v => v.content === "..." ? { ...v, content: errorMessage } : v) }
                    : m
            ))
            setStatus("ready")
        }
    }

    const handleSubmit = (message: PromptInputMessage) => {
        if (!message.text.trim()) return
        handleSend(message.text)
    }

    return (
        <div className="flex flex-col h-full overflow-hidden w-full bg-background min-w-0">
            {/* Conversation Area - Optimized for Mobile Padding */}
            <Conversation className="flex-1 min-h-0 border-b border-border bg-background">
                <ConversationContent className="p-3 sm:p-5">
                    {messages.map((msg) => (
                        <MessageBranch defaultBranch={0} key={msg.key}>
                            <MessageBranchContent>
                                {msg.versions.map((version) => (
                                    <Message from={msg.from} key={version.id} className="max-w-full">
                                        <div className="flex flex-col gap-2 min-w-0">
                                            {msg.sources?.length && (
                                                <Sources>
                                                    <SourcesTrigger count={msg.sources.length} />
                                                    <SourcesContent>
                                                        {msg.sources.map(source => (
                                                            <Source href={source.href} key={source.href} title={source.title} />
                                                        ))}
                                                    </SourcesContent>
                                                </Sources>
                                            )}
                                            {msg.reasoning && (
                                                <Reasoning duration={msg.reasoning.duration}>
                                                    <ReasoningTrigger />
                                                    <ReasoningContent>{msg.reasoning.content}</ReasoningContent>
                                                </Reasoning>
                                            )}
                                            <MessageContent>
                                                {version.content === "..." ? (
                                                    <div className="flex gap-1.5 py-2 px-1">
                                                        <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:-0.32s]"></span>
                                                        <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:-0.16s]"></span>
                                                        <span className="size-1.5 rounded-full bg-foreground/30 animate-bounce"></span>
                                                    </div>
                                                ) : (
                                                    <MessageResponse className="font-semibold text-sm leading-relaxed whitespace-pre-wrap break-words [word-break:normal]">
                                                        {version.content}
                                                    </MessageResponse>
                                                )}
                                            </MessageContent>
                                        </div>
                                    </Message>
                                ))}
                            </MessageBranchContent>
                            {msg.versions.length > 1 && (
                                <MessageBranchSelector from={msg.from}>
                                    <MessageBranchPrevious />
                                    <MessageBranchPage />
                                    <MessageBranchNext />
                                </MessageBranchSelector>
                            )}
                        </MessageBranch>
                    ))}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>

            {/* Input Area - Compact & Mobile Responsive */}
            <div className="shrink-0 pt-2 space-y-2 bg-card border-t border-border shadow-inner min-w-0">
                {suggestions.length > 0 && status === "ready" && (
                    <Suggestions className="px-3 overflow-x-auto no-scrollbar">
                        {suggestions.map(s => (
                            <Suggestion
                                key={s}
                                onClick={() => handleSend(s)}
                                suggestion={s}
                                className="font-bold text-[10px] h-7 px-3"
                            />
                        ))}
                    </Suggestions>
                )}

                <div className="w-full px-3 pb-3 min-w-0">
                    <PromptInput multiple onSubmit={handleSubmit} className="border-border">
                        <PromptInputHeader className="p-0">
                            <PromptInputAttachmentsDisplay />
                        </PromptInputHeader>
                        <PromptInputBody className="p-1">
                            <PromptInputTextarea
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                                value={text}
                                placeholder="Hỏi Sensei..."
                                className="min-h-[48px] max-h-[140px] font-medium placeholder:font-normal text-sm py-2 px-3"
                                disabled={status === "streaming" || status === "submitted"}
                            />
                        </PromptInputBody>
                        <PromptInputFooter className="p-1 pr-2">
                            <PromptInputTools />
                            <PromptInputSubmit
                                disabled={!text.trim() || status === "streaming" || status === "submitted"}
                                status={status === "streaming" || status === "submitted" ? "submitted" : "ready"}
                                className="h-8 w-8"
                            />
                        </PromptInputFooter>
                    </PromptInput>
                </div>
            </div>
        </div>
    )
}

export default AiChatBot
