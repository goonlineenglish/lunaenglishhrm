'use client'

/**
 * Evaluation template table — list templates with criteria count, status, actions.
 * Props: templates, onDeactivate, onEdit
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { EvaluationTemplateWithCount } from '@/lib/types/evaluation'

const APPLIES_TO_LABELS: Record<string, string> = {
  teacher: 'Giáo viên',
  assistant: 'Trợ giảng',
  office: 'Văn phòng',
  all: 'Tất cả',
}

interface Props {
  templates: EvaluationTemplateWithCount[]
  onDeactivate?: (id: string) => void
  loading?: boolean
}

export function EvaluationTemplateTable({ templates, onDeactivate, loading }: Props) {
  if (loading) return <p className="text-sm text-muted-foreground py-4 text-center">Đang tải...</p>

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md text-sm">
        Chưa có mẫu đánh giá nào. Nhấn &ldquo;Tạo mẫu&rdquo; để bắt đầu.
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs">
                <th className="px-3 py-2 text-left border-b">Tên mẫu</th>
                <th className="px-3 py-2 text-left border-b hidden sm:table-cell">Áp dụng</th>
                <th className="px-3 py-2 text-center border-b">Tiêu chí</th>
                <th className="px-3 py-2 text-center border-b">Trạng thái</th>
                <th className="px-3 py-2 border-b w-20" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 border-b font-medium">{t.name}</td>
                  <td className="px-3 py-2 border-b text-muted-foreground hidden sm:table-cell">
                    {APPLIES_TO_LABELS[t.applies_to] ?? t.applies_to}
                  </td>
                  <td className="px-3 py-2 border-b text-center">{t.criteria_count}</td>
                  <td className="px-3 py-2 border-b text-center">
                    {t.is_active ? (
                      <Badge variant="outline" className="text-green-700 border-green-400 text-xs">
                        Hoạt động
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Vô hiệu</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 border-b text-right">
                    {t.is_active && onDeactivate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 text-destructive hover:text-destructive"
                        onClick={() => onDeactivate(t.id)}
                      >
                        Vô hiệu
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
