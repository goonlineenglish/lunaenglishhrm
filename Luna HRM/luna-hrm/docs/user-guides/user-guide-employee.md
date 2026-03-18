# Hướng Dẫn Sử Dụng Luna HRM — Nhân Viên

**Phiên bản:** 1.1
**Ngày cập nhật:** 2026-03-18
**Dành cho:** Nhân viên (Giáo viên, Trợ giảng, Nhân viên VP)

---

## 📋 Tổng Quan

Tài liệu này hướng dẫn Nhân viên cách sử dụng Luna HRM để:
- Xem chấm công cá nhân
- Xem lương hàng tháng
- Xem hồ sơ cá nhân
- Xem KPI (Trợ giảng)
- Xác nhận lương trước chuyển khoản

**Quyền hạn Nhân viên:**
- ✅ Xem chấm công riêng
- ✅ Xem lương riêng
- ✅ Xem hồ sơ cá nhân
- ✅ Xem KPI (nếu là trợ giảng)
- ✅ Xác nhận lương
- ❌ Chỉnh sửa chấm công (Quản lý cơ sở)
- ❌ Tính lương (Kế toán)
- ❌ Quản lý toàn hệ thống

---

## 🚀 Bắt Đầu

### Đăng Nhập
1. Vào **https://hrm.lunaenglish.io.vn**
2. Nhập **email** (ví dụ: `john.smith@luna-hrm.local`)
3. Nhập **mật khẩu** (cấp lần đầu từ quản lý)
4. Kích **Đăng Nhập**

### Quên Mật Khẩu?
1. Kích **Quên Mật Khẩu?** trên trang login
2. Nhập email → Nhập email
3. Hệ thống gửi link reset về email (kiểm tra spam)
4. Kích link → Tạo mật khẩu mới

### Giao Diện Chính
```
Cổng Thông Tin Nhân Viên (Employee Portal)
├── Lịch Công Tác Của Tôi (My Attendance)
├── Bảng Lương Của Tôi (My Payslips)
├── Hồ Sơ Cá Nhân (My Profile)
├── KPI Của Tôi (My KPI) — Nếu là trợ giảng
└── Đăng Xuất
```

---

## 📅 Module 1: Lịch Công Tác (My Attendance)

### Tổng Quan
- Xem chấm công cá nhân theo từng lớp
- Xem chi tiết: ngày, tháng, trạng thái
- Xem lịch sử 3 tháng gần nhất
- **Lưu ý:** Chỉ xem thôi, không thể sửa

### Xem Chấm Công Tuần

**Step 1:** Kích **Lịch Công Tác Của Tôi**

**Step 2:** Chọn **Tuần** (mặc định là tuần hiện tại)

**Step 3:** Lưới hiển thị:
```
Tuần:        2026-03-02 đến 2026-03-08
────────────────────────────────────────

| Lớp Học            | Thứ 2 | Thứ 3 | Thứ 4 | Thứ 5 | Thứ 6 | Thứ 7 | CN |
| B1-Morning-01      |  1    |  1    |  1    |  1    |  1    |  KP   |  -  |
| A2-Afternoon-03    |  1    |  1    |  0.5  |  1    |  1    |  -    |  -  |
```

**Giải thích trạng thái:**
```
Trạng Thái    | Ý Nghĩa
──────────────────────────────
1             | Có mặt cả ngày
0             | Vắng có phép (có lý do)
KP            | Vắng không phép
0.5           | Nửa ngày (sáng hoặc chiều)
-             | Không có lớp hôm nay
```

### Xem Tổng Hợp Tháng

**Step 1:** Chọn **Tháng/Năm** từ dropdown

**Step 2:** Xem tóm tắt:
```
📊 Tóm Tắt Tháng 3/2026
───────────────────────────
Tổng Ngày Công:         20 ngày
Có Mặt:                 18 ngày
Vắng Có Phép:           1 ngày
Vắng Không Phép:        1 ngày
Nửa Ngày:               0 ngày
```

### Lịch Sử 3 Tháng

- Cuộn xuống → Xem lịch sử chấm công 3 tháng gần nhất
- Tìm kiếm tuần cụ thể

---

## 💰 Module 2: Bảng Lương (My Payslips)

### Tổng Quan
- Xem lương hàng tháng
- Xem chi tiết lương (cơ bản, phụ cấp, khấu trừ, thuế, ròng)
- Xem lịch sử lương năm ngoái
- **Lưu ý:** Sau khi duyệt, lương sẽ được chuyển khoản theo thông tin ngân hàng

### Xem Lương Hàng Tháng

**Step 1:** Kích **Bảng Lương Của Tôi**

**Step 2:** Danh sách lương theo tháng:
```
| Tháng | Lương Ròng | Trạng Thái    | Ngày Duyệt |
| 3/2026| 3,529,750  | Đã Duyệt ✓    | 2026-03-31 |
| 2/2026| 3,400,000  | Đã Chuyển     | 2026-02-28 |
```

**Step 3:** Kích tháng muốn xem

### Chi Tiết Lương Chi Tiết

```
John Smith — Tháng 3/2026
═══════════════════════════════════════

📊 LỰC LƯỢNG CÔNG VIỆC
  Giáo Viên:           40 phiên × 75,000 VND    = 3,000,000 VND
  Thay Thế:            4 phiên × 200,000 VND    = 800,000 VND
  ─────────────────────────────────────────────
  Tổng:                                         3,800,000 VND

💰 PHỤ CẤP & KHẤU TRỪ
  Phụ Cấp Bảo Hiểm:    500,000 VND
  Khấu Trừ Quỹ:        -100,000 VND
  ─────────────────────────────────────────────
  Tổng:                                         400,000 VND

═══════════════════════════════════════════════
Lương Tổng Cộng (GROSS):                 4,200,000 VND

🧮 KHOẢN TRỪ
  BHXH (8%):           336,000 VND
  BHYT (1.5%):         63,000 VND
  BHTN (1%):           42,000 VND
  Thuế TNCN:           229,250 VND
  ─────────────────────────────────────────────
  Tổng Khấu Trừ:                         670,250 VND

═══════════════════════════════════════════════
LƯƠNG RÒNG:                              3,529,750 VND

📅 CHUYỂN KHOẢN
  Ngân Hàng:           Vietcombank
  Chủ Tài Khoản:       JOHN SMITH
  Số Tài Khoản:        1234567890
  Trạng Thái:          Chuyển thành công ✓
```

### Xác Nhận Lương

- Sau khi Kế toán duyệt lương, bạn sẽ thấy nút **Xác Nhận Nhận Lương**
- Kích → Ghi nhận bạn đã nhận lương (tuỳ chọn)
- Lương sẽ được chuyển khoản theo thông tin ngân hàng

### Xuất Lương PDF

- Kích **Xuất PDF** → Tải chứng chỉ lương
- Có thể dùng để:
  - Gửi cho ngân hàng (chứng minh thu nhập)
  - Làm chứng thư cho khiếu nại
  - Lưu trữ cá nhân

### Lịch Sử Lương

- Cuộn xuống → Xem lương 12 tháng gần nhất
- So sánh lương theo từng tháng

---

## 🎯 Module 3: KPI (My KPI) — Cho Trợ Giảng

### Tổng Quan
- Xem điểm đánh giá hàng tháng (Part A + Part B)
- Xem lịch sử KPI 6 tháng
- Xem bonus KPI
- **Lưu ý:** Chỉ trợ giảng mới thấy module này

### Xem KPI Hàng Tháng

**Step 1:** Kích **KPI Của Tôi**

**Step 2:** Chọn **Tháng/Năm** → Danh sách KPI

**Step 3:** Kích tháng muốn xem → Chi tiết:
```
Trần Thị Linh — KPI Tháng 3/2026
═══════════════════════════════════

PHẦN A — YÊU CẦU CƠ BẢN
(Đạt/Không Đạt cho mỗi tiêu chí)
────────────────────────────────
✓ 1. Kiên trì đi làm
✓ 2. Tuân thủ quy định
✓ 3. Hoàn thành bài tập
✓ 4. Teamwork
─────────────────────────────
KẾT QUẢ: PASS ✓

PHẦN B — CHẤT LƯỢNG CÔNG VIỆC
(Chấm từ 0-10)
────────────────────────────────
1. Kỹ năng giảng dạy:        8/10
2. Chuẩn bị bài tập:         7/10
3. Tương tác với học sinh:   9/10
4. Đạt mục tiêu lớp:         8/10
5. Phát triển chuyên môn:    7/10
─────────────────────────────
TRUNG BÌNH:                  7.8/10

═══════════════════════════════════════
💰 BONUS KPI
Bonus = 7.8 × 50,000 VND = 390,000 VND
(Tính vào lương tháng)

LƯU Ý: Nếu Phần A = FAIL, Bonus = 0 VND
```

### Biểu Đồ KPI 6 Tháng

- Cuộn xuống → Biểu đồ lịch sử 6 tháng gần nhất
- Xem xu hướng: cải thiện hay giảm

### KPI & Lương

- Bonus KPI được tính vào **lương tháng đó**
- Ví dụ: KPI tháng 3 → Bonus → Nhập vào Lương tháng 3
- Xem chi tiết trong **Bảng Lương Của Tôi**

---

## 👤 Module 4: Hồ Sơ Cá Nhân (My Profile)

### Tổng Quan
- Xem thông tin cá nhân
- Xem thông tin công việc
- Xem thông tin ngân hàng
- Cập nhật mật khẩu

### Thông Tin Cá Nhân

```
👤 THÔNG TIN CƠ BẢN
─────────────────────
Tên:              John Smith
Mã Nhân Viên:     T-TM01
Email:            john.smith@luna-hrm.local
Điện Thoại:       0912 345 678
Chức Vụ:          Giáo Viên

📋 THÔNG TIN CÁ NHÂN
─────────────────────
CCCD:             123456789
Ngày Sinh:        1990-05-15
Địa Chỉ:          Tân Bình, TP.HCM

💼 THÔNG TIN CÔNG VIỆC
─────────────────────
Ngày Bắt Đầu:     2024-01-15
Hợp Đồng Lao Động: Có ✓
Tỷ Giá Cơ Bản:    75,000 VND/phiên

🏦 THÔNG TIN NGÂN HÀNG
─────────────────────
Ngân Hàng:        Vietcombank
Chủ Tài Khoản:    JOHN SMITH
Số Tài Khoản:     1234567890
```

### Cập Nhật Mật Khẩu

1. Kích **Cập Nhật Mật Khẩu** (góc phải)
2. Nhập:
   ```
   Mật Khẩu Hiện Tại:  [****]
   Mật Khẩu Mới:       [****]
   Xác Nhận:           [****]
   ```
3. Kích **Cập Nhật**
4. **Lưu ý:** Mật khẩu phải chứa ít nhất 8 ký tự, 1 số, 1 chữ hoa

---

## ⚙️ Cài Đặt & Phím Tắt

### Phím Tắt
```
Ctrl+P    : In trang hiện tại
Ctrl+Q    : Đăng xuất
F5        : Làm tươi dữ liệu
```

### Ứng Dụng Mobile (PWA)

Luna HRM là Progressive Web App — có thể cài đặt trên điện thoại:

**iPhone:**
1. Mở Safari → https://hrm.lunaenglish.io.vn
2. Kích **Share** → **Thêm vào Màn hình chính**
3. Tên ứng dụng: "Luna HRM" → **Thêm**

**Android:**
1. Mở Chrome → https://hrm.lunaenglish.io.vn
2. Kích **Menu (⋮)** → **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính**
3. Xác nhận

---

## ❓ FAQ

### Q: Chấm công bị sai, phải làm gì?
**A:** Liên hệ **Quản lý cơ sở** của chi nhánh. Bạn không thể sửa trực tiếp.

### Q: Lương bị nhỏ hơn dự kiến?
**A:**
1. Kiểm tra **Bảng Lương Của Tôi** → Chi tiết lương
2. Xem:
   - Sessions (số phiên công) có đủ không?
   - Thuế TNCN có hợp lý không?
   - BHXH/BHYT/BHTN có chính xác không?
3. Nếu còn thắc mắc → Liên hệ **Kế toán**

### Q: Khi nào nhận lương?
**A:**
- Lương được tính cuối tháng (do Kế toán)
- Sau khi duyệt → Chuyển khoản trong 3-5 ngày
- Xem **Trạng Thái** trong **Bảng Lương Của Tôi** để kiểm tra

### Q: Không đủ phiên công để tính lương?
**A:** Lương = tất cả phiên công trong tháng. Kiểm tra:
- Phiên bị xóa khỏi lịch học?
- Bị khóa tuần bị sửa?
→ Liên hệ Quản lý cơ sở

### Q: Bonus KPI tính sao?
**A:** Bonus = (Part B Average) × 50,000 VND
- **Điều kiện:** Part A phải = PASS
- Nếu Part A = FAIL → Bonus = 0 VND
- Bonus tính vào lương tháng đó

### Q: Quên mật khẩu?
**A:** Trang login → **Quên Mật Khẩu?** → Nhập email → Kiểm tra email → Kích link reset → Tạo mật khẩu mới.

### Q: Lương ròng (NET) là gì?
**A:** Lương **thực nhận** (tiền vào tài khoản ngân hàng) = Lương Tổng - Thuế - BHXH - BHYT - BHTN

Ví dụ:
```
Lương Tổng:   4,200,000 VND
- Thuế TNCN:    229,250 VND
- BHXH (8%):    336,000 VND
- BHYT (1.5%):   63,000 VND
- BHTN (1%):     34,000 VND
─────────────────────────────
= Lương Ròng:  3,537,750 VND ← Tiền vào tài khoản
```

### Q: Tại sao lương tháng này lại khác tháng trước?
**A:** Nguyên nhân có thể:
- Sessions khác (phiên công tăng/giảm)
- Bonus thêm/penalty (từ ghi chú)
- KPI bonus (nếu là trợ giảng)
- Thay đổi phụ cấp
- Kiểm tra Bảng Lương Của Tôi → So Sánh → Liên hệ Kế toán nếu thắc mắc

### Q: Có thể tải lương để lưu không?
**A:** Có. Kích **Xuất PDF** trong **Bảng Lương Của Tôi** → Tải về → Lưu trữ.

### Q: Ứng dụng mobile có an toàn không?
**A:** Tương tự web. Luôn:
- Không share mật khẩu với ai
- Đăng xuất sau mỗi lần sử dụng
- Không mở ứng dụng trên máy công cộng

---

## 📞 Liên Hệ Hỗ Trợ

### Vấn Đề Chấm Công
→ Liên hệ **Quản Lý Cơ Sở** chi nhánh của bạn
- Tân Mai: `bm.tanmai@luna-hrm.local`
- Quận 1: `bm.quan1@luna-hrm.local`

### Vấn Đề Lương
→ Liên hệ **Kế Toán**
- Email: `accountant@luna-hrm.local`

### Vấn Đề Hệ Thống / Quên Mật Khẩu
→ Liên hệ **Admin**
- Email: `admin@luna-hrm.local`

### Giờ Làm Việc Hỗ Trợ
- Thứ 2-5: 9:00 - 17:00
- Thứ 6: 9:00 - 16:00
- Thứ 7-CN: Không hỗ trợ
