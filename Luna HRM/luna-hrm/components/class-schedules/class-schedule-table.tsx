'use client'

/**
 * Class schedule data table.
 * Shows class_code, class_name, shift_time, days, teacher, assistant, status.
 */

import { Pencil, XCircle, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { ClassSchedule } from '@/lib/types/database'
import { getDayName } from '@/lib/utils/date-helpers'

interface ScheduleWithNames extends ClassSchedule {
  teacher_name: string
  assistant_name: string
}

interface Props {
  schedules: ScheduleWithNames[]
  onEdit: (schedule: ClassSchedule) => void
  onDeactivate: (id: string) => void
  onReactivate: (id: string) => void
}

export function ClassScheduleTable({ schedules, onEdit, onDeactivate, onReactivate }: Props) {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        Chưa có lịch lớp nào.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã lớp</TableHead>
            <TableHead>Tên lớp</TableHead>
            <TableHead>Ca</TableHead>
            <TableHead>Ngày học</TableHead>
            <TableHead>GV</TableHead>
            <TableHead>TG</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="w-24">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.class_code}</TableCell>
              <TableCell>{s.class_name}</TableCell>
              <TableCell className="text-sm">{s.shift_time}</TableCell>
              <TableCell className="text-sm">
                {s.days_of_week.map((d) => getDayName(d)).join(', ')}
              </TableCell>
              <TableCell className="text-sm">{s.teacher_name}</TableCell>
              <TableCell className="text-sm">{s.assistant_name}</TableCell>
              <TableCell>
                <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                  {s.status === 'active' ? 'Đang dạy' : 'Ngừng'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(s)} title="Sửa">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {s.status === 'active' ? (
                    <Button variant="ghost" size="icon" onClick={() => onDeactivate(s.id)} title="Ngừng lớp">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => onReactivate(s.id)} title="Mở lại lớp">
                      <PlayCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
