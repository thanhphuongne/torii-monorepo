import { Users, User } from 'lucide-react'
import type { AcademyCourseProfileCreateDTO } from '@workspace/schemas'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@workspace/ui/lib/utils'

interface CourseInstructorProps {
    course: AcademyCourseProfileCreateDTO & { lecturer?: any }
}

export function CourseInstructor({ course }: CourseInstructorProps) {
    const lecturer = course.lecturer;

    if (!lecturer) {
        return (
            <div className="space-y-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Users className="text-primary size-6" />
                    Giảng viên
                </h3>

                <div className="bg-muted/30 p-8 rounded-2xl flex flex-col md:flex-row gap-8 items-start">

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-2xl font-bold">Giảng viên Torii Nihongo</h3>
                            <p className="text-primary font-medium">Chuyên gia đào tạo JLPT</p>
                        </div>

                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Đội ngũ giảng viên giàu kinh nghiệm với phương pháp giảng dạy hiện đại, giúp học viên chinh phục JLPT một cách hiệu quả nhất.
                        </p>

                        <div className="flex gap-4">
                            <Link href="/dashboard/available-courses" className="text-sm font-bold text-primary hover:underline">
                                Các khóa học khác
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const instructorName = lecturer?.displayName || "Giảng viên Torii Nihongo";
    const instructorHref = lecturer?.id ? `/dashboard/instructors/${lecturer.id}?name=${encodeURIComponent(instructorName)}` : '#';
    const initials = instructorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const avatarUrl = lecturer?.avatarUrl || lecturer?.avatar;

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Users className="text-primary size-6" />
                Giảng viên
            </h3>

            <div className="bg-muted/30 p-8 rounded-2xl flex flex-col md:flex-row gap-8 items-start">
                <div className="shrink-0">
                    <Link href={instructorHref} className={cn("block group", !lecturer?.id && "pointer-events-none")}>
                        <Avatar className="size-32 rounded-full overflow-hidden shadow-lg ring-1 ring-border/50 group-hover:ring-primary transition-all duration-300">
                            {avatarUrl && (
                                <AvatarImage
                                    src={avatarUrl}
                                    alt={instructorName}
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            )}
                            <AvatarFallback className="rounded-full bg-gradient-to-br from-primary/10 to-primary/20 text-primary text-3xl font-bold flex items-center justify-center">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                </div>

                <div className="space-y-4 flex-1 pt-2">
                    <div>
                        <Link href={instructorHref} className={cn("inline-block hover:text-primary transition-colors", !lecturer?.id && "pointer-events-none")}>
                            <h3 className="text-2xl font-bold tracking-tight">{instructorName}</h3>
                        </Link>
                        <p className="text-primary/70 font-semibold text-sm mt-1 uppercase tracking-wider">
                            {lecturer ? "Giảng viên tại Torii Nihongo" : "Chuyên gia đào tạo JLPT"}
                        </p>
                    </div>

                    <p className="text-sm leading-relaxed text-muted-foreground/80 font-medium max-w-2xl">
                        {lecturer?.bio || "Giảng viên giàu kinh nghiệm với phương pháp giảng dạy hiện đại, giúp học viên chinh phục JLPT một cách hiệu quả và tự tin nhất."}
                    </p>

                    {lecturer?.id && (
                        <div className="flex gap-4 pt-2">
                            <Link href={instructorHref} className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 hover:bg-primary/10 transition-colors">
                                Xem hồ sơ đầy đủ & các khóa học
                                <User className="size-3" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
