import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { PageHeader } from "@/components/common/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { academyJlptMockApi } from "@/lib/api/services/academy-jlpt-mock";
import { jlptSectionLabel } from "@/components/academy/jlpt/jlpt-questions-toolbar";
import { toast } from "sonner";
import { dataTableHeaderClass, dataTableShellClass, listPageFiltersRowClass } from "@/lib/ui-shell";

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const SECTIONS = [
  "LANGUAGE_VOCAB",
  "LANGUAGE_GRAMMAR_READING",
  "LISTENING",
] as const;

type MondaiRow = {
  id: string;
  code: string;
  titleVi: string | null;
  titleJa: string | null;
  descriptionVi?: string | null;
  orderIndex?: number;
  recommendedQuestionCount?: number | null;
};

export default function JlptMondaiMasterPage() {
  const navigate = useNavigate();
  const [level, setLevel] = useState<string>("N5");
  const [sectionCode, setSectionCode] = useState<string>("LANGUAGE_VOCAB");
  const [items, setItems] = useState<MondaiRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await academyJlptMockApi.listBankMondaiOptions({
        level,
        sectionCode,
      });
      setItems(rows as MondaiRow[]);
    } catch {
      toast.error("Không thể tải danh sách mondai");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [level, sectionCode]);

  useEffect(() => {
    void load();
  }, [load]);


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Danh mục dạng bài JLPT"
        subtitle="Xem các dạng bài theo cấp độ và phần thi."
      />

      <div className={listPageFiltersRowClass}>
        <Field className="w-full md:w-40">
          <FieldLabel>Cấp độ</FieldLabel>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-full md:min-w-[240px] md:flex-1">
          <FieldLabel>Phần thi</FieldLabel>
          <Select value={sectionCode} onValueChange={setSectionCode}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {jlptSectionLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className={dataTableShellClass}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className={dataTableHeaderClass}>
            <TableRow>
              <TableHead className="w-[60px] text-center">#</TableHead>
              <TableHead className="w-[120px]">Mã</TableHead>
              <TableHead>Tên hiển thị</TableHead>
              <TableHead className="w-[140px]">Tên tiếng Nhật</TableHead>
              <TableHead className="w-[100px] text-right">Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Đang tải…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  Chưa có dữ liệu cho bộ lọc này. Bạn có thể kiểm tra lại tại trang{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="px-1 h-auto text-muted-foreground"
                    onClick={() => navigate("/academy/jlpt/config")}
                  >
                    JLPT Config
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              items.map((row, idx) => (
                <TableRow key={row.id} className="hover:bg-muted/10">
                  <TableCell className="text-center font-medium text-muted-foreground/60 tabular-nums text-xs">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">{row.code}</TableCell>
                  <TableCell className="max-w-md truncate">{row.titleVi ?? "—"}</TableCell>
                  <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                    {row.titleJa ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
  );
}
