import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "@/components/common/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { useDebounceValue } from "@workspace/ui/hooks/use-debounce-value"
import { ChevronRight, Search, Eye, Package, BookOpen } from "lucide-react"
import {
  useAcademyCohorts,
  type AcademyCohort,
} from "@/lib/api/services/academy-cohorts"
import { useAcademyCourseProfiles, type AcademyCourseProfile } from "@/lib/api/services/academy-course-profiles"
import { useAcademyVodPackages, type AcademyVodPackage } from "@/lib/api/services/academy-vod-packages"
import { formatDateTime } from "@/lib/format-utils"
import {
  listPageSearchIconClass,
  listPageSearchInputClass,
  listPageSearchWrapClass,
} from "@/lib/ui-shell"
import { usePermissions } from "@/hooks/use-permissions"

type ApprovalTab = "cohorts" | "vodPackages" | "courseProfiles"

export default function ApprovalsPage() {
  const { can, hasWildcard } = usePermissions()
  const showCourseProfileApprovals =
    hasWildcard || can("lms.catalog.approve")
  const showCatalogCommerceApprovals = hasWildcard || can("lms.commerce.approve")

  const [tab, setTab] = useState<ApprovalTab>("cohorts")

  useEffect(() => {
    if (
      tab === "courseProfiles" &&
      !showCourseProfileApprovals &&
      showCatalogCommerceApprovals
    ) {
      setTab("cohorts")
    }
    if (
      (tab === "cohorts" || tab === "vodPackages") &&
      !showCatalogCommerceApprovals &&
      showCourseProfileApprovals
    ) {
      setTab("courseProfiles")
    }
  }, [tab, showCourseProfileApprovals, showCatalogCommerceApprovals])

  const [cohortSearch, setCohortSearch] = useState("")
  const [debouncedCohortSearch] = useDebounceValue(cohortSearch, 500)

  const [vodPackageSearch, setVodPackageSearch] = useState("")
  const [debouncedVodPackageSearch] = useDebounceValue(vodPackageSearch, 500)

  const [profileSearch, setProfileSearch] = useState("")
  const [debouncedProfileSearch] = useDebounceValue(profileSearch, 500)

  const { data: cohorts = [], isLoading: isLoadingCohorts } =
    useAcademyCohorts({
      status: "PENDING_APPROVAL",
      q: debouncedCohortSearch || undefined,
    } as any)

  const { data: vodPackages = [], isLoading: isLoadingVodPackages } = useAcademyVodPackages({
    status: "PENDING_APPROVAL",
    q: debouncedVodPackageSearch || undefined,
  } as any)

  const { data: courseProfiles = [], isLoading: isLoadingCourseProfiles } =
    useAcademyCourseProfiles({
      status: "PENDING_APPROVAL",
      q: debouncedProfileSearch || undefined,
    })

  const pendingCohorts = useMemo(
    () => cohorts.filter((o) => o.status === "PENDING_APPROVAL"),
    [cohorts],
  )
  const pendingVodPackages = useMemo(
    () => vodPackages.filter((p) => p.status === "PENDING_APPROVAL"),
    [vodPackages],
  )

  const pendingCourseProfiles = useMemo(
    () => courseProfiles.filter((p) => p.status === "PENDING_APPROVAL"),
    [courseProfiles],
  )

  const isLoading =
    (tab === "cohorts" && isLoadingCohorts) ||
    (tab === "vodPackages" && isLoadingVodPackages) ||
    (tab === "courseProfiles" && isLoadingCourseProfiles)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Link
              to="/academy/live-classes"
              className="hover:underline text-muted-foreground transition-colors"
            >
              Academy
            </Link>
            <ChevronRight className="size-4" />
            <span>Trung tâm phê duyệt</span>
          </div>
        }
        subtitle="Xem trước và duyệt các nội dung/chính sách bán trước khi xuất bản."
      />


      <Tabs value={tab} onValueChange={(v) => setTab(v as ApprovalTab)}>
        <TabsList className="w-full overflow-x-auto whitespace-nowrap">
          {showCatalogCommerceApprovals ? (
            <TabsTrigger value="cohorts" className="gap-2">
              <Package className="size-4" />
              Đợt khai giảng
              <Badge variant="secondary">{pendingCohorts.length}</Badge>
            </TabsTrigger>
          ) : null}
          {showCatalogCommerceApprovals ? (
            <TabsTrigger value="vodPackages" className="gap-2">
              <Package className="size-4" />
              Gói học liệu tự học
              <Badge variant="secondary">{pendingVodPackages.length}</Badge>
            </TabsTrigger>
          ) : null}
          {showCourseProfileApprovals ? (
            <TabsTrigger value="courseProfiles" className="gap-2">
              <BookOpen className="size-4" />
              Hồ sơ khóa học
              <Badge variant="secondary">{pendingCourseProfiles.length}</Badge>
            </TabsTrigger>
          ) : null}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="cohorts" className="space-y-4">
            <div className={listPageSearchWrapClass}>
              <Search className={listPageSearchIconClass} />
              <Input
                placeholder="Tìm đợt khai giảng theo mã hoặc tên..."
                className={listPageSearchInputClass}
                value={cohortSearch}
                onChange={(e) => setCohortSearch(e.target.value)}
              />
            </div>
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead className="w-[120px]">Mã</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Ngày gửi duyệt</TableHead>
                    <TableHead className="text-right w-[140px]">Xem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-6" />
                        </TableCell>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : pendingCohorts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-muted-foreground"
                      >
                        Không có đợt khai giảng nào đang chờ duyệt.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingCohorts.map(
                      (o: AcademyCohort, index: number) => (
                        <TableRow key={o.id}>
                          <TableCell className="text-muted-foreground tabular-nums">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold">
                            {o.code}
                          </TableCell>
                          <TableCell className="font-medium">{o.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(o.submittedForApprovalAt || o.createdAt, "HH:mm dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 border-sky-500/40 text-sky-700 bg-transparent hover:bg-sky-50">
                              <Link to={`/academy/approvals/cohorts/${o.id}`}>
                                <Eye className="h-4 w-4" />
                                Xem
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ),
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="vodPackages" className="space-y-4">
            <div className={listPageSearchWrapClass}>
              <Search className={listPageSearchIconClass} />
              <Input
                placeholder="Tìm gói theo mã hoặc tên..."
                className={listPageSearchInputClass}
                value={vodPackageSearch}
                onChange={(e) => setVodPackageSearch(e.target.value)}
              />
            </div>
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead className="w-[120px]">Mã</TableHead>
                    <TableHead>Tên gói</TableHead>
                    <TableHead>Ngày gửi duyệt</TableHead>
                    <TableHead className="text-right w-[140px]">Xem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-6" />
                        </TableCell>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : pendingVodPackages.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground"
                      >
                        Không có gói nào đang chờ duyệt.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingVodPackages.map((p: AcademyVodPackage, index: number) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">
                          {p.code}
                        </TableCell>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(p.submittedForApprovalAt, "HH:mm dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 border-sky-500/40 text-sky-700 bg-transparent hover:bg-sky-50">
                            <Link to={`/academy/approvals/vod-packages/${p.id}`}>
                              <Eye className="h-4 w-4" />
                              Xem
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="courseProfiles" className="space-y-4">
            <div className={listPageSearchWrapClass}>
              <Search className={listPageSearchIconClass} />
              <Input
                placeholder="Tìm hồ sơ khóa học theo mã hoặc tên..."
                className={listPageSearchInputClass}
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
              />
            </div>
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead className="w-[120px]">Mã</TableHead>
                    <TableHead>Tên gốc</TableHead>
                    <TableHead className="w-[200px]">Ngày gửi duyệt</TableHead>
                    <TableHead className="text-right w-[140px]">Xem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-6" />
                        </TableCell>
                        {Array.from({ length: 4 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : pendingCourseProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Không có hồ sơ khóa học nào đang chờ duyệt.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingCourseProfiles.map((p: AcademyCourseProfile, index: number) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">
                          {p.code}
                        </TableCell>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(p.submittedForApprovalAt, "HH:mm dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 border-sky-500/40 text-sky-700 bg-transparent hover:bg-sky-50">
                            <Link to={`/academy/approvals/course-profiles/${p.id}`}>
                              <Eye className="h-4 w-4" />
                              Xem
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

