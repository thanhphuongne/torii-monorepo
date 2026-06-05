import { useState, useEffect } from "react";
import {
  Search,
  LayoutTemplate,
  Loader2,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import {
  Empty,
  EmptyContent,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@workspace/ui/components/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useForm, Controller } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field";
import { PageHeader } from "@/components/common/page-header";
import {
  listPageFiltersRowClass,
  listPageSearchIconClass,
  listPageSearchInputClass,
  listPageSearchWrapClass,
  listPageToolbarRootClass,
  dataTableHeaderClass,
  dataTableShellClass,
} from "@/lib/ui-shell";
import { academyJlptMockApi, type JlptMockTemplate } from "@/lib/api/services/academy-jlpt-mock";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const LEVELS = ["N1", "N2", "N3", "N4", "N5"];
const templateStatusLabelMap: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đang dùng",
  ARCHIVED: "Lưu trữ",
};

type CreateJlptTemplateForm = {
  title: string;
  code: string;
  levelCode: string;
};

export default function JlptTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<JlptMockTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateJlptTemplateForm>({
    defaultValues: {
      title: "",
      code: "",
      levelCode: "N3",
    },
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await academyJlptMockApi.findAllTemplates({
        levelCode: level === "all" ? undefined : level,
        q: search || undefined,
      });
      setTemplates(data);
    } catch {
      toast.error("Không thể tải danh sách đề thi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [level]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      await academyJlptMockApi.deleteTemplate(deleteTargetId);
      toast.success("Đã xóa đề thi JLPT");
      await fetchTemplates();
    } catch {
      toast.error("Không thể xóa đề thi");
    } finally {
      setDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const handleCloseCreate = (open: boolean) => {
    if (!open) {
      if (!creating) {
        setCreateOpen(false);
        reset();
      }
      return;
    }
    setCreateOpen(true);
  };

  const onCreate = async (data: CreateJlptTemplateForm) => {
    const title = data.title.trim();
    const code = data.code.trim();
    if (!title || !code) return;

    try {
      setCreating(true);
      const created = await academyJlptMockApi.createTemplate({
        title,
        code,
        levelCode: data.levelCode,
      });
      if (!created?.id) {
        throw new Error("CREATE_FAILED");
      }
      toast.success("Đã tạo đề thi JLPT");
      handleCloseCreate(false);
      navigate(`/academy/jlpt/templates/${created.id}`);
    } catch {
      toast.error("Không thể tạo đề thi");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Đề thi JLPT"
        subtitle="Danh sách đề thi hiện có."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo đề thi
          </Button>
        }
      />

      <div className="space-y-4">
        <div className={listPageToolbarRootClass}>
          <form onSubmit={handleSearch} className={listPageSearchWrapClass}>
            <Search className={listPageSearchIconClass} />
            <Input
              placeholder="Tìm kiếm tiêu đề hoặc mã đề..."
              className={listPageSearchInputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <div className={listPageFiltersRowClass}>
            <div className="w-full md:w-[140px]">
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cấp độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả cấp</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>
        </div>

        <div className={dataTableShellClass}>
          <div className="overflow-x-auto">
            <Table className="min-w-[800px] w-full">
              <TableHeader className={dataTableHeaderClass}>
                <TableRow>
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead className="w-[100px]">Cấp độ</TableHead>
                  <TableHead>Thông tin đề thi</TableHead>
                  <TableHead className="w-[120px]">Trạng thái</TableHead>
                  <TableHead className="w-[150px]">Thời gian</TableHead>
                  <TableHead className="w-[120px] text-right pr-4">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 6 }).map((_, colIndex) => (
                        <TableCell key={colIndex}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : templates.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="h-[320px] text-center">
                      <Empty>
                        <EmptyMedia>
                          <LayoutTemplate className="size-8 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyContent>
                          <EmptyTitle>Không tìm thấy đề thi</EmptyTitle>
                          <EmptyDescription>
                            Thử đổi bộ lọc hoặc tạo đề thi mới.
                          </EmptyDescription>
                        </EmptyContent>
                      </Empty>
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((tpl, idx) => (
                    <TableRow key={tpl.id} className="group transition-colors hover:bg-muted/10">
                      <TableCell className="text-center font-medium text-muted-foreground/60 tabular-nums text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold">
                          {tpl.levelCode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{tpl.title}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-tight text-muted-foreground">
                          {tpl.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tpl.status === "PUBLISHED" ? "default" : "secondary"} className="text-[10px]">
                          {templateStatusLabelMap[tpl.status] ?? tpl.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{tpl.totalDurationMinutes ?? "?"} phút</span>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-sky-500/40 text-sky-700 hover:bg-sky-50 font-medium"
                            onClick={() => navigate(`/academy/jlpt/templates/${tpl.id}`)}
                          >
                            <Edit2 className="size-4" />
                            Sửa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-destructive border-destructive/40 hover:text-destructive hover:bg-destructive/5 font-medium"
                            onClick={() => setDeleteTargetId(tpl.id)}
                          >
                            <Trash2 className="size-4" />
                            Xóa
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa đề thi JLPT?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bản mẫu đề thi này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xác nhận xóa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={createOpen} onOpenChange={handleCloseCreate}>
        <SheetContent className="!w-full sm:!max-w-[800px] max-h-screen p-0 flex flex-col overflow-hidden">
          <SheetHeader className="p-6 border-b shrink-0">
            <SheetTitle>Tạo đề thi JLPT</SheetTitle>
            <SheetDescription>
              Tạo đề mới để bắt đầu thêm phần thi và câu hỏi.
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={handleSubmit(onCreate)}
            className="flex flex-col flex-1 overflow-hidden"
            noValidate
          >
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 p-6">
                <Field>
                  <FieldLabel>Tiêu đề đề thi</FieldLabel>
                  <Input
                    placeholder="Ví dụ: JLPT N3 Đề thi thử #1"
                    {...register("title", { required: "Vui lòng nhập tiêu đề" })}
                  />
                  {errors.title?.message && (
                    <FieldError>{errors.title.message}</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel>Mã đề</FieldLabel>
                  <Input
                    placeholder="Ví dụ: JLPT-N3-001"
                    {...register("code", { required: "Vui lòng nhập mã đề" })}
                  />
                  {errors.code?.message && (
                    <FieldError>{errors.code.message}</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel>Cấp độ</FieldLabel>
                  <Controller
                    control={control}
                    name="levelCode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn cấp độ" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((l) => (
                            <SelectItem key={l} value={l}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>
            </ScrollArea>
            <div className="p-6 border-t bg-muted/30 shrink-0 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCloseCreate(false)}
                disabled={creating}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Tạo đề thi
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
