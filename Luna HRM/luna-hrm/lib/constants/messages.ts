/**
 * Shared Vietnamese UI messages — labels, errors, form validation.
 * All user-facing text should reference this file.
 */

export const MESSAGES = {
  // ── Common ────────────────────────────────────────────────────────────────
  loading: 'Đang tải...',
  error_generic: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  unauthorized: 'Bạn không có quyền thực hiện thao tác này.',
  not_found: 'Không tìm thấy dữ liệu.',
  save: 'Lưu',
  cancel: 'Hủy',
  delete: 'Xóa',
  edit: 'Chỉnh sửa',
  create: 'Tạo mới',
  confirm: 'Xác nhận',
  search: 'Tìm kiếm',
  filter: 'Lọc',
  export_label: 'Xuất',
  import_label: 'Nhập',
  success: 'Thành công',
  back: 'Quay lại',
  close: 'Đóng',

  // ── Auth ───────────────────────────────────────────────────────────────────
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  forgot_password: 'Quên mật khẩu',
  reset_password: 'Đặt lại mật khẩu',
  password_min_length: 'Mật khẩu phải có ít nhất 8 ký tự.',
  invalid_email: 'Email không hợp lệ.',

  // ── Branch ─────────────────────────────────────────────────────────────────
  branch_title: 'Cơ sở',
  branch_created: 'Tạo chi nhánh thành công.',
  branch_updated: 'Cập nhật chi nhánh thành công.',
  branch_create_failed: 'Không thể tạo chi nhánh.',
  branch_update_failed: 'Không thể cập nhật chi nhánh.',

  // ── Employee ───────────────────────────────────────────────────────────────
  employee_title: 'Nhân viên',
  employee_code: 'Mã NV',
  employee_name: 'Họ tên',
  employee_position: 'Vị trí',
  employee_branch: 'Cơ sở',
  employee_active: 'Đang làm việc',
  employee_inactive: 'Nghỉ việc',
  employee_teacher: 'Giáo viên',
  employee_assistant: 'Trợ giảng',
  employee_office: 'Văn phòng',
  employee_created: 'Tạo nhân viên thành công.',
  employee_updated: 'Cập nhật nhân viên thành công.',
  employee_create_failed: 'Không thể tạo nhân viên.',
  employee_update_failed: 'Không thể cập nhật nhân viên.',
  employee_email_exists: 'Email đã tồn tại trong hệ thống.',

  // ── Class Schedules ────────────────────────────────────────────────────────
  schedule_title: 'Thời Khóa Biểu',
  schedule_class_code: 'Mã lớp',
  schedule_class_name: 'Tên lớp',
  schedule_shift: 'Ca học',
  schedule_days: 'Ngày học',
  schedule_teacher: 'Giáo viên',
  schedule_assistant: 'Trợ giảng',

  // ── Attendance ─────────────────────────────────────────────────────────────
  attendance_title: 'Chấm công',
  attendance_office_title: 'Chấm công VP',
  attendance_week: 'Tuần',
  attendance_save: 'Lưu tuần',
  attendance_lock: 'Khóa tuần',
  attendance_locked: 'Đã khóa',
  attendance_present: 'Đi dạy',
  attendance_absent: 'Vắng có phép',
  attendance_no_permission: 'Vắng không phép',
  attendance_half: 'Nửa buổi',
  attendance_total: 'Tổng buổi',
  attendance_notes: 'Ghi chú',

  // ── Payroll ────────────────────────────────────────────────────────────────
  payroll_title: 'Tính lương',
  payroll_period: 'Kỳ lương',
  payroll_gross: 'Lương brutto',
  payroll_net: 'Lương thực lãnh',
  payroll_calculate: 'Tính tự động',
  payroll_confirm: 'Xác nhận lương',
  payroll_send_email: 'Gửi email phiếu lương',
  payroll_undo: 'Hoàn tác',
  payroll_sessions: 'Số buổi',
  payroll_rate: 'Đơn giá',
  payroll_substitute: 'Dạy thay',
  payroll_allowance: 'Phụ cấp',
  payroll_penalty: 'Phạt',
  payroll_bhxh: 'BHXH (8%)',
  payroll_bhyt: 'BHYT (1.5%)',
  payroll_bhtn: 'BHTN (1%)',
  payroll_tncn: 'Thuế TNCN',
  payroll_deductions: 'Khấu trừ định kỳ',
  payroll_export: 'Xuất Excel',

  // ── KPI ────────────────────────────────────────────────────────────────────
  kpi_title: 'KPI Trợ giảng',
  kpi_score: 'Điểm',
  kpi_bonus: 'Thưởng',
  kpi_evaluated: 'Đã đánh giá',
  kpi_pending: 'Chưa đánh giá',
  kpi_prefill: 'Dữ liệu sao chép từ tháng trước — vui lòng xem lại',

  // ── Evaluations ────────────────────────────────────────────────────────────
  eval_title: 'Đánh giá',
  eval_template: 'Mẫu đánh giá',
  eval_period: 'Kỳ đánh giá',
  eval_criteria: 'Tiêu chí',
  eval_score: 'Điểm',
  eval_notes: 'Nhận xét',
  eval_ad_hoc: 'Đánh giá đột xuất',
  eval_periodic: 'Đánh giá định kỳ',
  eval_create: 'Đánh giá mới',
  eval_template_create: 'Tạo mẫu đánh giá',
  eval_period_create: 'Tạo kỳ đánh giá',

  // ── Notes ──────────────────────────────────────────────────────────────────
  note_title: 'Ghi chú',
  note_praise: 'Khen ngợi',
  note_warning: 'Cảnh báo',
  note_observation: 'Nhận xét',
  note_general: 'Chung',

  // ── Form validation ────────────────────────────────────────────────────────
  required_field: 'Trường này là bắt buộc.',
  invalid_month_year: 'Tháng/năm không hợp lệ.',
} as const
