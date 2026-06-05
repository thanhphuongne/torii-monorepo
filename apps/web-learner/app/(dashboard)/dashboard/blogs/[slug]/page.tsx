import { BlogDetailClient } from '@/components/blog/blog-detail-client'

type BlogDetailPageProps = {
    params: Promise<{
        slug: string
    }>
}

export default async function DashboardBlogDetailPage({ params }: BlogDetailPageProps) {
    const { slug } = await params
    return <BlogDetailClient slug={slug} />
}
