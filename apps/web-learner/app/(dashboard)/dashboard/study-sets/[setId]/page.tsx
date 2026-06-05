'use client';

import Link from 'next/link';
import * as React from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useAppSelector } from '@/hooks/hooks';
import {
    useAcademyStudySet,
    usePublicCatalogStudySet,
    useUpdateAcademyStudySet,
    useDeleteAcademyStudySet,
    useCreateAcademySetCard,
    useUpdateAcademySetCard,
    useDeleteAcademySetCard,
    useShareAcademyStudySet,
} from '@/lib/api/services/academy-study-set-api';
import { agentApi } from '@/lib/api/services/agent-api';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent } from '@workspace/ui/components/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@workspace/ui/components/dialog';
import { StudyModeSelection } from '@/components/study/study-mode-selection';
import { Pencil, Trash2, Plus, ArrowLeft, Share2, Globe, Lock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { FlashcardFormDialog, type FlashcardFormValues } from '@workspace/ui/components/custom/flashcard-form-dialog';
import { FlashcardAIBulkDialog } from '@workspace/ui/components/custom/flashcard-ai-bulk-dialog';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import { Badge } from '@workspace/ui/components/badge';
import { Separator } from '@workspace/ui/components/separator';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
} from '@workspace/ui/components/pagination';

export default function StudySetDetailPage() {
    const params = useParams<{ setId: string }>();
    const searchParams = useSearchParams();
    const router = useRouter();
    const setId = params?.setId;
    const isCatalogView = searchParams.get('catalog') === '1';
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    const privateSet = useAcademyStudySet(setId, {
        enabled: !!setId && isAuthenticated && !isCatalogView,
    });
    const catalogSet = usePublicCatalogStudySet(setId, {
        enabled: !!setId && isCatalogView,
    });

    const set = isCatalogView ? catalogSet.data : privateSet.data;
    const isLoading = isCatalogView ? catalogSet.isLoading : privateSet.isLoading;

    const { user: currentUser } = useAppSelector((state) => state.auth);
    const isOwner = set?.userId === currentUser?.id;

    const canCreateCard = isAuthenticated && !isCatalogView && isOwner;
    const updateSet = useUpdateAcademyStudySet();
    const deleteSet = useDeleteAcademyStudySet();
    const createCard = useCreateAcademySetCard();
    const updateCard = useUpdateAcademySetCard();
    const deleteCard = useDeleteAcademySetCard();
    const shareSet = useShareAcademyStudySet();
    const autoFillCard = useMutation({
        mutationFn: (term: string) => agentApi.sensei.autofillFlashcard(term),
    });
    const [openAIDialog, setOpenAIDialog] = React.useState(false);
    const [isCreatingWithAI, setIsCreatingWithAI] = React.useState(false);

    const [page, setPage] = React.useState(1);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
    const [openEditDialog, setOpenEditDialog] = React.useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [editingCard, setEditingCard] = React.useState<any | null>(null);
    const [deletingCard, setDeletingCard] = React.useState<any | null>(null);

    const canManageSet = isAuthenticated && isOwner && !isCatalogView;
    const [openEditSetDialog, setOpenEditSetDialog] = React.useState(false);
    const [openDeleteSetDialog, setOpenDeleteSetDialog] = React.useState(false);
    const [editSetTitle, setEditSetTitle] = React.useState('');
    const [editSetDescription, setEditSetDescription] = React.useState('');

    // Filter and Paginate
    const [cards, setCards] = React.useState<any[]>([]);
    React.useEffect(() => {
        if (set?.setCards) setCards(set.setCards);
    }, [set?.setCards]);

    React.useEffect(() => {
        if (!set) return;
        setEditSetTitle(set.title || '');
        setEditSetDescription(set.description || '');
    }, [set?.id, set?.title, set?.description]);

    const filteredCards = cards.filter(c =>
        c.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.definition.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pageSize = 25;
    const totalPages = Math.max(1, Math.ceil(filteredCards.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paginatedCards = filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    if (isLoading) {
        return (
            <div className="container max-w-5xl space-y-3 px-3 py-4 animate-in fade-in sm:px-4 sm:py-6">
                <div className="h-14 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-28 w-full animate-pulse rounded-lg bg-muted" />
            </div>
        );
    }

    if (!set) {
        return (
            <div className="container px-3 py-16 text-center sm:px-4">
                <p className="text-sm text-muted-foreground">Không tìm thấy bộ thẻ</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    Quay lại
                </Button>
            </div>
        );
    }

    const handleCreateCard = async (values: FlashcardFormValues) => {
        if (!canCreateCard || !setId) return;
        try {
            await createCard.mutateAsync({
                setId,
                payload: {
                    term: values.term.trim(),
                    definition: values.definition.trim(),
                    hint: values.note.trim() || undefined,
                    languageDetails: {
                        phonetic: values.phonetic.trim(),
                        type: values.type,
                    }
                },
            });
            toast.success('Đã tạo thẻ mới');
            setOpenCreateDialog(false);
            setPage(1);
        } catch (e: any) {
            toast.error(e?.message || 'Lỗi tạo thẻ');
        }
    };


    const handleCreateWithAI = async (values: { terms: string }) => {
        if (!canCreateCard || !setId) return;
        const raw = values.terms || "";
        const list = raw
            .split(/\r?\n|,/) // newline or comma separated
            .map((t) => t.trim())
            .filter(Boolean);
        if (list.length === 0) {
            toast.error('Nhập ít nhất một từ hợp lệ');
            return;
        }

        setIsCreatingWithAI(true);
        let success = 0;
        let failed = 0;
        for (const term of list) {
            try {
                const generated = await autoFillCard.mutateAsync(term);
                await createCard.mutateAsync({
                    setId,
                    payload: {
                        term: (generated.term || term).trim(),
                        definition: (generated.definition || '').trim(),
                        hint: (generated.note || '').trim() || undefined,
                        languageDetails: {
                            phonetic: (generated.phonetic || '').trim(),
                            type: (generated.type as string) || 'Từ vựng',
                        },
                    },
                });
                success++;
            } catch (e: any) {
                failed++;
            }
        }

        setIsCreatingWithAI(false);
        setOpenAIDialog(false);
        setPage(1);
        if (success > 0) {
            toast.success(`Đã tạo ${success} thẻ${failed > 0 ? `, ${failed} thất bại` : ''}`);
        } else {
            toast.error('Không tạo được thẻ nào.');
        }
    };

    const handleOpenEdit = (card: any) => {
        setEditingCard(card);
        setOpenEditDialog(true);
    };

    const handleSaveEdit = async (values: FlashcardFormValues) => {
        if (!editingCard) return;
        try {
            await updateCard.mutateAsync({
                cardId: editingCard.id,
                payload: {
                    term: values.term.trim(),
                    definition: values.definition.trim(),
                    hint: values.note.trim() || undefined,
                    languageDetails: {
                        phonetic: values.phonetic.trim(),
                        type: values.type,
                    }
                },
            });
            toast.success('Đã cập nhật thẻ');
            setOpenEditDialog(false);
            setEditingCard(null);
        } catch (e: any) {
            toast.error(e?.message || 'Lỗi cập nhật');
        }
    };

    const handleDeleteCard = async () => {
        if (!deletingCard || !setId) return;
        try {
            await deleteCard.mutateAsync({ cardId: deletingCard.id, setId });
            toast.success('Đã xóa thẻ');
            setOpenDeleteDialog(false);
            setDeletingCard(null);
        } catch (e: any) {
            toast.error(e?.message || 'Lỗi xóa thẻ');
        }
    };

    const handleShareToggle = async (makePublic: boolean) => {
        if (!setId) return;
        try {
            const updated = await shareSet.mutateAsync({
                id: setId,
                payload: { isPublic: makePublic },
            });
            if (makePublic && updated.shareToken) {
                const url = `${window.location.origin}/share/study-sets/${updated.shareToken}`;
                await navigator.clipboard.writeText(url);
                toast.success('Đã bật công khai và sao chép link');
            } else {
                toast.success('Đã tắt công khai bộ thẻ');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Thất bại');
        }
    };

    const handleSaveSetMeta = async () => {
        if (!setId) return;
        const title = editSetTitle.trim();
        const description = editSetDescription.trim();
        if (!title) {
            toast.error('Tên bộ thẻ không được để trống');
            return;
        }
        try {
            await updateSet.mutateAsync({
                id: setId,
                payload: {
                    title,
                    description: description || undefined,
                },
            });
            toast.success('Đã cập nhật bộ thẻ');
            setOpenEditSetDialog(false);
        } catch (e: any) {
            toast.error(e?.message || 'Lỗi cập nhật bộ thẻ');
        }
    };

    const handleDeleteSet = async () => {
        if (!setId) return;
        try {
            await deleteSet.mutateAsync(setId);
            toast.success('Đã xóa bộ thẻ');
            router.push('/dashboard/study-sets');
        } catch (e: any) {
            toast.error(e?.message || 'Lỗi xóa bộ thẻ');
        } finally {
            setOpenDeleteSetDialog(false);
        }
    };

    return (
        <div className="container mx-auto max-w-5xl space-y-4 px-3 py-4 animate-in fade-in sm:space-y-5 sm:px-4 sm:py-6">
            <header className="space-y-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard/study-sets')}
                    className="-ml-2 h-8 px-2 text-muted-foreground"
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Bộ thẻ
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">{set.title}</h1>
                            {canManageSet && (
                                <Badge variant={set.isPublic ? 'default' : 'secondary'} className="shrink-0 text-xs">
                                    {set.isPublic ? 'Công khai' : 'Riêng tư'}
                                </Badge>
                            )}
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            {cards.length} thẻ
                        </p>
                    </div>

                    {canManageSet && (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 w-full sm:w-auto"
                                onClick={() => setOpenEditSetDialog(true)}
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Sửa bộ thẻ
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 w-full sm:w-auto border-destructive/30 text-destructive hover:bg-destructive/5"
                                onClick={() => setOpenDeleteSetDialog(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa bộ thẻ
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 w-full sm:w-auto"
                                disabled={shareSet.isPending}
                                onClick={() => handleShareToggle(!set.isPublic)}
                            >
                                {set.isPublic ? <Lock className="mr-2 h-4 w-4" /> : <Globe className="mr-2 h-4 w-4" />}
                                {set.isPublic ? 'Tắt công khai' : 'Bật công khai'}
                            </Button>
                            {set.isPublic && set.shareToken && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 w-full sm:w-auto"
                                    onClick={async () => {
                                        const url = `${window.location.origin}/share/study-sets/${set.shareToken}`;
                                        await navigator.clipboard.writeText(url);
                                        toast.success('Đã sao chép liên kết chia sẻ');
                                    }}
                                >
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Sao chép link
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <Separator />

            {/* Learning Modes */}
            <StudyModeSelection
                selectedSetId={setId || null}
                selectedCount={cards.length}
            />

            <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold tracking-tight sm:text-base">Thẻ trong bộ</h2>
                        <Badge variant="secondary" className="text-xs font-normal">
                            {filteredCards.length}
                        </Badge>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <div className="relative min-w-0 flex-1 sm:flex-initial">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Tìm thuật ngữ hoặc nghĩa…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 pl-8 text-sm sm:w-56"
                            />
                        </div>
                        {canCreateCard && (
                            <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 w-full shrink-0 sm:w-auto"
                                    onClick={() => setOpenCreateDialog(true)}
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Tạo thẻ
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 w-full shrink-0 sm:w-auto"
                                    onClick={() => setOpenAIDialog(true)}
                                >
                                    <Sparkles className="mr-1.5 h-4 w-4" />
                                    Tạo thẻ với AI
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    {paginatedCards.length > 0 ? (
                        paginatedCards.map((card) => (
                            <Card key={card.id} className="shadow-none">
                                <CardContent className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-3">
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                                            <p className="text-sm font-semibold text-foreground">{card.term}</p>
                                            {card.languageDetails?.phonetic && (
                                                <span className="text-[11px] text-muted-foreground">
                                                    [{card.languageDetails.phonetic}]
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs leading-snug text-muted-foreground">
                                            {card.definition}
                                        </p>
                                        {card.hint && (
                                            <p className="text-[11px] italic text-muted-foreground">Ghi chú: {card.hint}</p>
                                        )}
                                    </div>

                                    {canCreateCard && (
                                        <div className="flex w-full shrink-0 justify-end gap-2 border-t border-border/60 pt-2 sm:w-auto sm:border-t-0 sm:pt-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                aria-label="Sửa thẻ"
                                                className="h-8 flex-1 gap-1.5 px-2.5 sm:flex-initial"
                                                onClick={() => handleOpenEdit(card)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Sửa
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                aria-label="Xóa thẻ"
                                                className="h-8 flex-1 gap-1.5 border-destructive/30 px-2.5 text-destructive hover:bg-destructive/5 sm:flex-initial"
                                                onClick={() => {
                                                    setDeletingCard(card);
                                                    setOpenDeleteDialog(true);
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Xóa
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="rounded-md border border-dashed py-12 text-center">
                            <p className="text-xs text-muted-foreground sm:text-sm">Không có thẻ phù hợp</p>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <Pagination
                        aria-label="Phân trang Thẻ trong bộ"
                        className="mx-0 mt-3 flex w-full min-w-0 flex-col items-stretch gap-3 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 sm:pt-4"
                    >
                        <p className="flex w-full shrink-0 items-center justify-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm font-medium tabular-nums text-muted-foreground sm:w-auto sm:border-0 sm:bg-transparent sm:py-0">
                            <span className="sm:hidden">Trang</span>
                            <span className="text-foreground">{currentPage}</span>
                            <span>/</span>
                            <span className="text-foreground">{totalPages}</span>
                        </p>
                        <PaginationContent className="grid w-full min-w-0 grid-cols-4 gap-1.5 sm:flex sm:w-auto sm:flex-nowrap sm:justify-center sm:gap-2">
                            <PaginationItem className="min-w-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={currentPage === 1}
                                    onClick={() => setPage(1)}
                                    aria-label="Về trang đầu"
                                    className="h-10 w-full min-w-0 justify-center gap-0 px-1 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
                                >
                                    <ChevronsLeft className="h-4 w-4 shrink-0" />
                                    <span className="hidden truncate sm:inline">Đầu</span>
                                </Button>
                            </PaginationItem>
                            <PaginationItem className="min-w-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={currentPage === 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    aria-label="Trang trước"
                                    className="h-10 w-full min-w-0 justify-center gap-0 px-1 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
                                >
                                    <ChevronLeft className="h-4 w-4 shrink-0" />
                                    <span className="hidden truncate sm:inline">Trước</span>
                                </Button>
                            </PaginationItem>
                            <PaginationItem className="min-w-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    aria-label="Trang sau"
                                    className="h-10 w-full min-w-0 justify-center gap-0 px-1 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
                                >
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                    <span className="hidden truncate sm:inline">Sau</span>
                                </Button>
                            </PaginationItem>
                            <PaginationItem className="min-w-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setPage(totalPages)}
                                    aria-label="Đến trang cuối"
                                    className="h-10 w-full min-w-0 justify-center gap-0 px-1 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5"
                                >
                                    <ChevronsRight className="h-4 w-4 shrink-0" />
                                    <span className="hidden truncate sm:inline">Cuối</span>
                                </Button>
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>

            {/* Dialogs */}
            <FlashcardFormDialog
                open={openCreateDialog}
                onOpenChange={setOpenCreateDialog}
                onSave={handleCreateCard}
                isPending={createCard.isPending}
                title="Tạo thẻ mới"
            />

            <FlashcardFormDialog
                open={openEditDialog}
                onOpenChange={setOpenEditDialog}
                initialValues={editingCard ? {
                    term: editingCard.term,
                    definition: editingCard.definition,
                    phonetic: editingCard.languageDetails?.phonetic || "",
                    note: editingCard.hint || "",
                    type: editingCard.languageDetails?.type || "Từ vựng"
                } : undefined}
                onSave={handleSaveEdit}
                isPending={updateCard.isPending}
                title="Chỉnh sửa thẻ"
            />

            <FlashcardAIBulkDialog
                open={openAIDialog}
                onOpenChange={setOpenAIDialog}
                onCreate={handleCreateWithAI}
                isPending={isCreatingWithAI}
            />

            <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa thẻ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn xóa thẻ <span className="font-semibold text-foreground">"{deletingCard?.term || ''}"</span>?
                            Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCard}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteCard.isPending ? 'Đang xóa...' : 'Xóa ngay'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={openEditSetDialog} onOpenChange={setOpenEditSetDialog}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa bộ thẻ</DialogTitle>
                        <DialogDescription>
                            Cập nhật tên và mô tả. Chỉ bạn (chủ sở hữu) mới có quyền chỉnh sửa.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Tên bộ thẻ</label>
                            <Input
                                value={editSetTitle}
                                onChange={(e) => setEditSetTitle(e.target.value)}
                                placeholder="VD: Từ vựng N3 bài 1"
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Mô tả (tuỳ chọn)</label>
                            <Textarea
                                value={editSetDescription}
                                onChange={(e) => setEditSetDescription(e.target.value)}
                                placeholder="Mục tiêu / ghi chú cho bộ thẻ..."
                                className="min-h-24"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button variant="ghost" onClick={() => setOpenEditSetDialog(false)} className="h-9">
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSaveSetMeta}
                            disabled={updateSet.isPending || !editSetTitle.trim()}
                            className="h-9"
                        >
                            {updateSet.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={openDeleteSetDialog} onOpenChange={setOpenDeleteSetDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa bộ thẻ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn xóa bộ thẻ <span className="font-semibold text-foreground">"{set.title}"</span>?
                            Hành động này sẽ xóa toàn bộ thẻ bên trong và không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteSet}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteSet.isPending ? 'Đang xóa...' : 'Xóa bộ thẻ'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
