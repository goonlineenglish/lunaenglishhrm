/**
 * Email HTML templates for payslip confirmation workflow.
 * buildPayslipEmailHtml  — initial notification + confirm/dispute links
 * buildReminderEmailHtml — reminder for employees who haven't acted
 */

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount)
}

export interface PayslipEmailData {
  employeeName: string
  month: number
  year: number
  netPay: number
  grossPay: number
  branchName: string
  confirmUrl: string
  disputeUrl: string
  deadlineDate: string   // e.g. "31/03/2026"
}

export interface ReminderEmailData {
  employeeName: string
  month: number
  year: number
  netPay: number
  confirmUrl: string
  disputeUrl: string
  deadlineDate: string
  daysLeft: number
}

/** Build full payslip email: shows summary + confirm/dispute CTA buttons. */
export function buildPayslipEmailHtml(data: PayslipEmailData): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phiếu lương tháng ${data.month}/${data.year}</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <!-- Header -->
    <div style="background:#3E1A51;padding:24px 28px;">
      <h1 style="color:#fff;margin:0;font-size:18px;">Phiếu lương tháng ${data.month}/${data.year}</h1>
      <p style="color:#d4b8e8;margin:4px 0 0;font-size:13px;">${data.branchName}</p>
    </div>
    <!-- Body -->
    <div style="padding:24px 28px;">
      <p style="margin:0 0 16px;color:#333;">Xin chào <strong>${data.employeeName}</strong>,</p>
      <p style="margin:0 0 20px;color:#555;font-size:14px;">
        Phiếu lương tháng <strong>${data.month}/${data.year}</strong> của bạn đã được phát hành.
        Vui lòng xem xét và xác nhận trước <strong>${data.deadlineDate}</strong>.
      </p>

      <!-- Summary box -->
      <div style="background:#f9f6fd;border:1px solid #e8ddf3;border-radius:6px;padding:16px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#666;font-size:13px;padding:4px 0;">Tổng thu nhập (GROSS)</td>
            <td style="text-align:right;font-size:13px;color:#333;font-weight:600;">${formatVND(data.grossPay)} ₫</td>
          </tr>
          <tr>
            <td style="color:#3E1A51;font-size:15px;font-weight:700;padding:8px 0 4px;">Thực lãnh (NET)</td>
            <td style="text-align:right;font-size:17px;font-weight:700;color:#3E1A51;">${formatVND(data.netPay)} ₫</td>
          </tr>
        </table>
      </div>

      <!-- CTA buttons -->
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${data.confirmUrl}"
               style="display:block;background:#16a34a;color:#fff;text-align:center;padding:12px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              ✓ Xác nhận phiếu lương
            </a>
          </td>
          <td style="padding-left:8px;">
            <a href="${data.disputeUrl}"
               style="display:block;background:#fff;color:#dc2626;text-align:center;padding:11px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;border:1px solid #dc2626;">
              ✗ Khiếu nại
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:16px 0 0;font-size:12px;color:#999;text-align:center;">
        Nếu không phản hồi trước ${data.deadlineDate}, phiếu lương sẽ tự động được xác nhận.
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#faf9fb;border-top:1px solid #eee;padding:14px 28px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#aaa;">Luna HRM · Buttercup English Center</p>
    </div>
  </div>
</body>
</html>`
}

/** Build reminder email for employees who haven't confirmed or disputed. */
export function buildReminderEmailHtml(data: ReminderEmailData): string {
  const urgency = data.daysLeft <= 1 ? '🔴 Khẩn cấp' : data.daysLeft <= 2 ? '🟡 Nhắc nhở' : 'ℹ️ Nhắc nhở'
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc nhở xác nhận phiếu lương</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#b45309;padding:20px 28px;">
      <h1 style="color:#fff;margin:0;font-size:17px;">${urgency} — Chưa xác nhận phiếu lương</h1>
      <p style="color:#fef3c7;margin:4px 0 0;font-size:13px;">Tháng ${data.month}/${data.year}</p>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 14px;color:#333;">Xin chào <strong>${data.employeeName}</strong>,</p>
      <p style="margin:0 0 16px;color:#555;font-size:14px;">
        Bạn chưa xác nhận phiếu lương tháng <strong>${data.month}/${data.year}</strong>.
        Còn <strong>${data.daysLeft} ngày</strong> để phản hồi (hạn: <strong>${data.deadlineDate}</strong>).
      </p>
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          Thực lãnh: <strong>${formatVND(data.netPay)} ₫</strong>
        </p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${data.confirmUrl}"
               style="display:block;background:#16a34a;color:#fff;text-align:center;padding:12px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              ✓ Xác nhận ngay
            </a>
          </td>
          <td style="padding-left:8px;">
            <a href="${data.disputeUrl}"
               style="display:block;background:#fff;color:#dc2626;text-align:center;padding:11px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;border:1px solid #dc2626;">
              ✗ Khiếu nại
            </a>
          </td>
        </tr>
      </table>
    </div>
    <div style="background:#faf9fb;border-top:1px solid #eee;padding:14px 28px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#aaa;">Luna HRM · Buttercup English Center</p>
    </div>
  </div>
</body>
</html>`
}
