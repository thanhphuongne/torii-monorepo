import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Edit, Trash, Star } from "lucide-react";
import type { AchievementDTO } from "@workspace/schemas";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { dataTableHeaderClass } from "@/lib/ui-shell";
import { AchievementIcon } from "./achievement-icon";

interface AchievementsTableProps {
    data: AchievementDTO[];
    isLoading: boolean;
    onEdit: (achievement: AchievementDTO) => void;
    onDelete: (achievement: AchievementDTO) => void;
}

export function AchievementsTable({ data, isLoading, onEdit, onDelete }: AchievementsTableProps) {
    const columnsCount = 9;

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    return (
        <Table>
                <TableHeader className={dataTableHeaderClass}>
                    <TableRow>
                        <TableHead className="w-[80px] text-center">STT</TableHead>
                        <TableHead className="w-[80px]">Icon</TableHead>
                        <TableHead>Tên & mã</TableHead>
                        <TableHead>Mô tả</TableHead>
                        <TableHead>Phân loại</TableHead>
                        <TableHead>Điều kiện</TableHead>
                        <TableHead>Phần thưởng</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={columnsCount} className="h-24 text-center">
                                Chưa có thành tích nào.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((achievement, index) => {
                            return (
                                <TableRow key={achievement.id}>
                                    <TableCell className="w-[80px] text-center text-muted-foreground tabular-nums">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden">
                                            <AchievementIcon icon={achievement.icon} className="h-6 w-6" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{achievement.title}</span>
                                            <span className="text-xs text-muted-foreground">{achievement.code}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                        {achievement.description}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{achievement.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs italic">
                                            {(achievement.requirements as any)?.type}: {(achievement.requirements as any)?.value}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 font-bold text-amber-600">
                                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                            {(achievement.rewards as any)?.points || 0}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {achievement.isActive ? (
                                            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Hoạt động</Badge>
                                        ) : (
                                            <Badge variant="secondary">Tạm dừng</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-1.5"
                                                onClick={() => onEdit(achievement)}
                                            >
                                                <Edit className="h-4 w-4" />
                                                Sửa
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-1.5 text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5"
                                                onClick={() => onDelete(achievement)}
                                            >
                                                <Trash className="h-4 w-4" />
                                                Xóa
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
        </Table>
    );
}
