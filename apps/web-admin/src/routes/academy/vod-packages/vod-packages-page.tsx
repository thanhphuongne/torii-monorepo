import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/common/page-header"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
    Plus,
    Search,
    Pencil,
    Eye,
    Send,
    Trash2,
} from "lucide-react"
import {
    useAcademyVodPackages,
    type AcademyVodPackage,
    useDeleteAcademyVodPackage,
    useSubmitVodPackageForApproval,
} from "@/lib/api/services/academy-vod-packages"
import { useDebounceValue } from "@workspace/ui/hooks/use-debounce-value"
import { VodPackageSheet } from "@/components/academy/vod-package-sheet"
import { toast } from "sonner"
import {
    dataTableShellClass,
    dataTableHeaderClass,
    listPageFiltersRowClass,
    listPageSearchIconClass,
    listPageSearchInputClass,
    listPageSearchWrapClass,
    listPageToolbarRootClass,
} from "@/lib/ui-shell"

const getVodStatusLabel = (status: string) => {
    switch (status) {
        case "PUBLISHED":
            return "Đang hoạt động";
        case "DRAFT":
            return "Bản nháp";
        case "PENDING_APPROVAL":
            return "Chờ duyệt";
        case "ARCHIVED":
            return "Đã lưu trữ";
        default:
            return status;
    }
};

export default function VodPackagesPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearch] = useDebounceValue(searchTerm, 500)
    const [tab, setTab] = useState<'all' | 'draft' | 'pending' | 'published' | 'archived'>('all')
    const [sheetOpen, setSheetOpen] = useState(false)
    const [selectedPackage, setSelectedPackage] = useState<AcademyVodPackage | null>(null)
    const [rejectReasonDialog, setRejectReasonDialog] = useState<{
        open: boolean
        reason: string
    }>({ open: false, reason: "" })
    const [deleteDialogPackage, setDeleteDialogPackage] = useState<AcademyVodPackage | null>(null)
    const [submitApprovalDialog, setSubmitApprovalDialog] = useState<{
        open: boolean
        packageId?: string
        code?: string
    }>({ open: false })
    const navigate = useNavigate()
    const submitForApprovalMutation = useSubmitVodPackageForApproval()
    const deleteMutation = useDeleteAcademyVodPackage()

    const statusFilter = 
        tab === 'all' ? undefined : 
        tab === 'draft' ? 'DRAFT' : 
        tab === 'pending' ? 'PENDING_APPROVAL' : 
        tab === 'published' ? 'PUBLISHED' : 'ARCHIVED'

    const { data: packages, isLoading } = useAcademyVodPackages({
        q: debouncedSearch,
        status: statusFilter,
    })

    const handleCreate = () => {
        setSelectedPackage(null)
        setSheetOpen(true)
    }

    const goToDetail = (id: string) => {
        navigate(`/academy/vod-packages/${id}/detail`)
    }

    const handleEdit = (pkg: AcademyVodPackage) => {
        setSelectedPackage(pkg)
        setSheetOpen(true)
    }

    const handleDeleteDraft = async (pkg: AcademyVodPackage) => {
        setDeleteDialogPackage(pkg)
    }

    const handleConfirmDeleteDraft = async () => {
        if (!deleteDialogPackage) return
        try {
            await deleteMutation.mutateAsync(deleteDialogPackage.id)
            toast.success(`Đã xóa gói ${deleteDialogPackage.code}`)
            setDeleteDialogPackage(null)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || "Không thể xóa gói tự học")
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title="Gói tự học & Học liệu"
                subtitle="Quản lý các gói video bài giảng, lộ trình tự học và giá bán."
                actions={
                    <Button size="lg" onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Tạo gói tự học mới
                    </Button>
                }
            />

            <div className="flex flex-col gap-4">
                <div className={listPageToolbarRootClass}>
                    <div className={listPageSearchWrapClass}>
                        <Search className={listPageSearchIconClass} />
                        <Input
                            placeholder="Tìm theo mã hoặc tên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={listPageSearchInputClass}
                        />
                    </div>

                    <div className={listPageFiltersRowClass}>
                    <Select value={tab} onValueChange={(v) => setTab(v as any)}>
                        <SelectTrigger className="h-10 w-full md:w-[240px] bg-muted/30 p-1 rounded-lg">
                            <SelectValue placeholder="Lọc trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="draft">Bản nháp</SelectItem>
                            <SelectItem value="pending">Chờ duyệt</SelectItem>
                            <SelectItem value="published">Đang hoạt động</SelectItem>
                            <SelectItem value="archived">Đã lưu trữ</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                </div>

                <div className={dataTableShellClass}>
                    <Table>
                        <TableHeader className={dataTableHeaderClass}>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-12 text-center">#</TableHead>
                                <TableHead className="w-[100px]">Ảnh bìa</TableHead>
                                <TableHead className="w-[150px]">Mã Gói</TableHead>
                                <TableHead>Tên gói tự học</TableHead>
                                <TableHead>Giảng viên</TableHead>
                                <TableHead>Giá (VNĐ)</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right pr-6">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                        <TableCell><Skeleton className="h-10 w-16 rounded-md" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : packages?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        Không tìm thấy gói tự học nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                packages?.map((pkg, index) => (
                                    <TableRow key={pkg.id} className="group hover:bg-muted/5 transition-colors">
                                        <TableCell className="text-center text-muted-foreground tabular-nums">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="h-10 w-16 rounded-md border bg-muted/50 overflow-hidden shadow-xs flex-shrink-0">
                                                {pkg.thumbnailUrl ? (
                                                    <img
                                                        src={pkg.thumbnailUrl}
                                                        alt={pkg.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground italic">
                                                        Không có ảnh
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-bold text-primary">{pkg.code}</TableCell>
                                        <TableCell className="font-semibold text-sm">{pkg.title}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">{pkg.instructor?.displayName || 'Chưa chọn'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-primary tabular-nums">
                                                    {pkg.discountPrice ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(pkg.discountPrice)) : (pkg.price ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(pkg.price)) : 'Miễn phí')}
                                                </span>
                                                {pkg.discountPrice && pkg.price && (
                                                    <span className="text-[10px] text-muted-foreground line-through tabular-nums opacity-70">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(pkg.price))}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {pkg.status === 'ARCHIVED' ? (
                                                <Badge variant="destructive" className="bg-orange-500/10 text-orange-600 border-none">{getVodStatusLabel(pkg.status)}</Badge>
                                            ) : pkg.status === 'PENDING_APPROVAL' ? (
                                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-none">{getVodStatusLabel(pkg.status)}</Badge>
                                            ) : pkg.status === 'DRAFT' ? (
                                                <Badge variant="secondary" className="bg-slate-500/10 text-slate-700 border-none">{getVodStatusLabel(pkg.status)}</Badge>
                                            ) : (
                                                <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-none">{getVodStatusLabel(pkg.status)}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1.5 border-sky-500/40 text-sky-700 hover:bg-sky-50 font-medium"
                                                    onClick={() => goToDetail(pkg.id)}
                                                >
                                                    <Eye className="h-4 w-4" /> Chi tiết
                                                </Button>
                                                {pkg.status === 'DRAFT' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 font-medium"
                                                        onClick={() => handleEdit(pkg)}
                                                    >
                                                        <Pencil className="h-4 w-4" /> Sửa
                                                    </Button>
                                                )}

                                                {pkg.status === 'DRAFT' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1.5 border-indigo-500/40 text-indigo-700 hover:bg-indigo-50 font-medium"
                                                        onClick={() =>
                                                            setSubmitApprovalDialog({
                                                                open: true,
                                                                packageId: pkg.id,
                                                                code: pkg.code,
                                                            })
                                                        }
                                                        disabled={submitForApprovalMutation.isPending}
                                                    >
                                                        <Send className="h-4 w-4" /> Gửi duyệt
                                                    </Button>
                                                )}
                                                {pkg.status === 'DRAFT' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5 font-medium"
                                                        onClick={() => handleDeleteDraft(pkg)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4" /> Xóa nháp
                                                    </Button>
                                                )}
                                                {pkg.status === 'DRAFT' && !!pkg.rejectionReason && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() =>
                                                            setRejectReasonDialog({
                                                                open: true,
                                                                reason: pkg.rejectionReason || "Không có lý do cụ thể.",
                                                            })
                                                        }
                                                    >
                                                        Lý do từ chối
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <VodPackageSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                vodPackage={selectedPackage}
            />

            <Dialog
                open={rejectReasonDialog.open}
                onOpenChange={(open) =>
                    setRejectReasonDialog((prev) => (open ? prev : { open: false, reason: "" }))
                }
            >
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Lý do từ chối</DialogTitle>
                        <DialogDescription>
                            Yêu cầu của bạn đã bị từ chối. Vui lòng xem chi tiết bên dưới.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                        {rejectReasonDialog.reason}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectReasonDialog({ open: false, reason: "" })}>
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteDialogPackage} onOpenChange={(open) => !open && setDeleteDialogPackage(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa gói nháp</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn chắc chắn muốn xóa gói tự học bản nháp{" "}
                            <span className="font-semibold">{deleteDialogPackage?.code}</span>? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDeleteDraft}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? "Đang xóa..." : "Xóa gói nháp"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={submitApprovalDialog.open}
                onOpenChange={(open) =>
                    setSubmitApprovalDialog((prev) => ({ ...prev, open }))
                }
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận gửi duyệt</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn gửi duyệt gói{" "}
                            <span className="font-semibold">{submitApprovalDialog.code}</span>? Sau khi gửi, thông tin sẽ bị khóa để tránh thay đổi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitForApprovalMutation.isPending}>
                            Hủy
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={
                                submitForApprovalMutation.isPending ||
                                !submitApprovalDialog.packageId
                            }
                            onClick={async () => {
                                if (!submitApprovalDialog.packageId) return
                                try {
                                    await submitForApprovalMutation.mutateAsync(
                                        submitApprovalDialog.packageId,
                                    )
                                    toast.success(
                                        `Đã gửi duyệt gói ${submitApprovalDialog.code}`,
                                    )
                                } catch (err: any) {
                                    toast.error(
                                        err?.message ||
                                            err?.userMessage ||
                                            "Không thể gửi duyệt",
                                    )
                                } finally {
                                    setSubmitApprovalDialog({ open: false })
                                }
                            }}
                        >
                            {submitForApprovalMutation.isPending
                                ? "Đang gửi..."
                                : "Xác nhận gửi duyệt"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
