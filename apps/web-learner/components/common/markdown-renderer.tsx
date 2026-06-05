'use client'

import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { useMemo } from 'react'
import { cn } from '@workspace/ui/lib/utils'

interface MarkdownRendererProps {
    content: string | null | undefined
    className?: string
    /**
     * When true, renders content inline (no block elements).
     * Useful for question stems that should flow within text.
     */
    inline?: boolean
}

/**
 * Renders markdown content safely using `marked` + `DOMPurify`.
 * Falls back to plain text rendering if content has no markdown syntax.
 */
export function MarkdownRenderer({ content, className, inline = false }: MarkdownRendererProps) {
    const html = useMemo(() => {
        if (!content) return ''
        const trimmed = content.trim()
        const raw = inline
            ? marked.parseInline(trimmed)
            : marked.parse(trimmed, { async: false })
        return DOMPurify.sanitize(raw as string)
    }, [content, inline])

    if (!content) return null

    if (inline) {
        return (
            <span
                className={cn('prose prose-sm dark:prose-invert max-w-none inline', className)}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        )
    }

    return (
        <div
            className={cn(
                'prose prose-sm dark:prose-invert max-w-none',
                'prose-p:mt-0 prose-p:mb-3 last:prose-p:mb-0',
                'prose-headings:mt-4 prose-headings:mb-2 prose-pre:text-xs prose-code:text-xs',
                className
            )}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}
