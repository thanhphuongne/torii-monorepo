import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@workspace/ui/components/button';
import {
    ChevronRight,
    FileEdit,
    Download,
    Search,
    User,
    Clock,
    CheckCircle2,
    Loader2,
} from 'lucide-react';
import { useAcademyClassAssignment } from '@/lib/api/services/academy-class-assignments';
import { useAcademyAssignmentSubmissions, useUpdateAcademyAssignmentSubmission } from '@/lib/api/services/academy-assignment-submissions';
import type { AcademyAssignmentSubmission } from '@/lib/api/services/academy-assignment-submissions';
import { Badge } from '@workspace/ui/components/badge';
import { Skeleton } from '@workspace/ui/components/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import { Input } from '@workspace/ui/components/input';
import { formatDate, formatDateTime } from "@/lib/format-utils"
import {
  listPageSearchIconClass,
  listPageSearchInputClass,
  listPageSearchWrapClass,
} from "@/lib/ui-shell"
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

function submissionToRow(s: AcademyAssignmentSubmission) {
    const grade = s.score ?? s.grade;
    const num = typeof grade === 'number' ? grade : (grade != null ? Number(grade) : null);
    return {
        id: s.id,
        user: s.user,
        submittedAt: s.submittedAt,
        status: s.status ?? 'SUBMITTED',
        rawScore: num ?? null,
        maxScore: 10,
        content: s.content,
        fileUrls: s.fileUrls,
        feedback: s.feedback,
    };
}

export default function AssignmentGradingPage() {
    const { assessmentId } = useParams<{ liveClassId: string; assessmentId: string }>();
    const [search, setSearch] = useState('');
    
    // Grading states
    const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
    const [score, setScore] = useState<string>('');
    const [feedback, setFeedback] = useState<string>('');

    const classAssignmentQuery = useAcademyClassAssignment(assessmentId);
    const classAssignment = classAssignmentQuery.data;

    const submissionsQuery = useAcademyAssignmentSubmissions(
        { classAssessmentId: assessmentId! },
        { enabled: !!classAssignment && !classAssignmentQuery.isError }
    );

    const updateSubmission = useUpdateAcademyAssignmentSubmission();

    const isLoading = classAssignmentQuery.isLoading && !classAssignment;

    if (isLoading) {
        return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
    }

    if (!classAssignment || classAssignmentQuery.isError) {
        return <div className="p-8">Không tìm thấy bài tập.</div>;
    }

    const title = classAssignment?.assignment?.title ?? classAssignment?.titleOverride ?? 'Bài tập';
    const rows = (submissionsQuery.data ?? []).map(submissionToRow);
    const isLoadingRows = submissionsQuery.isLoading;

    const filteredRows = rows.filter(r =>
        r.user?.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        r.user?.email?.toLowerCase().includes(search.toLowerCase())
    );

    const submittedCount = rows.filter(r => r.submittedAt).length;
    const gradedCount = rows.filter(r => r.status === 'GRADED' || r.status === 'COMPLETED').length;
    const pendingCount = rows.filter(r => r.status === 'SUBMITTED').length;

    const handleOpenGrading = (row: any) => {
        setGradingSubmission(row);
        setScore(row.rawScore?.toString() || '');
        setFeedback(row.feedback || '');
    };

    const handleSaveGrade = async () => {
        if (!gradingSubmission) return;
        
        const numScore = parseFloat(score);
        if (isNaN(numScore) || numScore < 0 || numScore > 10) {
            toast.error("Điểm số không hợp lệ (0-10)");
            return;
        }

        try {
            await updateSubmission.mutateAsync({
                id: gradingSubmission.id,
                input: {
                    score: numScore,
                    status: 'GRADED',
                    feedback: feedback,
                }
            });
            toast.success("Đã chấm điểm thành công");
            setGradingSubmission(null);
        } catch (error) {
            console.error(error);
            toast.error("Có lỗi xảy ra khi lưu điểm");
        }
    };

    const handleDownload = (row: any) => {
        const fileUrl = row.fileUrls?.[0] || row.content?.url;
        if (fileUrl) {
            window.open(fileUrl, '_blank');
        } else if (row.content?.text) {
            // If it's just text, create a blob and download
            const blob = new Blob([row.content.text], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `submission-${row.user?.displayName || row.id}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            toast.error("Không tìm thấy file đính kèm để tải về");
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={
                    <div className="flex items-center gap-2">
                        <Link to="/academy/live-classes" className="hover:underline text-muted-foreground transition-colors">Lớp học</Link>
                        <ChevronRight className="size-4" />
                        <span>Chấm điểm: {title}</span>
                    </div>
                }
                subtitle={`Quản lý và chấm điểm bài nộp của sinh viên cho bài tập này.`}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Tổng sinh viên</p>
                    <p className="text-2xl font-bold">--</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Đã nộp</p>
                    <p className="text-2xl font-bold text-blue-500">{submittedCount}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Đã chấm</p>
                    <p className="text-2xl font-bold text-green-500">{gradedCount}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Chưa chấm</p>
                    <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
                </div>
            </div>

            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                    <div className={listPageSearchWrapClass}>
                        <Search className={listPageSearchIconClass} />
                        <Input
                            placeholder="Tìm sinh viên..."
                            className={listPageSearchInputClass}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {isLoadingRows ? (
                    <div className="p-8"><Skeleton className="h-48 w-full" /></div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Sinh viên</TableHead>
                                <TableHead>Ngày nộp</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead>Điểm số</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        Không có bài nộp nào.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRows.map((row) => (
                                    <TableRow key={row.id} className="group">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-secondary flex items-center justify-center">
                                                    <User className="size-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{row.user?.displayName || '—'}</span>
                                                    <span className="text-xs text-muted-foreground">{row.user?.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {row.submittedAt ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm">{formatDate(row.submittedAt)}</span>
                                                    <span className="text-xs text-muted-foreground">{formatDateTime(row.submittedAt, "HH:mm")}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">Chưa nộp</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {row.status === 'SUBMITTED' && (
                                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                                    <Clock className="size-3 mr-1" /> Chờ chấm
                                                </Badge>
                                            )}
                                            {(row.status === 'GRADED' || row.status === 'COMPLETED') ? (
                                                <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                                                    <CheckCircle2 className="size-3 mr-1" /> Đã chấm
                                                </Badge>
                                            ) : null}
                                            {row.status === 'IN_PROGRESS' ? (
                                                <Badge variant="outline">Đang làm</Badge>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-lg">
                                                {row.rawScore !== null ? row.rawScore : '--'}
                                                <span className="text-sm font-normal text-muted-foreground ml-1">/ {row.maxScore}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 gap-1.5"
                                                    onClick={() => handleOpenGrading(row)}
                                                    disabled={!row.submittedAt}
                                                >
                                                    <FileEdit className="size-4" /> Chấm điểm
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 gap-1.5"
                                                    onClick={() => handleDownload(row)}
                                                    disabled={!row.submittedAt}
                                                >
                                                    <Download className="size-4" /> Tải bài làm
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Grading Dialog */}
            <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Chấm điểm bài nộp</DialogTitle>
                        <DialogDescription>
                            Sinh viên: {gradingSubmission?.user?.displayName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="score">Điểm số (thang điểm 10)</Label>
                            <Input
                                id="score"
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                placeholder="Nhập điểm số..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="feedback">Nhận xét</Label>
                            <Textarea
                                id="feedback"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Nhập nhận xét cho sinh viên..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGradingSubmission(null)}>Hủy</Button>
                        <Button 
                            onClick={handleSaveGrade} 
                            disabled={updateSubmission.isPending}
                        >
                            {updateSubmission.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Lưu kết quả
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
