import { useParams, Link } from "react-router-dom"
import { useState } from "react"
import {
  useAcademyCohort,
  useSubmitCohortForApproval,
} from "@/lib/api/services/academy-cohorts"
import { useCohortOrders, useCohortStats } from "@/lib/api/services/finance"
import { PageHeader } from "@/components/common/page-header"
import { ChevronRight, Package, ShoppingCart, TrendingUp, Info, User } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { formatCurrency, formatDateTime } from "@/lib/format-utils"
import { OrdersTable } from "@/components/finance/orders-table"
import { dataTableShellClass } from "@/lib/ui-shell"
import { SmartPagination } from "@/components/common/smart-pagination"
import { Plus, Layout, BookOpen, Users, CheckCircle2, Edit, Send } from "lucide-react"
import { LiveClassSheet } from "@/components/academy/live-class-sheet"
import { useAcademyLiveClasses } from "@/lib/api/services/academy-live-classes"
import { useAcademyCourseProfile } from "@/lib/api/services/academy-course-profiles"
import { useApproveCohort } from "@/lib/api/services/academy-cohorts"
import { toast } from "sonner"

const cohortStatusLabelMap: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  OPENING: "Đang tuyển sinh",
  COMPLETED: "Đã kết thúc",
  ARCHIVED: "Đã lưu trữ",
}

export default function CohortDetailPage() {
  const { cohortId: id = "" } = useParams<{ cohortId: string }>()
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: cohort, isLoading: isLoadingCohort } = useAcademyCohort(id)
  const { data: liveClasses, isLoading: isLoadingClasses } = useAcademyLiveClasses({ cohortId: id })
  const { data: courseProfile } = useAcademyCourseProfile(cohort?.courseProfileId)

  const approveMutation = useApproveCohort()
  const submitForApprovalMutation = useSubmitCohortForApproval()

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(id)
      toast.success("Đã phê duyệt và xuất bản đợt học thành công!")
    } catch (err) {
      toast.error("Không thể phê duyệt đợt học")
    }
  }

  const handleUpdateStatus = async (status: string) => {
    try {
      if (status === "PENDING_APPROVAL") {
        await submitForApprovalMutation.mutateAsync(id)
      } else {
        throw new Error("Unsupported status transition")
      }
      toast.success(`Đã chuyển trạng thái sang ${cohortStatusLabelMap[status] ?? status}`)
    } catch (err: any) {
      toast.error(err?.userMessage || err?.message || "Không thể cập nhật trạng thái")
    }
  }

  const { data: ordersResponse, isLoading: isLoadingOrders } = useCohortOrders(id, {
    page,
    limit: 10,
  })

  const { data: stats } = useCohortStats(id)

  const orders = ordersResponse?.data || []
  const totalOrders = ordersResponse?.total || 0
  const totalPages = ordersResponse?.totalPages || 1

  if (isLoadingCohort) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!cohort) {
    return <div className="p-8 text-center text-muted-foreground">Không tìm thấy thông tin Đợt khai giảng.</div>
  }

  const canAddLiveClass = !['COMPLETED', 'ARCHIVED'].includes(String(cohort.status))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <Link
              to="/academy/cohorts"
              className="text-sm font-medium text-muted-foreground transition-colors hover:underline"
            >
              Đợt khai giảng
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <ChevronRight className="size-4 shrink-0" />
              <span className="truncate">Chi tiết Đợt khai giảng</span>
            </div>
          </div>
        }
        subtitle={<span className="block break-words">Thông tin chi tiết và thống kê kinh doanh cho đợt học #{cohort.code}</span>}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {cohort.status === 'DRAFT' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full gap-2 bg-primary shadow-none hover:bg-primary/90 sm:w-auto"
                    disabled={!liveClasses?.length || submitForApprovalMutation.isPending}
                    title={!liveClasses?.length ? "Cần ít nhất 1 lớp học trực tiếp để gửi duyệt" : ""}
                  >
                    <Send className="size-4" /> Gửi duyệt
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Gửi duyệt đợt khai giảng?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc muốn gửi duyệt đợt khai giảng <span className="font-semibold">#{cohort.code}</span>? Sau khi gửi, thông tin sẽ bị khóa cho tới khi được phê duyệt hoặc bị từ chối.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleUpdateStatus('PENDING_APPROVAL')}
                      disabled={!liveClasses?.length || submitForApprovalMutation.isPending}
                    >
                      Xác nhận gửi duyệt
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {cohort.status === 'PENDING_APPROVAL' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full gap-2 bg-emerald-600 shadow-none hover:bg-emerald-700 sm:w-auto"
                  >
                    <CheckCircle2 className="size-4" /> Phê duyệt & Xuất bản
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Phê duyệt & xuất bản đợt học?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn sắp phê duyệt đợt học <span className="font-semibold">#{cohort.code}</span>. Sau khi phê duyệt, thông tin sẽ được xuất bản cho học viên tham gia.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApprove}>
                      Xác nhận phê duyệt
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" className="w-full border-primary/20 shadow-none group hover:bg-primary/5 sm:w-auto">
              <Edit className="size-4 mr-2 group-hover:text-primary transition-colors" /> Chỉnh sửa
            </Button>
          </div>
        }
        stats={[
          { label: "Mã đợt học", value: cohort.code },
          { label: "Trạng thái", value: cohortStatusLabelMap[cohort.status] ?? cohort.status },
          { label: "Ngày tạo", value: formatDateTime(cohort.createdAt, "dd/MM/yyyy") },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ShoppingCart className="size-4" /> Tổng số đơn hàng
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{totalOrders}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Bao gồm tất cả các trạng thái</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-emerald-600 font-medium">
              <TrendingUp className="size-4" /> Doanh thu thực nhận
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700">
              {stats?.totalRevenue ? formatCurrency(stats.totalRevenue) : formatCurrency(orders.filter(o => o.status === 'PAID').reduce((sum, o) => sum + (+o.amount), 0))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Dựa trên các đơn hàng đã thanh toán thành công</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-blue-600 font-medium">
              <Package className="size-4" /> Số lớp trực tiếp liên kết
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-700">
              {isLoadingClasses ? "..." : liveClasses?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Các lớp đang vận hành dưới đợt khai giảng này</p>
          </CardContent>
        </Card>
      </div>

      {courseProfile && (
        <Card className="overflow-hidden border-primary/10 shadow-sm bg-gradient-to-br from-background to-muted/20">
          <div className="flex flex-col items-start gap-4 p-4 sm:p-6 md:flex-row md:items-center md:gap-6">
            <div className="size-24 rounded-2xl overflow-hidden border shadow-inner flex-shrink-0 bg-muted flex items-center justify-center">
              {courseProfile.thumbnailUrl ? (
                <img src={courseProfile.thumbnailUrl} alt={courseProfile.title} className="w-full h-full object-cover" />
              ) : (
                <Layout className="size-10 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 flex items-center gap-1">
                  <BookOpen className="size-3" /> Chương trình gốc
                </Badge>
                <span className="text-xs text-muted-foreground font-mono break-all">{courseProfile.code}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight break-words">{courseProfile.title}</h2>
              <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
                {(courseProfile as any).headline || (courseProfile as any).description?.replace(/<[^>]*>/g, '').slice(0, 150) + "..."}
              </p>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto">
              <Button asChild variant="outline" size="sm" className="w-full shadow-none md:w-auto">
                <Link to={`/academy/course-profiles/${courseProfile.id}/detail`}>
                  Xem hồ sơ gốc
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-lg bg-muted/50 p-1">
          <TabsTrigger value="info" className="gap-2 whitespace-nowrap px-3 py-2 data-[state=active]:bg-background">
            <Info className="size-4" /> Thông tin Đợt khai giảng
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2 whitespace-nowrap px-3 py-2 data-[state=active]:bg-background">
            <ShoppingCart className="size-4" /> Danh sách đơn hàng ({totalOrders})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="info">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cấu hình chung</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tên đợt học</p>
                      <p className="text-base font-semibold">{cohort.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mã định danh</p>
                      <p className="text-base font-mono font-bold">{cohort.code}</p>
                    </div>
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Trạng thái</p>
                      <Badge variant="outline" className="font-bold">
                        {cohortStatusLabelMap[cohort.status] ?? cohort.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2"><Plus className="size-4" /> Thời gian đăng ký</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Mở đăng ký</p>
                        <p className="text-sm font-medium">{cohort.enrollmentOpenAt ? formatDateTime(cohort.enrollmentOpenAt, "dd/MM/yyyy") : "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Đóng đăng ký</p>
                        <p className="text-sm font-medium">{cohort.enrollmentCloseAt ? formatDateTime(cohort.enrollmentCloseAt, "dd/MM/yyyy") : "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2"><Package className="size-4" /> Lịch trình dự kiến</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Khai giảng</p>
                        <p className="text-sm font-medium">{cohort.startDate ? formatDateTime(cohort.startDate, "dd/MM/yyyy") : "—"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase">Kết thúc</p>
                        <p className="text-sm font-medium">{cohort.endDate ? formatDateTime(cohort.endDate, "dd/MM/yyyy") : "—"}</p>
                      </div>
                    </div>
                  </div>

                  {cohort.description && (
                    <div className="pt-4 border-t space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mô tả chương trình</p>
                      <div className="text-sm prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: cohort.description }} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Lớp học vận hành</CardTitle>
                    <CardDescription>Các lớp học được kích hoạt và gán cho đợt này.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-primary/40 text-primary shadow-none hover:bg-primary/5 sm:w-auto"
                    onClick={() => setSheetOpen(true)}
                    disabled={!canAddLiveClass}
                    title={!canAddLiveClass ? 'Đợt học đã kết thúc/lưu trữ nên không thể thêm lớp trực tiếp.' : undefined}
                  >
                    <Plus className="size-4 mr-2" /> Tạo lớp mới
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoadingClasses ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))
                  ) : liveClasses && liveClasses.length > 0 ? (
                    liveClasses.map((cls) => (
                      <div key={cls.id} className="flex flex-col gap-3 rounded-xl border bg-muted/5 p-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-primary break-words">{cls.name}</p>
                            <Badge variant="outline" className="text-[10px] h-4 font-mono">{cls.code}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 items-center">
                            {cls.instructorId && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <div className="size-4 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="size-2.5" />
                                </div>
                                <span className="font-medium">Đã phân công giảng viên</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Users className="size-3" />
                              <span>Tối đa: {cls.maxStudents || "∞"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:justify-end">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${cls.status === 'OPENING'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : cls.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : ''
                              }`}
                          >
                            {cohortStatusLabelMap[cls.status] ?? cls.status}
                          </Badge>
                          <Button asChild size="sm" variant="outline" className="h-8 px-3">
                            <Link to={`/academy/live-classes/${cls.id}/detail`}>
                              Quản lý lớp
                              <ChevronRight className="ml-1 size-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl border-muted bg-muted/5">
                      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Package className="size-6 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium mb-1">Chưa có lớp học nào</p>
                      <p className="text-xs text-muted-foreground/60 max-w-[200px] mb-4">Hãy tạo lớp trực tiếp đầu tiên cho đợt khai giảng này.</p>
                      <Button
                        size="sm"
                        onClick={() => setSheetOpen(true)}
                        className="rounded-full px-6"
                        disabled={!canAddLiveClass}
                        title={!canAddLiveClass ? 'Đợt học đã kết thúc/lưu trữ nên không thể thêm lớp trực tiếp.' : undefined}
                      >
                        <Plus className="size-4 mr-2" /> Tạo lớp ngay
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lịch sử đơn hàng</CardTitle>
                  <CardDescription>Danh sách học viên đã đăng ký và nộp lệ phí cho đợt khai giảng này.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className={dataTableShellClass}>
                <OrdersTable
                  data={orders}
                  isLoading={isLoadingOrders}
                  onView={() => { }}
                  onCancel={() => { }}
                  onExport={() => { }}
                  page={page}
                  limit={10}
                />
                </div>
                <div className="p-4 border-t">
                  <SmartPagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalOrders}
                    onPageChange={setPage}
                    itemName="đơn hàng"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <LiveClassSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultCohortId={id}
      />
    </div>
  )
}
