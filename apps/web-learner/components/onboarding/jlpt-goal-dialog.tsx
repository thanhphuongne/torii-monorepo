import * as React from "react"
import { useEffect, useState } from "react"

import { useAppDispatch, useAppSelector } from "@/hooks/hooks"
import { apiClient } from "@/lib/api/api-client"
import { fetchProfile } from "@/store/slices/authSlice"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@workspace/ui/components/sonner"

type JlptGoalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const JLPT_TARGET_OPTIONS = ["N5", "N4", "N3", "N2", "N1"] as const
const JLPT_LEVEL_OPTIONS = ["NEVER", "N5", "N4", "N3", "N2", "N1"] as const

function normalizeJlptTarget(value: unknown): string {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : ""
  return JLPT_TARGET_OPTIONS.includes(raw as (typeof JLPT_TARGET_OPTIONS)[number]) ? raw : "N3"
}

function normalizeCurrentLevel(value: unknown): string {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : ""

  if (!raw) return "NEVER"
  if (JLPT_LEVEL_OPTIONS.includes(raw as (typeof JLPT_LEVEL_OPTIONS)[number])) return raw
  if (["BEGINNER", "NEW", "NONE"].includes(raw)) return "NEVER"

  return "NEVER"
}

export function JlptGoalDialog({ open, onOpenChange }: JlptGoalDialogProps) {
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()

  const [jlptTarget, setJlptTarget] = useState<string>(
    normalizeJlptTarget((user as any)?.jlptTarget || (user?.userMetadata as any)?.jlptTarget)
  )
  const [currentLevel, setCurrentLevel] = useState<string>(
    normalizeCurrentLevel((user as any)?.currentLevel || (user?.userMetadata as any)?.currentLevel)
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setJlptTarget(normalizeJlptTarget((user as any)?.jlptTarget || (user?.userMetadata as any)?.jlptTarget))
    setCurrentLevel(normalizeCurrentLevel((user as any)?.currentLevel || (user?.userMetadata as any)?.currentLevel))
  }, [user, open])

  const save = async () => {
    if (saving) return

    setSaving(true)
    try {
      const res = await apiClient.post("/api/onboarding/survey", {
        jlptTarget,
        currentLevel,
      })

      if (res.data?.success) {
        toast.success("Đã cập nhật mục tiêu JLPT.")
        await dispatch(fetchProfile())
        onOpenChange(false)
      } else {
        toast.error(res.data?.message || "Không thể lưu mục tiêu.")
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể lưu mục tiêu.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-border/70 bg-background p-0 shadow-2xl sm:max-w-[560px]">
        <div className="border-b border-border/70 bg-muted/30 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Mục tiêu JLPT</DialogTitle>
            <DialogDescription className="mt-1 max-w-[44ch] text-sm leading-6">
              Dùng để gợi ý khóa học phù hợp trên dashboard. Bạn có thể thay đổi bất cứ lúc nào.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Mục tiêu JLPT</Label>
            <RadioGroup
              value={jlptTarget}
              onValueChange={setJlptTarget}
              className="grid grid-cols-2 gap-3 sm:grid-cols-5"
            >
              {JLPT_TARGET_OPTIONS.map((lvl) => (
                <Label
                  key={lvl}
                  htmlFor={`goal-${lvl}`}
                  className="flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 text-sm font-semibold transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <RadioGroupItem id={`goal-${lvl}`} value={lvl} />
                  {lvl}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Trình độ hiện tại</Label>
            <Select value={currentLevel} onValueChange={setCurrentLevel}>
              <SelectTrigger className="h-12 rounded-2xl border-border bg-card text-sm font-medium shadow-none">
                <SelectValue placeholder="Chọn trình độ" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border">
                <SelectItem value="NEVER">Mới bắt đầu</SelectItem>
                <SelectItem value="N5">N5</SelectItem>
                <SelectItem value="N4">N4</SelectItem>
                <SelectItem value="N3">N3</SelectItem>
                <SelectItem value="N2">N2</SelectItem>
                <SelectItem value="N1">N1</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">
              Nếu dữ liệu cũ đang lưu không khớp option của thẻ chọn, modal sẽ tự chuẩn hóa để Select hiển thị đúng giá trị.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border/70 bg-muted/20 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-xl">
            Hủy
          </Button>
          <Button onClick={save} disabled={saving} className="rounded-xl font-bold">
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
