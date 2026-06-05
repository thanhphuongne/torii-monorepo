'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Send,
  Paperclip,
  MessageSquare,
  Trophy,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  useAcademyClassAssignments,
  useMyAssignmentSubmissions,
  useSubmitAssignment,
} from '@/lib/api/services/academy-assignment-api'
import { storageApi } from '@/lib/api/services/storage-api'
import { format } from 'date-fns'
import { cn } from '@workspace/ui/lib/utils'
import { toast } from 'sonner'

interface AcademyAssignmentDetailProps {
  liveClassId: string
  classAssignmentId: string
}

export function AcademyAssignmentDetail({
  liveClassId,
  classAssignmentId,
}: AcademyAssignmentDetailProps) {
  const { data: assignments, isLoading: isLoadingAssignments } = useAcademyClassAssignments(liveClassId)
  const { data: mySubmissions, isLoading: isLoadingSubmissions } = useMyAssignmentSubmissions(liveClassId)
  const submitMutation = useSubmitAssignment(liveClassId)

  const [submissionLink, setSubmissionLink] = useState('')
  const [submissionNote, setSubmissionNote] = useState('')
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  const selectedAssignment = useMemo(
    () => assignments?.find((a) => a.id === classAssignmentId) ?? null,
    [assignments, classAssignmentId],
  )

  const existingSubmission = useMemo(
    () =>
      selectedAssignment
        ? mySubmissions?.find((s) => s.assignmentTemplateId === selectedAssignment.assignmentId)
        : null,
    [mySubmissions, selectedAssignment],
  )

  const isLoading = isLoadingAssignments || isLoadingSubmissions

  const isSubmitted = existingSubmission?.status?.toUpperCase() === 'SUBMITTED' || existingSubmission?.status?.toUpperCase() === 'GRADED'

  const handleSubmit = async () => {
    if (!selectedAssignment) return
    const hasLink = submissionLink.trim().length > 0
    const hasFile = !!submissionFile

    if (!hasLink && !hasFile) {
      toast.error('Vui lòng đính kèm file hoặc nhập link bài nộp.')
      return
    }

    try {
      let uploadedFileUrl: string | undefined
      if (hasFile && submissionFile) {
        setIsUploadingFile(true)
        const uploaded = await storageApi.uploadFile(submissionFile, 'assignments')
        uploadedFileUrl = uploaded.fileUrl
      }

      await submitMutation.mutateAsync({
        classAssessmentId: selectedAssignment.id,
        assignmentTemplateId: selectedAssignment.assignmentId,
        content: {
          text: submissionNote.trim() || undefined,
          url: hasLink ? submissionLink.trim() : uploadedFileUrl,
        },
        fileUrls: uploadedFileUrl ? [uploadedFileUrl] : undefined,
      })
      toast.success('Nộp bài tập thành công!')
      setSubmissionFile(null)
    } catch (error: any) {
      toast.error(error?.message || 'Có lỗi xảy ra khi nộp bài')
    } finally {
      setIsUploadingFile(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Đang tải chi tiết bài tập...</p>
      </div>
    )
  }

  if (!selectedAssignment) {
    return (
      <Card>
        <CardContent className="py-12 space-y-4 text-center">
          <p className="font-semibold">Không tìm thấy bài tập</p>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/my-courses/${liveClassId}?tab=assignments`}>
              <ArrowLeft className="mr-2 size-4" />
              Quay lại danh sách bài tập
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="pl-0">
        <Link href={`/dashboard/my-courses/${liveClassId}?tab=assignments`}>
          <ArrowLeft className="mr-2 size-4" />
          Quay lại danh sách bài tập
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Chi tiết bài tập</Badge>
                {selectedAssignment.deadline && (
                  <Badge variant="destructive">
                    Hết hạn: {format(new Date(selectedAssignment.deadline), 'dd/MM/yyyy HH:mm')}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-semibold">
                {selectedAssignment.titleOverride || selectedAssignment.assignment?.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {selectedAssignment.assignment?.instructions || 'Giảng viên chưa cung cấp hướng dẫn chi tiết.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="size-4" /> Nộp bài
              </CardTitle>
              <CardDescription>
                Nộp bằng tệp đính kèm hoặc link bài làm. Có thể thêm ghi chú nếu cần.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Đính kèm tệp</label>
                <Input
                  type="file"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] ?? null)}
                  disabled={isSubmitted}
                />
                {submissionFile && (
                  <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Paperclip className="size-3.5" />
                    {submissionFile.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Link bài nộp</label>
                <Input
                  placeholder="https://drive.google.com/... hoặc https://github.com/..."
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  disabled={isSubmitted}
                />
              </div>

              <Textarea
                placeholder="Ghi chú thêm cho bài nộp (không bắt buộc)..."
                className="min-h-[132px] resize-none"
                value={submissionNote}
                onChange={(e) => setSubmissionNote(e.target.value)}
                disabled={isSubmitted}
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    submitMutation.isPending ||
                    isUploadingFile ||
                    (!(submissionFile || submissionLink.trim())) ||
                    isSubmitted
                  }
                >
                  {submitMutation.isPending || isUploadingFile ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {isUploadingFile ? 'Đang tải tệp...' : 'Đang nộp...'}
                    </>
                  ) : (
                    <>
                      Nộp bài tập
                      <Send className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-4">
          {existingSubmission?.feedback && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="size-4" /> Phản hồi giáo viên
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Kết quả</div>
                    <div className="text-lg font-semibold">
                      {existingSubmission.grade ?? existingSubmission.score ?? '--'} / 100
                    </div>
                  </div>
                  <Trophy className="size-5 text-muted-foreground" />
                </div>
                <p className="border-l pl-3 text-sm italic text-muted-foreground">
                  "{existingSubmission.feedback}"
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin nộp bài</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Trạng thái</p>
                <Badge
                  className={cn(
                    'border-none',
                    !existingSubmission
                      ? 'bg-zinc-100 text-zinc-500'
                      : existingSubmission.status?.toUpperCase() === 'GRADED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700',
                  )}
                >
                  {!existingSubmission
                    ? 'Chưa nộp'
                    : existingSubmission.status?.toUpperCase() === 'GRADED'
                      ? `Đã chấm: ${existingSubmission.grade ?? existingSubmission.score ?? '?'}`
                      : 'Đã nộp'}
                </Badge>
              </div>
              {existingSubmission?.submittedAt && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Ngày nộp</p>
                  <p className="text-sm font-medium">
                    {format(new Date(existingSubmission.submittedAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              )}
              {existingSubmission?.gradedAt && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Ngày chấm</p>
                  <p className="text-sm font-medium">
                    {format(new Date(existingSubmission.gradedAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

