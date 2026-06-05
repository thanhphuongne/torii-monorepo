import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import {
    BookOpen,
    Video,
    GraduationCap,
    Calendar,
    Hash,
    FileText,
    Tag,
} from "lucide-react"
import { type AcademyVodPackage } from "@/lib/api/services/academy-vod-packages"
import { formatCurrency, formatDateTime } from "@/lib/format-utils"

interface VodInfoTabProps {
    pkg: AcademyVodPackage
    profile: any // The linked course profile
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Bản nháp",
    PENDING_APPROVAL: "Chờ duyệt",
    PUBLISHED: "Đang bán",
    ARCHIVED: "Lưu trữ",
}

export function VodInfoTab({ pkg, profile }: VodInfoTabProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="size-5" />
                        Thông tin gói tự học
                    </CardTitle>
                    <CardDescription>Mã gói, tên gói và trạng thái niêm yết</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center gap-3">
                            <Hash className="size-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Mã gói</p>
                                <p className="font-mono font-medium">{pkg.code}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <FileText className="size-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Tên hiển thị</p>
                                <p className="font-medium">{pkg.title}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Tag className="size-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Giá bán</p>
                                <div className="flex flex-col">
                                    {pkg.discountPrice ? (
                                        <>
                                            <p className="font-bold text-primary text-lg">{formatCurrency(pkg.discountPrice as any)}</p>
                                            <p className="text-xs text-muted-foreground line-through decoration-muted-foreground/50">
                                                {formatCurrency(pkg.price)}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="font-bold text-primary text-lg">{formatCurrency(pkg.price)}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="size-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Trạng thái</p>
                                <Badge variant={pkg.status === 'PUBLISHED' ? 'default' : 'outline'}>
                                    {STATUS_LABELS[pkg.status] ?? pkg.status}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="size-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Ngày tạo</p>
                                <p className="font-medium">{formatDateTime(pkg.createdAt, "dd/MM/yyyy HH:mm")}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <GraduationCap className="size-4" />
                            Hồ sơ khóa học liên kết
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <BookOpen className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Tên khóa học gốc</p>
                                <p className="font-medium">{profile?.title || "—"}</p>
                                {profile?.level && (
                                    <Badge variant="outline" className="mt-1 text-[10px] h-4">
                                        {profile.level}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-start gap-3 border-t pt-4">
                            <Hash className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-muted-foreground">Mã hồ sơ</p>
                                <p className="font-mono font-medium">{profile?.code || "—"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Video className="size-4" />
                            Cấu trúc nội dung
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">Số lượng mô-đun</p>
                                <p className="text-2xl font-bold">{profile?.modules?.length || 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tổng số bài giảng</p>
                                <p className="text-2xl font-bold">
                                    {(profile?.modules ?? []).reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

    )
}
