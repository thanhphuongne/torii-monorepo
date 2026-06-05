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
import { Textarea } from "@workspace/ui/components/textarea"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Loader2 } from "lucide-react"

export interface FlashcardAIBulkValues {
  terms: string
}

interface FlashcardAIBulkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (values: FlashcardAIBulkValues) => Promise<void>
  isPending?: boolean
  title?: string
}

export function FlashcardAIBulkDialog({
  open,
  onOpenChange,
  onCreate,
  isPending = false,
  title = "Tạo thẻ với AI",
}: FlashcardAIBulkDialogProps) {
  const [values, setValues] = React.useState<FlashcardAIBulkValues>({
    terms: "",
  })

  React.useEffect(() => {
    if (open) {
      setValues({ terms: "" })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.terms.trim()) return
    await onCreate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Nhập một hoặc nhiều từ (mỗi từ trên một dòng hoặc ngăn cách bởi dấu phẩy). AI sẽ tự điền các trường còn lại và lưu vào bộ thẻ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="ai-terms">Từ / Danh sách từ</FieldLabel>
            <Textarea
              id="ai-terms"
              placeholder="Ví dụ:\nたべる\nみる\n..."
              value={values.terms}
              onChange={(e) => setValues({ ...values, terms: e.target.value })}
              rows={6}
            />
          </Field>



          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending || !values.terms.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo thẻ với AI
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
