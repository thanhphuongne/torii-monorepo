import { Metadata } from 'next';
import { StudySetReview } from '@/components/study/study-set-review';

export const metadata: Metadata = {
    title: 'Ôn tập thẻ | Torii Nihongo',
    description: 'Ôn tập bộ thẻ ghi nhớ',
};

export default async function StudySetReviewPage({ params }: { params: Promise<{ setId: string }> }) {
    const { setId } = await params;
    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col space-y-4">
            <StudySetReview setId={setId} />
        </div>
    );
}
