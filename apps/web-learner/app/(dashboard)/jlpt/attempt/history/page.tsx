'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { PageLoading } from '@workspace/ui/components/page-loading'
import { ArrowLeft, History as HistoryIcon } from 'lucide-react'
import { jlptMockApi, type JlptMockAttemptHistoryItem } from '@/lib/api/services/jlpt-mock-api'
import { cn } from '@workspace/ui/lib/utils'
import { dataTableHeaderClass, dataTableShellClass } from '@/lib/ui-shell'

const LEVEL_FILTERS = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'] as const

function statusBadge(status: string) {
  if (status === 'SUBMITTED') {
    return {
      text: 'Đã nộp',
      variant: 'default' as const,
      className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
    }
  }

  if (status === 'IN_PROGRESS') {
    return {
      text: 'Đang làm',
      variant: 'secondary' as const,
      className: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
    }
  }

  return {
    text: 'Chưa xác định',
    variant: 'outline' as const,
    className: '',
  }
}

function getFilteredItems(items: JlptMockAttemptHistoryItem[], level: string) {
  if (level === 'ALL') return items
  return items.filter((item) => item.levelCode?.toUpperCase() === level)
}

export default function JlptAttemptHistoryPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['jlpt-attempt-history'],
    queryFn: () => jlptMockApi.findAttemptHistory(),
  })
  const [selectedLevel, setSelectedLevel] = useState<(typeof LEVEL_FILTERS)[number]>('ALL')

  const filteredItems = useMemo(() => getFilteredItems(items, selectedLevel), [items, selectedLevel])

  if (isLoading) return <PageLoading className="h-screen" />

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 sm:space-y-8 sm:px-6">
      <div className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <Button
              variant="ghost"
              className="h-9 w-full justify-start gap-2 rounded-lg border px-3 sm:w-fit"
              asChild
            >
              <Link href="/dashboard/jlpt-list-exam">
                <ArrowLeft className="size-4" />
                Quay lại danh sách đề
              </Link>
            </Button>

            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Lịch sử làm bài</h1>
              <p className="text-sm font-medium text-muted-foreground">
                Xem lại các lần luyện thi JLPT và mở chi tiết theo từng bài làm.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium leading-none text-muted-foreground">Tổng số lượt thi</p>
              <p className="text-xl font-bold leading-none tabular-nums text-foreground">{items.length}</p>
            </div>

            <Button asChild variant="outline" className="h-10 w-full rounded-lg px-6 sm:w-auto">
              <Link href="/dashboard/jlpt-list-exam">Thi thử mới</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {LEVEL_FILTERS.map((level) => {
            const active = selectedLevel === level
            return (
              <Button
                key={level}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setSelectedLevel(level)}
                className={cn('h-9 rounded-lg px-4 text-sm', active && 'shadow-none')}
              >
                {level === 'ALL' ? 'Tất cả cấp độ' : level}
              </Button>
            )
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-5 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
            <HistoryIcon className="size-7 text-muted-foreground/20" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-lg font-bold">Chưa có dữ liệu</h3>
            <p className="text-sm font-medium text-muted-foreground">
              Bạn chưa tham gia bất kỳ đề thi thử JLPT nào.
            </p>
          </div>
          <Button asChild variant="outline" className="h-10 rounded-lg px-8">
            <Link href="/dashboard/jlpt-list-exam">Bắt đầu ngay</Link>
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Chưa có lượt thi nào cho cấp độ {selectedLevel}.
          </p>
        </div>
      ) : (
        <div className={dataTableShellClass}>
          <Table>
            <TableHeader className={dataTableHeaderClass}>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px] text-center">STT</TableHead>
                <TableHead className="min-w-[240px] pl-4">Đề thi</TableHead>
                <TableHead className="hidden text-center sm:table-cell">Cấp độ</TableHead>
                <TableHead className="hidden text-center md:table-cell">Thời gian</TableHead>
                <TableHead className="text-center">Tình trạng</TableHead>
                <TableHead className="w-[150px] pr-4 text-right">
                  <span className="sr-only">Thao tác</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item, idx) => {
                const badge = statusBadge(item.status)
                const displayTime = item.submittedAt || item.startedAt

                return (
                  <TableRow key={item.id} className="border-b transition-colors last:border-b-0 hover:bg-muted/30">
                    <TableCell className="py-4 text-center text-xs font-medium tabular-nums text-muted-foreground/60">
                      {String(idx + 1).padStart(2, '0')}
                    </TableCell>
                    <TableCell className="py-4 pl-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-sm font-semibold tracking-tight text-foreground">
                          {item.template.title}
                        </div>
                        <div className="text-xs font-medium tabular-nums text-muted-foreground/40">
                          {item.template.code ?? item.templateId.substring(0, 8).toUpperCase()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-4 text-center sm:table-cell">
                      <Badge variant="outline" className="font-normal tabular-nums">
                        {item.levelCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden py-4 text-center tabular-nums md:table-cell">
                      <div className="text-sm font-medium leading-none text-muted-foreground/70">
                        {displayTime ? format(new Date(displayTime), 'dd/MM/yyyy') : '—'}
                      </div>
                      <div className="mt-1 text-xs font-medium text-muted-foreground/40">
                        {displayTime ? format(new Date(displayTime), 'HH:mm') : ''}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <Badge
                        variant={badge.variant}
                        className={cn('rounded-md border px-2 text-xs font-semibold shadow-none', badge.className)}
                      >
                        {badge.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 pr-4 text-right">
                      <Button asChild variant="outline" size="sm" className="h-9 rounded-lg px-3">
                        <Link href={`/jlpt/attempt/history/${item.id}`}>Xem chi tiết</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
