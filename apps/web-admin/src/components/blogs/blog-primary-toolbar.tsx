import { Input } from '@workspace/ui/components/input';
import { Search, Layers, Sparkles, SlidersHorizontal } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@workspace/ui/components/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { Button } from '@workspace/ui/components/button';
import {
    listPageFiltersRowClass,
    listPageSearchIconClass,
    listPageSearchInputClass,
    listPageSearchWrapClass,
    listPageToolbarRootClass,
} from '@/lib/ui-shell';

interface BlogPrimaryToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusFilterChange: (value: string) => void;
    onSortChange: (field: string, order: 'asc' | 'desc') => void;
}

export function BlogPrimaryToolbar({
    search,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    onSortChange,
}: BlogPrimaryToolbarProps) {
    return (
        <div className={listPageToolbarRootClass}>
            <div className={listPageSearchWrapClass}>
                <Search className={listPageSearchIconClass} />
                <Input
                    placeholder="Tìm kiếm theo tiêu đề..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={listPageSearchInputClass}
                />
            </div>

            <div className={listPageFiltersRowClass}>
                {/* Status Filter */}
                <Select
                    value={statusFilter || 'all'}
                    onValueChange={(value) =>
                        onStatusFilterChange(value === 'all' ? '' : value)
                    }
                >
                    <SelectTrigger className="w-full md:w-[160px]">
                        <div className="flex items-center gap-2">
                            <Layers className="size-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Trạng thái" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="draft">Bản nháp</SelectItem>
                        <SelectItem value="scheduled">Đã lên lịch</SelectItem>
                        <SelectItem value="published">Đã xuất bản</SelectItem>
                        <SelectItem value="archived">Đã lưu trữ</SelectItem>
                    </SelectContent>
                </Select>

                {/* Sort Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full gap-2 md:w-auto">
                            <SlidersHorizontal className="size-4 text-muted-foreground" />
                            <span>Sắp xếp</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => onSortChange('publishedAt', 'desc')} className="flex justify-between">
                                Mới nhất <Sparkles className="size-3 text-amber-500" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSortChange('publishedAt', 'asc')}>
                                Cũ nhất
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSortChange('title', 'asc')}>
                                Tiêu đề (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSortChange('viewCount', 'desc')}>
                                Lượt xem nhiều nhất
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
