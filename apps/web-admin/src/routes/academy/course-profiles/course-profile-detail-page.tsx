import React, { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useParams, Link, useSearchParams } from "react-router-dom"
import { useAcademyCourseProfile, useSubmitAcademyCourseProfileForApproval } from "@/lib/api/services/academy-course-profiles"
import { useAcademyLiveClasses } from "@/lib/api/services/academy-live-classes"
import { useAcademyVodPackages } from "@/lib/api/services/academy-vod-packages"
import { PageHeader } from "@/components/common/page-header"
import { AlertTriangle, ChevronRight, BookOpen, Users, LayoutDashboard, Layers, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Video, FileText, Send, GripVertical, Eye } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { formatDateTime } from "@/lib/format-utils"
import { CreateCourseModuleDialog } from "./components/create-module-dialog"
import { EditCourseModuleDialog } from "./components/edit-module-dialog"
import { CreateLessonDialog } from "./components/create-lesson-sheet"
import { EditLessonDialog } from "./components/edit-lesson-sheet"
import { ViewLessonDialog } from "./components/view-lesson-sheet"
import { useDeleteAcademyCourseModule, useReorderAcademyCourseModules } from "@/lib/api/services/academy-course-modules"
import { useDeleteAcademyLesson, useReorderAcademyLessons } from "@/lib/api/services/academy-lessons"
import { toast } from "sonner"
import { CourseProfileSheet } from "./components/course-profile-sheet"
import { AssessmentPlanTab } from "./components/assessment-plan-tab"
import { Trophy } from "lucide-react"

const statusLabelMap: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  OPENING: "Đang tuyển sinh",
  PUBLISHED: "Đang hoạt động",
  ONGOING: "Đang diễn ra",
  COMPLETED: "Đã hoàn thành",
  ARCHIVED: "Đã lưu trữ",
}

interface SortableItemProps {
  id: string;
  children: (props: {
    attributes: any;
    listeners: any;
    isDragging: boolean;
  }) => React.ReactNode;
  disabled?: boolean;
}

function SortableItem({ id, children, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}

export default function CourseProfileDetailPage() {
  const { profileId } = useParams<{ profileId: string }>()
  const [createModuleOpen, setCreateModuleOpen] = useState(false)
  const [editModuleOpen, setEditModuleOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<any | null>(null)

  const [createLessonOpen, setCreateLessonOpen] = useState(false)
  const [createLessonModuleId, setCreateLessonModuleId] = useState<string | null>(null)

  const [editLessonOpen, setEditLessonOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<any | null>(null)
  const [viewLessonOpen, setViewLessonOpen] = useState(false)
  const [viewingLesson, setViewingLesson] = useState<any | null>(null)

  const [deleteModuleConfirm, setDeleteModuleConfirm] = useState<{
    open: boolean
    moduleId: string | null
    moduleTitle: string | null
  }>({ open: false, moduleId: null, moduleTitle: null })

  const [deleteLessonConfirm, setDeleteLessonConfirm] = useState<{
    open: boolean
    lessonId: string | null
    lessonTitle: string | null
  }>({ open: false, lessonId: null, lessonTitle: null })

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [submitDialog, setSubmitDialog] = useState(false)

  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'info'

  const { data: profile, isLoading: isLoadingProfile } = useAcademyCourseProfile(profileId)
  const submitForApprovalMutation = useSubmitAcademyCourseProfileForApproval()
  const { data: classes } = useAcademyLiveClasses({ courseProfileId: profileId } as any)
  const { data: vodPackages } = useAcademyVodPackages({ courseProfileId: profileId } as any)

  const qc = useQueryClient()
  const deleteModuleMutation = useDeleteAcademyCourseModule()
  const deleteLessonMutation = useDeleteAcademyLesson()
  const reorderModulesMutation = useReorderAcademyCourseModules()
  const reorderLessonsMutation = useReorderAcademyLessons()




  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragEndModules = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !profileId) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);

    const newModules = arrayMove(modules, oldIndex, newIndex);
    const moduleIds = newModules.map((m) => m.id);

    try {
      await reorderModulesMutation.mutateAsync({ courseProfileId: profileId, moduleIds });
                  toast.success("Đã thay đổi thứ tự mô-đun");
    } catch (err: any) {
                  toast.error(err.message || "Không thể thay đổi thứ tự mô-đun");
    }
  };

  const onDragEndLessons = async (event: DragEndEvent, moduleId: string) => {
    const { active, over } = event;
    const targetModule = modules.find(m => m.id === moduleId);
    if (!over || active.id === over.id || !targetModule?.lessons) return;

    const lessons = targetModule.lessons;
    const oldIndex = lessons.findIndex((l: any) => l.id === active.id);
    const newIndex = lessons.findIndex((l: any) => l.id === over.id);

    const newLessons = arrayMove(lessons, oldIndex, newIndex);
    const lessonIds = newLessons.map((l: any) => l.id);

    try {
      await reorderLessonsMutation.mutateAsync({ moduleId, lessonIds });
      toast.success("Đã thay đổi thứ tự bài học");
    } catch (err: any) {
      toast.error(err.message || "Không thể thay đổi thứ tự bài học");
    }
  };

  useEffect(() => {
    const mods = profile?.modules ?? []
    if (!mods.length) return
    setExpandedModules((prev) => {
      if (Object.keys(prev).length > 0) return prev
      const first = mods[0]
      if (!first) return prev
      return { [first.id]: true }
    })
  }, [profile])

  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed my-8">
        <BookOpen className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Không tìm thấy thông tin khóa học.</p>
        <Button variant="link" asChild className="mt-2">
          <Link to="/academy/course-profiles">Quay lại danh sách</Link>
        </Button>
      </div>
    )
  }

  // Sau khi đã gửi duyệt / được duyệt (PENDING_APPROVAL / PUBLISHED) thì không được chỉnh sửa curriculum nữa.
  const isLocked = profile.status !== "DRAFT"
  const modules = [...(profile.modules ?? [])]
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .map(m => ({
      ...m,
      lessons: [...(m.lessons ?? [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <Link
              to="/academy/course-profiles"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Hồ sơ khóa học
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
              <span className="truncate text-base font-bold sm:text-lg">{profile.code}</span>
            </div>
          </div>
        }
        subtitle={<span className="block max-w-full break-words leading-relaxed sm:line-clamp-1">{profile.title}</span>}
        stats={[
          { label: "Mã khóa", value: profile.code },
          { label: "Trình độ", value: profile.level || 'JLPT' },
          { label: "Lớp trực tiếp", value: classes?.length || 0 },
          { label: "Gói tự học", value: vodPackages?.length || 0 },
        ]}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {!isLocked && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setProfileSheetOpen(true)}
                >
                  Chỉnh sửa hồ sơ
                </Button>
            )}

            {profile.status === 'DRAFT' && (
              <Button
                disabled={isLocked || submitForApprovalMutation.isPending}
                onClick={() => setSubmitDialog(true)}
                className="w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto"
              >
                <Send className="size-4" />
                Gửi duyệt giáo trình
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-lg overflow-x-auto max-w-full">
          <TabsTrigger value="info" className="gap-2 px-4 py-2 whitespace-nowrap data-[state=active]:bg-background shadow-sm">
            <BookOpen className="size-4" /> Thông tin chi tiết
          </TabsTrigger>
          <TabsTrigger value="curriculum" className="gap-2 px-4 py-2 whitespace-nowrap data-[state=active]:bg-background shadow-sm">
            <Layers className="size-4" /> Chương trình học
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-2 px-4 py-2 whitespace-nowrap data-[state=active]:bg-background shadow-sm">
            <Users className="size-4" /> Danh sách lớp học
          </TabsTrigger>
          <TabsTrigger value="assessment" className="gap-2 px-4 py-2 whitespace-nowrap data-[state=active]:bg-background shadow-sm">
            <Trophy className="size-4" /> Kế hoạch đánh giá
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <TabsContent value="curriculum" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold">Quản lý chương trình</h3>
                <p className="text-sm text-muted-foreground">Phân chia giáo trình thành các mô-đun và bài học.</p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                {!isLocked && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 border-primary/20 text-primary font-medium hover:bg-primary/5 sm:w-auto"
                      onClick={() => setCreateModuleOpen(true)}
                    >
                      <Plus className="size-4" /> Thêm mô-đun mới
                    </Button>
                )}
              </div>
            </div>

            {(modules.length === 0) ? (
              <Card className="border-dashed shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Layers className="size-12 mb-4 opacity-10" />
                  <p className="font-medium text-balance text-center max-w-xs">Hồ sơ khóa học này chưa có chương trình học nào.</p>
                  {!isLocked && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setCreateModuleOpen(true)}
                      >
                        Khởi tạo mô-đun đầu tiên
                      </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEndModules}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext
                  items={modules.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {modules.map((module) => {
                      const isExpanded = !!expandedModules[module.id]
                      return (
                        <SortableItem key={module.id} id={module.id} disabled={isLocked}>
                          {({ attributes, listeners, isDragging }) => (
                            <Card className={`overflow-hidden transition-all ${isDragging ? "ring-2 ring-primary shadow-lg scale-[1.01] z-50 bg-background" : ""}`}>
                              <div className="flex items-center justify-between gap-3 p-4">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {!isLocked && (
                                    <div
                                      {...attributes}
                                      {...listeners}
                                      className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                    >
                                      <GripVertical className="size-4" />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className="flex-1 min-w-0 text-left flex items-center gap-3"
                                    onClick={() => {
                                      setExpandedModules((prev) => ({
                                        ...prev,
                                        [module.id]: !prev[module.id],
                                      }))
                                    }}
                                  >
                                    <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
                                      {module.orderIndex}
                                    </div>
                                    <div className="min-w-0">
                                      <CardTitle className="text-base font-semibold truncate">
                                        {module.title}
                                      </CardTitle>
                                      <CardDescription className="text-xs">
                                        {module.lessons?.length || 0} bài giảng
                                      </CardDescription>
                                    </div>
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {!isLocked && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="hidden sm:inline-flex"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingModule(module)
                                          setEditModuleOpen(true)
                                        }}
                                      >
                                        Chỉnh sửa
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="hidden sm:inline-flex"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setDeleteModuleConfirm({
                                            open: true,
                                            moduleId: module.id,
                                            moduleTitle: module.title,
                                          })
                                        }}
                                      >
                                        Xóa
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="sm:hidden h-8 w-8"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingModule(module)
                                          setEditModuleOpen(true)
                                        }}
                                      >
                                        <Pencil className="size-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="sm:hidden h-8 w-8 text-destructive border-destructive/30"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setDeleteModuleConfirm({
                                            open: true,
                                            moduleId: module.id,
                                            moduleTitle: module.title,
                                          })
                                        }}
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </>
                                  )}

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setExpandedModules((prev) => ({
                                        ...prev,
                                        [module.id]: !prev[module.id],
                                      }))
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="size-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="size-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              </div>

                              {isExpanded && (
                                <CardContent className="pt-0">
                                  <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={(event) => onDragEndLessons(event, module.id)}
                                    modifiers={[restrictToVerticalAxis]}
                                  >
                                    <SortableContext
                                      items={module.lessons?.map((l: any) => l.id) || []}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      <div className="space-y-1 p-2">
                                        {module.lessons?.map((lesson: any) => (
                                          <SortableItem key={lesson.id} id={lesson.id} disabled={isLocked}>
                                            {({ attributes: lAttrs, listeners: lListeners, isDragging: lIsDragging }) => (
                                              <div
                                                className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 transition-all ${lIsDragging ? "bg-muted shadow-sm ring-1 ring-primary/20 scale-[1.01] z-50" : "hover:bg-muted/30"}`}
                                              >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                  {!isLocked && (
                                                    <div
                                                      {...lAttrs}
                                                      {...lListeners}
                                                      className="cursor-grab active:cursor-grabbing p-1 hover:bg-background rounded text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                                                    >
                                                      <GripVertical className="size-3.5" />
                                                    </div>
                                                  )}
                                                  {lesson.type === "VIDEO" ? (
                                                    <Video className="size-4 text-blue-500 shrink-0" />
                                                  ) : (
                                                    <FileText className="size-4 text-orange-500 shrink-0" />
                                                  )}
                                                  <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{lesson.title}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">
                                                      {lesson.type}
                                                    </p>
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2"
                                                    onClick={() => {
                                                      setViewingLesson(lesson)
                                                      setViewLessonOpen(true)
                                                    }}
                                                  >
                                                    <Eye className="size-4 sm:mr-1" />
                                                    <span className="hidden sm:inline">Xem</span>
                                                  </Button>
                                                  {!isLocked && (
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-2"
                                                        onClick={() => {
                                                          setEditingLesson(lesson)
                                                          setEditLessonOpen(true)
                                                        }}
                                                      >
                                                        <Pencil className="size-4 sm:mr-1" />
                                                        <span className="hidden sm:inline">Sửa</span>
                                                      </Button>
                                                  )}
                                                  {!isLocked && (
                                                      <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="h-8 px-2"
                                                        onClick={() => {
                                                          setDeleteLessonConfirm({
                                                            open: true,
                                                            lessonId: lesson.id,
                                                            lessonTitle: lesson.title,
                                                          })
                                                        }}
                                                      >
                                                        <Trash2 className="size-4 sm:mr-1" />
                                                        <span className="hidden sm:inline">Xóa</span>
                                                      </Button>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </SortableItem>
                                        ))}

                                        {(!module.lessons || module.lessons.length === 0) && (
                                          <div className="py-8 text-center text-xs text-muted-foreground italic">
                                            Chưa có bài giảng.
                                          </div>
                                        )}

                                        {!isLocked && (
                                            <Button
                                              variant="ghost"
                                              className="w-full justify-start gap-2 mt-2"
                                              onClick={() => {
                                                setCreateLessonModuleId(module.id)
                                                setCreateLessonOpen(true)
                                              }}
                                            >
                                              <Plus className="size-4" />
                                              Thêm bài học mới
                                            </Button>
                                        )}
                                      </div>
                                    </SortableContext>
                                  </DndContext>
                                </CardContent>
                              )}
                            </Card>
                          )}
                        </SortableItem>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </TabsContent>

          <TabsContent value="classes" className="space-y-8">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Các lớp học trực tiếp</CardTitle>
                    <CardDescription>Danh sách các lớp học đang diễn ra hoặc sắp mở thuộc hồ sơ này.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                    {classes?.length || 0} Lớp
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 px-6">STT</TableHead>
                      <TableHead>Mã lớp</TableHead>
                      <TableHead>Tên lớp</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right px-6">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes?.map((cls, index) => (
                      <TableRow key={cls.id} className="group transition-colors">
                        <TableCell className="px-6 text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-primary">{cls.code}</TableCell>
                        <TableCell className="font-medium">{cls.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={(cls.status === 'PUBLISHED' || cls.status === 'OPENING' || cls.status === 'ONGOING') ? 'default' : cls.status === 'ARCHIVED' ? 'destructive' : 'secondary'}
                            className="text-[10px]"
                          >
                            {statusLabelMap[cls.status] ?? cls.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 gap-2 border-primary/30 text-primary bg-transparent hover:bg-primary/5"
                          >
                            <Link to={`/academy/live-classes/${cls.id}/detail`} className="flex items-center gap-2">
                              <LayoutDashboard className="size-4" />
                              Quản lý lớp
                              <ChevronRight className="size-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!classes || classes.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                          Chưa có lớp học nào.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Các gói bài giảng tự học</CardTitle>
                    <CardDescription>Danh sách các gói tự học đang bán hoặc đang soạn thảo dựa trên hồ sơ này.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                    {vodPackages?.length || 0} Gói
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 px-6">STT</TableHead>
                      <TableHead>Mã gói</TableHead>
                      <TableHead>Tên gói tự học</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right px-6">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vodPackages?.map((pkg, index) => (
                      <TableRow key={pkg.id} className="group transition-colors">
                        <TableCell className="px-6 text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-orange-600">{pkg.code}</TableCell>
                        <TableCell className="font-medium">{pkg.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant={pkg.status === 'PUBLISHED' ? 'default' : pkg.status === 'ARCHIVED' ? 'destructive' : 'secondary'}
                            className={`text-[10px] ${pkg.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-600 border-none' : ''}`}
                          >
                            {statusLabelMap[pkg.status] ?? pkg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 gap-2 border-orange-500/30 text-orange-700 bg-transparent hover:bg-orange-50"
                          >
                            <Link to={`/academy/vod-packages/${pkg.id}/detail`} className="flex items-center gap-2">
                              <LayoutDashboard className="size-4" />
                              Quản lý gói
                              <ChevronRight className="size-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!vodPackages || vodPackages.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                          Chưa có gói tự học nào.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessment">
            <AssessmentPlanTab
              courseProfileId={profileId as string}
              modules={profile.modules || []}
            />
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin định danh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tên khóa học</p>
                    <p className="text-sm font-semibold">{profile.title}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mã hồ sơ</p>
                    <p className="text-sm font-mono font-bold text-primary">{profile.code}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Trình độ tương đương</p>
                    <p className="text-sm font-medium">{profile.level || 'Chưa xác định'}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mô tả khóa học</p>
                  <p className="text-sm text-balance leading-relaxed">
                    {profile.description || 'Chưa có thông tin mô tả chi tiết cho hồ sơ khóa học này.'}
                  </p>
                </div>

                <div className="pt-4 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Ngày tạo: {formatDateTime(profile.createdAt, "HH:mm dd/MM/yyyy")}</span>
                  <span>Cập nhật cuối: {formatDateTime(profile.updatedAt, "HH:mm dd/MM/yyyy")}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <CreateCourseModuleDialog
        open={createModuleOpen}
        onOpenChange={setCreateModuleOpen}
        courseProfileId={profileId as string}
      />

      <EditCourseModuleDialog
        open={editModuleOpen}
        onOpenChange={setEditModuleOpen}
        courseProfileId={profileId as string}
        module={editingModule}
      />

      {createLessonModuleId && (
        <CreateLessonDialog
          open={createLessonOpen}
          onOpenChange={setCreateLessonOpen}
          moduleId={createLessonModuleId}
          courseProfileId={profileId as string}
        />
      )}

      {editingLesson && (
        <EditLessonDialog
          open={editLessonOpen}
          onOpenChange={setEditLessonOpen}
          lesson={editingLesson}
          courseProfileId={profileId as string}
        />
      )}

      {viewingLesson && (
        <ViewLessonDialog
          open={viewLessonOpen}
          onOpenChange={(open) => {
            setViewLessonOpen(open)
            if (!open) setViewingLesson(null)
          }}
          lesson={viewingLesson}
        />
      )}

      <CourseProfileSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        profile={profile as any}
      />

      <Dialog open={submitDialog} onOpenChange={setSubmitDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Xác nhận gửi duyệt hồ sơ</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn gửi duyệt hồ sơ <strong>{profile.code}</strong>?
              Sau khi gửi duyệt, curriculum sẽ bị khóa để tránh thay đổi ngẫu nhiên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitDialog(false)}
              disabled={submitForApprovalMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={async () => {
                try {
                  await submitForApprovalMutation.mutateAsync(profile.id)
                  toast.success(`Đã gửi duyệt hồ sơ ${profile.code} thành công`)
                  setSubmitDialog(false)
                } catch (err: any) {
                  toast.error(err?.response?.data?.message || err.message || "Không thể gửi duyệt hồ sơ.")
                }
              }}
              disabled={submitForApprovalMutation.isPending}
            >
              Xác nhận gửi duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteModuleConfirm.open}
        onOpenChange={(open) => {
          if (!open) setDeleteModuleConfirm({ open: false, moduleId: null, moduleTitle: null })
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xác nhận xóa mô-đun</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa mô-đun{" "}
              <span className="font-semibold text-foreground">{deleteModuleConfirm.moduleTitle}</span>
              ? Toàn bộ bài học trong mô-đun cũng bị xóa. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                disabled={deleteModuleMutation.isPending}
              >
                Hủy
              </Button>
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteModuleConfirm.moduleId) return
                try {
                  await deleteModuleMutation.mutateAsync({
                    courseProfileId: profileId as string,
                    moduleId: deleteModuleConfirm.moduleId,
                  })
                  setExpandedModules({})
                  setDeleteModuleConfirm({ open: false, moduleId: null, moduleTitle: null })
                  toast.success("Đã xóa mô-đun")
                } catch (err: any) {
                  toast.error(err?.response?.data?.message || err.message || "Không thể xóa mô-đun")
                }
              }}
              disabled={deleteModuleMutation.isPending}
            >
              {deleteModuleMutation.isPending ? "Đang xóa..." : "Xóa mô-đun"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteLessonConfirm.open}
        onOpenChange={(open) => {
          if (!open) setDeleteLessonConfirm({ open: false, lessonId: null, lessonTitle: null })
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xác nhận xóa bài học</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa bài học{" "}
              <span className="font-semibold text-foreground">{deleteLessonConfirm.lessonTitle}</span>
              ? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                disabled={deleteLessonMutation.isPending}
              >
                Hủy
              </Button>
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteLessonConfirm.lessonId) return
                try {
                  await deleteLessonMutation.mutateAsync(deleteLessonConfirm.lessonId)
                  await qc.invalidateQueries({ queryKey: ["academy-course-profile", profileId as string] })
                  setDeleteLessonConfirm({ open: false, lessonId: null, lessonTitle: null })
                  toast.success("Đã xóa bài học")
                } catch (err: any) {
                  toast.error(err?.response?.data?.message || err.message || "Không thể xóa bài học")
                }
              }}
              disabled={deleteLessonMutation.isPending}
            >
              {deleteLessonMutation.isPending ? "Đang xóa..." : "Xóa bài học"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
