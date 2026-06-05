'use client'

import { FileText, ChevronRight, GraduationCap } from 'lucide-react'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@workspace/ui/components/empty'
import { Item, ItemContent, ItemMedia, ItemTitle, ItemDescription, ItemActions } from '@workspace/ui/components/item'
import { Button } from '@workspace/ui/components/button'

interface CertificatesListProps {
    certificates: any[]
}

export function CertificatesList({ certificates }: CertificatesListProps) {
    if (!certificates || certificates.length === 0) {
        return (
            <div className="py-12">
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon" className="mb-4">
                            <GraduationCap className="size-8 text-muted-foreground/40" />
                        </EmptyMedia>
                        <EmptyTitle className="text-lg font-bold">Chưa có chứng chỉ</EmptyTitle>
                        <EmptyDescription className="text-sm text-muted-foreground max-w-xs">
                            Hoàn thành các khóa học để nhận chứng chỉ công nhận nhé!
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <Button variant="outline" className="h-9 px-4 font-bold border-dashed hover:border-solid transition-all">
                            Khám phá khóa học
                        </Button>
                    </EmptyContent>
                </Empty>
            </div>
        )
    }

    return (
        <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {certificates.map((cert) => (
                <Item
                    key={cert.id}
                    variant="outline"
                    className="group cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all p-4 rounded-2xl"
                >
                    <ItemMedia className="size-12 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <FileText className="size-6 transition-transform group-hover:scale-110" />
                    </ItemMedia>
                    <ItemContent className="pl-1">
                        <ItemTitle className="text-sm font-bold group-hover:text-primary transition-colors">
                            {cert.title}
                        </ItemTitle>
                        <ItemDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60 pt-0.5">
                            Cấp ngày {cert.date}
                        </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full size-8 bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all group-hover:translate-x-1"
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </ItemActions>
                </Item>
            ))}
        </div>
    )
}
