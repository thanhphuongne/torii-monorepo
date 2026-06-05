import { useEffect, useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@workspace/ui/components/sheet"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Pencil, Plus, Trash2 } from "lucide-react"
import {
    useCreateRole,
    useDeleteRole,
    useUpdateRole,
    type RoleDefinition,
} from "@/lib/api/services/permissions"
import { ROLE_NAME_LABELS_VI } from "@/routes/permissions/permission-labels"

const PROTECTED_ROLE_CODES = new Set([
    "admin",
    "staff-academic",
    "staff-operations",
    "lecturer",
    "learner",
])

const createRoleFormSchema = z.object({
    code: z
        .string()
        .min(2, "Tối thiểu 2 ký tự")
        .max(64)
        .regex(
            /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
            "Chỉ chữ thường, số và gạch ngang (vd: team-lead)",
        ),
    name: z.string().min(1, "Bắt buộc").max(120),
    description: z.string().max(500).optional().or(z.literal("")),
})

const editRoleFormSchema = z.object({
    name: z.string().min(1, "Bắt buộc").max(120),
    description: z.string().max(500).optional().or(z.literal("")),
})

type CreateRoleForm = z.infer<typeof createRoleFormSchema>
type EditRoleForm = z.infer<typeof editRoleFormSchema>

interface RoleAdminSectionProps {
    roles: RoleDefinition[] | undefined
}

export function RoleAdminSection({ roles }: RoleAdminSectionProps) {
    const createMutation = useCreateRole()
    const updateMutation = useUpdateRole()
    const deleteMutation = useDeleteRole()

    const [createOpen, setCreateOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<RoleDefinition | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<RoleDefinition | null>(null)

    const createForm = useForm<CreateRoleForm>({
        resolver: zodResolver(createRoleFormSchema),
        defaultValues: { code: "", name: "", description: "" },
    })

    const editForm = useForm<EditRoleForm>({
        resolver: zodResolver(editRoleFormSchema),
        defaultValues: { name: "", description: "" },
    })

    useEffect(() => {
        if (editTarget) {
            editForm.reset({
                name: editTarget.name,
                description: editTarget.description ?? "",
            })
        }
    }, [editTarget, editForm])

    useEffect(() => {
        if (!createOpen) {
            createForm.reset({ code: "", name: "", description: "" })
        }
    }, [createOpen, createForm])

    const onCreateSubmit = createForm.handleSubmit(async (values) => {
        await createMutation.mutateAsync({
            code: values.code.trim(),
            name: values.name.trim(),
            description: values.description?.trim() || null,
        })
        setCreateOpen(false)
    })

    const onEditSubmit = editForm.handleSubmit(async (values) => {
        if (!editTarget) return
        await updateMutation.mutateAsync({
            roleCode: editTarget.code,
            data: {
                name: values.name.trim(),
                description: values.description?.trim() || null,
            },
        })
        setEditTarget(null)
    })

    const confirmDelete = async () => {
        if (!deleteTarget) return
        await deleteMutation.mutateAsync(deleteTarget.code)
        setDeleteTarget(null)
    }

    const list = roles ?? []

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                        <CardTitle>Vai trò</CardTitle>
                        <CardDescription>
                            Tạo vai trò tùy chỉnh, chỉnh tên/mô tả, hoặc xóa khi chưa gán cho người dùng. Chỉ
                            quản trị viên (quyền <span className="font-mono text-xs">ops.user.manage</span>) truy
                            cập được trang này.
                        </CardDescription>
                    </div>
                    <Button type="button" className="shrink-0 gap-2" onClick={() => setCreateOpen(true)}>
                        <Plus className="size-4" />
                        Tạo vai trò mới
                    </Button>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 pt-0">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">Mã</TableHead>
                                    <TableHead>Tên hiển thị</TableHead>
                                    <TableHead className="hidden md:table-cell">Mô tả</TableHead>
                                    <TableHead className="w-[200px] text-right pr-4">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {list.map((role) => {
                                    const protectedRole = PROTECTED_ROLE_CODES.has(role.code)
                                    return (
                                        <TableRow key={role.code}>
                                            <TableCell className="font-mono text-xs">{role.code}</TableCell>
                                            <TableCell className="font-medium">
                                                {ROLE_NAME_LABELS_VI[role.code] || role.name}
                                            </TableCell>
                                            <TableCell className="hidden max-w-md truncate text-muted-foreground text-sm md:table-cell">
                                                {role.description || "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2.5"
                                                        onClick={() => setEditTarget(role)}
                                                        title="Chỉnh sửa tên và mô tả"
                                                    >
                                                        <Pencil className="size-4" />
                                                        <span className="ml-2 text-xs font-medium">Sửa</span>
                                                    </Button>
                                                    {!protectedRole && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 px-2.5 text-destructive hover:text-destructive"
                                                            onClick={() => setDeleteTarget(role)}
                                                            title="Xóa vai trò"
                                                        >
                                                            <Trash2 className="size-4" />
                                                            <span className="ml-2 text-xs font-medium">Xóa</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <SheetContent className="w-full sm:max-w-[800px] flex flex-col p-0 gap-0">
                    <SheetHeader className="px-6 pt-6 pb-2 space-y-1">
                        <SheetTitle>Tạo vai trò mới</SheetTitle>
                        <SheetDescription>
                            Mã vai trò không đổi được sau khi tạo. Gán quyền ở ma trận bên dưới sau khi lưu.
                        </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="flex-1 min-h-0">
                        <form id="create-role-form" onSubmit={onCreateSubmit} className="space-y-6 p-6">
                            <FieldSet>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="role-code">Mã vai trò</FieldLabel>
                                        <Input
                                            id="role-code"
                                            placeholder="vd: content-moderator"
                                            autoComplete="off"
                                            {...createForm.register("code")}
                                        />
                                        {createForm.formState.errors.code?.message && (
                                            <FieldDescription className="text-destructive">
                                                {createForm.formState.errors.code.message}
                                            </FieldDescription>
                                        )}
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="role-name">Tên hiển thị</FieldLabel>
                                        <Input id="role-name" {...createForm.register("name")} />
                                        {createForm.formState.errors.name?.message && (
                                            <FieldDescription className="text-destructive">
                                                {createForm.formState.errors.name.message}
                                            </FieldDescription>
                                        )}
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="role-desc">Mô tả (tuỳ chọn)</FieldLabel>
                                        <Textarea id="role-desc" rows={3} {...createForm.register("description")} />
                                    </Field>
                                </FieldGroup>
                            </FieldSet>
                        </form>
                    </ScrollArea>
                    <SheetFooter className="border-t px-6 py-4 gap-2 flex-row justify-end">
                        <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" form="create-role-form" disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Đang tạo…" : "Tạo vai trò"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <Sheet open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
                <SheetContent className="w-full sm:max-w-[800px] flex flex-col p-0 gap-0">
                    <SheetHeader className="px-6 pt-6 pb-2 space-y-1">
                        <SheetTitle>Chỉnh sửa vai trò</SheetTitle>
                        <SheetDescription className="font-mono text-xs">
                            {editTarget?.code}
                        </SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="flex-1 min-h-0">
                        <form id="edit-role-form" onSubmit={onEditSubmit} className="space-y-6 p-6">
                            <FieldSet>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="edit-role-name">Tên hiển thị</FieldLabel>
                                        <Input id="edit-role-name" {...editForm.register("name")} />
                                        {editForm.formState.errors.name?.message && (
                                            <FieldDescription className="text-destructive">
                                                {editForm.formState.errors.name.message}
                                            </FieldDescription>
                                        )}
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="edit-role-desc">Mô tả</FieldLabel>
                                        <Textarea id="edit-role-desc" rows={3} {...editForm.register("description")} />
                                    </Field>
                                </FieldGroup>
                            </FieldSet>
                        </form>
                    </ScrollArea>
                    <SheetFooter className="border-t px-6 py-4 gap-2 flex-row justify-end">
                        <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                            Hủy
                        </Button>
                        <Button type="submit" form="edit-role-form" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Đang lưu…" : "Lưu"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa vai trò?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vai trò <strong className="font-mono">{deleteTarget?.code}</strong> sẽ bị xóa vĩnh viễn.
                            Chỉ thực hiện được khi không còn người dùng nào đang dùng vai trò này.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => void confirmDelete()}
                        >
                            {deleteMutation.isPending ? "Đang xóa…" : "Xóa"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
