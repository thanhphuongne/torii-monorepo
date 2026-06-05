import { createColumnHelper } from '@tanstack/react-table';
import type { BlogResponseDTO } from '@workspace/schemas';
import { Button } from '@workspace/ui/components/button';
import { ArrowUpDown, Pencil, Trash, FileText } from 'lucide-react';
import { Badge } from '@workspace/ui/components/badge';
import { formatDateTime } from '@/lib/format-utils';
import { cn } from '@workspace/ui/lib/utils';

import { Can } from "@/lib/guard/can";

const columnHelper = createColumnHelper<BlogResponseDTO>();

export type BlogColumnsProps = {
    onEdit: (blog: BlogResponseDTO) => void;
    onDelete: (blog: BlogResponseDTO) => void;
    onScheduleChange: (blog: BlogResponseDTO) => void;
    page: number;
    limit: number;
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        published: 'Đã đăng',
        draft: 'Bản nháp',
        archived: 'Đã lưu trữ',
        scheduled: 'Đã lên lịch',
    };
    const normalizedStatus = status?.toLowerCase();
    return labels[normalizedStatus] || status;
};

export const getBlogColumns = ({ onEdit, onDelete, onScheduleChange, page, limit }: BlogColumnsProps) => [
    // STT Column
    columnHelper.display({
        id: 'stt',
        header: () => <div className="text-center">#</div>,
        cell: ({ row }) => {
            const stt = (page - 1) * limit + row.index + 1;
            return <div className="text-center font-medium text-muted-foreground">{stt}</div>;
        },
        size: 60,
    }),
    columnHelper.accessor('title', {
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Tiêu đề
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: (info) => {
            const blog = info.row.original;
            return (
                <div
                    className="flex items-center gap-3 max-w-[280px]"
                >
                    <div className="w-11 h-11 shrink-0 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground overflow-hidden">
                        {blog.coverImageUrl ? (
                            <img
                                src={blog.coverImageUrl}
                                alt={blog.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <FileText className="size-5" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground text-sm line-clamp-1">
                            {info.getValue()}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider truncate">
                            ID: {blog.id.slice(0, 8)}
                        </span>
                    </div>
                </div>
            );
        },
    }),
    columnHelper.accessor('author', {
        header: 'Tác giả',
        cell: (info) => {
            const author = info.getValue() as any;
            if (!author) return <div className="text-muted-foreground text-sm">N/A</div>;

            return (
                <div className="flex flex-col min-w-[180px]">
                    <span className="font-semibold text-foreground text-sm truncate">
                        {author.displayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 truncate">
                        {author.email}
                    </span>
                </div>
            );
        },
        size: 200,
    }),
    columnHelper.accessor('status', {
        header: 'Trạng thái',
        cell: (info) => {
            const blog = info.row.original;
            let status = (info.getValue() as string)?.toLowerCase();

            // Virtual status: if scheduled and time passed, show as published
            const isPastScheduled = status === 'scheduled' &&
                blog.publishedAt && new Date(blog.publishedAt) <= new Date();

            if (isPastScheduled) {
                status = 'published';
            }

            const isScheduled = status === 'scheduled';

            return (
                <Badge
                    variant={
                        isScheduled
                            ? 'outline'
                            : status === 'published'
                                ? 'default'
                                : status === 'draft'
                                    ? 'secondary'
                                    : 'outline'
                    }
                    className={cn(
                        "uppercase",
                        isScheduled && "border-blue-500 text-blue-500 bg-blue-50 hover:bg-blue-50"
                    )}
                >
                    {getStatusLabel(status)}
                </Badge>
            );
        },
        size: 120,
    }),
    columnHelper.accessor('viewCount', {
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Lượt xem
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: (info) => (
            <div className="text-center font-medium text-muted-foreground">
                {info.getValue() || 0}
            </div>
        ),
        size: 100,
    }),
    columnHelper.accessor('publishedAt', {
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Ngày đăng
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: (info) => {
            const date = info.getValue();
            return (
                <div className="text-center text-muted-foreground text-sm">
                    {date ? formatDateTime(date) : '-'}
                </div>
            );
        },
        size: 140,
    }),
    columnHelper.display({
        id: 'actions',
        cell: ({ row }) => {
            const blog = row.original;
            const statusLower = (blog.status as string)?.toLowerCase();
            const isPastScheduled = statusLower === 'scheduled' &&
                blog.publishedAt && new Date(blog.publishedAt) <= new Date();
            const isPublished = statusLower === 'published' || isPastScheduled;

            return (
                <div className="flex items-center justify-center gap-2">
                    <Can permission="ops.blog.manage">
                        {!isPublished && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => onEdit(blog)}
                            >
                                <Pencil className="h-4 w-4" />
                                Sửa
                            </Button>
                        )}
                        {statusLower === 'scheduled' && !isPublished && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-amber-600 border-amber-500/40"
                                onClick={() => onScheduleChange(blog)}
                            >
                                <ArrowUpDown className="h-4 w-4" />
                                Đổi lịch
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5"
                            onClick={() => onDelete(blog)}
                        >
                            <Trash className="h-4 w-4" />
                            Xóa
                        </Button>
                    </Can>
                </div>
            );
        },
        size: 180,
    }),
];
