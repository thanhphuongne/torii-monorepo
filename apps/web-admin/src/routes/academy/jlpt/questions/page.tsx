import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import {
  Search,
  FileAudio,
  Image as ImageIcon,
  Plus,
  Edit2,
  Trash2,
  Loader2,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@workspace/ui/components/empty";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@workspace/ui/components/sheet";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { PageHeader } from "@/components/common/page-header";
import {
  JlptQuestionsToolbar,
  JLPT_SECTIONS,
  jlptSectionLabel,
  formatJlptMondaiLabel,
} from "@/components/academy/jlpt/jlpt-questions-toolbar";
import { academyJlptMockApi, type JlptBankQuestion } from "@/lib/api/services/academy-jlpt-mock";
import { JlptQuestionForm } from "@/components/academy/jlpt/jlpt-question-form";
import { SmartPagination } from "@/components/common/smart-pagination";
import { toast } from "sonner";
import { dataTableHeaderClass, dataTableShellClass } from "@/lib/ui-shell";

const PAGE_SIZE = 20;

export default function JlptQuestionsPage() {
  const [questions, setQuestions] = useState<JlptBankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [section, setSection] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Sheet states
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<JlptBankQuestion | null>(null);
  const [isFetchingQuestion, setIsFetchingQuestion] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetQuestionId, setDeleteTargetQuestionId] = useState<string | null>(null);


  const prevFilters = useRef({
    level,
    section,
  });


  const fetchQuestions = async (pageOverride?: number) => {
    const p = pageOverride ?? page;
    try {
      setLoading(true);
      const data = await academyJlptMockApi.findAllBankQuestions({
        level: level === "all" ? undefined : level,
        sectionCode: section === "all" ? undefined : section,
        q: search || undefined,
        page: p,
        limit: PAGE_SIZE,
      });
      setQuestions(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.total);
    } catch {
      toast.error("Không thể tải danh sách câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prev = prevFilters.current;
    const filtersChanged =
      prev.level !== level ||
      prev.section !== section;
    prevFilters.current = {
      level,
      section,
    };

    if (filtersChanged && page !== 1) {
      setPage(1);
      return;
    }

    fetchQuestions();
  }, [level, section, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void fetchQuestions(1);
  };

  const handleLevelChange = (v: string) => {
    setLevel(v);
  };

  const handleSectionChange = (v: string) => {
    setSection(v);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetQuestionId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetQuestionId) return;
    try {
      await academyJlptMockApi.deleteBankQuestion(deleteTargetQuestionId);
      toast.success("Đã xóa câu hỏi");
      void fetchQuestions();
    } catch {
      toast.error("Không thể xóa câu hỏi");
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTargetQuestionId(null);
    }
  };

  const handleOpenSheet = async (questionId?: string) => {
    if (questionId) {
      try {
        setIsFetchingQuestion(true);
        setIsSheetOpen(true);
        const q = await academyJlptMockApi.findBankQuestionById(questionId);
        if (q) {
          setCurrentQuestion(q);
        } else {
          toast.error("Không tìm thấy câu hỏi");
          setIsSheetOpen(false);
        }
      } catch {
        toast.error("Lỗi khi tải dữ liệu câu hỏi");
        setIsSheetOpen(false);
      } finally {
        setIsFetchingQuestion(false);
      }
    } else {
      setCurrentQuestion(null);
      setIsSheetOpen(true);
    }
  };

  const handleFormSuccess = () => {
    setIsSheetOpen(false);
    setCurrentQuestion(null);
    void fetchQuestions();
  };

  const questionsBySection = useMemo(() => {
    const map = new Map<string, JlptBankQuestion[]>();
    for (const q of questions) {
      const list = map.get(q.sectionCode) ?? [];
      list.push(q);
      map.set(q.sectionCode, list);
    }
    const orderedCodes = [
      ...JLPT_SECTIONS.map((s) => s.code).filter((c) => map.has(c)),
      ...[...map.keys()].filter((c) => !JLPT_SECTIONS.some((s) => s.code === c)),
    ];
    return orderedCodes.map((sectionCode) => ({
      sectionCode,
      label: jlptSectionLabel(sectionCode),
      items: map.get(sectionCode)!,
    }));
  }, [questions]);

  const sttBase = (page - 1) * PAGE_SIZE;
  let sttCounter = 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Ngân hàng Câu hỏi JLPT"
        subtitle="Quản lý câu hỏi theo từng phần thi JLPT."
        actions={
          <Button onClick={() => handleOpenSheet()}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm câu hỏi
          </Button>
        }
      />

      <div className="space-y-4">
        <JlptQuestionsToolbar
          search={search}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearch}
          level={level}
          onLevelChange={handleLevelChange}
          section={section}
          onSectionChange={handleSectionChange}
        />

        <div className={dataTableShellClass}>
          <div className="overflow-x-auto">
            <Table className="min-w-[1040px] w-full">
              <TableHeader className={dataTableHeaderClass}>
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead className="w-[72px]">Cấp độ</TableHead>
                  <TableHead>Nội dung (stem)</TableHead>
                  <TableHead className="w-[160px]">Phần thi</TableHead>
                  <TableHead className="w-[280px]">Mondai</TableHead>
                  <TableHead className="w-[72px]">Media</TableHead>
                  <TableHead className="w-[100px] text-right pr-4">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 9 }).map((_, colIndex) => (
                        <TableCell key={colIndex}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : questions.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="h-[400px] text-center">
                      <Empty>
                        <EmptyMedia>
                          <Search className="size-8 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyContent>
                          <EmptyTitle>Không tìm thấy câu hỏi nào</EmptyTitle>
                          <EmptyDescription>
                            Thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.
                          </EmptyDescription>
                        </EmptyContent>
                      </Empty>
                    </TableCell>
                  </TableRow>
                ) : (
                  questionsBySection.map(({ sectionCode, label, items }) => (
                    <Fragment key={sectionCode}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={7} className="py-2.5 text-sm font-semibold">
                          <span>{label}</span>
                          <span className="ml-2 font-normal text-muted-foreground">({items.length} câu)</span>
                        </TableCell>
                      </TableRow>
                      {items.map((q) => (
                        <TableRow key={q.id} className="group transition-colors hover:bg-muted/10">
                          <TableCell className="text-center font-medium text-muted-foreground/60 tabular-nums text-xs">
                            {sttBase + (sttCounter += 1)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-bold">
                              {q.levelCode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {/<[a-z][\s\S]*>/i.test(q.stemText) ? (
                              <div
                                className="max-w-[min(70vw,520px)] text-sm sm:max-w-[500px] whitespace-normal break-words"
                                dangerouslySetInnerHTML={{ __html: q.stemText }}
                              />
                            ) : (
                              <div className="max-w-[min(70vw,520px)] text-sm sm:max-w-[500px] whitespace-normal break-words">
                                {q.stemText}
                              </div>
                            )}
                            <div className="mt-1 flex flex-wrap gap-1">
                              {q.options.map((o) => (
                                <Badge
                                  key={o.id || `${q.id}-${o.key}`}
                                  variant={o.isCorrect ? "default" : "secondary"}
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  {o.key}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {jlptSectionLabel(q.sectionCode)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {q.mondai ? (
                              <div className="max-w-[220px] space-y-0.5">
                                <div className="text-xs font-medium leading-tight">
                                  {formatJlptMondaiLabel(q.mondai)}
                                </div>
                                <div className="font-mono text-[10px] text-muted-foreground">{q.mondai.code}</div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {q.audioAssetId && <FileAudio className="size-4 text-blue-500" />}
                              {q.imageAssetId && <ImageIcon className="size-4 text-emerald-500" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 border-sky-500/40 text-sky-700 hover:bg-sky-50 font-medium"
                                onClick={() => handleOpenSheet(q.id)}
                              >
                                <Edit2 className="size-4" />
                                Sửa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5 font-medium"
                                onClick={() => handleDelete(q.id)}
                              >
                                <Trash2 className="size-4" />
                                Xóa
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <SmartPagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(p) => setPage(p)}
          itemName="câu hỏi"
        />
      </div>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmOpen(false);
            setDeleteTargetQuestionId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa câu hỏi?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Câu hỏi sẽ bị xóa khỏi ngân hàng câu hỏi JLPT.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="!w-full sm:!max-w-[800px] max-h-screen p-0 flex flex-col overflow-hidden">
          <SheetHeader className="shrink-0 border-b p-6">
            <SheetTitle>
              {currentQuestion ? "Cập nhật câu hỏi" : "Thêm câu hỏi mới"}
            </SheetTitle>
            <SheetDescription>
              Hoàn thiện thông tin bên dưới để lưu câu hỏi vào ngân hàng.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-6 p-6">
              {isFetchingQuestion ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Đang tải dữ liệu...
                  </p>
                </div>
              ) : (
                <JlptQuestionForm
                  initialData={currentQuestion}
                  onSuccess={handleFormSuccess}
                  onCancel={() => setIsSheetOpen(false)}
                  presetLevelCode={level !== "all" ? level : undefined}
                  presetSectionCode={section !== "all" ? section : undefined}
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
