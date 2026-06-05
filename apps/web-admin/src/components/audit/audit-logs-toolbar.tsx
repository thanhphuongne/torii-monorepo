import { Search, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@workspace/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Field, FieldLabel } from '@workspace/ui/components/field';
import { Button } from '@workspace/ui/components/button';
import { Calendar } from '@workspace/ui/components/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { cn } from '@workspace/ui/lib/utils';
import {
    listPageFiltersRowClass,
    listPageSearchIconClass,
    listPageSearchInputClass,
    listPageSearchWrapClass,
    listPageToolbarRootClass,
} from '@/lib/ui-shell';
import { ENTITY_MAP } from './audit-log-details-sheet';

interface AuditLogsToolbarProps {
    action: string;
    onActionChange: (value: string) => void;
    entity: string;
    onEntityChange: (value: string) => void;
    startDate: string;
    onStartDateChange: (value: string) => void;
    endDate: string;
    onEndDateChange: (value: string) => void;
}

export function AuditLogsToolbar({
    action,
    onActionChange,
    entity,
    onEntityChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
}: AuditLogsToolbarProps) {
    return (
        <div className={listPageToolbarRootClass}>
            <Field className="w-full min-w-0 space-y-2 md:flex-1">
                <FieldLabel>Hành động</FieldLabel>
                <div className={listPageSearchWrapClass}>
                    <Search className={listPageSearchIconClass} />
                    <Input
                        placeholder="Tìm kiếm hành động..."
                        value={action}
                        onChange={(e) => onActionChange(e.target.value)}
                        className={listPageSearchInputClass}
                    />
                </div>
            </Field>
            <div className={listPageFiltersRowClass}>
            <Field className="w-full md:flex-1 md:min-w-[200px]">
                <FieldLabel>Đối tượng</FieldLabel>
                <Select value={entity || 'all'} onValueChange={(val) => onEntityChange(val === 'all' ? '' : val)}>
                    <SelectTrigger className="h-10 w-full md:w-[220px]">
                        <SelectValue placeholder="Chọn đối tượng" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {Object.entries(ENTITY_MAP).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field className="w-full md:flex-1 md:min-w-[200px]">
                <FieldLabel>Ngày bắt đầu</FieldLabel>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full h-10 justify-start text-left font-normal",
                                !startDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(new Date(startDate), "dd/MM/yyyy") : <span>Chọn ngày</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={startDate ? new Date(startDate) : undefined}
                            onSelect={(date) => onStartDateChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </Field>
            <Field className="w-full md:flex-1 md:min-w-[200px]">
                <FieldLabel>Ngày kết thúc</FieldLabel>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full h-10 justify-start text-left font-normal",
                                !endDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(new Date(endDate), "dd/MM/yyyy") : <span>Chọn ngày</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={endDate ? new Date(endDate) : undefined}
                            onSelect={(date) => onEndDateChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </Field>
            </div>
        </div>
    );
}
