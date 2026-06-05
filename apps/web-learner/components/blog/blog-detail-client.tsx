'use client';

import { useEffect } from 'react';
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import {
    Calendar,
    Clock,
    Eye,
    ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { useBlogBySlug, blogApi } from '@/lib/api/services/blog-api';
import { Skeleton } from "@workspace/ui/components/skeleton";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface BlogDetailClientProps {
    slug: string;
}

export function BlogDetailClient({ slug }: BlogDetailClientProps) {
    const { data: blog, isLoading, error } = useBlogBySlug(slug ? decodeURIComponent(slug).trim() : null);

    // Increment view count on mount
    useEffect(() => {
        if (blog?.id) {
            blogApi.incrementViewCount(blog.id);
        }
    }, [blog?.id]);

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'dd MMMM, yyyy', { locale: vi });
        } catch {
            return dateString;
        }
    };

    const getReadingTime = (content: string) => {
        const raw = (content ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const trimmed = raw.trim();

        // 1) Nếu content là JSON blocks (editor), lấy text từ các block để tính thời gian đọc
        try {
            const parsed = JSON.parse(trimmed);
            const blocks = Array.isArray(parsed) ? parsed : parsed?.blocks;
            if (Array.isArray(blocks)) {
                const text = blocks
                    .map((b: any) => {
                        const data = b?.data ?? {};
                        return (
                            data?.text ??
                            data?.caption ??
                            data?.code ??
                            (Array.isArray(data?.items) ? data.items.join(' ') : '') ??
                            ''
                        );
                    })
                    .join(' ');

                const words = text.split(/\s+/).filter(Boolean).length;
                const minutes = Math.max(1, Math.ceil(words / 200));
                return `${minutes} phút đọc`;
            }
        } catch {
            // ignore -> fallback sang text thuần phía dưới
        }

        // 2) Fallback: content là text/markdown thuần
        const words = trimmed.split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.ceil(words / 200));
        return `${minutes} phút đọc`;
    };

    const renderContent = (content: string) => {
        const raw = (content ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const trimmed = raw.trim();

        // 1) Cố parse JSON blocks (format của editor)
        try {
            const parsed = JSON.parse(trimmed);
            const blocks = Array.isArray(parsed) ? parsed : parsed?.blocks;
            if (Array.isArray(blocks)) {
                return (
                    <div className="prose prose-lg max-w-none dark:prose-invert">
                        {blocks.map((block: any, index: number) => {
                            const data = block?.data ?? {};
                            switch (block?.type) {
                                case 'header': {
                                    const level = (data?.level ?? 2) as 1 | 2 | 3 | 4 | 5 | 6;
                                    const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
                                    return <Tag key={index} dangerouslySetInnerHTML={{ __html: data?.text ?? '' }} />;
                                }
                                case 'paragraph':
                                    return <p key={index} dangerouslySetInnerHTML={{ __html: data?.text ?? '' }} />;
                                case 'list': {
                                    const ListTag = data?.style === 'ordered' ? 'ol' : 'ul';
                                    return (
                                        <ListTag key={index}>
                                            {Array.isArray(data?.items) && data.items.map((item: string, i: number) => (
                                                <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                                            ))}
                                        </ListTag>
                                    );
                                }
                                case 'quote':
                                    return (
                                        <blockquote key={index}>
                                            <p dangerouslySetInnerHTML={{ __html: data?.text ?? '' }} />
                                            {data?.caption && <cite>{data.caption}</cite>}
                                        </blockquote>
                                    );
                                case 'code':
                                    return <pre key={index}><code>{data?.code ?? ''}</code></pre>;
                                case 'image':
                                    return (
                                        <figure key={index}>
                                            <img src={data?.file?.url ?? ''} alt={data?.caption || ''} />
                                            {data?.caption && <figcaption>{data.caption}</figcaption>}
                                        </figure>
                                    );
                                case 'delimiter':
                                    return <hr key={index} />;
                                case 'table':
                                    return (
                                        <table key={index}>
                                            <tbody>
                                                {Array.isArray(data?.content) && data.content.map((row: string[], i: number) => (
                                                    <tr key={i}>
                                                        {Array.isArray(row) && row.map((cell: string, j: number) => (
                                                            <td key={j} dangerouslySetInnerHTML={{ __html: cell }} />
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    );
                                default:
                                    return null;
                            }
                        })}
                    </div>
                );
            }
        } catch {
            // ignore -> fallback sang render text thuần
        }

        // 2) Fallback: content là text/markdown thuần.
        // Render theo block tách bởi khoảng trắng dòng đôi để giữ cấu trúc đoạn văn.
        const paragraphs = trimmed.length > 0 ? trimmed.split(/\n{2,}/) : [];
        return (
            <div className="prose prose-lg max-w-none dark:prose-invert">
                {paragraphs.length > 0
                    ? paragraphs.map((p, i) => (
                        <p key={i}>
                            {p.split('\n').map((line, j, arr) => (
                                <span key={j}>
                                    {line}
                                    {j < arr.length - 1 ? <br /> : null}
                                </span>
                            ))}
                        </p>
                    ))
                    : null}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="bg-card border-b border-border py-4">
                    <div className="container mx-auto px-4 lg:px-8">
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
                <main className="container mx-auto px-4 lg:px-8 py-10 md:py-16">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <Skeleton className="h-8 w-32 mx-auto" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-6 w-3/4 mx-auto" />
                        <Skeleton className="h-96 w-full rounded-2xl" />
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !blog) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-2">Không tìm thấy bài viết</h1>
                    <p className="text-muted-foreground mb-4">Bài viết bạn tìm kiếm không tồn tại hoặc đã bị xóa.</p>
                    <Link href="/dashboard/blogs">
                        <Button>Quay lại danh sách</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-sans text-foreground">
            <main className="container mx-auto px-4 lg:px-8 py-10 md:py-16">
                {/* Header Section */}
                <div className="max-w-4xl mx-auto mb-12">
                    <div className="flex flex-col gap-6 text-left">
                        <div className="flex flex-wrap items-center gap-3">
                            <Link href="/dashboard/blogs" className="text-muted-foreground hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                                <ChevronLeft className="size-3" strokeWidth={3} />
                                Quay lại
                            </Link>
                            {blog.tags && blog.tags.length > 0 && (
                                <Badge className="bg-primary/10 text-primary border-none text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 py-1">
                                    {blog.tags[0]}
                                </Badge>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                            {blog.title}
                        </h1>

                        {blog.excerpt && (
                            <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed max-w-3xl border-l-4 border-primary/20 pl-6 italic">
                                {blog.excerpt}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-y-4 gap-x-8 text-xs sm:text-sm text-muted-foreground font-bold uppercase tracking-widest mt-2 border-t border-border/50 pt-6">
                            {blog.publishedAt && (
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-muted text-primary"><Calendar className="size-4" /></div>
                                    <span>{formatDate(blog.publishedAt.toString())}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-muted text-primary"><Clock className="size-4" /></div>
                                <span>{getReadingTime(blog.content)}</span>
                            </div>
                            {blog.viewCount !== undefined && (
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-muted text-primary"><Eye className="size-4" /></div>
                                    <span>{blog.viewCount} lượt xem</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Featured Image */}
                {blog.coverImageUrl && (
                    <div className="max-w-5xl mx-auto mb-16 px-0 sm:px-4">
                        <div className="aspect-[21/9] rounded-[2rem] overflow-hidden shadow-2xl border border-border/50">
                            <img
                                src={blog.coverImageUrl}
                                className="w-full h-full object-cover"
                                alt={blog.title}
                            />
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="max-w-4xl mx-auto">
                    <article className="prose-container">
                        {renderContent(blog.content)}
                    </article>
                </div>
            </main>
        </div>
    );
}
