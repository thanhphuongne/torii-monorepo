import { cn } from '@workspace/ui/lib/utils';

/**
 * Nền toàn màn hình cho trạng thái loading / lỗi (không dùng pattern chấm).
 */
export function FullScreenPageBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/20 dark:from-muted/15 dark:via-background dark:to-muted/10" />
      <div className="absolute left-1/2 top-0 h-[min(55vh,30rem)] w-[min(92vw,52rem)] -translate-x-1/2 -translate-y-[20%] rounded-full bg-primary/[0.08] blur-3xl dark:bg-primary/[0.12]" />
      <div className="absolute bottom-0 right-0 h-[min(50vh,26rem)] w-[min(88vw,40rem)] translate-x-[15%] translate-y-[25%] rounded-full bg-muted-foreground/[0.06] blur-3xl dark:bg-muted-foreground/[0.09]" />
    </div>
  );
}
