'use client';

import Link from 'next/link';
import { useMemo, useState, type ComponentProps } from 'react';
import { Plus, Search, Globe, User, ChevronRight, Library, Users } from 'lucide-react';
import { useAppSelector } from '@/hooks/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import {
    useAcademyStudySets,
    useCreateAcademyStudySet,
    usePublicCatalogStudySets,
} from '@/lib/api/services/academy-study-set-api';
import type { AcademyStudySetModel } from '@workspace/schemas';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@workspace/ui/components/dialog';
import { Card, CardContent } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { toast } from 'sonner';
import { cn } from '@workspace/ui/lib/utils';

function cardCount(set: AcademyStudySetModel) {
    return (set as { _count?: { setCards?: number } })._count?.setCards ?? 0;
}

function StudySetCardLink({
    set,
    variant,
}: {
    set: AcademyStudySetModel;
    variant: 'mine' | 'system' | 'community';
}) {
    const count = cardCount(set);
    const href =
        variant === 'mine'
            ? `/dashboard/study-sets/${set.id}`
            : `/dashboard/study-sets/${set.id}${set.sourceType === 'SYSTEM' ? '?catalog=1' : ''}`;

    const stripe =
        variant === 'mine'
            ? 'bg-primary'
            : variant === 'system'
              ? 'bg-primary'
              : 'bg-emerald-500';

    return (
        <Link href={href} className="group block">
            <Card
                className={cn(
                    // Override Card default padding/gap so borders run "full-bleed" like JLPT items.
                    'h-full overflow-hidden rounded-xl border bg-card shadow-none transition-colors hover:bg-muted/40 py-0 gap-0 ring-0',
                    variant === 'system'
                        ? 'border-primary/25'
                        : variant === 'community'
                          ? 'border-emerald-500/20'
                          : 'border-border',
                )}
            >
                <CardContent className="flex gap-0 p-0">
                    <div className={cn('w-1 shrink-0 self-stretch -my-px', stripe)} aria-hidden />
                    <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-3.5">
                        <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                                {set.title}
                            </p>
                            {set.sourceType === 'SYSTEM' && (
                                <Badge
                                    variant="secondary"
                                    className="h-5 shrink-0 rounded-md px-1.5 text-[9px] font-bold uppercase tracking-wide"
                                >
                                    Torii
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                                {count} thẻ
                            </span>
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted/80">
                                    <User className="size-3 text-muted-foreground" />
                                </div>
                                <span className="truncate text-[10px] font-semibold text-muted-foreground">
                                    {variant === 'mine'
                                        ? 'Của bạn'
                                        : set.sourceType === 'SYSTEM'
                                          ? 'Hệ thống'
                                          : (set as { user?: { displayName?: string } }).user?.displayName ||
                                            'Cộng đồng'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-end border-t border-border/60 pt-2">
                            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export function StudySetsList() {
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const { data: mySets, isLoading: mySetsLoading } = useAcademyStudySets({ enabled: isAuthenticated });

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);
    const { data: publicSets, isLoading: publicLoading } = usePublicCatalogStudySets(debouncedSearch);

    const { systemSets, communitySets } = useMemo(() => {
        const list = publicSets || [];
        return {
            systemSets: list.filter((s) => s.sourceType === 'SYSTEM'),
            communitySets: list.filter((s) => s.sourceType !== 'SYSTEM'),
        };
    }, [publicSets]);

    const createSet = useCreateAcademyStudySet();

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');

    const handleCreateNotebook = async () => {
        if (!title.trim()) return;
        try {
            await createSet.mutateAsync({ title });
            toast.success('Đã tạo bộ thẻ mới');
            setOpen(false);
            setTitle('');
        } catch (error: unknown) {
            const msg = error && typeof error === 'object' && 'message' in error ? String((error as Error).message) : '';
            toast.error(msg || 'Không tạo được bộ thẻ');
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* My Sets Section */}
            <section className="space-y-4">
                <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                            <BookOpen className="size-5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                            <h2 className="text-lg font-bold tracking-tight sm:text-xl">Sổ tay của tôi</h2>
                            <p className="text-xs font-medium text-muted-foreground">
                                Bộ thẻ cá nhân — tạo và ôn tập theo cách của bạn.
                            </p>
                        </div>
                    </div>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="sm"
                                className="h-10 w-full shrink-0 rounded-xl px-6 font-bold sm:h-9 sm:w-auto"
                            >
                                <Plus className="mr-2 size-4" />
                                Tạo bộ thẻ
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle className="text-base font-bold">Tạo sổ tay mới</DialogTitle>
                                <DialogDescription className="text-xs">
                                    Nhập tên bộ thẻ để bắt đầu lưu từ vựng / ngữ pháp.
                                </DialogDescription>
                            </DialogHeader>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="VD: Từ vựng N3 bài 1..."
                                className="h-11 rounded-xl"
                            />
                            <DialogFooter className="gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setOpen(false)} className="h-10 rounded-xl font-bold">
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleCreateNotebook}
                                    disabled={createSet.isPending || !title.trim()}
                                    className="h-10 rounded-xl px-8 font-bold"
                                >
                                    {createSet.isPending ? 'Đang tạo...' : 'Tạo ngay'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3 xl:grid-cols-4">
                    {mySetsLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-muted/20" />
                        ))
                    ) : (mySets || []).length > 0 ? (
                        (mySets || []).map((set) => <StudySetCardLink key={set.id} set={set} variant="mine" />)
                    ) : (
                        <div className="col-span-full rounded-xl border-2 border-dashed border-border bg-muted/5 py-12 text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
                                Bạn chưa có bộ thẻ nào
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Public: search + 2 nhóm */}
            <section className="space-y-8">
                <div className="space-y-3 border-b pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                <Globe className="size-5" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-lg font-bold tracking-tight sm:text-xl">Khám phá</h2>
                                <p className="text-xs font-medium text-muted-foreground">
                                    Thẻ từ hệ thống Torii và thẻ công khai từ cộng đồng.
                                </p>
                            </div>
                        </div>
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                            <Input
                                placeholder="Tìm kiếm..."
                                className="h-10 rounded-xl pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {publicLoading ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-muted/20" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Hệ thống */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Library className="size-4 text-primary" />
                                <h3 className="text-sm font-bold tracking-tight text-foreground">Thẻ từ hệ thống</h3>
                                <Badge variant="secondary" className="text-[10px] font-bold">
                                    {systemSets.length}
                                </Badge>
                            </div>
                            {systemSets.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-xs text-muted-foreground">
                                    Chưa có bộ thẻ hệ thống phù hợp từ khóa tìm kiếm.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3 xl:grid-cols-4">
                                    {systemSets.map((set) => (
                                        <StudySetCardLink key={set.id} set={set} variant="system" />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Cộng đồng */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
                                <h3 className="text-sm font-bold tracking-tight text-foreground">Thẻ từ cộng đồng</h3>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                    {communitySets.length}
                                </Badge>
                            </div>
                            {communitySets.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-xs text-muted-foreground">
                                    Chưa có bộ thẻ cộng đồng phù hợp từ khóa tìm kiếm.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-3 xl:grid-cols-4">
                                    {communitySets.map((set) => (
                                        <StudySetCardLink key={set.id} set={set} variant="community" />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function BookOpen({ className, ...props }: ComponentProps<'svg'>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    );
}
