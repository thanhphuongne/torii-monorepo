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

interface SetCardLike {
  id: string
  term: string
}

interface DeleteSetCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: SetCardLike | null
  onConfirm: () => Promise<void>
  isPending: boolean
}

export function DeleteSetCardDialog({
  open,
  onOpenChange,
  card,
  onConfirm,
  isPending,
}: DeleteSetCardDialogProps) {
  if (!card) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <AlertTriangle />
          </AlertDialogMedia>
          <AlertDialogTitle>Xóa thẻ</AlertDialogTitle>
          <AlertDialogDescription>
            Xóa thẻ{' '}
            <span className="font-medium text-foreground">「{card.term}」</span>? Hành động này không
            thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isPending}>
              Hủy
            </Button>
          </AlertDialogCancel>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <Spinner /> : 'Xóa thẻ'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
