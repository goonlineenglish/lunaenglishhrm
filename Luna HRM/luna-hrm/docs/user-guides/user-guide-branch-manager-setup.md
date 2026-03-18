# Hướng Dẫn Setup Toàn Bộ — Quản Lý Cơ Sở

**Phiên bản:** 1.1
**Ngày cập nhật:** 2026-03-18
**Dành cho:** Quản lý cơ sở (Branch Manager)
**Thời gian:** ~2-3 giờ cho setup lần đầu

---

## 📋 Tổng Quan

Tài liệu này hướng dẫn chi tiết cách **setup một cơ sở hoàn chỉnh** từ đầu:
1. ✅ Tạo cơ sở (chi nhánh)
2. ✅ Thêm nhân viên
3. ✅ Tạo lịch học
4. ✅ Chấm công hàng tuần

---

## 🚀 Quy Trình 1: Setup Cơ Sở Lần Đầu

### URL: `https://hrm.lunaenglish.io.vn/dashboard/branches`

### Bước 1.1 — Đăng Nhập

1. Vào **https://hrm.lunaenglish.io.vn**
2. Nhập **email**: `bm.tanmai@luna-hrm.local` (hoặc email BM của bạn)
3. Nhập **mật khẩu**: `Luna@2026` (do Admin cấp lần đầu)
4. Kích **Đăng Nhập**

**Kết quả:** Redirect về **Dashboard** (`/dashboard`)

[IMAGE PLACEHOLDER — Step 1.1: Login screen with email/password fields]

---

### Bước 1.2 — Truy Cập Module Branches

**Trên Dashboard:**
1. Kích menu **Nhân Viên** ở bên trái
2. Nhìn thấy sub-menu → Kích **Quản Lý Chi Nhánh** (hoặc kích trực tiếp URL bar)
3. Hoặc truy cập URL: `https://hrm.lunaenglish.io.vn/dashboard/branches`

**Kết quả:** Danh sách chi nhánh (có thể rỗng nếu lần đầu)

[IMAGE PLACEHOLDER — Step 1.2: Left sidebar menu with Branches option highlighted]

---

### Bước 1.3 — Tạo Chi Nhánh Mới

**Nếu chưa có chi nhánh:**
1. Kích nút **+ Tạo Chi Nhánh** (góc trên phải)
2. Modal form mở ra

**Điền thông tin:**
```
Tên Chi Nhánh:        Tân Mai
Mã Chi Nhánh:         TM-001
Địa Chỉ:              123 Đường Tân Mai, Q.Tân Phú, HCM
Điện Thoại:           +84 28 1234 5678
Email:                tanmai@lunaenglish.io.vn
Quản Lý Chi Nhánh:    [Chọn từ dropdown — tên BM]
```

[IMAGE PLACEHOLDER — Step 1.3: Branch creation form with fields]

**Step 1.3.1 — Chọn Quản Lý Chi Nhánh**
- Kích dropdown **Quản Lý Chi Nhánh**
- Danh sách BM hiện tại (hoặc "Tạo mới")
- Nếu "Tạo mới" → cần Admin tạo tài khoản trước

**Step 1.3.2 — Lưu Chi Nhánh**
1. Kiểm tra tất cả field đã điền
2. Kích **Lưu Chi Nhánh**
3. Hệ thống xác nhận: "✓ Chi nhánh tạo thành công"

**Kết quả:** Chi nhánh hiện ở danh sách

[IMAGE PLACEHOLDER — Step 1.3.2: Success message after branch creation]

---

### Bước 1.4 — Cấu Hình Cơ Sở (Nếu Cần Sửa)

1. Kích tên chi nhánh trong danh sách
2. Kích **Chỉnh Sửa**
3. Thay đổi thông tin (tên, địa chỉ, BM, v.v.)
4. Kích **Cập Nhật**

---

## 👥 Quy Trình 2: Thêm Nhân Viên

### URL: `https://hrm.lunaenglish.io.vn/dashboard/employees`

### Bước 2.1 — Truy Cập Module Nhân Viên

1. Từ **Dashboard** → Menu trái → **Nhân Viên**
2. Hoặc URL: `https://hrm.lunaenglish.io.vn/dashboard/employees`

**Kết quả:** Danh sách nhân viên (có cột: Mã NV, Tên, Chức Vụ, Email, Trạng Thái)

[IMAGE PLACEHOLDER — Step 2.1: Employees list page with table and action buttons]

---

### Bước 2.2 — Thêm Nhân Viên Thủ Công (Từng Cái)

**Nút "Thêm Nhân Viên" (góc trên phải):**
1. Kích **+ Thêm Nhân Viên**
2. Form wizard mở ra (3 bước)

---

#### Bước 2.2.1 — Thông Tin Cơ Bản

**Form:**
```
Mã Nhân Viên:        T-TM01        (tự định nghĩa, ví dụ: T=Teacher, TM=Tân Mai, 01=số thứ tự)
Tên Đầy Đủ:          John Smith
Email:               john.smith@luna-hrm.local
Điện Thoại:          0912345678
Chức Vụ:             Giáo Viên      (Chọn: Giáo Viên, Trợ Giảng, Nhân viên VP)
Chi Nhánh:           Tân Mai        (auto-filled từ BM, hoặc chọn)
Tỷ Giá Lương:        75000          (VND/phiên cho Giáo viên)
Có Hợp Đồng Lao Động: ☑             (checkbox)
```

[IMAGE PLACEHOLDER — Step 2.2.1: Employee form - Basic Info tab]

**Kích "Tiếp Tục" → Bước 2.2.2**

---

#### Bước 2.2.2 — Thông Tin Cá Nhân

**Form:**
```
CCCD:                123456789
Ngày Sinh:           1990-05-15
Địa Chỉ:             Tân Bình, TPHCM
Bằng Cấp:            B.A. English   (tuỳ chọn)
Ghi Chú:             Tốt nghiệp ĐH Ngoại Ngữ
```

[IMAGE PLACEHOLDER — Step 2.2.2: Employee form - Personal Info tab]

**Kích "Tiếp Tục" → Bước 2.2.3**

---

#### Bước 2.2.3 — Thông Tin Ngân Hàng

**Form:**
```
Ngân Hàng:           Vietcombank     (Chọn từ dropdown)
Chủ Tài Khoản:       JOHN SMITH
Số Tài Khoản:        1234567890
Chi Nhánh Ngân Hàng: Tân Bình
```

[IMAGE PLACEHOLDER — Step 2.2.3: Employee form - Bank Info tab]

**Kích "Tạo Nhân Viên"**

---

#### Kết Quả Bước 2.2

- ✓ Nhân viên được tạo
- Hệ thống hiển thị: "✓ Nhân viên tạo thành công"
- Danh sách cập nhật → Thấy nhân viên mới

[IMAGE PLACEHOLDER — Step 2.2: Success notification]

---

### Bước 2.3 — Nhập Nhân Viên Hàng Loạt (Excel)

**Nút "Nhập Excel" (bên cạnh "+ Thêm Nhân Viên"):**

1. Kích **📤 Nhập Excel**
2. Dialog mở ra

[IMAGE PLACEHOLDER — Step 2.3: Import Excel dialog with template download button]

---

#### Bước 2.3.1 — Tải Template

1. Kích **Tải Template**
2. File `employees-template.xlsx` tải về

**Mở template trong Excel, điền dữ liệu:**

| full_name  | employee_code | email | position | salary_per_session | has_labor_contract | is_active |
|-----------|--------------|-------|----------|-------------------|-------------------|-----------|
| John Smith | T-TM01 | john@luna.local | teacher | 75000 | 1 | 1 |
| Trần Thị Linh | A-TM01 | linh@luna.local | assistant | 0 | 1 | 1 |
| Lê Thị Ngân | O-TM01 | ngan@luna.local | office | 0 | 1 | 1 |

**Lưu ý:**
- `position`: teacher / assistant / office / admin
- `salary_per_session`: 0 cho trợ giảng (tính theo KPI)
- `has_labor_contract`: 1 = Có, 0 = Không
- `is_active`: 1 = Hoạt động, 0 = Ngưng việc

[IMAGE PLACEHOLDER — Step 2.3.1: Excel template with sample data]

---

#### Bước 2.3.2 — Upload File

1. Kích **Chọn File** → Chọn file Excel đã điền
2. Hoặc kéo thả file vào upload zone
3. Kích **Nhập**

**Hệ thống sẽ:**
- Validate dữ liệu
- Hiển thị preview (danh sách nhân viên sẽ thêm)
- Kích **Xác Nhận** → Import

[IMAGE PLACEHOLDER — Step 2.3.2: Upload area and preview of imported employees]

**Kết quả:**
- ✓ Danh sách cập nhật
- Thấy tất cả nhân viên vừa import

[IMAGE PLACEHOLDER — Step 2.3.2: Success message and updated employees list]

---

## 📅 Quy Trình 3: Tạo Lịch Học

### URL: `https://hrm.lunaenglish.io.vn/dashboard/class-schedules`

### Bước 3.1 — Truy Cập Module Lịch Học

1. Từ **Dashboard** → Menu trái → **Lịch Học**
2. Hoặc URL: `https://hrm.lunaenglish.io.vn/dashboard/class-schedules`

**Kết quả:** Danh sách lớp học (có cột: Mã Lớp, Tên, Giáo Viên, Trợ Giảng, Giờ Học, Trạng Thái)

[IMAGE PLACEHOLDER — Step 3.1: Class schedules list page]

---

### Bước 3.2 — Tạo Lịch Học Thủ Công (Từng Cái)

1. Kích **+ Tạo Lịch Học** (góc trên phải)
2. Form mở ra

**Điền thông tin:**
```
Mã Lớp:              B1-TM-01
Tên Lớp:             Beginner 1 - Sáng Tân Mai
Khóa Học:            Beginner (BASIC)
Giáo Viên:           John Smith          [Chọn từ danh sách nhân viên]
Trợ Giảng:           Trần Thị Linh        [Chọn từ danh sách]
Giờ Bắt Đầu:         08:00
Giờ Kết Thúc:        09:30
Ngày Học:            ☑ Mon  ☑ Wed  ☑ Fri  [Chọn các ngày]
Trạng Thái:          Active              [Chọn: Active / Inactive]
```

[IMAGE PLACEHOLDER — Step 3.2: Class schedule creation form]

---

### Bước 3.3 — Lưu Lịch Học

1. Kiểm tra tất cả field đã điền
2. Kích **Lưu Lịch Học**
3. Hệ thống xác nhận: "✓ Lịch học tạo thành công"

**Kết quả:**
- ✓ Lớp học được tạo
- Hệ thống **auto-generate chấm công** cho tuần hiện tại
- Danh sách lịch học cập nhật

[IMAGE PLACEHOLDER — Step 3.3: Success message]

---

### Bước 3.4 — Nhập Lịch Học Hàng Loạt (Excel)

1. Kích **📤 Nhập Excel**
2. Tải template

**Template columns:**
```
class_code | name | time_start | time_end | days | teacher_email | assistant_email | course_level | status
B1-01 | Beginner 1 | 08:00 | 09:30 | Mon,Wed,Fri | john@luna.local | linh@luna.local | BASIC | active
```

[IMAGE PLACEHOLDER — Step 3.4: Class schedule Excel template]

3. Điền dữ liệu → Upload → Xác nhận

[IMAGE PLACEHOLDER — Step 3.4: Upload and import confirmation]

---

## ✅ Quy Trình 4: Chấm Công Hàng Tuần

### URL: `https://hrm.lunaenglish.io.vn/dashboard/attendance`

### Bước 4.1 — Truy Cập Module Chấm Công

1. Từ **Dashboard** → Menu trái → **Chấm Công**
2. Hoặc URL: `https://hrm.lunaenglish.io.vn/dashboard/attendance`

**Kết quả:** Lưới chấm công hiển thị

[IMAGE PLACEHOLDER — Step 4.1: Attendance page with week selector and grid]

---

### Bước 4.2 — Chọn Tuần Cần Chấm

1. **Tuần Selector** (phía trên): Chọn tuần từ dropdown hoặc calendar
2. Mặc định = tuần hiện tại
3. Mỗi tuần: Thứ 2 - Chủ Nhật (7 cột)

**Lưới hiển thị:**
```
| Nhân Viên (từ lịch học) | T2 | T3 | T4 | T5 | T6 | T7 | CN |
| John Smith (B1-01)      | 1  | 1  | 1  | 1  | 1  | -  | -  |
| Trần Thị Linh (B1-01)    | 1  | 1  | 1  | 1  | 1  | -  | -  |
```

[IMAGE PLACEHOLDER — Step 4.2: Week selector and attendance grid with columns]

---

### Bước 4.3 — Chỉnh Sửa Chấm Công

#### Cách 1 — Click Từng Ô (Cycle Trạng Thái)

1. Kích vào ô chấm công
2. Trạng thái **cycle**: 1 → 0 → KP → 0.5 → 1
   - **1** = Có mặt cả ngày
   - **0** = Vắng có phép
   - **KP** = Vắng không phép
   - **0.5** = Nửa ngày
   - **-** = Không có lớp (tự động)

[IMAGE PLACEHOLDER — Step 4.3a: Attendance cell cycling through statuses]

#### Cách 2 — Auto-fill (Từ Tuần Trước)

1. Kích nút **🔄 Auto-fill** (góc trên phải)
2. Hệ thống điền dữ liệu tuần trước
3. **Lưu ý:** Kiểm tra kỹ trước khi lưu

[IMAGE PLACEHOLDER — Step 4.3b: Auto-fill button and confirmation]

---

### Bước 4.4 — Xem Trước Thay Đổi

1. Kích **👁️ Xem Trước** (góc dưới phải)
2. Modal hiển thị: **Trước** vs **Sau**

```
TRƯỚC:          SAU:
John 1 1 1      John 1 1 0
Linh 1 1 KP     Linh 1 1 KP
```

[IMAGE PLACEHOLDER — Step 4.4: Diff/preview modal showing before and after]

3. Kiểm tra có đúng không
4. Kích **✓ Xác Nhận Thay Đổi** → Lưu vào DB

**Kết quả:** Grid cập nhật

[IMAGE PLACEHOLDER — Step 4.4: Confirmation and success message]

---

### Bước 4.5 — Khóa Tuần Chấm Công

**Sau khi hoàn thành chấm công:**

1. Kích nút **🔒 Khóa Tuần** (góc dưới phải)
2. Modal xác nhận:
   ```
   Bạn có chắc muốn khóa tuần 2026-03-02?
   Tuần khóa không thể chỉnh sửa.
   ```
3. Kích **Xác Nhận Khóa Tuần**

**Kết quả:**
- ✓ Tuần bị khóa
- Hệ thống ghi lại: ngày khóa + người khóa
- Lưới chuyển sang trạng thái read-only

[IMAGE PLACEHOLDER — Step 4.5: Lock confirmation dialog]

---

### Bước 4.6 — Mở Khóa Tuần (Nếu Cần Sửa)

1. Tìm tuần bị khóa
2. Kích **🔓 Mở Khóa** (nút đó thay thế "Khóa Tuần")
3. Ghi lý do mở khóa (tuỳ chọn)
4. Kích **Xác Nhận Mở Khóa**

**Kết quả:**
- ✓ Tuần mở khóa
- Có thể chỉnh sửa lại
- Lịch sử mở/khóa được ghi vào Audit Log

[IMAGE PLACEHOLDER — Step 4.6: Unlock dialog]

---

### Bước 4.7 — Xuất Excel Chấm Công

1. Kích **📥 Xuất Excel** (góc trên phải)
2. File `attendance-2026-03.xlsx` tải về

**File bao gồm:**
- Tất cả tuần trong tháng
- Tất cả nhân viên
- Có thể in hoặc chia sẻ

[IMAGE PLACEHOLDER — Step 4.7: Export button and downloaded file]

---

## 📊 Tab Tổng Hợp Chấm Công (Attendance Summary)

### URL: `https://hrm.lunaenglish.io.vn/dashboard/attendance` → Tab "Tổng Hợp"

### Bước 4.8 — Xem Tính Toán Sessions

1. Ở lưới chấm công → Kích tab **Tổng Hợp**
2. Hiển thị bảng:
   ```
   | Nhân Viên  | Lớp (Class) | Mon | Tue | Wed | Thu | Fri | Sat | Sun | Total Sessions |
   | John Smith | B1-01       | 1   | -   | 1   | -   | 1   | -   | -   | 3              |
   | Linh       | B1-01       | 1   | -   | 1   | -   | 1   | -   | -   | 3              |
   ```

**Tính toán:**
- Sessions = tổng số ngày có mặt (status = 1)
- Half-day (0.5) = tính 0.5 sessions
- Dùng để tính lương (Kế toán dùng)

[IMAGE PLACEHOLDER — Step 4.8: Attendance Summary tab with per-employee per-class sessions]

---

## 🔐 Quy Trình 5: VP Attendance (Nhân Viên Văn Phòng)

### URL: `https://hrm.lunaenglish.io.vn/dashboard/office-attendance`

### Bước 5.1 — Truy Cập Module VP Attendance

1. Từ **Dashboard** → Menu trái → **Chấm Công VP**
2. Hoặc URL: `https://hrm.lunaenglish.io.vn/dashboard/office-attendance`

**Khác với Attendance Grid:**
- Không theo lớp học
- Hàng ngày (Thứ 2 - Thứ 7)
- Chỉ dành cho nhân viên VP

[IMAGE PLACEHOLDER — Step 5.1: Office attendance page with daily grid]

---

### Bước 5.2 — Chấm Công VP

1. Chọn **Tháng/Năm**
2. Lưới hiển thị:
   ```
   | Nhân Viên | T2 | T3 | T4 | T5 | T6 | T7 |
   | Lê Ngân   | 1  | 1  | 1  | 1  | 1  | -  |
   ```

3. Click ô → Cycle trạng thái (1 → 0 → KP → 0.5)
4. Kích **Lưu**

**Lưu ý:** Thứ 7 là tuỳ chọn (nhiều nơi không làm)

[IMAGE PLACEHOLDER — Step 5.2: Office attendance grid for daily entry]

---

## ⏰ Automation — Cron Jobs

### Auto-lock Mỗi Chủ Nhật 23:00

- Hệ thống tự động khóa tuần
- Bạn **không cần** thao tác thủ công
- Để đảm bảo dữ liệu không bị sửa sau hạn

### Reminder Email — Thứ 5 Lúc 3PM

- Hệ thống gửi email nhắc nhở
- Nội dung: "Hãy chấm công cho tuần này"
- Để bạn không quên

---

## 📋 Checklist Setup Hoàn Chỉnh

```
SETUP CƠNG SỞ LẦN ĐẦU
├─ ☐ Tạo chi nhánh tại /dashboard/branches
├─ ☐ Thêm nhân viên (thủ công hoặc Excel) tại /dashboard/employees
├─ ☐ Tạo lịch học (thủ công hoặc Excel) tại /dashboard/class-schedules
├─ ☐ Chấm công tuần đầu tại /dashboard/attendance
├─ ☐ Khóa tuần đầu
└─ ☐ Xuất chứng chỉ chấm công (Excel)

CÔNG VIỆC HÀng TUẦN
├─ ☐ Mỗi Thứ 2: Chấm công cho tuần trước (nếu quên)
├─ ☐ Mỗi Thứ 5: Nhận email nhắc nhở (tự động)
├─ ☐ Mỗi Thứ 6-CN: Hoàn thành chấm công
├─ ☐ Mỗi CN: Khóa tuần (nếu chưa auto-lock)
└─ ☐ Cuối tháng: Xuất Excel gửi Kế toán

HÀNG THÁNG (Cuối Tháng)
├─ ☐ Đảm bảo tất cả tuần đã chấm & khóa
├─ ☐ Xuất Excel chấm công
├─ ☐ Gửi Kế toán để tính lương
├─ ☐ (Kế toán tính lương)
├─ ☐ Duyệt bảng lương tại /dashboard/payroll
└─ ☐ Phê duyệt lương
```

---

## ❓ FAQ Thường Gặp

### Q: Chấm công bị sai, phải làm gì?
**A:**
1. Tìm tuần cần sửa
2. Kích **🔓 Mở Khóa** (nếu đã khóa)
3. Chỉnh sửa ô chấm công
4. Kích **Xác Nhận Thay Đổi**
5. Khóa lại (nếu cần)

### Q: Quên auto-fill thì sao?
**A:**
1. Mỗi ngày có thể input thủ công
2. Hoặc dùng **Auto-fill** (điền từ tuần trước)
3. Kiểm tra trước khi lưu

### Q: Nhân viên mới vào giữa tháng?
**A:**
1. Thêm nhân viên vào danh sách
2. Tạo lịch học gán cho nhân viên đó
3. Auto-generate chấm công cho tuần tiếp theo

### Q: Lương tính sao nếu 0.5 ngày?
**A:** 0.5 = nửa ngày = 0.5 sessions trong lương

### Q: Mất dữ liệu sau khi khóa tuần?
**A:** Không. Khóa = chỉ read-only. Dữ liệu vẫn lưu. Có thể mở khóa & sửa.

---

## 📞 Hỗ Trợ

- **Vấn đề nhân viên:** Liên hệ Admin
- **Vấn đề lịch học:** Liên hệ Admin
- **Vấn đề chấm công:** Liên hệ Kế toán
- **Tài khoản / Mật khẩu:** Admin
