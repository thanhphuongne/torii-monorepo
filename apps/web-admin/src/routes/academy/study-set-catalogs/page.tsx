import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Badge } from '@workspace/ui/components/badge'
import { PageHeader } from '@/components/common/page-header'
import { StudySetCatalogFormSheet } from '@/components/academy/study-set-catalog-form-sheet'
import { DeleteStudySetCatalogDialog } from '@/components/academy/delete-study-set-catalog-dialog'
import {
  useAcademyStudySetCatalogs,
  useCreateAcademyStudySetCatalog,
  useDeleteAcademyStudySetCatalog,
  useUpdateAcademyStudySetCatalog,
} from '@/lib/api/services/academy-study-set-catalogs'
import type { AcademyStudySetModel } from '@workspace/schemas'
import { toast } from 'sonner'
import { dataTableShellClass, dataTableHeaderClass } from '@/lib/ui-shell'

export default function StudySetCatalogsPage() {
  const { data, isLoading } = useAcademyStudySetCatalogs()
  const navigate = useNavigate()
  const createCatalog = useCreateAcademyStudySetCatalog()
  const updateCatalog = useUpdateAcademyStudySetCatalog()
  const deleteCatalog = useDeleteAcademyStudySetCatalog()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<AcademyStudySetModel | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<AcademyStudySetModel | null>(null)

  const items = useMemo(
    () => (data || []).filter((x) => (x.sourceType || 'SYSTEM') === 'SYSTEM'),
    [data],
  )

  const openCreate = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  const openEdit = (item: AcademyStudySetModel) => {
    setEditing(item)
    setSheetOpen(true)
  }

  const onSubmitSheet = async (input: {
    title: string
    description: string
    isPublic: boolean
  }) => {
    try {
      if (editing) {
        await updateCatalog.mutateAsync({
          id: editing.id,
          input,
        })
        toast.success('Đã cập nhật bộ hệ thống')
      } else {
        await createCatalog.mutateAsync(input)
        toast.success('Đã tạo bộ hệ thống')
      }
      setSheetOpen(false)
      setEditing(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu bộ hệ thống')
    }
  }

  const openDelete = (item: AcademyStudySetModel) => {
    setDeleting(item)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteCatalog.mutateAsync(deleting.id)
      toast.success('Đã xóa bộ hệ thống')
      setDeleteOpen(false)
      setDeleting(null)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không xóa được')
    }
  }

  const formPending = createCatalog.isPending || updateCatalog.isPending

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Study Set Catalogs (System)"
        subtitle="Quản lý bộ thẻ mặc định hệ thống, dùng cho mục Khám phá phía học viên."
        actions={
          <Button size="lg" onClick={openCreate}>
            <Plus />
            Tạo bộ hệ thống
          </Button>
        }
      />

      <StudySetCatalogFormSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          if (!formPending) {
            setSheetOpen(o)
            if (!o) setEditing(null)
          }
        }}
        editing={editing}
        onSubmit={onSubmitSheet}
        isPending={formPending}
      />

      <DeleteStudySetCatalogDialog
        open={deleteOpen && !!deleting}
        onOpenChange={(o) => {
          setDeleteOpen(o)
          if (!o) setDeleting(null)
        }}
        catalog={deleting}
        onConfirm={confirmDelete}
        isPending={deleteCatalog.isPending}
      />

      <div className={dataTableShellClass}>
        <Table>
          <TableHeader className={dataTableHeaderClass}>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead>Tên bộ</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Số thẻ</TableHead>
              <TableHead className="text-right pr-6">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>Đang tải...</TableCell>
              </TableRow>
            ) : !items.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Chưa có bộ hệ thống nào.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell className="text-center text-muted-foreground tabular-nums text-xs">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-muted-foreground">{item.description || '—'}</TableCell>
                  <TableCell>
                    {item.isPublic ? (
                      <Badge variant="secondary">Public</Badge>
                    ) : (
                      <Badge variant="outline">Ẩn</Badge>
                    )}
                  </TableCell>
                  <TableCell>{item._count?.setCards ?? 0}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/academy/study-set-catalogs/${item.id}`)}
                      >
                        Quản lý thẻ
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        Chỉnh sửa
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDelete(item)}>
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
