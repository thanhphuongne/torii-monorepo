import { Metadata } from 'next';
import { StudyModeTest } from '@/components/study/study-mode-test';

export const metadata: Metadata = {
    title: 'Kiểm tra bộ thẻ | Torii Nihongo',
};

export default async function StudySetTestPage({ params }: { params: Promise<{ setId: string }> }) {
    const { setId } = await params;
    return (
        <div className="flex-1 flex flex-col">
            <StudyModeTest setId={setId} />
        </div>
    );
}
