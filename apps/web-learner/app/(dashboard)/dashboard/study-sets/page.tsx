import { Metadata } from 'next';
import { StudySetsList } from '@/components/study/study-sets-list';

export const metadata: Metadata = {
    title: 'Thẻ ghi nhớ | Torii Nihongo',
    description: 'Quản lý các bộ thẻ ghi nhớ của bạn',
};

export default function StudySetsPage() {
    return (
        <div className="container mx-auto max-w-6xl space-y-8 px-3 py-4 animate-in fade-in duration-700 sm:px-4 sm:py-6">
            <div className="space-y-4 pb-8 border-b border-border">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Thẻ ghi nhớ của tôi
                </h1>
                <p className="text-sm font-medium text-muted-foreground w-full max-w-xl">
                    Hệ thống lưu trữ và ôn tập từ vựng, ngữ pháp qua phương pháp Flashcards thông minh.
                </p>
            </div>
            <StudySetsList />
        </div>
    );
}
