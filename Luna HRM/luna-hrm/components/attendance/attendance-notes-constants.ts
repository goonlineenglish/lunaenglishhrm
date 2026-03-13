import type { NoteType } from '@/lib/types/database'

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  substitute: 'Dạy thay',
  bonus: 'Thưởng',
  penalty: 'Phạt',
  extra_job: 'Công việc thêm',
  general: 'Ghi chú chung',
}

export const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  substitute: 'bg-blue-100 text-blue-800',
  bonus: 'bg-green-100 text-green-800',
  penalty: 'bg-red-100 text-red-800',
  extra_job: 'bg-orange-100 text-orange-800',
  general: 'bg-gray-100 text-gray-800',
}
