import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@workspace/ui/components/select';
import { Search, Filter, Sparkles, SlidersHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import {
    listPageFiltersRowClass,
    listPageSearchIconClass,
    listPageSearchInputClass,
    listPageSearchWrapClass,
    listPageToolbarRootClass,
} from '@/lib/ui-shell';

interface UsersPrimaryToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    filters: { role?: string };
    onFilterChange: (filters: { role?: string }) => void;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSortChange: (field: string, order: 'asc' | 'desc') => void;
    hideRoleFilter?: boolean;
}

export function UsersPrimaryToolbar({
    search,
    onSearchChange,
    filters,
    onFilterChange,
    onSortChange,
    hideRoleFilter,
}: UsersPrimaryToolbarProps) {
    return (
        <div className={listPageToolbarRootClass}>
            <div className={listPageSearchWrapClass}>
                <Search className={listPageSearchIconClass} />
                <Input
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={listPageSearchInputClass}
                />
            </div>

            <div className={listPageFiltersRowClass}>
                {!hideRoleFilter && (
                    <Select
                        value={filters.role || 'all'}
                        onValueChange={(value) => onFilterChange({ ...filters, role: value === 'all' ? undefined : value })}
                    >
                        <SelectTrigger className="w-full md:w-[180px]">
                            <div className="flex items-center gap-2">
                                <Filter className="size-3.5 text-muted-foreground" />
                                <SelectValue placeholder="Vai trò" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả vai trò</SelectItem>
                            <SelectItem value="admin">Quản trị viên</SelectItem>
                            <SelectItem value="staff-academic">NV Học vụ</SelectItem>
                            <SelectItem value="staff-operations">NV Vận hành</SelectItem>
                            <SelectItem value="learner">Học viên</SelectItem>
                            <SelectItem value="lecturer">Giảng viên</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                {/* Sort Controls */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full gap-2 md:w-auto">
                            <SlidersHorizontal className="size-4 text-muted-foreground" />
                            <span>Sắp xếp</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => onSortChange('createdAt', 'desc')} className="flex justify-between">
                                Mới nhất <Sparkles className="size-3 text-amber-500" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSortChange('createdAt', 'asc')}>
                                Cũ nhất
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSortChange('displayName', 'asc')}>
                                Tên (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSortChange('email', 'asc')}>
                                Email (A-Z)
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
