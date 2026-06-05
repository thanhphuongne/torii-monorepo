
import {
    Search,
    Filter,
} from 'lucide-react';
import { Input } from '@workspace/ui/components/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@workspace/ui/components/select';
import {
    listPageFiltersRowClass,
    listPageSearchIconClass,
    listPageSearchInputClass,
    listPageSearchWrapClass,
    listPageToolbarRootClass,
} from '@/lib/ui-shell';

interface CouponsPrimaryToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    status: string | undefined;
    onStatusChange: (value: string) => void;
}

export function CouponsPrimaryToolbar({
    search,
    onSearchChange,
    status,
    onStatusChange,
}: CouponsPrimaryToolbarProps) {
    return (
        <div className={listPageToolbarRootClass}>
            <div className={listPageSearchWrapClass}>
                <Search className={listPageSearchIconClass} />
                <Input
                    placeholder="Tìm kiếm theo mã, tên..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={listPageSearchInputClass}
                />
            </div>
            <div className={listPageFiltersRowClass}>
                <Select value={status || 'all'} onValueChange={onStatusChange}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <div className="flex items-center gap-2">
                            <Filter className="size-3.5 text-muted-foreground" />
                            <SelectValue placeholder="Tất cả trạng thái" />
                        </div>
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                        <SelectItem value="INACTIVE">Tạm dừng</SelectItem>
                        <SelectItem value="EXPIRED">Đã hết hạn</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
