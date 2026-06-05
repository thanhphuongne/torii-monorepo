import { Filter, Layers, Search } from 'lucide-react';
import { Input } from '@workspace/ui/components/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@workspace/ui/components/select';
import {
    listPageFiltersRowClass,
    listPageSearchIconClass,
    listPageSearchInputClass,
    listPageToolbarRootClass,
} from '@/lib/ui-shell';

/** Cấp độ JLPT (N5–N1, format hiện hành). */
export const JLPT_LEVELS = ['N1', 'N2', 'N3', 'N4', 'N5'] as const;

/**
 * Ba khối lớn trong đề JLPT (khớp enum backend) — tương ứng cấu trúc N1:
 * - 言語知識（文字・語彙）→ LANGUAGE_VOCAB
 * - 言語知識（文法）・読解 → LANGUAGE_GRAMMAR_READING
 * - 聴解 → LISTENING
 *
 * Các “dạng bài” chi tiết (漢字読み, 文脈規定, 内容理解（短文）, 課題理解…) nằm ở bộ lọc **Mondai**, seed trong `jlpt_mondai`.
 */
export const JLPT_SECTIONS = [
    { code: 'LANGUAGE_VOCAB', label: 'Từ vựng & chữ Hán (文字・語彙)' },
    { code: 'LANGUAGE_GRAMMAR_READING', label: 'Ngữ pháp & đọc hiểu (文法・読解)' },
    { code: 'LISTENING', label: 'Nghe hiểu (聴解)' },
] as const;

/** Dạng câu theo domain (VOCAB / GRAMMAR / READING / LISTENING) — khớp phân môn trong đề chính thức. */
export const JLPT_QUESTION_TYPES = [
    { value: 'VOCAB', label: 'Từ vựng (文字・語彙)' },
    { value: 'GRAMMAR', label: 'Ngữ pháp (文法)' },
    { value: 'READING', label: 'Đọc hiểu (読解)' },
    { value: 'LISTENING', label: 'Nghe hiểu (聴解)' },
] as const;

export const JLPT_DIFFICULTIES = [
    { value: 'EASY', label: 'Dễ' },
    { value: 'MEDIUM', label: 'Trung bình' },
    { value: 'HARD', label: 'Khó' },
] as const;

export function jlptQuestionTypeLabel(code: string): string {
    return JLPT_QUESTION_TYPES.find((t) => t.value === code)?.label ?? code;
}

export function jlptSectionLabel(code: string): string {
    return JLPT_SECTIONS.find((s) => s.code === code)?.label ?? code;
}

/** Hiển thị mondai: tiếng Việt (tiếng Nhật), fallback mã nếu thiếu tên. */
export function formatJlptMondaiLabel(m: {
    titleVi?: string | null;
    titleJa?: string | null;
    code?: string;
}): string {
    const vi = (m.titleVi ?? '').trim();
    const ja = (m.titleJa ?? '').trim();
    if (vi && ja) return `${vi} (${ja})`;
    if (vi) return vi;
    if (ja) return ja;
    return (m.code ?? '').trim() || '—';
}

export function jlptDifficultyLabel(code: string): string {
    return JLPT_DIFFICULTIES.find((d) => d.value === code)?.label ?? code;
}

export type JlptMondaiOption = { id: string; code: string; titleVi: string | null; titleJa: string | null };

export interface JlptQuestionsToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit: (e: React.FormEvent) => void;
    level: string;
    onLevelChange: (value: string) => void;
    section: string;
    onSectionChange: (value: string) => void;
}

export function JlptQuestionsToolbar({
    search,
    onSearchChange,
    onSearchSubmit,
    level,
    onLevelChange,
    section,
    onSectionChange,
}: JlptQuestionsToolbarProps) {
    return (
        <div className={listPageToolbarRootClass}>
            <div className={listPageFiltersRowClass}>
                <form onSubmit={onSearchSubmit} className="relative w-full md:w-[280px]">
                    <Search className={listPageSearchIconClass} />
                    <Input
                        placeholder="Tìm kiếm nội dung câu hỏi..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className={listPageSearchInputClass}
                    />
                </form>

                <div className="w-full md:w-[120px]">
                    <Select value={level} onValueChange={onLevelChange}>
                        <SelectTrigger className="w-full">
                            <div className="flex min-w-0 items-center gap-2">
                                <Filter className="size-3.5 shrink-0 text-muted-foreground" />
                                <SelectValue placeholder="Cấp độ" />
                            </div>
                        </SelectTrigger>
                        <SelectContent align="start">
                            <SelectItem value="all">Cấp độ</SelectItem>
                            {JLPT_LEVELS.map((l) => (
                                <SelectItem key={l} value={l}>
                                    {l}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full md:w-[320px]">
                    <Select value={section} onValueChange={onSectionChange}>
                        <SelectTrigger className="w-full">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <Layers className="size-3.5 shrink-0 text-muted-foreground" />
                                <SelectValue placeholder="Phần thi" />
                            </div>
                        </SelectTrigger>
                        <SelectContent align="start" className="max-h-[min(320px,50vh)]">
                            <SelectItem value="all">Phần thi</SelectItem>
                            {JLPT_SECTIONS.map((s) => (
                                <SelectItem key={s.code} value={s.code}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
