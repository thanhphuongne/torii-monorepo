'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAcademyStudySet as useStudySet, useUpdateAcademyStudySet as useUpdateStudySet, useCreateAcademySetCard as useCreateSetCard, useUpdateAcademySetCard as useUpdateSetCard, useDeleteAcademySetCard as useDeleteSetCard } from '@/lib/api/services/academy-study-set-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Textarea } from '@workspace/ui/components/textarea';
import { ChevronLeft, Plus, Trash2, Save, BookOpen, Layers, Zap, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { FlashcardFormDialog, type FlashcardFormValues } from '@workspace/ui/components/custom/flashcard-form-dialog';

export function StudySetEditor({ setId }: { setId: string }) {
    const router = useRouter();
    const { data: set, isLoading } = useStudySet(setId);
    const updateSet = useUpdateStudySet();
    const createCard = useCreateSetCard();
    const updateCard = useUpdateSetCard();
    const deleteCard = useDeleteSetCard();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isEditingMeta, setIsEditingMeta] = useState(false);

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<any | null>(null);

    useEffect(() => {
        if (set) {
            setTitle(set.title);
            setDescription(set.description || '');
        }
    }, [set]);

    const handleSaveMeta = async () => {
        try {
            await updateSet.mutateAsync({ id: setId, payload: { title, description } });
            toast.success('Đã lưu thông tin bộ thẻ!');
            setIsEditingMeta(false);
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi lưu');
        }
    };

    const handleSaveFlashcard = async (values: FlashcardFormValues) => {
        const payload = {
            term: values.term,
            definition: values.definition,
            hint: values.note || undefined,
            languageDetails: {
                phonetic: values.phonetic,
                type: values.type
            }
        };

        try {
            if (editingCard) {
                await updateCard.mutateAsync({ cardId: editingCard.id, payload });
                toast.success('Đã cập nhật thẻ!');
            } else {
                await createCard.mutateAsync({ setId, payload });
                toast.success('Đã thêm thẻ mới!');
            }
            setIsDialogOpen(false);
            setEditingCard(null);
        } catch (e: any) {
            toast.error(e.message || 'Lỗi khi lưu thẻ');
        }
    };

    const startEditingCard = (card: any) => {
        setEditingCard(card);
        setIsDialogOpen(true);
    };

    const handleDeleteCard = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Bạn có chắc muốn xóa thẻ này?')) return;
        try {
            await deleteCard.mutateAsync({ setId, cardId: id });
            toast.success('Đã xóa thẻ!');
        } catch (e: any) {
            toast.error(e.message || 'Lỗi xóa thẻ');
        }
    };

    if (isLoading) return <div className="animate-pulse space-y-6"><div className="h-10 w-48 bg-muted rounded"></div><div className="h-40 bg-muted rounded-xl"></div></div>;
    if (!set) return <div className="text-center py-20">Không tìm thấy bộ thẻ.</div>;

    const initialValues: Partial<FlashcardFormValues> = editingCard ? {
        term: editingCard.term,
        definition: editingCard.definition,
        phonetic: editingCard.languageDetails?.phonetic || '',
        note: editingCard.hint || '',
        type: editingCard.languageDetails?.type || 'Từ vựng'
    } : {};

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-20">
            <Button variant="ghost" className="mb-4" onClick={() => router.push('/dashboard/study-sets')}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
            </Button>

            <Card className="border-primary/10 bg-card overflow-hidden shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        {isEditingMeta ? (
                            <div className="w-full space-y-4">
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên bộ thẻ" className="text-xl font-bold h-12 rounded-xl" />
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả..." className="rounded-xl" />
                                <div className="flex gap-2">
                                    <Button onClick={handleSaveMeta} disabled={updateSet.isPending}><Save className="mr-2 h-4 w-4" /> Lưu thông tin</Button>
                                    <Button variant="outline" onClick={() => setIsEditingMeta(false)}>Hủy</Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <CardTitle className="text-3xl font-bold mb-2 text-slate-800">{set.title}</CardTitle>
                                    <CardDescription className="text-base text-slate-500">{set.description || 'Không có mô tả'}</CardDescription>
                                </div>
                                <Button variant="outline" className="rounded-xl" onClick={() => setIsEditingMeta(true)}>Sửa thông tin</Button>
                            </>
                        )}
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href={`/dashboard/study-sets/${setId}/review`} className="block group">
                    <Card className="hover:border-primary transition-all duration-300 cursor-pointer h-full shadow-sm hover:shadow-md border-primary/5">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <BookOpen className="size-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Học (SRS)</h4>
                                <p className="text-sm text-slate-500 whitespace-nowrap">Ôn tập ghi nhớ lâu</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href={`/dashboard/study-sets/${setId}/test`} className="block group">
                    <Card className="hover:border-orange-500 transition-all duration-300 cursor-pointer h-full shadow-sm hover:shadow-md border-orange-500/5">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="bg-orange-500/10 p-3 rounded-2xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <Zap className="size-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Kiểm tra</h4>
                                <p className="text-sm text-slate-500 whitespace-nowrap">Làm bài trắc nghiệm</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href={`/dashboard/study-sets/${setId}/match`} className="block group">
                    <Card className="hover:border-purple-500 transition-all duration-300 cursor-pointer h-full shadow-sm hover:shadow-md border-purple-500/5">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="bg-purple-500/10 p-3 rounded-2xl text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                <Layers className="size-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Ghép cặp</h4>
                                <p className="text-sm text-slate-500 whitespace-nowrap">Trò chơi nối thẻ</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
                        Danh sách thẻ 
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">{set.setCards?.length || 0}</span>
                    </h3>
                    <Button 
                        onClick={() => { setEditingCard(null); setIsDialogOpen(true); }}
                        className="rounded-2xl h-11 px-6 shadow-lg shadow-primary/20 font-bold"
                    >
                        <Plus className="mr-2 h-5 w-5" /> Thêm thẻ mới
                    </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {set.setCards?.map((card: any, index: number) => (
                        <Card key={card.id} className="group transition-all hover:shadow-md border-slate-100 overflow-hidden rounded-2xl">
                            <CardContent className="p-0">
                                <div
                                    className="p-6 flex flex-col md:flex-row gap-6 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => startEditingCard(card)}
                                >
                                    <div className="flex gap-4 flex-1">
                                        <span className="text-slate-300 font-bold text-xl w-8 shrink-0">{index + 1}</span>
                                        <div className="space-y-1 w-full border-l-2 pl-4 border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xl font-bold text-slate-800">{card.term}</p>
                                                {card.languageDetails?.type && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wider">
                                                        {card.languageDetails.type}
                                                    </span>
                                                )}
                                            </div>
                                            {card.languageDetails?.phonetic && (
                                                <p className="text-slate-400 font-medium text-sm">「 {card.languageDetails.phonetic} 」</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 flex justify-between items-start gap-4">
                                        <div className="space-y-1 w-full border-l-2 pl-4 border-slate-100 md:border-slate-100">
                                            <p className="text-slate-600 font-medium line-clamp-2 leading-relaxed">{card.definition}</p>
                                            {card.hint && (
                                                <p className="text-slate-400 italic text-sm">Ghi chú: {card.hint}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 rounded-xl hover:bg-slate-100 shrink-0 transition-all"
                                                onClick={(e) => { e.stopPropagation(); startEditingCard(card); }}
                                            >
                                                <Pencil className="h-4 w-4 text-slate-400" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 rounded-xl text-destructive hover:bg-destructive/10 shrink-0 transition-all"
                                                onClick={(e) => handleDeleteCard(card.id, e)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {(!set.setCards || set.setCards.length === 0) && (
                    <div className="py-20 text-center space-y-4 border-2 border-dashed rounded-3xl border-slate-100">
                        <div className="bg-slate-50 size-20 rounded-full flex items-center justify-center mx-auto text-slate-200">
                            <BookOpen className="size-10" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-slate-500 font-bold text-lg">Chưa có thẻ nào</p>
                            <p className="text-slate-400">Bắt đầu xây dựng bộ thẻ của bạn ngay nhé!</p>
                        </div>
                        <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="rounded-xl border-slate-200">
                            Thêm từ đầu tiên
                        </Button>
                    </div>
                )}
            </div>

            <FlashcardFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                initialValues={initialValues}
                onSave={handleSaveFlashcard}
                isPending={createCard.isPending || updateCard.isPending}
                title={editingCard ? "Chỉnh sửa thẻ" : "Thêm từ mới"}
            />
        </div>
    );
}
