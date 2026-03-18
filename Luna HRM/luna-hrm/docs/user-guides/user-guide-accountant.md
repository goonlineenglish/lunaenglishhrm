# Hướng Dẫn Sử Dụng Luna HRM — Kế Toán

**Phiên bản:** 1.1
**Ngày cập nhật:** 2026-03-18
**Dành cho:** Kế toán (Accountant)

---

## 📋 Tổng Quan

Tài liệu này hướng dẫn Kế toán cách sử dụng Luna HRM để:
- Tính lương hàng tháng (3 loại: Giáo viên, Trợ giảng, Nhân viên VP)
- Quản lý các loại phụ cấp & khấu trừ
- Tính thuế TNCN & bảo hiểm xã hội (BHXH/BHYT/BHTN)
- Xem lịch sử KPI
- Xuất bảng lương & chứng chỉ
- Quản lý điều chỉnh lương theo ghi chú

**Quyền hạn Kế toán:**
- ✅ Tạo kỳ tính lương
- ✅ Tính lương tự động
- ✅ Xem/sửa chi tiết lương
- ✅ Duyệt & gửi lương
- ✅ Xem KPI trợ giảng
- ✅ Nhập ghi chú điều chỉnh (bonus/penalty/substitute)
- ✅ Xuất báo cáo Excel/PDF
- ✅ Quản lý phụ cấp cố định
- ❌ Quản lý nhân viên (Quản lý cơ sở)
- ❌ Quản lý toàn hệ thống (Admin)

---

## 🚀 Bắt Đầu

### Đăng Nhập
1. Vào **https://hrm.lunaenglish.io.vn**
2. Nhập **email** (ví dụ: `accountant@luna-hrm.local`)
3. Nhập **mật khẩu** (cấp lần đầu: `Luna@2026`)
4. Kích **Đăng Nhập**

### Giao Diện Chính
```
Dashboard (Trang chủ)
├── Thống kê lương tháng này
├── Menu bên trái
│   ├── Bảng Lương (Payroll)
│   ├── KPI (Kpi)
│   ├── Nhân Viên (Employees - xem thôi)
│   ├── Ghi Chú Hàng Tuần (Weekly Notes)
│   ├── Hồ Sơ Cá Nhân (Profile)
│   └── Đăng Xuất
└── Thông tin cá nhân (góc phải)
```

---

## 💰 Module 1: Bảng Lương (Payroll)

### Tổng Quan
- Quản lý kỳ tính lương (tháng/năm)
- Tính lương tự động hoặc bán tự động
- Xem chi tiết từng nhân viên
- Điều chỉnh lương nếu có thay đổi
- Duyệt & gửi lương cho nhân viên

### Công Thức Tính Lương

**Giáo Viên & Nhân Viên VP:**
```
Lương Cơ Bản    = Sessions × Tỷ Giá Lương (ví dụ: 75,000 VND)
Lương Thay Thế  = Substitute Sessions × Tỷ Giá Thay Thế (ví dụ: 200,000 VND)
Lương Khác      = Từ ghi chú hàng tuần (Bonus, Extra Job)
────────────────────────────────────────────────────
GROSS (Lương Tổng Cộng)

Phụ Cấp (Allowances)     = Từ salary_components cố định
Khấu Trừ (Deductions)    = Từ salary_components cố định
Penalty                  = Từ ghi chú hàng tuần (nếu có)
────────────────────────────────────────────────────
TAXABLE (Lương Chịu Thuế) = GROSS + Phụ Cấp - Khấu Trừ - Penalty

Thuế TNCN                = Tỷ lệ% theo từng khung (7 khung thuế)
BHXH (8%)               = Dành cho nhân viên hợp đồng lao động
BHYT (1.5%)             = Dành cho nhân viên hợp đồng lao động
BHTN (1%)               = Dành cho nhân viên hợp đồng lao động
────────────────────────────────────────────────────
NET (Lương Ròng) = TAXABLE - Thuế TNCN - BHXH - BHYT - BHTN
```

**Trợ Giảng (Assistant):**
```
NET = (Sessions × 75,000) + (Substitute × SubRate) + KPI Bonus + Khác - Deductions - Penalty - Taxes
```

### Tạo Kỳ Tính Lương Mới

**Step 1:** Kích **Bảng Lương** → **Tạo Kỳ Lương**

**Step 2:** Điền thông tin:
```
Tháng:           3
Năm:             2026
Ngày Bắt Đầu:    2026-03-01
Ngày Kết Thúc:   2026-03-31
Trạng Thái:      Draft (Dự thảo)

[Các tùy chọn]
☐ Khóa Tỷ Giá Cố Định   (nếu tỷ giá không đổi)
☐ Tính Tự Động         (tự động tính ngay)
```

**Step 3:** Kích **Tạo Kỳ Lương**

Hệ thống sẽ:
- Lấy chấm công từ Chấm Công module (sessions đã đi học)
- Lấy phụ cấp/khấu trừ từ salary_components
- Lấy KPI & bonus/penalty từ ghi chú hàng tuần
- Tính lương tự động cho tất cả nhân viên

### Tính Lương Tự Động / Bán Tự Động

**Tự Động:**
1. Kỳ lương tạo mới → Hệ thống tính ngay
2. Kích **Tính Lương** để tính lại (nếu chấm công bị sửa)

**Bán Tự Động (Semi-Manual):**
- Lưới spreadsheet có thể chỉnh sửa
- Kích từng ô → Thay đổi giá trị (sessions, deductions, etc.)
- Lương sẽ tính lại tự động dựa trên công thức

### Xem Chi Tiết Lương Nhân Viên

**Step 1:** Kích **Bảng Lương** → Kỳ lương cần xem

**Step 2:** Danh sách nhân viên → Kích tên → **Chi Tiết Lương**

**Chi tiết hiển thị:**
```
John Smith — Tháng 3/2026
─────────────────────────────────────
📊 SESSIONS (Các Phiên)
  Giáo viên:           40 phiên × 75,000 VND    = 3,000,000 VND
  Thay Thế:            4 phiên × 200,000 VND    = 800,000 VND
  ─────────────────────────────────────────────
  Subtotal:                                      3,800,000 VND

💰 ALLOWANCES & DEDUCTIONS
  Phụ Cấp Bảo Hiểm:    500,000 VND
  Khấu Trừ Quỹ:        -100,000 VND
  Ghi Chú Thêm:        0 VND
  ─────────────────────────────────────────────
  Subtotal:                                      400,000 VND

🎯 SPECIAL (KPI, Bonus, Penalty)
  KPI Bonus (Trợ Giảng): 0 VND
  Bonus Thêm:          0 VND
  Penalty:             0 VND
  ─────────────────────────────────────────────
  Subtotal:                                      0 VND

═════════════════════════════════════════════════
GROSS (Lương Tổng Cộng):                 4,200,000 VND

🧮 TAXES & INSURANCE
  BHXH (8%):           336,000 VND
  BHYT (1.5%):         63,000 VND
  BHTN (1%):           42,000 VND
  Thuế TNCN:           229,250 VND
  ─────────────────────────────────────────────
  Total Deductions:                        670,250 VND

═════════════════════════════════════════════════
NET (Lương Ròng):                        3,529,750 VND

📅 CHUYỂN KHOẢN
  Ngân Hàng:          Vietcombank
  Chủ Tài Khoản:      JOHN SMITH
  Số Tài Khoản:       1234567890
```

### Chỉnh Sửa Chi Tiết Lương

**Nếu chấm công bị sửa:**
1. Quản lý cơ sở chỉnh sửa → Kích **Tính Lương** → Tự động cập nhật

**Nếu cần chỉnh sửa thủ công:**
1. Kích **Chỉnh Sửa** → Lưới spreadsheet:
   ```
   | Nhân Viên | Sessions | Tỷ Giá | Phụ Cấp | Khấu Trừ | Penalty | Lương Ròng |
   | Thay đổi từng ô theo cần thiết |
   ```
2. Lương tự động recalculate
3. Kích **Cập Nhật Tất Cả**

### So Sánh Lương (Trước/Sau)

- Kích **So Sánh** trước khi duyệt
- Xem danh sách thay đổi:
  ```
  Nhân Viên          | Lương Tháng Trước | Lương Tháng Này | % Thay Đổi
  John Smith         | 3,400,000        | 3,529,750       | +3.8%
  ...
  ```

### Cảnh Báo Lương Tăng > 20%

- Nếu lương tăng > 20% so với tháng trước → Cảnh báo đỏ
- **Yêu cầu xác nhận:** Kích **Xác Nhận Lương Tăng**
- Ghi lý do (tuỳ chọn)

### Duyệt & Gửi Lương

**Step 1:** Kích **Duyệt Lương**

**Step 2:** Xem tóm tắt:
```
📊 TỔNG HỢP KỲ LƯƠNG
  Tháng:              3/2026
  Tổng Nhân Viên:     21 người
  Tổng Lương Ròng:    45,123,456 VND
  Tổng Thuế TNCN:     2,345,678 VND
  Tổng BHXH/BHYT/BHTN: 5,432,109 VND
```

**Step 3:** Kích **Xác Nhận Duyệt**

**Step 4:** Hệ thống sẽ:
- Gửi email thông báo lương cho từng nhân viên
- Nhân viên có thể xem chi tiết lương trong **Lương Của Tôi** portal
- Lịch sử duyệt được ghi lại (ngày + người duyệt)

### Hoàn Tác Duyệt (Undo - trong 24h)

- Nếu phát hiện sai sau duyệt, trong vòng 24 giờ:
1. Kích **Hoàn Tác Duyệt**
2. Lương quay lại trạng thái chỉnh sửa
3. Chỉnh sửa → Duyệt lại

---

## 📝 Module 2: Ghi Chú Hàng Tuần (Weekly Notes)

### Tổng Quan
- Ghi nhận các khoản điều chỉnh lương hàng tuần
- Loại ghi chú: Substitute (thay thế), Bonus (thưởng), Penalty (phạt), Extra Job (công việc thêm)
- Dữ liệu này sẽ được tính vào lương tháng

### Nhập Ghi Chú Mới

**Step 1:** Kích **Ghi Chú Hàng Tuần**

**Step 2:** Kích **Thêm Ghi Chú**

**Step 3:** Điền thông tin:
```
Tuần:              Tuần 1 - Tháng 3/2026 (2026-03-01 - 2026-03-07)
Nhân Viên:         John Smith
Loại Ghi Chú:      Chọn từ dropdown
  ├ Substitute     (Thay thế: 2 phiên thay thế học sinh)
  ├ Bonus          (Thưởng: 500,000 VND)
  ├ Penalty        (Phạt: -100,000 VND)
  └ Extra Job      (Công việc thêm: 300,000 VND)
Số Tiền:           [Nhập số tiền]
Mô Tả:             Lý do ghi chú (tuỳ chọn)
```

**Step 4:** Kích **Tạo Ghi Chú**

### Danh Sách Ghi Chú

- Xem toàn bộ ghi chú hàng tuần
- Bộ lọc: Tuần, Nhân viên, Loại ghi chú
- Kích tên ghi chú → Sửa/Xóa (nếu cần)

### Cách Ghi Chú Ảnh Hưởng Lương

```
Loại             | Ảnh Hưởng Lương
────────────────────────────────────────
Substitute       | Thêm vào Lương Thay Thế (= Số phiên × Tỷ giá)
Bonus            | Thêm vào Lương Khác (Positive)
Penalty          | Trừ vào Lương Khác (Negative = -Amount)
Extra Job        | Thêm vào Lương Khác
```

---

## 🎯 Module 3: KPI (Đánh Giá Trợ Giảng)

### Tổng Quan
- Xem KPI trợ giảng theo tháng/năm
- Nếu Part A = Pass → Bonus = (Part B score) × 50,000 VND
- Nếu Part A = Fail → Bonus = 0 VND (dù Part B cao)

### Xem KPI Trợ Giảng
1. Kích **KPI**
2. Chọn **Tháng/Năm**
3. Danh sách trợ giảng → Kích tên → Chi tiết:
   ```
   Trần Thị Linh — KPI Tháng 3/2026
   ─────────────────────────────
   PART A (Yêu Cầu Cơ Bản):
     ✓ Kiên trì đi làm
     ✓ Tuân thủ quy định
     ✓ Hoàn thành bài tập
     ✓ Teamwork
     → PASS ✓

   PART B (Chất Lượng):
     Kỹ năng giảng dạy:     8/10
     Chuẩn bị bài tập:      7/10
     Tương tác học sinh:    9/10
     Đạt mục tiêu lớp:      8/10
     Phát triển chuyên môn: 7/10
     → TRUNG BÌNH: 7.8/10

   BONUS: 7.8 × 50,000 = 390,000 VND
   ```

### KPI & Lương

- Bonus từ KPI được tính vào **Lương Tháng Đó**
- Lương = (Sessions × 75k) + Substitute + **KPI Bonus** - Deductions
- Nếu Part A = Fail, Bonus = 0 → Lương giảm

---

## 👥 Module 4: Nhân Viên (Employees) — Xem Thôi

### Tổng Quan
- Xem danh sách nhân viên (chỉ xem, không sửa)
- Tham khảo thông tin khi tính lương

### Xem Danh Sách
1. Kích **Nhân Viên**
2. Danh sách toàn bộ nhân viên
3. Kích tên → Xem thông tin (CCCD, ngân hàng, etc.)
4. **Lưu ý:** Chỉnh sửa do Quản lý cơ sở hoặc Admin

---

## 📊 Xuất Báo Cáo & Dữ Liệu

### Xuất Bảng Lương Excel
1. **Bảng Lương** → Kỳ lương → **Xuất Excel**
2. File include:
   - Tên nhân viên, chức vụ, sessions, lương cơ bản, phụ cấp, khấu trừ, thuế, lương ròng
   - Có thể in trực tiếp hoặc sửa trong Excel

### Xuất Chứng Chỉ Lương (Payslip)
1. Kích tên nhân viên → **Xuất PDF**
2. PDF chứa chi tiết lương chuẩn thức (có thể gửi cho nhân viên)

### Báo Cáo Thuế TNCN
- Tính toán tự động theo 7 khung thuế Vietnam
- Xuất danh sách thuế TNCN hàng tháng cho báo cáo

### Báo Cáo BHXH
- Tính toán tự động (8% BHXH)
- Danh sách nhân viên có hợp đồng lao động

---

## ⚙️ Cài Đặt & Phím Tắt

### Phím Tắt (Lưới Bán Tự Động)
```
Tab              : Di chuyển ô tiếp theo
Shift+Tab        : Di chuyển ô trước
Ctrl+S           : Lưu tất cả thay đổi
Ctrl+Z           : Hoàn tác
↑↓               : Di chuyển hàng
```

---

## ❓ FAQ

### Q: Làm sao biết lương được tính đúng?
**A:** Kích **So Sánh** xem chi tiết trước/sau. Kiểm tra công thức:
- Sessions chính xác?
- Phụ cấp/khấu trừ đủ?
- Thuế TNCN đúng khung?

### Q: Lương bị tính sai vì chấm công bị sửa?
**A:** Quản lý cơ sở sửa chấm công → Kích **Tính Lương** trong Bảng Lương → Tự động cập nhật.

### Q: Năm vừa qua bao nhiêu trợ giảng nhận bonus KPI?
**A:** KPI → Chọn tháng năm → Xem danh sách (Bonus > 0).

### Q: Lương thay thế được tính bao giờ?
**A:** Quản lý cơ sở nhập **Ghi Chú Hàng Tuần** → Loại "Substitute" → Ghi số phiên & tỷ giá → Tự động tính vào lương.

### Q: Nhân viên nào chưa có tài khoản ngân hàng?
**A:** Nhân Viên → Tìm nhân viên → Xem **Số Tài Khoản** (nếu trống = chưa).

### Q: Cách hoàn tác lương nếu duyệt nhầm?
**A:** Trong vòng 24 giờ: Kích **Hoàn Tác Duyệt** → Chỉnh sửa → Duyệt lại.

### Q: Tax brackets (7 khung thuế) là gì?
**A:**
```
0 - 5M VND       : 5%
5M - 10M VND     : 10%
10M - 20M VND    : 15%
20M - 30M VND    : 20%
30M - 40M VND    : 25%
40M - 50M VND    : 30%
> 50M VND        : 35%
(Áp dụng sau khoản trừ 11M/tháng)
```

---

## 📞 Hỗ Trợ

- **Admin:** `admin@luna-hrm.local`
- **Quản Lý Cơ Sở:** `bm.tanmai@luna-hrm.local` (Tân Mai), `bm.quan1@luna-hrm.local` (Quận 1)
- **Điều Hành:** Công ty quản lý
