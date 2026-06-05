import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Pencil, Trash2, Star, Ticket, Percent, Banknote } from "lucide-react"
import type { PointRewardDTO } from "@workspace/schemas"
import { formatCurrency, formatNumber } from "@/lib/format-utils"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyMedia,
    EmptyTitle,
} from "@workspace/ui/components/empty"
import { dataTableHeaderClass } from "@/lib/ui-shell"

interface RewardsTableProps {
    data: PointRewardDTO[]
    isLoading: boolean
    onEdit: (reward: PointRewardDTO) => void
    onDelete: (reward: PointRewardDTO) => void
}

export function RewardsTable({ data, isLoading, onEdit, onDelete }: RewardsTableProps) {
    const columnsCount = 7

    return (
        <Table>
            <TableHeader className={dataTableHeaderClass}>
                <TableRow>
                    <TableHead className="w-[80px]">STT</TableHead>
                    <TableHead className="w-[240px]">Tên phần thưởng</TableHead>
                    <TableHead>Số điểm cần</TableHead>
                    <TableHead>Loại giảm giá</TableHead>
                    <TableHead>Giá trị</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right px-6">Thao tác</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="px-6"><Skeleton className="h-4 w-8" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                            <TableCell className="text-right px-6"><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                        </TableRow>
                    ))
                ) : data.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={columnsCount} className="h-[400px] text-center">
                            <Empty>
                                <EmptyMedia>
                                    <Ticket className="size-8 text-muted-foreground" />
                                </EmptyMedia>
                                <EmptyContent>
                                    <EmptyTitle>Chưa có mẫu phần thưởng</EmptyTitle>
                                    <EmptyDescription>
                                        Bắt đầu bằng cách tạo mẫu phần thưởng đầu tiên của bạn.
                                    </EmptyDescription>
                                </EmptyContent>
                            </Empty>
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((reward, index) => (
                        <TableRow key={reward.id} className="group transition-colors">
                            <TableCell className="px-6 font-medium text-muted-foreground tabular-nums">
                                {index + 1}
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                                <span className="block truncate font-medium text-foreground" title={reward.name}>
                                    {reward.name}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1.5 font-bold text-amber-600">
                                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                    {formatNumber(reward.costPoints)}
                                </div>
                            </TableCell>
                            <TableCell>
                                {reward.config?.discountType === 'PERCENTAGE' ? (
                                    <Badge variant="secondary" className="gap-1 font-normal">
                                        <Percent className="h-3 w-3" /> Phần trăm
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="gap-1 font-normal">
                                        <Banknote className="h-3 w-3" /> Số tiền cố định
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="font-medium">
                                {reward.config?.discountType === 'PERCENTAGE'
                                    ? `${reward.config?.discountValue}%`
                                    : formatCurrency(reward.config?.discountValue || 0)}
                            </TableCell>
                            <TableCell>
                                {reward.isActive ? (
                                    <Badge variant="success">Hoạt động</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-muted-foreground">Tạm dừng</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right px-6">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1.5"
                                        onClick={() => onEdit(reward)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                        Sửa
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1.5 text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5"
                                        onClick={() => onDelete(reward)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Xóa
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    )
}
