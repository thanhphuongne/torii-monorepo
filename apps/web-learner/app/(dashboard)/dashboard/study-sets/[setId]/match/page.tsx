import { Metadata } from 'next';
import { StudyModeMatch } from '@/components/study/study-mode-match';

export const metadata: Metadata = {
    title: 'Ghép cặp bộ thẻ | Torii Nihongo',
};

export default async function StudySetMatchPage({ params }: { params: Promise<{ setId: string }> }) {
    const { setId } = await params;
    return (
        <div className="flex-1 flex flex-col">
            <StudyModeMatch setId={setId} />
        </div>
    );
}
