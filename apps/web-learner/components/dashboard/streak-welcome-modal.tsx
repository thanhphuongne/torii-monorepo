"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMarkToastShown, useStreak } from '@/lib/api/services/gamification-api';
import { Dialog, DialogContent, DialogTitle } from '@workspace/ui/components/dialog';
import { Button } from '@workspace/ui/components/button';
import { cn } from '@workspace/ui/lib/utils';
import { Shield } from 'lucide-react';

type StreakWelcomeModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function StreakWelcomeModal(props: StreakWelcomeModalProps = {}) {
  const { data: streak } = useStreak();
  const markToastShown = useMarkToastShown();

  const isControlled =
    typeof props.open === 'boolean' && typeof props.onOpenChange === 'function';

  const [isOpen, setIsOpen] = useState(false);
  const [sessionShown, setSessionShown] = useState(false);
  const [mode, setMode] = useState<'weekly' | 'detail'>('weekly');
  const prevOpenRef = useRef<boolean>(false);

  const effectiveOpen = isControlled ? (props.open as boolean) : isOpen;
  const setEffectiveOpen = isControlled
    ? (props.onOpenChange as (open: boolean) => void)
    : setIsOpen;

  // When modal opens (manual click), reset to weekly view.
  useEffect(() => {
    const prev = prevOpenRef.current;
    if (!prev && effectiveOpen) {
      setMode('weekly');
    }
    prevOpenRef.current = effectiveOpen;
  }, [effectiveOpen]);

  useEffect(() => {
    if (!streak || sessionShown) return;

    // Server decides once/day gating to ensure cross-device consistency
    const shouldShow = streak.shouldShowToast === true;
    if (!shouldShow) return;

    const timer = setTimeout(() => {
      if (isControlled) {
        props.onOpenChange?.(true);
      } else {
        setIsOpen(true);
      }
      setSessionShown(true);
      markToastShown.mutate();
    }, 600);

    return () => clearTimeout(timer);
  }, [streak, sessionShown, isControlled]);

  const currentStreak = (streak as any)?.currentStreak ?? 0;
  const freezeCount = (streak as any)?.freezeCount ?? 0;
  const isActiveToday = (streak as any)?.isActiveToday === true;
  const streakSavedByFreeze = (streak as any)?.streakSavedByFreeze === true;
  const recentActiveDates = (streak as any)?.recentActiveDates ?? [];
  const recentFreezeDates = (streak as any)?.recentFreezeDates ?? [];

  const weekly = useMemo(() => {
    const now = new Date();
    const vnToday = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
    );

    const days: {
      dayName: string;
      status: 'done' | 'todo' | 'frozen';
      dateStr: string;
    }[] = [];

    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(vnToday);
      date.setDate(vnToday.getDate() - i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dayOfWeek = date.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const isToday = i === 0;

      const done =
        (isToday && isActiveToday) ||
        (Array.isArray(recentActiveDates) && recentActiveDates.includes(dateStr));
      
      const frozen = !done && (Array.isArray(recentFreezeDates) && recentFreezeDates.includes(dateStr));

      days.push({
        dayName: dayNames[adjustedDay] ?? '',
        status: done ? 'done' : frozen ? 'frozen' : 'todo',
        dateStr,
      });
    }
    return days;
  }, [isActiveToday, recentActiveDates]);

  const [detailMonth, setDetailMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (effectiveOpen) {
      const now = new Date();
      setDetailMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [effectiveOpen]);

  const detail = useMemo(() => {
    // Build monthly grid (Sun..Sat)
    const year = detailMonth.getFullYear();
    const month = detailMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay(); // 0=Sun
    const daysInMonth = last.getDate();

    const toDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    const vnToday = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
    );
    const todayStr = toDateStr(vnToday);

    const cells: {
      label: number | null;
      state: 'done' | 'todo' | 'today' | 'frozen';
    }[] = [];

    // padding before 1st
    for (let i = 0; i < startDay; i++) {
      cells.push({ label: null, state: 'todo' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const ds = toDateStr(dt);
      const done = Array.isArray(recentActiveDates) && recentActiveDates.includes(ds);
      const frozen = Array.isArray(recentFreezeDates) && recentFreezeDates.includes(ds);
      const isToday = ds === todayStr;
      cells.push({
        label: d,
        state: isToday ? 'today' : done ? 'done' : frozen ? 'frozen' : 'todo',
      });
    }
    // pad to full weeks
    while (cells.length % 7 !== 0) {
      cells.push({ label: null, state: 'todo' });
    }

    return { year, month, cells };
  }, [detailMonth, recentActiveDates]);

  const monthLabel = useMemo(() => {
    const m = detailMonth.getMonth() + 1;
    const y = detailMonth.getFullYear();
    return `Tháng ${m}/${y}`;
  }, [detailMonth]);

  if (!streak) return null;

  return (
    <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
      <DialogContent className="max-w-2xl p-0">
        <DialogTitle className="sr-only">Streak</DialogTitle>

        {mode === 'weekly' ? (
          <div>
            <div className="px-4 pt-6 pb-4 sm:px-6">
              <div className="space-y-1 text-center">
                <div className="text-xl font-medium text-foreground">
                  {currentStreak || 0}{' '}
                  <span className="text-primary">ngày streak</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {streakSavedByFreeze 
                    ? 'Hôm nay bạn đã được bảo vệ bởi Lá chắn! 🔥' 
                    : isActiveToday
                      ? 'Bạn đã học hôm nay.'
                      : 'Hoàn thành 1 hoạt động học để giữ streak.'}
                </div>
              </div>
            </div>

            <div className="px-4 pb-6 sm:px-6">
              <div className="mx-auto w-full rounded-md border p-4">
                <div className="mx-auto grid w-fit grid-cols-7 gap-2 sm:gap-3">
                  {weekly.map((d, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {d.dayName}
                      </div>
                      <div
                        className={cn(
                          'relative h-10 w-10 rounded-full border sm:h-11 sm:w-11',
                          d.status === 'done'
                            ? 'border-primary/30 bg-primary text-primary-foreground'
                            : 'border-border bg-muted/30',
                        )}
                      >
                        {d.status === 'done' && (
                          <div className="absolute inset-0 flex items-center justify-center text-primary-foreground text-base">
                            ✓
                          </div>
                        )}
                        {d.status === 'frozen' && (
                          <div className="absolute inset-0 flex items-center justify-center text-blue-500 text-base font-bold">
                            <Shield className="h-5 w-5 fill-blue-500 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 text-center text-sm text-muted-foreground">
                  {currentStreak > 0
                    ? 'Tiếp tục duy trì streak nhé.'
                    : 'Bắt đầu streak bằng một hoạt động học.'}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Freeze: <span className="font-medium text-foreground">{freezeCount || 0}</span>
                </div>

                <Button
                  variant="outline"
                  className="h-9 font-normal"
                  onClick={() => setMode('detail')}
                >
                  Xem chi tiết
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-2xl">
              <div className="text-center">
                <div className="text-xl font-medium text-foreground">
                  {currentStreak || 0}{' '}
                  <span className="text-primary">ngày streak</span>
                </div>
              </div>

              <div className="mt-5 text-base font-medium text-foreground">Lịch sử học</div>

              <div className="mt-4 w-full rounded-md border p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-9 rounded-md p-0 text-xl text-muted-foreground"
                    onClick={() =>
                      setDetailMonth((d) =>
                        new Date(d.getFullYear(), d.getMonth() - 1, 1),
                      )
                    }
                  >
                    ‹
                  </Button>
                  <div className="text-sm font-medium text-foreground">
                    {monthLabel}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 w-9 rounded-md p-0 text-xl text-muted-foreground"
                    onClick={() =>
                      setDetailMonth((d) =>
                        new Date(d.getFullYear(), d.getMonth() + 1, 1),
                      )
                    }
                  >
                    ›
                  </Button>
                </div>

              <div className="mx-auto mt-5 grid w-fit grid-cols-7 gap-3 text-center text-xs text-muted-foreground">
                <div className="w-10">SUN</div>
                <div className="w-10">MON</div>
                <div className="w-10">TUE</div>
                <div className="w-10">WED</div>
                <div className="w-10">THU</div>
                <div className="w-10">FRI</div>
                <div className="w-10">SAT</div>
              </div>

                <div className="mx-auto mt-4 grid w-fit grid-cols-7 gap-3">
                {detail.cells.map((c, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'h-10 w-10 rounded-md text-center text-sm leading-10',
                      c.label == null && 'opacity-0',
                      c.label != null && c.state === 'todo' && 'bg-muted/40 text-muted-foreground',
                      c.label != null && c.state === 'done' && 'bg-primary/15 text-primary',
                      c.label != null && c.state === 'today' && 'bg-primary text-primary-foreground',
                      c.label != null && c.state === 'frozen' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 border border-blue-200 dark:border-blue-800',
                    )}
                  >
                    {c.label ?? ''}
                  </div>
                ))}
              </div>
            </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-5 w-5 rounded-md bg-primary/15" />
                  <span>Đã học</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-5 w-5 rounded-md bg-muted/40" />
                  <span>Chưa học</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-5 w-5 rounded-md bg-blue-500/20 border border-blue-200 flex items-center justify-center">
                    <Shield className="h-3 w-3 fill-blue-500 text-white" />
                  </span>
                  <span>Đóng băng</span>
                </div>

                <div className="ml-auto">
                  <Button
                    variant="outline"
                    className="h-9 font-normal"
                    onClick={() => setMode('weekly')}
                  >
                    Quay lại
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

