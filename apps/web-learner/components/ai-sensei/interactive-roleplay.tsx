"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
    Send, User, Sparkles, RefreshCcw, CheckCircle,
    Mic, MicOff, Volume2, PhoneOff, Settings,
    Play, Zap, X, ChevronDown, ChevronUp
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
    Card, CardContent
} from "@workspace/ui/components/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Spinner } from "@workspace/ui/components/spinner"
import { agentApi } from "@/lib/api/services/agent-api"
import { cn } from "@workspace/ui/lib/utils"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useAppDispatch } from "@/hooks/hooks"
import { Separator } from "@workspace/ui/components/separator"
import { Badge } from "@workspace/ui/components/badge"
import { Label } from "@workspace/ui/components/label"

const topicSchema = z.object({
    topic: z.string().min(1, "Vui lòng nhập hoặc chọn chủ đề"),
})

const inputSchema = z.object({
    text: z.string().min(1, "Nội dung tin nhắn không được để trống"),
})

type TopicFormData = z.infer<typeof topicSchema>
type InputFormData = z.infer<typeof inputSchema>

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    romaji?: string
    vietnamese?: string
    isFeedback?: boolean
    isExpended?: boolean
}

const SUGGESTED_TOPICS = [
    "Du lịch Nhật Bản",
    "Phỏng vấn xin việc",
    "Mua sắm tại siêu thị",
    "Giao lưu bạn bè",
    "Đặt món ăn",
    "Gặp gỡ lần đầu"
]

export function InteractiveRoleplay() {
    const dispatch = useAppDispatch()
    const [isStarted, setIsStarted] = React.useState(false)
    const [messages, setMessages] = React.useState<Message[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [showTranslation, setShowTranslation] = React.useState(true)
    const [history, setHistory] = React.useState<any[]>([])
    const [isFinished, setIsFinished] = React.useState(false)
    const [currentlyPlayingId, setCurrentlyPlayingId] = React.useState<string | null>(null)
    const [sessionTokens, setSessionTokens] = React.useState({ prompt: 0, completion: 0, total: 0 })

    const topicForm = useForm<TopicFormData>({
        resolver: zodResolver(topicSchema),
        defaultValues: { topic: "" },
    })

    const inputForm = useForm<InputFormData>({
        resolver: zodResolver(inputSchema),
        defaultValues: { text: "" },
    })

    const currentTopicValue = topicForm.watch("topic")
    const inputText = inputForm.watch("text")
    const scrollRef = React.useRef<HTMLDivElement>(null)

    // Voice & Tech States
    const [isListening, setIsListening] = React.useState(false)
    const [isSpeaking, setIsSpeaking] = React.useState(false)
    const [autoPlay, setAutoPlay] = React.useState(true)
    const queryClient = useQueryClient()
    const recognitionRef = React.useRef<any>(null)
    const [isSpeechSupported, setIsSpeechSupported] = React.useState(false)
    const [availableVoices, setAvailableVoices] = React.useState<SpeechSynthesisVoice[]>([])
    const [selectedVoiceURI, setSelectedVoiceURI] = React.useState<string>("ja-JP-NanamiNeural")
    const [showSettings, setShowSettings] = React.useState(false)
    const audioRef = React.useRef<HTMLAudioElement | null>(null)
    const ttsRequestId = React.useRef<number>(0)

    // Refs for cleanup
    const historyRef = React.useRef(history)
    const topicRef = React.useRef("")
    const isStartedRef = React.useRef(isStarted)
    const isFinishedRef = React.useRef(isFinished)

    React.useEffect(() => { historyRef.current = history }, [history])
    React.useEffect(() => { topicRef.current = currentTopicValue }, [currentTopicValue])
    React.useEffect(() => { isStartedRef.current = isStarted }, [isStarted])
    React.useEffect(() => { isFinishedRef.current = isFinished }, [isFinished])

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isLoading])

    // Voice Initialization
    React.useEffect(() => {
        const loadVoices = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                const voices = window.speechSynthesis.getVoices()
                if (voices.length > 0) setAvailableVoices(voices)
            }
        }
        loadVoices()
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices

        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                setIsSpeechSupported(true)
                const recognition = new SpeechRecognition()
                recognition.continuous = true
                recognition.interimResults = true
                recognition.lang = 'ja-JP'
                recognition.onresult = (event: any) => {
                    let finalTranscript = ''
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
                    }
                    if (finalTranscript) inputForm.setValue("text", inputForm.getValues("text") + finalTranscript)
                }
                recognition.onend = () => setIsListening(false)
                recognitionRef.current = recognition
            }
        }

        // Final Cleanup for quota
        const triggerFinalCleanup = () => {
            const turnCount = historyRef.current.filter(m => m.role === 'user').length
            if (isStartedRef.current && !isFinishedRef.current && turnCount > 0) {
                agentApi.sensei.roleplay(topicRef.current, "", historyRef.current, true).catch(() => { });
            }
        }
        const handleBeforeUnload = () => triggerFinalCleanup()
        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            triggerFinalCleanup()
            window.removeEventListener('beforeunload', handleBeforeUnload)
            if (recognitionRef.current) {
                try { recognitionRef.current.abort() } catch (e) { }
            }
        }
    }, [])

    const toggleListening = () => {
        if (!isSpeechSupported || !recognitionRef.current) {
            toast.error("Trình duyệt không hỗ trợ nhận diện giọng nói.")
            return
        }
        if (isListening) recognitionRef.current.stop()
        else {
            try {
                recognitionRef.current.start()
                setIsListening(true)
            } catch (e: any) {
                setIsListening(false)
            }
        }
    }

    const speak = (text: string, messageId?: string) => {
        if (messageId && currentlyPlayingId === messageId && isSpeaking) {
            stopSpeaking()
            return
        }
        stopSpeaking()
        if (!messageId && !autoPlay) return
        if (messageId) setCurrentlyPlayingId(messageId)

        const currentId = ttsRequestId.current + 1
        ttsRequestId.current = currentId

        const isBrowserVoice = availableVoices.some(v => v.voiceURI === selectedVoiceURI)
        if (!isBrowserVoice && (selectedVoiceURI === 'server-voice' || selectedVoiceURI.includes('Neural'))) {
            const voice = selectedVoiceURI === 'server-voice' ? undefined : selectedVoiceURI
            playBackendAudio(text, currentId, messageId)
            return
        }

        if (typeof window !== 'undefined' && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'ja-JP'
            const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI)
            if (voice) utterance.voice = voice
            utterance.onstart = () => setIsSpeaking(true)
            utterance.onend = () => {
                setIsSpeaking(false)
                if (messageId) setCurrentlyPlayingId(null)
            }
            utterance.onerror = () => {
                setIsSpeaking(false)
                if (messageId) setCurrentlyPlayingId(null)
                if (ttsRequestId.current === currentId) playBackendAudio(text, currentId, messageId)
            }
            window.speechSynthesis.speak(utterance)
        } else playBackendAudio(text, currentId, messageId)
    }

    const playBackendAudio = async (text: string, requestId: number, messageId?: string, voice?: string) => {
        try {
            if (ttsRequestId.current !== requestId) return
            setIsSpeaking(true)
            const data = await agentApi.sensei.tts(text, voice || (selectedVoiceURI.includes('Neural') ? selectedVoiceURI : undefined))
            if (ttsRequestId.current !== requestId) return
            if (data.url) {
                const audio = new Audio(data.url)
                audioRef.current = audio
                audio.onended = () => {
                    if (ttsRequestId.current === requestId) {
                        setIsSpeaking(false)
                        if (messageId) setCurrentlyPlayingId(null)
                    }
                }
                await audio.play()
            } else {
                setIsSpeaking(false)
                if (messageId) setCurrentlyPlayingId(null)
            }
        } catch (error) {
            if (ttsRequestId.current === requestId) {
                setIsSpeaking(false)
                if (messageId) setCurrentlyPlayingId(null)
            }
        }
    }

    const stopSpeaking = () => {
        ttsRequestId.current += 1
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
        setIsSpeaking(false)
        setCurrentlyPlayingId(null)
    }

    const addTokenUsage = (usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => {
        if (!usage) return
        setSessionTokens(prev => ({
            prompt: prev.prompt + usage.promptTokens,
            completion: prev.completion + usage.completionTokens,
            total: prev.total + usage.totalTokens,
        }))
    }

    const handleStart = async (topicValueOverride?: string) => {
        stopSpeaking()
        const topicValue = topicValueOverride || topicForm.getValues("topic")
        if (!topicValue.trim()) return
        topicForm.setValue("topic", topicValue) // Sync form
        setIsStarted(true)
        setIsLoading(true)
        try {
            const res = await agentApi.sensei.roleplay(topicValue, "", [])
            addTokenUsage(res.tokenUsage)
            const aiMsg: Message = { id: Date.now().toString(), role: 'assistant', content: res.response, romaji: res.romaji, vietnamese: res.vietnamese }
            setMessages([aiMsg])
            setHistory([{ role: 'model', content: JSON.stringify(res) }])
            queryClient.invalidateQueries({ queryKey: ["quota-status"] })
            if (res.response && autoPlay) speak(res.response, aiMsg.id)
        } catch (error: any) {
            toast.error(error.message || "Lỗi khởi tạo")
            setIsStarted(false)
        } finally { setIsLoading(false) }
    }

    const handleSend = async (data: InputFormData) => {
        if (!data.text.trim() || isLoading) return
        stopSpeaking()
        const userMsgText = data.text
        inputForm.reset({ text: "" })
        const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: userMsgText }
        setMessages(prev => [...prev, newUserMsg])
        setIsLoading(true)
        try {
            const nextHistory = [...history, { role: 'user', content: userMsgText }]
            const res = await agentApi.sensei.roleplay(topicForm.getValues("topic"), userMsgText, nextHistory)
            addTokenUsage(res.tokenUsage)
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: res.response, romaji: res.romaji, vietnamese: res.vietnamese }
            setMessages(prev => [...prev, aiMsg])
            setHistory([...nextHistory, { role: 'model', content: JSON.stringify(res) }])
            queryClient.invalidateQueries({ queryKey: ["quota-status"] })
            if (res.response && autoPlay) speak(res.response, aiMsg.id)
            if (res.isFinished && res.feedback) {
                const feedbackMsg: Message = { id: (Date.now() + 2).toString(), role: 'assistant', content: res.feedback, isFeedback: true }
                setMessages(prev => [...prev, feedbackMsg])
                setIsFinished(true)
            }
        } catch (error: any) { toast.error("Lỗi gửi tin nhắn") } finally { setIsLoading(false) }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); inputForm.handleSubmit(handleSend)() }
    }

    const handleFinish = async () => {
        if (isLoading) return
        setIsLoading(true)
        try {
            const data = await agentApi.sensei.roleplay(topicForm.getValues("topic"), "", history, true)
            addTokenUsage(data.tokenUsage)
            if (data.isFinished && data.feedback) {
                const feedbackMsg: Message = { id: (Date.now() + 2).toString(), role: 'assistant', content: data.feedback, isFeedback: true }
                if (data.response) {
                    const closingMsg: Message = { id: Date.now().toString(), role: 'assistant', content: data.response, romaji: data.romaji, vietnamese: data.vietnamese }
                    setMessages(prev => [...prev, closingMsg, feedbackMsg])
                    if (autoPlay) speak(data.response, closingMsg.id)
                } else setMessages(prev => [...prev, feedbackMsg])
                setIsFinished(true)
            }
        } catch (error) { } finally { setIsLoading(false) }
    }

    if (!isStarted) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-lg border-border shadow-none rounded-2xl overflow-hidden bg-card">
                    <CardContent className="p-8 flex flex-col items-center gap-6">
                        <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                            <Sparkles className="size-7 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold ">Hội thoại với Sensei</h2>
                            <p className="text-muted-foreground text-xs max-w-[280px] mx-auto leading-relaxed">
                                Chọn một chủ đề và bắt đầu luyện tập hội thoại tiếng Nhật cùng AI Sensei.
                            </p>
                        </div>

                        <div className="w-full space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                {SUGGESTED_TOPICS.map((t) => (
                                    <Button
                                        key={t}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl font-bold text-[10px] h-8 border-border bg-muted/20 hover:bg-primary/5 hover:border-primary/20 transition-all"
                                        onClick={() => handleStart(t)}
                                    >
                                        {t}
                                    </Button>
                                ))}
                            </div>

                            <Separator className="bg-border/40" />

                            <div className="space-y-3">
                                <Controller
                                    name="topic"
                                    control={topicForm.control}
                                    render={({ field }) => (
                                        <Input
                                            {...field}
                                            placeholder="Hoặc tự nhập chủ đề khác..."
                                            className="h-10 rounded-xl px-4 text-sm border-border bg-muted/10 shadow-none focus-visible:ring-primary/20"
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleStart() }}
                                        />
                                    )}
                                />
                                <Button className="w-full h-10 font-bold rounded-xl text-xs" onClick={() => handleStart()} disabled={!currentTopicValue.trim() || isLoading}>
                                    {isLoading ? <Spinner className="size-3 mr-2" /> : <Play className="mr-2 size-3" />}
                                    Bắt đầu ngay
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const turnCount = messages.filter(m => m.role === 'user').length

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] sm:h-[calc(100vh-140px)] bg-background overflow-hidden relative border border-border sm:rounded-xl mx-auto w-full shadow-2xl max-w-6xl">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between p-3 sm:p-4 border-b border-border bg-card z-10">
                <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="secondary" className="h-8 px-3 rounded-lg font-bold text-xs bg-primary/10 text-primary border-none truncate max-w-[150px] sm:max-w-none">
                        {currentTopicValue || "Chủ đề ngẫu nhiên"}
                    </Badge>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">

                    {!isFinished && turnCount >= 5 && (
                        <Button variant="outline" size="sm" className="h-8 px-3 font-bold text-[10px] rounded-lg border-primary/40 text-primary hover:bg-primary/5 hidden sm:flex" onClick={handleFinish} disabled={isLoading}>
                            Kết thúc
                        </Button>
                    )}

                    <Dialog open={showSettings} onOpenChange={setShowSettings}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9 text-muted-foreground/60 hover:text-primary">
                                <Settings className="size-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px] p-0 border-border overflow-hidden rounded-2xl shadow-2xl">
                            <DialogHeader className="p-6 pb-0">
                                <DialogTitle className="text-lg font-bold">Cài đặt hội thoại</DialogTitle>
                                <DialogDescription className="text-xs">Tùy chỉnh giọng nói và hỗ trợ học tập.</DialogDescription>
                            </DialogHeader>

                            <div className="p-6 space-y-6">
                                {/* Option 1: Bật âm thanh */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Bật âm thanh</Label>
                                        <p className="text-[10px] text-muted-foreground">Tự động phát âm thanh khi Sensei phản hồi</p>
                                    </div>
                                    <Switch
                                        checked={autoPlay}
                                        onCheckedChange={(val) => {
                                            setAutoPlay(val)
                                            if (!val) stopSpeaking()
                                        }}
                                    />
                                </div>

                                {/* Option 2: Bật Romaji & Dịch */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Bật Romaji & Dịch</Label>
                                        <p className="text-[10px] text-muted-foreground">Hiển thị phiên âm Romaji và nghĩa tiếng Việt</p>
                                    </div>
                                    <Switch checked={showTranslation} onCheckedChange={setShowTranslation} />
                                </div>

                                <Separator className="bg-border/50" />

                                {/* Voice Selection */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold uppercase  text-muted-foreground/60 ml-1">Giọng nói AI</Label>
                                    <Select value={selectedVoiceURI} onValueChange={(val) => {
                                        setSelectedVoiceURI(val)
                                        // Auto speak test when changing voice
                                        setTimeout(() => speak("こんにちは"), 100)
                                    }}>
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border shadow-none font-bold text-xs ring-0 focus:ring-0">
                                            <SelectValue placeholder="Chọn giọng..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border shadow-xl">
                                            <SelectItem value="ja-JP-NanamiNeural" className="py-2.5 text-xs font-bold">Nanami (Nữ - Tự nhiên)</SelectItem>
                                            <SelectItem value="ja-JP-KeitaNeural" className="py-2.5 text-xs font-bold">Keita (Nam - Tự nhiên)</SelectItem>
                                            <SelectItem value="server-voice" className="py-2.5 text-xs font-bold italic">Mặc định (Server)</SelectItem>
                                            {availableVoices.length > 0 && <Separator className="my-1" />}
                                            {availableVoices.map(voice => (
                                                <SelectItem key={voice.voiceURI} value={voice.voiceURI} className="py-2.5 text-xs font-bold">{voice.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => speak("こんにちは")}
                                        className="flex-1 font-bold h-9 rounded-xl text-[10px] border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 shadow-none"
                                    >
                                        <Volume2 className="size-3.5 mr-2" /> Nghe thử
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowSettings(false)}
                                        className="flex-1 font-bold h-9 rounded-xl text-[10px] shadow-none"
                                    >
                                        Hoàn tất
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="icon" onClick={() => { setIsStarted(false); setMessages([]); setIsFinished(false); stopSpeaking() }} className="rounded-lg h-9 w-9 text-destructive">
                        <X className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/5 scrollbar-thin" ref={scrollRef}>
                <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex w-full animate-in fade-in duration-500", msg.role === 'user' ? "justify-end" : "justify-start")}>
                            <div className={cn("flex flex-col gap-1.5 w-full", msg.role === 'user' ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "relative p-4 rounded-xl text-sm font-medium leading-relaxed border shadow-sm group transition-all",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground border-primary w-fit max-w-[85%]"
                                        : "bg-card border-border text-foreground w-full sm:w-fit sm:max-w-[85%] pr-10 shadow-border/5"
                                )}>
                                    {msg.content}

                                    {/* Inline Voice Action */}
                                    {msg.role === 'assistant' && !msg.isFeedback && (
                                        <button
                                            onClick={() => speak(msg.content, msg.id)}
                                            className={cn(
                                                "absolute top-3 right-3 h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                                                currentlyPlayingId === msg.id && isSpeaking ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-primary hover:bg-primary/5"
                                            )}
                                        >
                                            {currentlyPlayingId === msg.id && isSpeaking ? <Volume2 className="size-3.5 animate-pulse" /> : <Volume2 className="size-3.5 opacity-60" />}
                                        </button>
                                    )}
                                </div>

                                {/* Translation & Romaji */}
                                {msg.role === 'assistant' && !msg.isFeedback && showTranslation && (
                                    <div className="w-full sm:max-w-[80%] space-y-1 mt-0.5 px-1 animate-in fade-in slide-in-from-top-1 duration-300">
                                        {msg.romaji && (
                                            <p className="text-[10px] text-primary/60 font-bold bg-primary/5 w-fit px-2 py-0.5 rounded border border-primary/10">
                                                {msg.romaji}
                                            </p>
                                        )}
                                        {msg.vietnamese && (
                                            <div className="p-2 sm:p-3 rounded-lg bg-muted/20 border border-border/50">
                                                <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold leading-normal">
                                                    {msg.vietnamese}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 justify-start px-4">
                            <div className="size-1.5 bg-primary/40 rounded-full animate-bounce" />
                            <div className="size-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="size-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    )}
                </div>
            </div>

            {/* Input Bar */}
            <div className="shrink-0 p-3 sm:p-4 border-t border-border bg-card pb-safe">
                <div className="max-w-4xl mx-auto flex items-end gap-2 sm:gap-3 p-1.5 bg-muted/10 border border-border rounded-xl focus-within:border-primary/40 transition-colors">
                    <Button
                        variant={isListening ? "destructive" : "ghost"}
                        size="icon"
                        onClick={toggleListening}
                        className={cn("h-9 w-9 rounded-lg shrink-0", isListening && "animate-pulse")}
                        disabled={!isSpeechSupported || isFinished}
                    >
                        {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                    </Button>

                    <Controller
                        name="text"
                        control={inputForm.control}
                        render={({ field }) => (
                            <Textarea
                                {...field}
                                rows={1}
                                placeholder={isFinished ? "Xong..." : "Nhập..."}
                                className="flex-1 min-h-[38px] max-h-[120px] py-2 text-sm font-medium border-none focus-visible:ring-0 resize-none bg-transparent shadow-none"
                                onKeyDown={handleKeyDown}
                                disabled={isLoading || isFinished}
                            />
                        )}
                    />

                    <Button
                        size="icon"
                        className="h-9 w-9 rounded-lg shrink-0 shadow-sm transition-transform active:scale-95"
                        onClick={inputForm.handleSubmit(handleSend)}
                        disabled={!inputText.trim() || isLoading || isFinished}
                    >
                        {isLoading ? <Spinner className="size-3" /> : <Send className="size-3" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}
