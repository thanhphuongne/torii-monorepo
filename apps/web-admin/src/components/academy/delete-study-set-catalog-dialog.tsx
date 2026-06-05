import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import { AlertTriangle } from 'lucide-react'
import { Spinner } from '@workspace/ui/components/spinner'
import type { AcademyStudySetModel } from '@workspace/schemas'

interface DeleteStudySetCatalogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalog: AcademyStudySetModel | null
  onConfirm: () => Promise<void>
  isPending: boolean
}

export function DeleteStudySetCatalogDialog({
  open,
  onOpenChange,
  catalog,
  onConfirm,
  isPending,
}: DeleteStudySetCatalogDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <AlertTriangle />
          </AlertDialogMedia>
          <AlertDialogTitle>Xóa bộ hệ thống</AlertDialogTitle>
          <AlertDialogDescription>
            Bộ{' '}
            <span className="font-medium text-foreground">{catalog?.title ?? '—'}</span> và thẻ liên
            quan sẽ bị xóa khỏi catalog. Thao tác không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isPending}>
              Hủy
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Spinner /> : 'Xóa bộ'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
