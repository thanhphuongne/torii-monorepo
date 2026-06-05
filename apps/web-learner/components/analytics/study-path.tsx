"use client"

import { CheckCircle2, Circle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"

interface StudyPathNode {
    title: string;
    status: 'completed' | 'in-progress' | 'locked';
    description: string;
}

interface StudyPathProps {
    roadmap?: StudyPathNode[];
}

export function StudyPath({ roadmap }: StudyPathProps) {
    const defaultRoadmap: StudyPathNode[] = [
        { title: "Hiragana và Katakana", status: "completed", description: "Nắm vững hệ chữ viết cơ bản" },
        { title: "Từ vựng N5", status: "completed", description: "800 từ vựng cốt lõi" },
        { title: "Ngữ pháp N5", status: "in-progress", description: "Trợ từ cơ bản và chia động từ" },
        { title: "Hán tự nhập môn", status: "locked", description: "100 chữ đầu tiên" },
        { title: "Đọc hiểu cơ bản", status: "locked", description: "Đoạn văn và hội thoại ngắn" },
    ]

    const displayRoadmap = roadmap || defaultRoadmap

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lộ trình JLPT N5</CardTitle>
                <CardDescription>Lộ trình cá nhân hóa để chinh phục chứng chỉ</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6 border-l-2 border-muted space-y-8">
                    {displayRoadmap.map((step, i) => (
                        <div key={i} className="relative">
                            <span className={cn(
                                "absolute -left-[31px] bg-background border-2 rounded-full p-1",
                                step.status === "completed" ? "border-primary/50 text-primary/50" :
                                    step.status === "in-progress" ? "border-primary text-primary" : "border-muted text-muted-foreground"
                            )}>
                                {step.status === "completed" ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                            </span>

                            <div className="space-y-1">
                                <h4 className={cn("font-semibold text-sm leading-none", step.status === "locked" && "text-muted-foreground")}>
                                    {step.title}
                                </h4>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>

                            {step.status === "in-progress" && (
                                <Badge variant="secondary" className="mt-2">
                                    Trọng tâm hiện tại
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
