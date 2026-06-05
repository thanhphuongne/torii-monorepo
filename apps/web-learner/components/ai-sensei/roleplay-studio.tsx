"use client"

import * as React from "react"
import { Sparkles, Drama, Clapperboard, RefreshCw, Bot } from 'lucide-react'
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select"
import { agentApi } from "@/lib/api/services/agent-api"
import { extractErrorMessage } from "@/lib/api/api-client"
import { AgentConversationSimulationResponseDTO as ConversationSimulationResponse } from "@workspace/schemas"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/sonner"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Field, FieldLabel, FieldError } from "@workspace/ui/components/field"
import { Separator } from "@workspace/ui/components/separator"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const roleplayStudioFormSchema = z.object({
    scenario: z.string().min(1, "Vui lòng nhập tình huống"),
    level: z.enum(["N5", "N4", "N3", "N2", "N1"]),
})

type RoleplayStudioFormData = z.infer<typeof roleplayStudioFormSchema>

export function RoleplayStudio() {
    const [isLoading, setIsLoading] = React.useState(false)
    const [roleplayData, setRoleplayData] = React.useState<ConversationSimulationResponse | null>(null)
    const [isPracticeMode, setIsPracticeMode] = React.useState(false)

    const form = useForm<RoleplayStudioFormData>({
        resolver: zodResolver(roleplayStudioFormSchema),
        defaultValues: {
            scenario: "",
            level: "N4",
        },
    })

    const handleGenerate = async (data: RoleplayStudioFormData) => {
        setIsLoading(true)
        try {
            const res = await agentApi.sensei.simulateConversation(data.scenario, data.level)
            setRoleplayData(res)
        } catch (error: any) {
            console.error(error)
            toast.error(extractErrorMessage(error) || 'Không thể tạo kịch bản. Vui lòng thử lại.')
        } finally {
            setIsLoading(false)
        }
    }

    const scenarios = [
        "Đặt món nhà hàng",
        "Hỏi đường",
        "Mua sắm",
        "Phỏng vấn",
        "Check-in khách sạn",
        "Giới thiệu bản thân"
    ]

    return (
        <div className="max-w-5xl py-8 space-y-8">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold tracking-normal">Hội thoại Roleplay</h1>
                <p className="text-muted-foreground">Luyện tập hội thoại tiếng Nhật theo nhiều tình huống khác nhau.</p>
            </header>

            {!roleplayData ? (
                <Card className="shadow-none border-border">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">Bắt đầu tình huống</CardTitle>
                        <CardDescription>Chọn một tình huống có sẵn hoặc tự nhập chủ đề bạn muốn.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-wrap gap-2">
                            {scenarios.map((s) => (
                                <Button
                                    key={s}
                                    variant={form.watch("scenario") === s ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => form.setValue("scenario", s)}
                                    className="rounded-full text-[10px] font-bold uppercase tracking-wider"
                                >
                                    {s}
                                </Button>
                            ))}
                        </div>

                        <form id="roleplay-form" onSubmit={form.handleSubmit(handleGenerate)} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-3">
                                <Controller
                                    name="scenario"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field>
                                            <FieldLabel className="text-xs font-semibold uppercase text-muted-foreground">Tình huống</FieldLabel>
                                            <Input
                                                {...field}
                                                placeholder="Ví dụ: Đi khám bệnh, mua vé tàu..."
                                                disabled={isLoading}
                                            />
                                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                        </Field>
                                    )}
                                />
                            </div>
                            <Controller
                                name="level"
                                control={form.control}
                                render={({ field }) => (
                                    <Field>
                                        <FieldLabel className="text-xs font-semibold uppercase text-muted-foreground">Trình độ</FieldLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["N5", "N4", "N3", "N2", "N1"].map(lvl => (
                                                    <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                )}
                            />
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-6 border-t">
                        <Button
                            form="roleplay-form"
                            type="submit"
                            disabled={!form.watch("scenario").trim() || isLoading}
                            className="font-bold uppercase tracking-widest text-[10px]"
                        >
                            {isLoading ? <Spinner className="mr-2" /> : <Sparkles className="size-3.5 mr-2" />}
                            Tạo kịch bản
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <Card className="shadow-none border-border overflow-hidden">
                        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b">
                            <div className="space-y-1 text-center md:text-left">
                                <CardTitle className="text-2xl font-bold">{roleplayData.scenario}</CardTitle>
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <Badge variant="secondary" className="font-bold text-[10px] uppercase">{form.watch("level")}</Badge>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Kịch bản gợi ý</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="font-bold uppercase tracking-widest text-[10px]" onClick={() => setIsPracticeMode(!isPracticeMode)}>
                                    {isPracticeMode ? "Hiện chữ Nhật" : "Chế độ luyện tập"}
                                </Button>
                                <Button variant="outline" size="sm" className="font-bold uppercase tracking-widest text-[10px]" onClick={() => setRoleplayData(null)}>
                                    <RefreshCw className="mr-2 size-3" /> Đổi tình huống
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y border-b">
                                {roleplayData.conversation.map((line, i) => (
                                    <div key={i} className="p-6 transition-colors hover:bg-muted/30">
                                        <div className="flex gap-6 items-start max-w-3xl mx-auto">
                                            <Avatar className="h-10 w-10 border shadow-sm">
                                                <AvatarFallback className={line.speaker === 'Sensei' ? 'bg-primary text-primary-foreground text-xs font-bold' : 'text-xs font-bold'}>
                                                    {line.speaker[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-2 flex-1">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{line.speaker}</p>
                                                <p className={cn("text-lg font-medium leading-relaxed tracking-normal transition-all", isPracticeMode ? 'blur-md hover:blur-none cursor-help bg-muted/50 rounded p-1' : '')}>
                                                    {line.japanese}
                                                </p>
                                                <p className="text-sm text-muted-foreground italic leading-relaxed">
                                                    {line.vietnamese}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
