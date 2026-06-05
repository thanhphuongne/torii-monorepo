'use client';

import { useState } from 'react';
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
    ChevronRight,
    ChevronLeft,
    Newspaper,
} from "lucide-react";
import Link from "next/link";
import { useBlogs } from '@/lib/api/services/blog-api';
import { Skeleton } from "@workspace/ui/components/skeleton";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const ArrowRight = ChevronRight;
const ArrowLeft = ChevronLeft;

export function BlogListClient() {
    const [page, setPage] = useState(1);

    const { data, isLoading, error } = useBlogs({
        page,
        limit: 12,
        status: 'published' as any,
    });

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'dd/MM/yyyy', { locale: vi });
        } catch {
            return dateString;
        }
    };

    const blogs = data?.data || [];
    const totalPages = data?.totalPages || 1;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-8">
            <div className="space-y-4 pb-2 border-b border-border">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Blog kiến thức
                </h1>
                <p className="text-sm font-medium text-muted-foreground w-full max-w-xl">
                    Torii Insight — tin tức, mẹo học và văn hóa Nhật Bản từ Torii Nihongo.
                </p>
            </div>

            {error && (
                <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                    Không thể tải bài viết. Vui lòng thử lại sau.
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-card rounded-xl overflow-hidden shadow-sm border border-border">
                            <Skeleton className="h-56 w-full" />
                            <div className="p-6 space-y-3">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : blogs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
                    <Newspaper
                        className="mx-auto size-9 text-muted-foreground/40"
                        strokeWidth={1.25}
                        aria-hidden
                    />
                    <p className="mt-3 text-sm font-medium text-foreground">
                        Chưa có bài viết
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                        Nội dung sẽ xuất hiện tại đây khi đội ngũ đăng bài mới.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {blogs.map((blog) => (
                            <Link key={blog.id} href={`/dashboard/blogs/${blog.slug}`} className="block h-full">
                                <article
                                    className="bg-card/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border border-border/50 group flex flex-col h-full"
                                >
                                    <div className="relative h-50 overflow-hidden">
                                        {blog.coverImageUrl ? (
                                            <img
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                alt={blog.title}
                                                src={blog.coverImageUrl}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-muted flex items-center justify-center">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Không có xem trước</span>
                                            </div>
                                        )}
                                        {blog.tags && blog.tags.length > 0 && (
                                            <Badge className="absolute top-4 left-4 bg-primary/95 backdrop-blur-md border-none text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                                                {blog.tags[0]}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="p-5 flex flex-col flex-1 gap-3">
                                        <div className="space-y-1.5">
                                            <p className="text-primary/70 text-[10px] font-bold uppercase tracking-[0.2em]">
                                                {blog.publishedAt && formatDate(blog.publishedAt.toString())}
                                            </p>
                                            <h4 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                                {blog.title}
                                            </h4>
                                        </div>
                                        {blog.excerpt && (
                                            <p className="text-muted-foreground text-xs line-clamp-2 font-medium leading-relaxed">
                                                {blog.excerpt}
                                            </p>
                                        )}
                                    </div>
                                </article>
                            </Link>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 pt-10">
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-md"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ArrowLeft className="size-4" strokeWidth={3} />
                            </Button>

                            {[...Array(Math.min(totalPages, 5))].map((_, idx) => {
                                const pageNum = idx + 1;
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={page === pageNum ? 'default' : 'outline'}
                                        className={`size-12 rounded-xl border-border/50 font-bold ${
                                            page === pageNum
                                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                : 'bg-background/50 backdrop-blur-md'
                                        }`}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}

                            <Button
                                variant="outline"
                                size="icon"
                                className="size-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-md"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                <ArrowRight className="size-4" strokeWidth={3} />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
