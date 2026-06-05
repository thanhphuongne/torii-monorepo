import { useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@workspace/ui/components/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@workspace/ui/components/popover"
import { useAcademyQuestions } from "@/lib/api/services/academy-questions"
import { AcademyQuestionType } from "@workspace/schemas"
import { Search } from "lucide-react"

interface QuestionPickerProps {
    value?: string
    onSelect: (questionId: string) => void
    placeholder?: string
    label?: string
    disabled?: boolean
    questionTypeFilter?: AcademyQuestionType
    allowClear?: boolean
}

export function QuestionPicker({
    value,
    onSelect,
    placeholder = "Chọn câu hỏi...",
    disabled = false,
    questionTypeFilter,
    allowClear = true,
}: QuestionPickerProps) {
    const [open, setOpen] = useState(false)
    const { data: questions = [], isLoading } = useAcademyQuestions({
        questionType: questionTypeFilter || undefined,
    })

    const selectedQuestion = questions.find((q) => q.id === value)
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    {selectedQuestion ? (
                        <span className="truncate max-w-[300px]">
                            {stripHtml(selectedQuestion.stem || selectedQuestion.content || "").substring(0, 100)}...
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Tìm câu hỏi..." />
                    <CommandList>
                        <CommandEmpty>Không tìm thấy câu hỏi nào.</CommandEmpty>
                        <CommandGroup>
                            {allowClear && (
                                <CommandItem
                                    value="__none__"
                                    onSelect={() => {
                                        onSelect("")
                                        setOpen(false)
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                                    <span className="text-muted-foreground">Không chọn câu hỏi cha</span>
                                </CommandItem>
                            )}
                            {isLoading ? (
                                <CommandItem disabled>Đang tải...</CommandItem>
                            ) : (
                                (questions as any).map((q: any) => (
                                    <CommandItem
                                        key={q.id}
                                        value={`${stripHtml(q.stem || q.content || "")} ${q.id}`}
                                        onSelect={() => {
                                            onSelect(q.id)
                                            setOpen(false)
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === q.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col gap-1 overflow-hidden">
                                            <span className="truncate font-medium">{stripHtml(q.stem || q.content || "")}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ID: {q.id.substring(0, 8)} | Loai: {q.questionType} | Level: {q.level || "—"}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
