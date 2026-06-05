"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Loader2 } from "lucide-react"

export interface FlashcardFormValues {
  term: string
  phonetic: string
  definition: string
  note: string
  type: string
}

interface FlashcardFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: Partial<FlashcardFormValues>
  onSave: (values: FlashcardFormValues) => Promise<void>
  isPending?: boolean
  title?: string
}

export function FlashcardFormDialog({
  open,
  onOpenChange,
  initialValues,
  onSave,
  isPending = false,
  title = "Thêm từ mới",
}: FlashcardFormDialogProps) {
  const [values, setValues] = React.useState<FlashcardFormValues>({
    term: "",
    phonetic: "",
    definition: "",
    note: "",
    type: "Từ vựng",
  })
  React.useEffect(() => {
    if (open) {
      setValues({
        term: initialValues?.term || "",
        phonetic: initialValues?.phonetic || "",
        definition: initialValues?.definition || "",
        note: initialValues?.note || "",
        type: initialValues?.type || "Từ vựng",
      })
    }
  }, [open, initialValues])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.term.trim() || !values.definition.trim()) return
    try {
      await onSave(values)
    } catch {
      /* toast tại caller */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Nhập mặt trước, nghĩa và tùy chọn phiên âm / từ loại.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="flash-term">Từ</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="flash-term"
                placeholder="Nhập từ…"
                value={values.term}
                onChange={(e) => setValues({ ...values, term: e.target.value })}
                autoComplete="off"
              />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="flash-phonetic">Phiên âm (Romaji)</FieldLabel>
            <Input
              id="flash-phonetic"
              placeholder="Vi du: taberu"
              value={values.phonetic}
              onChange={(e) => setValues({ ...values, phonetic: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="flash-def">Nghĩa</FieldLabel>
            <Textarea
              id="flash-def"
              placeholder="Giải nghĩa…"
              value={values.definition}
              onChange={(e) => setValues({ ...values, definition: e.target.value })}
              rows={4}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="flash-note">Ghi chú</FieldLabel>
            <Input
              id="flash-note"
              placeholder="Tùy chọn…"
              value={values.note}
              onChange={(e) => setValues({ ...values, note: e.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="flash-type">Từ loại</FieldLabel>
            <Select
              value={values.type}
              onValueChange={(val) => setValues({ ...values, type: val })}
            >
              <SelectTrigger id="flash-type" className="w-full">
                <SelectValue placeholder="Chọn loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Từ vựng">Từ vựng</SelectItem>
                <SelectItem value="Ngữ pháp">Ngữ pháp</SelectItem>
                <SelectItem value="Hán tự">Hán tự</SelectItem>
                <SelectItem value="Mẫu câu">Mẫu câu</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isPending || !values.term.trim() || !values.definition.trim()}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
