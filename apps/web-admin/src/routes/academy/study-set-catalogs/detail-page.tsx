import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useAcademyStudySetCatalogById,
  useAdminCreateSetCard,
  useAdminUpdateSetCard,
  useAdminDeleteSetCard,
} from '@/lib/api/services/academy-study-set-catalogs'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@workspace/ui/components/empty'
import { ArrowLeft, Plus, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { dataTableShellClass, dataTableHeaderClass } from '@/lib/ui-shell'

import { FlashcardFormDialog, type FlashcardFormValues } from '@workspace/ui/components/custom/flashcard-form-dialog'
import { DeleteSetCardDialog } from '@/components/academy/delete-set-card-dialog'

export default function StudySetCatalogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const setId = id!

  const { data: set, isLoading } = useAcademyStudySetCatalogById(setId)
  const createCard = useAdminCreateSetCard(setId)
  const updateCard = useAdminUpdateSetCard(setId)
  const deleteCard = useAdminDeleteSetCard(setId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<any | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<{ id: string; term: string } | null>(null)

  const openCreate = () => {
    setEditingCard(null)
    setDialogOpen(true)
  }

  const openEdit = (card: any) => {
    setEditingCard(card)
    setDialogOpen(true)
  }

  const handleSave = async (values: FlashcardFormValues) => {
    const payload = {
      term: values.term.trim(),
      definition: values.definition.trim(),
      hint: values.note.trim() || undefined,
      languageDetails: {
        phonetic: values.phonetic.trim(),
        type: values.type,
      },
    }
    try {
      if (editingCard) {
        await updateCard.mutateAsync({ cardId: editingCard.id, input: payload })
        toast.success('Đã cập nhật thẻ')
      } else {
        await createCard.mutateAsync(payload)
        toast.success('Đã thêm thẻ mới')
      }
      setDialogOpen(false)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu thẻ')
    }
  }

  const openDelete = (card: any) => {
    setCardToDelete({ id: card.id, term: card.term })
    setDeleteOpen(true)
  }

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return
    try {
      await deleteCard.mutateAsync(cardToDelete.id)
      toast.success('Đã xóa thẻ')
      setDeleteOpen(false)
      setCardToDelete(null)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa thẻ')
    }
  }

  const isPending = createCard.isPending || updateCard.isPending

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!set) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Không tìm thấy bộ thẻ.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft />
          Quay lại
        </Button>
      </div>
    )
  }

  const cards = (set as any).setCards ?? []

  const initialValues: Partial<FlashcardFormValues> = editingCard
    ? {
        term: editingCard.term,
        definition: editingCard.definition,
        phonetic:
          editingCard.languageDetails?.phonetic || editingCard.language_details?.phonetic || '',
        note: editingCard.hint || '',
        type: editingCard.languageDetails?.type || editingCard.language_details?.type || 'Từ vựng',
      }
    : {}

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
        <Button variant="outline" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader
            title={set.title}
            subtitle={set.description || 'Quản lý các thẻ flashcard trong bộ này.'}
            stats={[
              { label: 'Số thẻ', value: cards.length },
              { label: 'Trạng thái', value: set.isPublic ? 'Public' : 'Ẩn' },
            ]}
            actions={
              <Button onClick={openCreate}>
                <Plus />
                Thêm thẻ
              </Button>
            }
          />
        </div>
      </div>

      <DeleteSetCardDialog
        open={deleteOpen && !!cardToDelete}
        onOpenChange={(o) => {
          setDeleteOpen(o)
          if (!o) setCardToDelete(null)
        }}
        card={cardToDelete}
        onConfirm={confirmDeleteCard}
        isPending={deleteCard.isPending}
      />

      {cards.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>Chưa có thẻ</EmptyTitle>
            <EmptyDescription>
              Thêm thẻ để học viên có nội dung trong bộ catalog này.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate}>
              <Plus />
              Thêm thẻ đầu tiên
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className={dataTableShellClass}>
          <Table>
            <TableHeader className={dataTableHeaderClass}>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pl-4">#</TableHead>
                <TableHead>Mặt trước / Phiên âm</TableHead>
                <TableHead>Mặt sau</TableHead>
                <TableHead>Từ loại</TableHead>
                <TableHead className="w-[220px] text-right pr-4">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map((card: any, idx: number) => (
                <TableRow key={card.id}>
                  <TableCell className="pl-4 text-muted-foreground text-sm tabular-nums">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="max-w-[min(100%,240px)]">
                    <div className="font-medium">{card.term}</div>
                    {(card.languageDetails?.phonetic || card.language_details?.phonetic) && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        「{card.languageDetails?.phonetic || card.language_details?.phonetic}」
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[min(100%,320px)]">
                    <div>{card.definition}</div>
                    {card.hint && (
                      <div className="mt-0.5 text-xs text-muted-foreground">Ghi chú: {card.hint}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {card.languageDetails?.type || card.language_details?.type ? (
                      <Badge variant="outline">
                        {card.languageDetails?.type || card.language_details?.type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(card)}>
                        Chỉnh sửa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDelete(card)}
                        disabled={
                          deleteCard.isPending && deleteCard.variables === card.id
                        }
                      >
                        {deleteCard.isPending && deleteCard.variables === card.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang xóa
                          </>
                        ) : (
                          'Xóa'
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FlashcardFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValues={initialValues}
        onSave={handleSave}
        isPending={isPending}
        title={editingCard ? 'Chỉnh sửa thẻ' : 'Thêm thẻ mới'}
      />
    </div>
  )
}
