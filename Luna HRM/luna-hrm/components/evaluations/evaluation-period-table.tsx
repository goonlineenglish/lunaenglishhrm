'use client'

/**
 * Evaluation period table — list periods with status badge and close action.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { EvaluationPeriod } from '@/lib/types/evaluation'

interface Props {
  periods: EvaluationPeriod[]
  onClose?: (id: string) => void
  loading?: boolean
}

export function EvaluationPeriodTable({ periods, onClose, loading }: Props) {
  if (loading) return <p className="text-sm text-muted-foreground py-4 text-center">Đang tải...</p>

  if (periods.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md text-sm">
        Chưa có kỳ đánh giá nào. Nhấn &ldquo;Tạo kỳ&rdquo; để bắt đầu.
      </div>
    )
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('vi-VN')
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs">
                <th className="px-3 py-2 text-left border-b">Tên kỳ</th>
                <th className="px-3 py-2 text-left border-b hidden sm:table-cell">Từ ngày</th>
                <th className="px-3 py-2 text-left border-b hidden sm:table-cell">Đến ngày</th>
                <th className="px-3 py-2 text-center border-b">Trạng thái</th>
                <th className="px-3 py-2 border-b w-20" />
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 border-b font-medium">{p.name}</td>
                  <td className="px-3 py-2 border-b text-muted-foreground hidden sm:table-cell">
                    {formatDate(p.start_date)}
                  </td>
                  <td className="px-3 py-2 border-b text-muted-foreground hidden sm:table-cell">
                    {formatDate(p.end_date)}
                  </td>
                  <td className="px-3 py-2 border-b text-center">
                    {p.status === 'open' ? (
                      <Badge variant="outline" className="text-green-700 border-green-400 text-xs">
                        Đang mở
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Đã đóng</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 border-b text-right">
                    {p.status === 'open' && onClose && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => onClose(p.id)}
                      >
                        Đóng
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
