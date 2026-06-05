"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  User,
  Calendar,
  XCircle,
  MessageSquare,
  Tag,
  Info,
  Building,
  Coins,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { TicketResponseDTO, TicketStatus, TicketType } from "@workspace/schemas";
import { formatDateTime } from "@/utils/format-utils";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useCancelTicket } from "@/lib/api/services/ticket-api";
import { toast } from "sonner";
import { Spinner } from "@workspace/ui/components/spinner";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

interface TicketDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketResponseDTO | null;
  isLoading: boolean;
}

const statusConfig: Record<
  TicketStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  [TicketStatus.PENDING]: {
    label: "Đang chờ",
    icon: AlertCircle,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  [TicketStatus.PROCESSING]: {
    label: "Đang xử lý",
    icon: Clock,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  [TicketStatus.RESOLVED]: {
    label: "Đã giải quyết",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-700 border-green-500/20",
  },
  [TicketStatus.CANCELLED]: {
    label: "Đã hủy",
    icon: XCircle,
    className: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  },
};

const typeLabelMap: Record<TicketType, string> = {
  [TicketType.REFUND]: "Hoàn tiền",
  [TicketType.SUPPORT]: "Hỗ trợ",
  [TicketType.ERROR_REPORT]: "Báo lỗi",
};

export function TicketDetailDialog({
  open,
  onOpenChange,
  ticket,
  isLoading,
}: TicketDetailDialogProps) {
  const [isConfirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const cancelTicket = useCancelTicket();

  const handleConfirmCancel = async () => {
    if (!ticket) return;
    try {
      await cancelTicket.mutateAsync(ticket.id);
      toast.success("Yêu cầu đã được hủy.");
      setConfirmCancelOpen(false);
      onOpenChange(false);
    } catch {
      toast.error("Hủy yêu cầu thất bại.");
    }
  };

  const renderMetadata = () => {
    if (!ticket?.metadata || Object.keys(ticket.metadata).length === 0)
      return null;

    const renderValue = (value: unknown) => {
      if (value === null) return "—";
      if (value === undefined) return "—";
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean")
        return String(value);
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    };

    const entries = Object.entries(ticket.metadata as Record<string, unknown>);

    return (
      <div className="space-y-3">
        <h4 className="text-xs uppercase text-muted-foreground font-semibold">
          Thông tin bổ sung
        </h4>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[180px]">Trường</TableHead>
                <TableHead>Giá trị</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="align-top py-3">
                    <div className="text-sm font-medium">{key}</div>
                  </TableCell>
                  <TableCell className="align-top py-3">
                    <pre className="text-xs whitespace-pre-wrap break-words font-mono text-muted-foreground">
                      {renderValue(value)}
                    </pre>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] h-full max-h-[90vh] p-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <Spinner className="w-8 h-8 text-primary" />
              <p className="text-sm text-muted-foreground mt-2">
                Đang tải thông tin...
              </p>
            </div>
          ) : ticket ? (
            <>
              <DialogHeader className="p-6 border-b shrink-0">
                <DialogTitle>
                  Chi tiết yêu cầu #{ticket.id.slice(0, 8).toUpperCase()}
                </DialogTitle>
                <DialogDescription>
                  Xem lại thông tin chi tiết yêu cầu hỗ trợ của bạn.
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-6 space-y-8">
                  {/* Status & ID Section */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Yêu cầu hỗ trợ</p>
                      <h3 className="text-xl font-bold text-foreground">#{ticket.id.slice(0, 8).toUpperCase()}</h3>
                    </div>
                    {(() => {
                      const status = ticket.status as TicketStatus;
                      const cfg = statusConfig[status] || statusConfig[TicketStatus.PENDING];
                      const Icon = cfg.icon;
                      return (
                        <Badge
                          variant="outline"
                          className={cn("gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider", cfg.className)}
                        >
                          <Icon className="size-3" />
                          {cfg.label}
                        </Badge>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* User Info */}
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <User className="size-3.5" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Người gửi</span>
                       </div>
                       <p className="text-sm font-semibold">
                         {ticket.user?.displayName || "—"}
                         <span className="block text-xs font-medium text-muted-foreground mt-0.5">{ticket.user?.email || "—"}</span>
                       </p>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <Tag className="size-3.5" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Phân loại</span>
                       </div>
                       <Badge variant="secondary" className="px-2 py-0 h-6 text-[10px] font-bold uppercase">
                          {typeLabelMap[ticket.type as TicketType] || ticket.type}
                       </Badge>
                    </div>

                    {/* Created Date */}
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <Calendar className="size-3.5" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Ngày tạo</span>
                       </div>
                       <p className="text-sm font-medium">{formatDateTime(ticket.createdAt)}</p>
                    </div>

                    {/* Updated Date */}
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-muted-foreground">
                         <Clock className="size-3.5" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Cập nhật lần cuối</span>
                       </div>
                       <p className="text-sm font-medium">{formatDateTime(ticket.updatedAt)}</p>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Info className="size-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Tiêu đề</span>
                    </div>
                    <p className="text-base font-bold text-foreground leading-tight">{ticket.subject}</p>
                  </div>

                  {/* Description */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="size-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Nội dung chi tiết</span>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {ticket.description}
                    </div>
                  </div>

                  {/* Refund Amount if any */}
                  {ticket.refundAmount != null && ticket.refundAmount > 0 && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Coins className="size-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Số tiền hoàn trả</p>
                          <p className="text-lg font-black text-primary">{ticket.refundAmount} Xu</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Support Response */}
                  {ticket.response && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-2 text-primary">
                        <Building className="size-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Phản hồi từ Torii Nihongo</span>
                      </div>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm leading-relaxed text-foreground whitespace-pre-wrap relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-1 opacity-10">
                          <CheckCircle2 className="size-12" />
                        </div>
                        {ticket.response}
                      </div>
                    </div>
                  )}

                  {renderMetadata()}
                </div>
              </ScrollArea>

              <DialogFooter className="m-0 p-6 border-t flex flex-row justify-between items-center w-full shrink-0 bg-muted/20">
                <div className="flex-1">
                  {ticket.status === TicketStatus.PENDING && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="font-bold uppercase tracking-widest text-[10px] h-8"
                      onClick={() => setConfirmCancelOpen(true)}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-2" />
                      Hủy yêu cầu
                    </Button>
                  )}
                </div>
                <Button variant="outline" size="sm" className="font-bold uppercase tracking-widest text-[10px] h-8" onClick={() => onOpenChange(false)}>
                  Đóng
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <DialogTitle>Không tìm thấy thông tin</DialogTitle>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => onOpenChange(false)}
              >
                Quay lại
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn hủy?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Yêu cầu hỗ trợ của bạn sẽ
              được đánh dấu là đã hủy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelTicket.isPending}>
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelTicket.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelTicket.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận hủy"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
