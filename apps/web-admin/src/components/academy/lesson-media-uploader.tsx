import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldError,
} from "@workspace/ui/components/field"
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { storageApi } from "@/lib/api/services/storage-api"
import { ImagePreview } from "../common/image-preview"

interface LessonMediaUploaderProps {
  label?: string
  description?: string
  value?: string | null
  onChange: (url: string | null) => void
  accept?: string
  errorMessage?: string
}

export function LessonMediaUploader({
  label = "File nội dung",
  description,
  value,
  onChange,
  accept,
  errorMessage,
}: LessonMediaUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setLocalError(null)
    setUploading(true)
    setProgress(10)

    try {
      const response = await storageApi.uploadFile(file, "academy-lessons")
      setProgress(90)
      onChange(response.fileUrl)
      setProgress(100)
    } catch (error: any) {
      console.error(error)
      setLocalError(error?.message || "Tải lên thất bại")
      onChange(null)
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Card>
        <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  className="shrink-0"
                  onClick={() => {
                    const input = document.createElement("input")
                    input.type = "file"
                    if (accept) {
                      input.accept = accept
                    }
                    input.onchange = (ev: Event) => handleFileChange(ev as unknown as React.ChangeEvent<HTMLInputElement>)
                    input.click()
                  }}
                >
                  {uploading ? "Đang upload..." : "Chọn file"}
                </Button>
              </div>
            </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                Đang tải file lên, vui lòng chờ...
              </p>
            </div>
          )}

          {value && !uploading && (
            <div className="space-y-2">
              {value.match(/\.(mp4|webm|ogg)$/i) ? (
                <>
                  <p className="text-sm font-medium">Xem trước</p>
                  <video
                    src={value}
                    controls
                    className="w-full rounded-md"
                  />
                </>
              ) : value.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                <ImagePreview url={value} />
              ) : (
                <>
                  <p className="text-sm font-medium">Xem trước</p>
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline"
                  >
                    Mở file
                  </a>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {description && (
        <FieldDescription>{description}</FieldDescription>
      )}
      <FieldError>{errorMessage || localError}</FieldError>
    </Field>
  )
}

