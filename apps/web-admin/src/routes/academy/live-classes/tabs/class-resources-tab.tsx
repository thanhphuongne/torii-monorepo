import { useState } from "react"
import {
    useAcademyFolders,
    useCreateAcademyFolder,
    useAcademyResources,
    useCreateAcademyResource,
    useUpdateAcademyResource,
    useDeleteAcademyResource,
    useDeleteAcademyFolder
} from "@/lib/api/services/academy-resources"
import { storageApi } from "@/lib/api/services/storage-api"
import {
    Folder,
    FileText,
    Plus,
    Trash2,
    Download,
    Eye,
    EyeOff,
    ArrowLeft,
    Upload
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@workspace/ui/components/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@workspace/ui/components/select"
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
import { AcademyFolderType, AcademyFolderOwnerType, AcademyResourceType, AcademyResourceVisibility } from "@workspace/schemas"
import { toast } from "sonner"

interface ClassResourcesTabProps {
    liveClassId?: string
    vodPackageId?: string
}

export function ClassResourcesTab({ liveClassId, vodPackageId }: ClassResourcesTabProps) {
    const [isAddingResource, setIsAddingResource] = useState(false)
    const [isAddingFolder, setIsAddingFolder] = useState(false)
    const [resourceToDelete, setResourceToDelete] = useState<string | null>(null)
    const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
    const [newFolderName, setNewFolderName] = useState("")

    const ownerId = (vodPackageId || liveClassId) as string
    const ownerType = vodPackageId ? AcademyFolderOwnerType.COURSE_VOD : AcademyFolderOwnerType.LIVE_CLASS
    const { data: folders, isLoading: isLoadingFolders } = useAcademyFolders(ownerId, ownerType)

    const activeFolder = folders?.find(f => f.folderId === activeFolderId)
    const { data: resources, isLoading: isLoadingResources } = useAcademyResources(activeFolderId || undefined)

    const createFolderMutation = useCreateAcademyFolder()
    const createResourceMutation = useCreateAcademyResource()
    const updateResourceMutation = useUpdateAcademyResource()
    const deleteResourceMutation = useDeleteAcademyResource()
    const deleteFolderMutation = useDeleteAcademyFolder()

    // Form states
    const [isUploading, setIsUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [newResource, setNewResource] = useState<{
        title: string;
        description: string;
        type: AcademyResourceType;
        fileAssetId: string;
        externalUrl: string;
        visibility: AcademyResourceVisibility;
    }>({
        title: "",
        description: "",
        type: AcademyResourceType.FILE,
        fileAssetId: "",
        externalUrl: "",
        visibility: AcademyResourceVisibility.PUBLIC
    })

    const handleCreateFolder = async () => {
        if (!newFolderName) return toast.error("Vui lòng nhập tên thư mục.")
        try {
            await createFolderMutation.mutateAsync({
                name: newFolderName,
                type: AcademyFolderType.SHARED,
                ownerId: ownerId,
                ownerType: ownerType
            })
            toast.success("Đã tạo thư mục.")
            setIsAddingFolder(false)
            setNewFolderName("")
        } catch (error) {
            toast.error("Không thể tạo thư mục.")
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let file: File | undefined
        if ('target' in e && (e.target as HTMLInputElement).files) {
            file = (e.target as HTMLInputElement).files?.[0]
        } else if ('dataTransfer' in e) {
            file = e.dataTransfer.files?.[0]
        }

        if (!file) return

        setIsUploading(true)
        try {
            const result = await storageApi.uploadFile(file, 'academy', { liveClassId, vodPackageId })
            setNewResource(prev => ({
                ...prev,
                fileAssetId: result.fileId,
                title: prev.title || (file ? (file as File).name : "")
            }))
            toast.success("Tải lên thành công.")
        } catch (error) {
            toast.error("Tải lên thất bại.")
        } finally {
            setIsUploading(false)
            setIsDragging(false)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        handleFileUpload(e)
    }

    const handleAddResource = async () => {
        if (!activeFolderId) return toast.error("Vui lòng chọn thư mục.")
        if (!newResource.title) return toast.error("Vui lòng nhập tiêu đề.")

        try {
            await createResourceMutation.mutateAsync({
                folderId: activeFolderId,
                title: newResource.title,
                description: newResource.description,
                resourceType: newResource.type as any,
                externalUrl: newResource.type === AcademyResourceType.LINK ? newResource.externalUrl : undefined,
                fileAssetId: newResource.type === AcademyResourceType.FILE ? (newResource.fileAssetId || undefined) : undefined,
                visibility: newResource.visibility as any,
                sortOrder: 0
            })
            toast.success("Đã thêm tài liệu thành công.")
            setIsAddingResource(false)
            setNewResource({
                title: "",
                description: "",
                type: AcademyResourceType.FILE,
                fileAssetId: "",
                externalUrl: "",
                visibility: AcademyResourceVisibility.PUBLIC
            })
        } catch (error) {
            toast.error("Không thể thêm tài liệu.")
        }
    }

    const handleDeleteResource = async () => {
        if (!resourceToDelete) return
        try {
            await deleteResourceMutation.mutateAsync(resourceToDelete)
            toast.success("Đã xóa tài liệu.")
            setResourceToDelete(null)
        } catch (error) {
            toast.error("Không thể xóa tài liệu.")
        }
    }

    const handleDeleteFolder = async () => {
        if (!folderToDelete) return
        try {
            await deleteFolderMutation.mutateAsync(folderToDelete)
            toast.success("Đã xóa thư mục.")
            setFolderToDelete(null)
        } catch (error) {
            toast.error("Không thể xóa thư mục.")
        }
    }

    const toggleVisibility = async (resource: any) => {
        const newVisibility = resource.visibility === AcademyResourceVisibility.PUBLIC
            ? AcademyResourceVisibility.PRIVATE
            : AcademyResourceVisibility.PUBLIC

        try {
            await updateResourceMutation.mutateAsync({
                id: resource.id,
                input: { visibility: newVisibility }
            })
            toast.success("Đã cập nhật trạng thái hiển thị.")
        } catch (error) {
            toast.error("Không thể cập nhật trạng thái.")
        }
    }

    if (isLoadingFolders) {
        return <Skeleton className="h-48 w-full rounded-2xl" />
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header section with Create Folder/Resource Dialogs */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {activeFolderId && (
                            <Button variant="ghost" size="icon" onClick={() => setActiveFolderId(null)} className="h-8 w-8 rounded-full">
                                <ArrowLeft className="size-4" />
                            </Button>
                        )}
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Folder className="size-5 text-primary" />
                            {activeFolder ? activeFolder.folderName : "Thư mục tài liệu"}
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {activeFolder
                            ? `Quản lý các tài liệu trong thư mục ${activeFolder.folderName}.`
                            : "Danh sách các thư mục tài liệu chia sẻ."}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {!activeFolderId ? (
                        <Dialog open={isAddingFolder} onOpenChange={setIsAddingFolder}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="rounded-xl gap-2">
                                    <Plus className="size-4" /> Tạo thư mục
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl">
                                <DialogHeader>
                                    <DialogTitle>Tạo thư mục mới</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="folder-name">Tên thư mục</Label>
                                        <Input
                                            id="folder-name"
                                            placeholder="VD: Tuần 1, Tài liệu N3..."
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddingFolder(false)} className="rounded-xl">Hủy</Button>
                                    <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending} className="rounded-xl">
                                        {createFolderMutation.isPending ? "Đang tạo..." : "Tạo thư mục"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <Dialog open={isAddingResource} onOpenChange={setIsAddingResource}>
                            <DialogTrigger asChild>
                                <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                                    <Plus className="size-4" /> Thêm tài liệu
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] rounded-3xl">
                                <DialogHeader>
                                    <DialogTitle>Thêm tài liệu mới</DialogTitle>
                                    <DialogDescription>
                                        Vào thư mục: <strong>{activeFolder?.folderName}</strong>
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Tiêu đề</Label>
                                        <Input
                                            id="title"
                                            placeholder="VD: Tài liệu buổi 1 - Từ vựng N3"
                                            value={newResource.title}
                                            onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                                            className="rounded-xl w-full"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Mô tả (không bắt buộc)</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Mô tả ngắn về nội dung tài liệu..."
                                            value={newResource.description}
                                            onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                                            className="rounded-xl min-h-[100px]"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Hiển thị</Label>
                                        <Select
                                            value={newResource.visibility}
                                            onValueChange={(val) => setNewResource({ ...newResource, visibility: val as any })}
                                        >
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={AcademyResourceVisibility.PUBLIC}>Công khai</SelectItem>
                                                <SelectItem value={AcademyResourceVisibility.PRIVATE}>Ẩn</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>


                                    <div className="grid gap-2">
                                        <Label>Tải lên tập tin</Label>
                                        {newResource.fileAssetId ? (
                                            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 overflow-hidden">
                                                <FileText className="size-4 shrink-0" />
                                                <span className="text-xs font-medium truncate flex-1 min-w-0">{newResource.title}</span>
                                                <Button variant="ghost" size="sm" onClick={() => setNewResource({ ...newResource, fileAssetId: "" })} className="h-6 px-2 text-emerald-700 hover:bg-emerald-100 shrink-0">Thay đổi</Button>
                                            </div>
                                        ) : (
                                            <div
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                                className={`p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all relative ${isUploading ? 'bg-muted/50 border-muted cursor-not-allowed' : isDragging ? 'bg-primary/10 border-primary scale-[1.02]' : 'hover:bg-primary/5 hover:border-primary/50 border-zinc-200 cursor-pointer'}`}
                                                onClick={() => !isUploading && document.getElementById('file-upload-input')?.click()}
                                            >
                                                <input
                                                    id="file-upload-input"
                                                    type="file"
                                                    className="hidden"
                                                    onChange={handleFileUpload}
                                                    disabled={isUploading}
                                                />
                                                {isUploading ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                                        <p className="text-sm font-medium text-muted-foreground">Đang tải lên...</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                                                            <Upload className={`size-8 transition-colors ${isDragging ? 'text-primary' : 'text-primary'}`} />
                                                        </div>
                                                        <div className="text-center space-y-1">
                                                            <p className="text-sm font-bold">
                                                                {isDragging ? 'Thả tệp vào đây' : 'Nhấn để chọn hoặc kéo thả tệp'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">Hỗ trợ các định dạng PDF, Docx, Hình ảnh...</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddingResource(false)} className="rounded-xl">Hủy</Button>
                                    <Button onClick={handleAddResource} disabled={createResourceMutation.isPending || isUploading} className="rounded-xl px-8">
                                        {createResourceMutation.isPending ? "Đang lưu..." : "Lưu tài liệu"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {isLoadingFolders || isLoadingResources ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                    ))
                ) : !activeFolderId ? (
                    /* Folder List View */
                    folders && folders.length > 0 ? (
                        <div className="rounded-2xl border bg-background">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tên thư mục</TableHead>
                                        <TableHead>Số tài liệu</TableHead>
                                        <TableHead>Loại</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {folders.map((f) => (
                                        <TableRow key={f.folderId}>
                                            <TableCell>
                                                <div className="flex items-center gap-2 max-w-[250px]">
                                                    <Folder className="size-4 text-primary shrink-0" />
                                                    <span className="font-medium truncate">{f.folderName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{f.resourceCount || 0}</TableCell>
                                            <TableCell>Tài liệu chia sẻ</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setActiveFolderId(f.folderId)}
                                                    >
                                                        Mở
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setFolderToDelete(f.folderId)}
                                                        className="text-destructive hover:text-destructive gap-1"
                                                    >
                                                        <Trash2 className="size-4" />
                                                        Xóa
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed">
                            <Folder className="size-16 text-muted-foreground/10 mx-auto mb-4" />
                            <h4 className="font-bold">Chưa có thư mục nào</h4>
                            <p className="text-sm text-muted-foreground mb-6">Hãy bắt đầu bằng cách tạo thư mục để tổ chức tài liệu.</p>
                            <Button onClick={() => setIsAddingFolder(true)} className="rounded-xl">
                                Khởi tạo thư mục
                            </Button>
                        </div>
                    )
                ) : (
                    /* Resource List View in Folder */
                    resources && resources.length > 0 ? (
                        <div className="rounded-2xl border bg-background">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tên tài liệu</TableHead>
                                        <TableHead>Mô tả</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead className="text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {resources.map((res) => (
                                        <TableRow key={res.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2 max-w-[300px]">
                                                    <FileText className="size-4 text-primary shrink-0" />
                                                    <span className="font-medium truncate">{res.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[360px] truncate text-muted-foreground">
                                                {res.description || "Không có mô tả."}
                                            </TableCell>
                                            <TableCell>
                                                {res.visibility === AcademyResourceVisibility.PUBLIC ? "Công khai" : "Đang ẩn"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" asChild>
                                                        <a href={res.downloadUrl} download target="_blank" rel="noopener noreferrer">
                                                            <Download className="size-4" />
                                                            Tải xuống
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleVisibility(res)}
                                                        className="gap-1"
                                                    >
                                                        {res.visibility === AcademyResourceVisibility.PUBLIC ? (
                                                            <>
                                                                <EyeOff className="size-4" />
                                                                Ẩn
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="size-4" />
                                                                Hiện
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setResourceToDelete(res.id)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="size-4" />
                                                        Xóa
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed">
                            <FileText className="size-16 text-muted-foreground/10 mx-auto mb-4" />
                            <h4 className="font-bold">Thư mục này trống</h4>
                            <p className="text-sm text-muted-foreground">Bắt đầu bằng cách tải lên các tài liệu học tập hữu ích.</p>
                        </div>
                    )
                )}
            </div>

            <AlertDialog open={!!resourceToDelete} onOpenChange={(open) => !open && setResourceToDelete(null)}>
                ...
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa tài liệu</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác và tài liệu sẽ được chuyển vào kho lưu trữ (Archive).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteResource} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                            Xóa tài liệu
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa thư mục</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa thư mục này? Hành động này sẽ xóa vĩnh viễn thư mục và <strong>tất cả tài liệu bên trong</strong>. Thao tác này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteFolder}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                        >
                            Xóa thư mục
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
