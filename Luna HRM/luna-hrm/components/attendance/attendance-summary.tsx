'use client'

/**
 * Attendance summary — per-employee totals table.
 */

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { WeekSummary } from '@/lib/services/attendance-grid-service'

interface Props {
  summary: WeekSummary[]
}

export function AttendanceSummary({ summary }: Props) {
  if (summary.length === 0) return null

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã NV</TableHead>
            <TableHead>Tên</TableHead>
            <TableHead className="text-center">Có mặt</TableHead>
            <TableHead className="text-center">Vắng phép</TableHead>
            <TableHead className="text-center">KP</TableHead>
            <TableHead className="text-center">Nửa buổi</TableHead>
            <TableHead className="text-center font-bold">Tổng buổi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary.map((s) => (
            <TableRow key={s.employeeId}>
              <TableCell className="font-medium">{s.employeeCode}</TableCell>
              <TableCell>{s.employeeName}</TableCell>
              <TableCell className="text-center text-green-700">{s.totalPresent}</TableCell>
              <TableCell className="text-center text-blue-700">{s.totalAbsent}</TableCell>
              <TableCell className="text-center text-red-700">{s.totalKP}</TableCell>
              <TableCell className="text-center text-yellow-700">{s.totalHalf}</TableCell>
              <TableCell className="text-center font-bold">{s.totalSessions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
