import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { academyJlptMockApi, type JlptBankQuestion } from "@/lib/api/services/academy-jlpt-mock";
import { JlptQuestionForm } from "@/components/academy/jlpt/jlpt-question-form";
import { toast } from "sonner";

export default function JlptQuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [initialData, setInitialData] = useState<JlptBankQuestion | null>(null);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const q = await academyJlptMockApi.findBankQuestionById(id);
        if (!q || cancelled) return;
        setInitialData(q);
      } catch {
        toast.error("Không tải được câu hỏi");
        navigate("/academy/jlpt/questions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Đang tải câu hỏi...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <Link
          to="/academy/jlpt/questions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {isNew ? "Thêm câu hỏi mới" : "Chỉnh sửa câu hỏi"}
        </h1>
      </div>

      <JlptQuestionForm
        initialData={initialData}
        onSuccess={() => navigate("/academy/jlpt/questions")}
        onCancel={() => navigate("/academy/jlpt/questions")}
      />
    </div>
  );
}
