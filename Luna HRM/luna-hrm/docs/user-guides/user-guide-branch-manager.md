# Hướng Dẫn Sử Dụng Luna HRM — Quản Lý Cơ Sở

**Phiên bản:** 1.1
**Ngày cập nhật:** 2026-03-18
**Dành cho:** Quản lý cơ sở (Branch Manager)

---

## 📋 Tổng Quan

Tài liệu này hướng dẫn Quản lý cơ sở cách sử dụng Luna HRM để:
- Quản lý lịch học hàng tuần
- Chấm công nhân viên
- Khóa chấm công theo tuần
- Phê duyệt bảng lương
- Theo dõi KPI
- Quản lý hồ sơ nhân viên

**Quyền hạn Quản lý cơ sở:**
- ✅ Tạo/sửa lịch học (class schedules)
- ✅ Nhập chấm công hàng tuần
- ✅ Khóa/mở khóa tuần
- ✅ Xem lương cơ sở
- ✅ Xem KPI trợ giảng
- ✅ Xem hồ sơ nhân viên
- ✅ Xuất báo cáo Excel
- ❌ Tính lương (Kế toán)
- ❌ Quản lý toàn hệ thống (Admin)

---

## 🚀 Bắt Đầu

### Đăng Nhập
1. Vào **https://hrm.lunaenglish.io.vn**
2. Nhập **email** (ví dụ: `bm.tanmai@luna-hrm.local`)
3. Nhập **mật khẩu** (cấp lần đầu: `Luna@2026`)
4. Kích **Đăng Nhập**

### Giao Diện Chính
```
Dashboard (Trang chủ)
├── Thống kê chi nhánh
├── Menu bên trái
│   ├── Lịch Học (Class Schedules)
│   ├── Chấm Công (Attendance)
│   ├── Bảng Lương (Payroll)
│   ├── KPI (Kpi)
│   ├── Nhân Viên (Employees)
│   ├── Hồ Sơ Cá Nhân (Profile)
│   └── Đăng Xuất
└── Thông tin cá nhân (góc phải)
```

---

## 📅 Module 1: Lịch Học (Class Schedules)

### Tổng Quan
- Định nghĩa các lớp học hàng tuần
- Gán giáo viên & trợ giảng
- Auto-generate chấm công

### Tạo Lịch Học Mới

**Step 1:** Kích **Lịch Học** → **Tạo Mới**

**Step 2:** Điền thông tin:
```
Mã lớp:          B1-Morning-01
Tên lớp:         Beginner 1 - Sáng
Khóa học:        Beginner (đặc tính 1)
Giáo viên:       John Smith
Trợ giảng:       Trần Thị Linh
Giờ học:         08:00 - 09:30
Ngày học:        Mon, Wed, Fri (chọn checkbox)
Trạng thái:      Active ✓
```

**Step 3:** Kích **Lưu** → Hệ thống auto-sinh chấm công cho hàng tuần

### Sửa Lịch Học
1. Tìm lớp trong danh sách
2. Kích **Chỉnh Sửa** → Thay đổi info
3. Kích **Cập Nhật**
4. **Lưu ý:** Thay đổi ngày học sẽ ảnh hưởng chấm công từ tuần tới

### Nhập Lịch Học Hàng Loạt (Excel)
1. Kích **Lịch Học** → **Nhập Excel**
2. Tải template → Điền dữ liệu:
   ```
   class_code | name | time_start | time_end | days | teacher_email | assistant_email | course_level | status
   B1-01      | B1   | 08:00      | 09:30    | Mon,Wed,Fri | john@... | linh@... | BASIC | active
   ```
3. Upload file → **Nhập**
4. Kiểm tra kết quả trong **Lịch Học**

---

## ✅ Module 2: Chấm Công (Attendance)

### Tổng Quan
- Lưới chấm công auto-sinh từ lịch học
- Click để chuyển trạng thái: **1** (có) → **0** (vắng có phép) → **KP** (vắng không phép) → **0.5** (nửa ngày) → **1**
- Khóa tuần sau khi hoàn thành
- Xem lịch sử & người khóa

### Chấm Công Tuần Hàng

**Step 1:** Kích **Chấm Công**

**Step 2:** Chọn **Tuần** (tự động là tuần hiện tại)

**Step 3:** Lưới hiển thị:
- **Cột bên trái:** Tên nhân viên (giáo viên & trợ giảng từ lịch học)
- **Cột ngày:** DD/MM (thứ Hai đến Chủ Nhật)
- **Trạng thái:** 1 / 0 / KP / 0.5

**Step 4:** Click ô muốn chỉnh sửa:
```
Trạng thái      | Ý nghĩa
────────────────────────────────────
1               | Có mặt cả ngày
0               | Vắng có phép (có lý do)
KP              | Vắng không phép
0.5             | Nửa ngày (sáng hoặc chiều)
```

**Step 5:** Kích **Lưu Tất Cả** để ghi nhận

**Step 6:** Kích **Xem Trước Thay Đổi** để kiểm tra trước
```
Trước:   [grid cũ]
Sau:     [grid mới]
→ Kích Xác Nhận Thay Đổi
```

### Auto-fill Chấm Công
- Kích **Auto-fill** → Tự động điền dữ liệu tuần trước
- Tiết kiệm thời gian nếu nhân viên vẫn đi làm bình thường
- **Lưu ý:** Kiểm tra kỹ trước khi lưu

### Khóa Tuần Chấm Công
Sau khi hoàn thành chấm công cho tuần:

1. Kích **Khóa Tuần** (góc dưới phải)
2. Hệ thống ghi lại: ngày khóa + người khóa + thời gian
3. Tuần khóa không thể chỉnh sửa (trừ khi bạn mở khóa)
4. **Tự động khóa:** Mỗi Chủ Nhật 23:00 hệ thống tự động khóa tuần

### Mở Khóa Tuần (Nếu Cần Chỉnh Sửa)
1. Tìm tuần bị khóa → Kích **Mở Khóa**
2. Ghi lý do mở khóa (tuỳ chọn)
3. Chỉnh sửa chấm công
4. Khóa lại tuần

### Chấm Công VP (Nhân Viên Văn Phòng)
- Riêng cho nhân viên VP, chấm công hàng ngày (không theo lớp học)
- Kích **Chấm Công VP**
- Chọn tháng → Lưới hàng ngày
- Điền trạng thái (1/0/KP/0.5) cho mỗi ngày từ Thứ 2 - Thứ 7

---

## 💰 Module 3: Bảng Lương (Payroll)

### Tổng Quan
- Xem bảng lương đã tính (Kế toán tính)
- Phê duyệt lương
- Xuất Excel
- **Lưu ý:** Quản lý chỉ xem, không tính lương (việc của Kế toán)

### Xem Bảng Lương
1. Kích **Bảng Lương**
2. Chọn **Kỳ Tính Lương** (ví dụ: Tháng 3/2026)
3. Danh sách nhân viên + cột thông tin:
   ```
   | STT | Nhân Viên | Chức Vụ | Sessions | Tính Lương | Lương Cơ Bản | Phụ Cấp | Khấu Trừ | Thuế | Lương Ròng |
   ```

### Xem Chi Tiết Lương
- Kích tên nhân viên → Toàn bộ chi tiết:
  ```
  Giáo viên John Smith — Tháng 3/2026
  ───────────────────────────────
  Lương cơ bản:       3,000,000 VND (40 sessions × 75k)
  Thay thế:              800,000 VND (4 sessions × 200k)
  Khác:                        0 VND
  ─────────────────────────────── +
  Tổng cộng:          3,800,000 VND

  Phụ Cấp:              500,000 VND
  Khấu Trừ:             100,000 VND
  BHXH (8%):            272,000 VND
  BHYT (1.5%):           51,000 VND
  BHTN (1%):             34,000 VND
  Thuế TNCN:            229,250 VND
  ─────────────────────────────── -
  Lương Ròng:        2,944,750 VND
  ```

### Duyệt Lương
- Khi Kế toán đã tính xong, bạn nhìn thấy nút **Duyệt Lương**
- Kích → Ghi chú tuỳ chọn → **Xác Nhận Duyệt**
- Sau khi duyệt, lương sẽ được gửi cho nhân viên

### Xuất Excel Lương
1. Kích **Xuất Excel** → File tải về
2. File Excel bao gồm toàn bộ nhân viên + chi tiết lương
3. Mở trong Excel → Format, in hoặc chia sẻ

---

## 🎯 Module 4: KPI (Đánh Giá Trợ Giảng)

### Tổng Quan
- Trợ giảng được đánh giá hàng tháng
- Điểm Part A (4 tiêu chí): Đạt/Không Đạt (pass/fail)
- Điểm Part B (5 tiêu chí): 0-10 điểm
- **Bonus:** Nếu Part A = Đạt, Bonus = (Part B điểm) × 50,000 VND

### Xem KPI Trợ Giảng
1. Kích **KPI**
2. Danh sách trợ giảng + tháng năm
3. Kích tên trợ giảng → Chi tiết:
   ```
   Trần Thị Linh — KPI Tháng 3/2026
   ─────────────────────────────────
   PART A (Yêu Cầu Cơ Bản):
     ☑ 1. Kiên trì đi làm
     ☑ 2. Tuân thủ quy định
     ☑ 3. Hoàn thành bài tập
     ☑ 4. Teamwork
     → RESULT: PASS ✓

   PART B (Chất Lượng Công Việc):
     □ 1. Kỹ năng giảng dạy:        8/10
     □ 2. Chuẩn bị bài tập:        7/10
     □ 3. Tương tác học sinh:      9/10
     □ 4. Đạt mục tiêu lớp:        8/10
     □ 5. Phát triển chuyên môn:   7/10
     → TRUNG BÌNH: 7.8/10

   BONUS: 7.8 × 50,000 = 390,000 VND
   ```

### Lịch Sử KPI (6 Tháng Gần Nhất)
- Cuộn xuống → Biểu đồ lịch sử 6 tháng
- Xem xu hướng trợ giảng: cải thiện hoặc giảm

---

## 👥 Module 5: Nhân Viên (Employees)

### Tổng Quan
- Quản lý toàn bộ nhân viên chi nhánh
- Xem/sửa thông tin
- Khóa/mở khóa tài khoản
- Xuất/nhập Excel

### Danh Sách Nhân Viên
1. Kích **Nhân Viên**
2. Bộ lọc: **Trạng thái** (Hoạt động / Ngưng việc)
3. Tìm kiếm: Nhập tên, mã nhân viên
4. Danh sách:
   ```
   | Mã NV | Tên | Chức Vụ | Email | Điện Thoại | Trạng Thái |
   ```

### Xem Chi Tiết Nhân Viên
- Kích tên nhân viên → Toàn bộ profile:
  ```
  Thông Tin Cơ Bản:
    Tên: John Smith
    Mã NV: T-TM01
    Email: john@luna.vn
    Điện Thoại: 0912345678
    Chức Vụ: Giáo Viên

  Thông Tin Cá Nhân:
    CCCD: 123456789
    Ngày Sinh: 1990-05-15
    Địa Chỉ: Tân Bình, TPHCM

  Thông Tin Việc Làm:
    Ngày Bắt Đầu: 2024-01-15
    Hợp Đồng Lao Động: Có
    Bảng Lương: 75,000 VND/phiên

  Thông Tin Ngân Hàng:
    Ngân Hàng: Vietcombank
    Chủ Tài Khoản: JOHN SMITH
    Số Tài Khoản: 1234567890
  ```

### Thêm Nhân Viên Mới
1. Kích **Thêm Nhân Viên**
2. Điền thông tin cơ bản
3. Bước 2: Thông tin cá nhân (CCCD, ngày sinh)
4. Bước 3: Thông tin ngân hàng
5. Kích **Tạo Nhân Viên**
6. **Yêu cầu:** Admin phải tạo tài khoản đăng nhập riêng

### Sửa Thông Tin Nhân Viên
1. Kích tên nhân viên → **Chỉnh Sửa**
2. Thay đổi thông tin cần thiết
3. Kích **Cập Nhật**

### Nhập Nhân Viên Hàng Loạt (Excel)
1. Kích **Nhập Excel**
2. Tải template → Điền:
   ```
   full_name | email | position | salary_per_session | has_labor_contract | is_active
   John Smith | john@luna.vn | teacher | 75000 | 1 | 1
   ```
3. Upload → **Nhập**

### Xuất Danh Sách Nhân Viên
- Kích **Xuất Excel** → Tải toàn bộ danh sách

---

## 📝 Module 6: Hồ Sơ Cá Nhân

### Xem Hồ Sơ Riêng
- Kích **Hồ Sơ Cá Nhân** (góc phải)
- Xem thông tin cá nhân + ngân hàng (chỉ xem, không sửa)

---

## 📊 Báo Cáo & Xuất Dữ Liệu

### Chấm Công
- Chấm Công → **Xuất Excel** → Toàn bộ lịch chấm công tháng

### Lương
- Bảng Lương → **Xuất Excel** → Toàn bộ chi tiết lương

### Nhân Viên
- Nhân Viên → **Xuất Excel** → Danh sách + thông tin

---

## ⚙️ Cài Đặt & Phím Tắt

### Phím Tắt
```
Ctrl+S   : Lưu (trong lưới chấm công)
↑↓←→     : Di chuyển giữa ô
Space    : Click ô để chuyển trạng thái
```

---

## ❓ FAQ

### Q: Cách khóa tuần nếu quên?
**A:** Mỗi Chủ Nhật 23:00, hệ thống tự động khóa tuần. Nếu cần khóa sớm, kích **Khóa Tuần** ngay.

### Q: Chỉnh sửa chấm công sau khi khóa?
**A:** Kích **Mở Khóa** → Chỉnh sửa → Khóa lại. Admin sẽ thấy lịch sử ai mở khóa lúc nào.

### Q: Nhân viên mới có thể đi học được không?
**A:** Phải thêm vào lịch học trước (chọn làm giáo viên hoặc trợ giảng), sau đó sẽ có tên trong lưới chấm công.

### Q: Lương được tính bao giờ?
**A:** Kế toán tính cuối tháng. Bạn xem kết quả → Duyệt → Gửi cho nhân viên.

### Q: Xuất Excel có loại cụ thể nào không?
**A:** Xuất theo module: Chấm Công, Lương, Nhân Viên. Admin có thể tùy chỉnh report khác.

---

## 📞 Hỗ Trợ

- **Admin:** `admin@luna-hrm.local`
- **Kế Toán:** `accountant@luna-hrm.local`
- **Điều Hành:** Công ty quản lý
