import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
    Field,
    FieldError,
    FieldLabel,
    FieldGroup,
} from "@workspace/ui/components/field"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@workspace/ui/components/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import { Check, Search } from "lucide-react"
import { Spinner } from "@workspace/ui/components/spinner"
import {
    academyEnrollmentCreateDTOSchema,
    academyEnrollmentUpdateDTOSchema,
    type AcademyEnrollmentCreateDTO,
    type AcademyEnrollmentUpdateDTO,
} from "@workspace/schemas"
import type { AcademyEnrollment } from "@/lib/api/services/academy-enrollments"
import { useAcademyLiveClasses } from "@/lib/api/services/academy-live-classes"
import { useAcademyVodPackages } from "@/lib/api/services/academy-vod-packages"
import { useUsersQuery } from "@/lib/api/services/users"
import { useDebounceValue } from "@workspace/ui/hooks/use-debounce-value"

export function EnrollmentForm({
    mode,
    initial,
    onSubmit,
    onCancel,
    submitting,
    defaultLiveClassId,
    defaultVodPackageId,
}: {
    mode: "create" | "edit"
    initial?: AcademyEnrollment
    onSubmit: (
        data: AcademyEnrollmentCreateDTO | AcademyEnrollmentUpdateDTO
    ) => Promise<void>
    onCancel: () => void
    submitting?: boolean
    defaultLiveClassId?: string
    defaultVodPackageId?: string
}) {
    const isEdit = mode === "edit"
    const [classSearch, setClassSearch] = useState("")
    const [debouncedClassSearch] = useDebounceValue(classSearch, 500)
    const [openClassPopover, setOpenClassPopover] = useState(false)
    const [openVodPopover, setOpenVodPopover] = useState(false)
    const [vodSearch, setVodSearch] = useState("")
    const [debouncedVodSearch] = useDebounceValue(vodSearch, 500)

    const { data: classesData = [], isLoading: loadingClasses } = useAcademyLiveClasses({
        q: debouncedClassSearch,
    })
    const classes = Array.isArray(classesData) ? classesData : (classesData as any)?.items || []

    const { data: vodPackagesData = [], isLoading: loadingVodPackages } = useAcademyVodPackages({
        q: debouncedVodSearch,
    })
    const vodPackages = Array.isArray(vodPackagesData) ? vodPackagesData : (vodPackagesData as any)?.items || []

    const [userSearch, setUserSearch] = useState("")
    const [debouncedUserSearch] = useDebounceValue(userSearch, 400)
    const [openUserPopover, setOpenUserPopover] = useState(false)

    const { data: learnersData, isLoading: loadingLearners } = useUsersQuery({
        role: "learner",
        search: debouncedUserSearch,
        limit: 100,
    }, {
        enabled: openUserPopover,
    })
    const learners = learnersData?.data || []

    const { handleSubmit, control } = useForm<
        AcademyEnrollmentCreateDTO | AcademyEnrollmentUpdateDTO
    >({
        resolver: zodResolver(
            (isEdit
                ? academyEnrollmentUpdateDTOSchema
                : academyEnrollmentCreateDTOSchema) as any
        ) as any,
        defaultValues: (isEdit
            ? {
                expiresAt: initial?.expiresAt ? new Date(initial.expiresAt) : undefined,
                status: initial?.status ?? 'ACTIVE',
            }
            : {
                liveClassId: defaultLiveClassId || undefined,
                vodPackageId: defaultVodPackageId || undefined,
                userId: "",
                status: "ACTIVE",
            }) as any,
    })

    const today = new Date().toISOString().split("T")[0]

    return (
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-6">
                <FieldGroup>
                    {!isEdit && (
                        <>
                            {!defaultLiveClassId && !defaultVodPackageId && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Controller
                                        name={"liveClassId" as any}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field>
                                                <FieldLabel>Lớp học trực tiếp</FieldLabel>
                                                <Popover open={openClassPopover} onOpenChange={setOpenClassPopover}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className="w-full justify-between font-normal"
                                                        >
                                                            {field.value
                                                                ? classes.find((c: any) => c.id === field.value)?.name || "Đã chọn lớp"
                                                                : "Chọn lớp..."}
                                                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0" align="start">
                                                        <Command shouldFilter={false}>
                                                            <CommandInput
                                                                placeholder="Tìm lớp học (tên hoặc mã)..."
                                                                value={classSearch}
                                                                onValueChange={setClassSearch}
                                                            />
                                                            <CommandList className="max-h-72 overflow-y-auto">
                                                                {loadingClasses && (
                                                                    <div className="p-4 text-center">
                                                                        <Spinner className="mx-auto" />
                                                                    </div>
                                                                )}
                                                                {!loadingClasses && classes.length === 0 && (
                                                                    <CommandEmpty>Không tìm thấy lớp học nào</CommandEmpty>
                                                                )}
                                                                <CommandGroup>
                                                                    {classes.map((cls: any) => (
                                                                        <CommandItem
                                                                            key={cls.id}
                                                                            value={cls.id}
                                                                            onSelect={() => {
                                                                                field.onChange(cls.id)
                                                                                setOpenClassPopover(false)
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    field.value === cls.id ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium">{cls.name}</span>
                                                                                <span className="text-xs text-muted-foreground">{cls.code}</span>
                                                                            </div>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FieldError>{fieldState.error?.message}</FieldError>
                                            </Field>
                                        )}
                                    />

                                    <Controller
                                        name={"vodPackageId" as any}
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field>
                                                <FieldLabel>Gói tự học</FieldLabel>
                                                <Popover open={openVodPopover} onOpenChange={setOpenVodPopover}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className="w-full justify-between font-normal"
                                                        >
                                                            {field.value
                                                                ? vodPackages.find((p: any) => p.id === field.value)?.title || "Đã chọn gói"
                                                                : "Chọn gói tự học..."}
                                                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0" align="start">
                                                        <Command shouldFilter={false}>
                                                            <CommandInput
                                                                placeholder="Tìm gói tự học..."
                                                                value={vodSearch}
                                                                onValueChange={setVodSearch}
                                                            />
                                                            <CommandList className="max-h-72 overflow-y-auto">
                                                                {loadingVodPackages && (
                                                                    <div className="p-4 text-center">
                                                                        <Spinner className="mx-auto" />
                                                                    </div>
                                                                )}
                                                                {!loadingVodPackages && vodPackages.length === 0 && (
                                                                    <CommandEmpty>Không tìm thấy gói nào</CommandEmpty>
                                                                )}
                                                                <CommandGroup>
                                                                    {vodPackages.map((pkg: any) => (
                                                                        <CommandItem
                                                                            key={pkg.id}
                                                                            value={pkg.id}
                                                                            onSelect={() => {
                                                                                field.onChange(pkg.id)
                                                                                setOpenVodPopover(false)
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    field.value === pkg.id ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium">{pkg.title}</span>
                                                                                <span className="text-xs text-muted-foreground">{pkg.code}</span>
                                                                            </div>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FieldError>{fieldState.error?.message}</FieldError>
                                            </Field>
                                        )}
                                    />
                                </div>
                            )}

                            <Controller
                                name={"userId" as any}
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field>
                                        <FieldLabel>Học viên</FieldLabel>
                                        <Popover open={openUserPopover} onOpenChange={setOpenUserPopover}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-full justify-between font-normal"
                                                >
                                                    {field.value
                                                        ? (() => {
                                                            const selectedUser = learners.find((u: any) => u.id === field.value)
                                                            if (!selectedUser) return "Đã chọn học viên"
                                                            return `${selectedUser.displayName} (${selectedUser.email})`
                                                        })()
                                                        : "Chọn học viên..."}
                                                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command shouldFilter={false}>
                                                    <CommandInput
                                                        placeholder="Nhập email hoặc tên học viên (tìm qua API)..."
                                                        value={userSearch}
                                                        onValueChange={setUserSearch}
                                                    />
                                                    <CommandList className="max-h-72 overflow-y-auto">
                                                        {loadingLearners && (
                                                            <div className="p-4 text-center">
                                                                <Spinner className="mx-auto" />
                                                            </div>
                                                        )}
                                                        {!loadingLearners && learners.length === 0 && (
                                                            <CommandEmpty>Không tìm thấy học viên nào</CommandEmpty>
                                                        )}
                                                        <CommandGroup>
                                                            {learners.map((u: any) => (
                                                                <CommandItem
                                                                    key={u.id}
                                                                    value={u.id}
                                                                    onSelect={() => {
                                                                        field.onChange(u.id)
                                                                        setOpenUserPopover(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            field.value === u.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{u.displayName}</span>
                                                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FieldError>{fieldState.error?.message}</FieldError>
                                    </Field>
                                )}
                            />
                        </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Controller
                            name={"status" as any}
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel>Trạng thái</FieldLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn trạng thái..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                                            <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                                            <SelectItem value="CANCELLED">Đã huỷ</SelectItem>
                                            <SelectItem value="EXPIRED">Hết hạn</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />

                        <Controller
                            name={"expiresAt" as any}
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field>
                                    <FieldLabel>Ngày hết hạn</FieldLabel>
                                    <Input
                                        type="date"
                                        min={today}
                                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            field.onChange(val ? new Date(val).toISOString() : undefined);
                                        }}
                                    />
                                    <FieldError>{fieldState.error?.message}</FieldError>
                                </Field>
                            )}
                        />
                    </div>
                </FieldGroup>
            </div>

            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={submitting}
                >
                    Hủy
                </Button>
                <Button type="submit" disabled={submitting}>
                    {submitting ? <Spinner className="mr-2" /> : null}
                    {isEdit ? "Lưu thay đổi" : "Ghi danh học viên"}
                </Button>
            </div>
        </form>
    )
}
