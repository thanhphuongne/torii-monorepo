import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@workspace/ui/components/pagination";
import { cn } from "@workspace/ui/lib/utils";
import { formatNumber } from "@/lib/format-utils";

interface SmartPaginationProps {
    page: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    itemName?: string;
    className?: string;
}

export function SmartPagination({
    page,
    totalPages,
    totalItems,
    onPageChange,
    itemName = "mục",
    className
}: SmartPaginationProps) {
    if (totalItems === 0 && totalPages === 0) return null;

    const renderPaginationItems = () => {
        const items = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            items.push(
                <PaginationItem key={1}>
                    <PaginationLink
                        onClick={(e) => {
                            e.preventDefault();
                            onPageChange(1);
                        }}
                    >
                        1
                    </PaginationLink>
                </PaginationItem>
            );
            if (startPage > 2) items.push(<PaginationEllipsis key="start-ellipsis" />);
        }

        for (let i = startPage; i <= endPage; i++) {
            items.push(
                <PaginationItem key={i}>
                    <PaginationLink
                        isActive={page === i}
                        onClick={(e) => {
                            e.preventDefault();
                            if (page !== i) onPageChange(i);
                        }}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>
            );
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) items.push(<PaginationEllipsis key="end-ellipsis" />);
            items.push(
                <PaginationItem key={totalPages}>
                    <PaginationLink
                        onClick={(e) => {
                            e.preventDefault();
                            onPageChange(totalPages);
                        }}
                    >
                        {totalPages}
                    </PaginationLink>
                </PaginationItem>
            );
        }

        return items;
    };

    return (
        <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4", className)}>
            <p className="text-sm text-muted-foreground">
                Trang <span className="font-semibold text-foreground">{page}</span> trên <span className="font-semibold text-foreground">{totalPages}</span>.
                Tổng cộng <span className="font-semibold text-foreground">{formatNumber(totalItems)}</span> {itemName}.
            </p>

            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={(e) => {
                                    e.preventDefault();
                                    onPageChange(Math.max(1, page - 1));
                                }}
                                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {renderPaginationItems()}

                        <PaginationItem>
                            <PaginationNext
                                onClick={(e) => {
                                    e.preventDefault();
                                    onPageChange(Math.min(totalPages, page + 1));
                                }}
                                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
