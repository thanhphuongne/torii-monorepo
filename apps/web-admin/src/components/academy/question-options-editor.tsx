import { useState, useEffect, useRef } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Plus, Trash2, CheckCircle2 } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

interface Option {
    id: string
    label: string
    value: string
}

interface QuestionOptionsEditorProps {
    type: string
    options: any
    correctAnswer: any
    onChange: (options: any, correctAnswer: any) => void
}

export function QuestionOptionsEditor({
    type,
    options,
    correctAnswer,
    onChange,
}: QuestionOptionsEditorProps) {
    const [localOptions, setLocalOptions] = useState<Option[]>([])
    const [localCorrect, setLocalCorrect] = useState<any>(null)

    const lastPushedOptionsRef = useRef<string>("")
    const lastPushedCorrectRef = useRef<string>("")
    const prevTypeRef = useRef<string>(type)
    const initializedRef = useRef<boolean>(false)

    useEffect(() => {
        // If type changed, reset completely
        if (type !== prevTypeRef.current) {
            prevTypeRef.current = type
            let newOpts: Option[] = []
            if (type === "TRUE_FALSE") {
                newOpts = [
                    { id: "true", label: "Đúng (True)", value: "true" },
                    { id: "false", label: "Sai (False)", value: "false" }
                ]
            } else {
                // For other types, maybe we keep options or clear. We clear to be safe.
                newOpts = [
                    { id: Math.random().toString(36).substr(2, 9), label: "", value: "A" }
                ]
            }
            setLocalOptions(newOpts)
            setLocalCorrect(null)

            const strippedOpts = newOpts.map(({ id, ...rest }) => ({ ...rest }))
            lastPushedOptionsRef.current = JSON.stringify(strippedOpts)
            lastPushedCorrectRef.current = "null"
            onChange(strippedOpts, null)
            return
        }

        // Initialize on mount
        if (!initializedRef.current) {
            initializedRef.current = true
            let newOpts: Option[] = []
            if (Array.isArray(options) && options.length > 0) {
                newOpts = options.map((o, i) => ({
                    id: o.id || Math.random().toString(36).substr(2, 9),
                    label: o.label || "",
                    value: o.value || String.fromCharCode(65 + i)
                }))
            } else if (type === "TRUE_FALSE") {
                newOpts = [
                    { id: "true", label: "Đúng (True)", value: "true" },
                    { id: "false", label: "Sai (False)", value: "false" }
                ]
            }

            setLocalOptions(newOpts)
            if (correctAnswer !== undefined) {
                setLocalCorrect(correctAnswer)
            }

            const strippedOpts = newOpts.map(({ id, ...rest }) => ({ ...rest }))
            lastPushedOptionsRef.current = JSON.stringify(strippedOpts)
            lastPushedCorrectRef.current = JSON.stringify(correctAnswer || null)
        }
    }, [type])

    const updateAll = (newOpts: Option[], newCorrect: any) => {
        // Auto re-index A, B, C... for choice types
        let reIndexedOpts = newOpts
        let reMappedCorrect = newCorrect

        if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
            // Store old values to remap correct answer
            const oldToNew = new Map<string, string>()

            reIndexedOpts = newOpts.map((opt, idx) => {
                const newValue = String.fromCharCode(65 + idx)
                oldToNew.set(opt.value, newValue)
                return { ...opt, value: newValue }
            })

            // Remap single choice
            if (type === "SINGLE_CHOICE" && newCorrect?.value) {
                const newValue = oldToNew.get(newCorrect.value)
                reMappedCorrect = newValue ? { value: newValue } : null
            }

            // Remap multiple choice
            if (type === "MULTIPLE_CHOICE" && Array.isArray(newCorrect)) {
                reMappedCorrect = newCorrect
                    .map(v => oldToNew.get(v))
                    .filter(Boolean) as string[]
            }
        }

        setLocalOptions(reIndexedOpts)
        setLocalCorrect(reMappedCorrect)

        const strippedOpts = reIndexedOpts.map(({ id, ...rest }) => ({ ...rest }))
        lastPushedOptionsRef.current = JSON.stringify(strippedOpts)
        lastPushedCorrectRef.current = JSON.stringify(reMappedCorrect || null)

        onChange(strippedOpts, reMappedCorrect)
    }

    const addOption = () => {
        const nextChar = String.fromCharCode(65 + localOptions.length)
        const newOpts = [
            ...localOptions,
            { id: Math.random().toString(36).substr(2, 9), label: "", value: nextChar }
        ]
        updateAll(newOpts, localCorrect)
    }

    const removeOption = (id: string) => {
        const newOpts = localOptions.filter(o => o.id !== id)
        updateAll(newOpts, localCorrect)
    }

    const toggleCorrect = (value: string) => {
        let newCorrect: any = localCorrect
        if (type === "SINGLE_CHOICE" || type === "TRUE_FALSE") {
            newCorrect = { value }
        } else if (type === "MULTIPLE_CHOICE") {
            const current = Array.isArray(localCorrect) ? localCorrect : []
            if (current.includes(value)) {
                newCorrect = current.filter(v => v !== value)
            } else {
                newCorrect = [...current, value]
            }
        }
        updateAll(localOptions, newCorrect)
    }

    const isCorrect = (value: string) => {
        if (!localCorrect) return false
        if (type === "SINGLE_CHOICE" || type === "TRUE_FALSE") {
            return localCorrect.value === value
        }
        if (type === "MULTIPLE_CHOICE") {
            return Array.isArray(localCorrect) && localCorrect.includes(value)
        }
        return false
    }

    if (type === "GROUP_PARENT") return null

    return (
        <div className="space-y-4 border p-4 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Cấu hình đáp án</h4>
                {(type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") && (
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                        <Plus className="size-4 mr-1" /> Thêm lựa chọn
                    </Button>
                )}
            </div>

            <div className="space-y-2">
                {localOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                        <Button
                            type="button"
                            className={cn(
                                "shrink-0 rounded-full",
                                isCorrect(opt.value)
                                    ? "text-green-600 bg-green-50"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleCorrect(opt.value)}
                        >
                            <CheckCircle2 className="size-5" />
                        </Button>
                        <div className="flex items-center flex-1 gap-2">
                            <span className="font-bold text-muted-foreground w-6 text-center">{opt.value}.</span>
                            <Input
                                placeholder={`Nhập nội dung lựa chọn ${opt.value}...`}
                                value={opt.label}
                                className="flex-1"
                                onChange={(e) => {
                                    const newOpts = [...localOptions]
                                    newOpts[idx].label = e.target.value
                                    updateAll(newOpts, localCorrect)
                                }}
                            />
                        </div>
                        {(type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive shrink-0"
                                onClick={() => removeOption(opt.id)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {type === "SHORT_ANSWER" && (
                <div className="p-2 border bg-yellow-50 rounded text-xs text-yellow-700">
                    Sử dụng trình soạn thảo text thô cho Short Answer (sẽ hỗ trợ UI sau)
                </div>
            )}
        </div>
    )
}
