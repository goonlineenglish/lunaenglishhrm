# Luna HRM — Hướng Dẫn Sử Dụng (User Guides)

**Cập nhật:** 2026-03-18
**Phiên bản:** 1.1

---

## 👋 Chào Mừng!

Luna HRM là hệ thống quản lý nhân sự dành cho Trung tâm tiếng Anh. Tài liệu này hướng dẫn bạn cách sử dụng từng module theo vai trò của bạn.

---

## 🎯 Chọn Vai Trò Của Bạn

### 1️⃣ **Quản Lý Cơ Sở (Branch Manager)**

**Trách nhiệm:**
- Quản lý lịch học & lớp học hàng tuần
- Nhập chấm công nhân viên
- Khóa/mở khóa tuần chấm công
- Phê duyệt bảng lương
- Quản lý hồ sơ nhân viên

📖 **Hướng dẫn:**
- **[user-guide-branch-manager-setup.md](./user-guide-branch-manager-setup.md)** — 🔥 **BẮT ĐẦU ĐÂY** Setup cơ sở lần đầu + step-by-step từng tính năng (URLs + form fields + nút nhấn)
  - Quy trình 1: Setup cơ sở
  - Quy trình 2: Thêm nhân viên (thủ công + Excel)
  - Quy trình 3: Tạo lịch học (thủ công + Excel)
  - Quy trình 4: Chấm công hàng tuần (click-cycle, auto-fill, lock/unlock, export)
  - Quy trình 5: VP Attendance
  - Checklist & FAQ

- [user-guide-branch-manager.md](./user-guide-branch-manager.md) — Tổng quan & ghi chú

**Modules chính:**
- ✅ Setup Chi Nhánh (`/dashboard/branches`)
- ✅ Quản Lý Nhân Viên (`/dashboard/employees`)
- ✅ Lịch Học (`/dashboard/class-schedules`)
- ✅ Chấm Công (`/dashboard/attendance`)
- ✅ Chấm Công VP (`/dashboard/office-attendance`)
- ✅ Bảng Lương (`/dashboard/payroll`) — xem & duyệt thôi
- ✅ KPI — xem thôi

---

### 2️⃣ **Kế Toán (Accountant)**

**Trách nhiệm:**
- Tính lương hàng tháng (3 loại công việc)
- Tính thuế TNCN & bảo hiểm xã hội
- Quản lý ghi chú điều chỉnh lương (bonus, penalty, substitute)
- Duyệt & gửi lương
- Xuất báo cáo Excel/PDF

📖 **Đọc:** [user-guide-accountant.md](./user-guide-accountant.md)

**Modules chính:**
- ✅ Bảng Lương (Payroll)
- ✅ Ghi Chú Hàng Tuần (Weekly Notes)
- ✅ KPI — xem thôi
- ✅ Nhân Viên (Employees) — xem thôi

---

### 3️⃣ **Nhân Viên (Employee)**

**Trách nhiệm:**
- Xem chấm công cá nhân
- Xem lương hàng tháng
- Xác nhận lương trước chuyển khoản
- Xem hồ sơ cá nhân
- Xem KPI (nếu là trợ giảng)

📖 **Đọc:** [user-guide-employee.md](./user-guide-employee.md)

**Modules chính:**
- ✅ Lịch Công Tác (My Attendance)
- ✅ Bảng Lương (My Payslips)
- ✅ Hồ Sơ Cá Nhân (My Profile)
- ✅ KPI (My KPI) — Nếu là trợ giảng

---

## 📚 Tất Cả Hướng Dẫn

| Vai Trò | File | Mục Đích |
|---------|------|---------|
| Quản lý cơ sở | [user-guide-branch-manager.md](./user-guide-branch-manager.md) | Quản lý chấm công, lịch học, phê duyệt lương |
| Kế toán | [user-guide-accountant.md](./user-guide-accountant.md) | Tính lương, quản lý điều chỉnh, duyệt lương |
| Nhân viên | [user-guide-employee.md](./user-guide-employee.md) | Xem chấm công, xem lương, xem KPI |

---

## 🆘 FAQ Chung

### Q: Tôi quên email đăng nhập?
**A:** Liên hệ **Admin** tại `admin@luna-hrm.local`

### Q: Mất mật khẩu?
**A:** Trang login → **Quên Mật Khẩu?** → Nhập email → Kiểm tra email (inbox hoặc spam)

### Q: Hệ thống bị lỗi / không tải được?
**A:**
1. Kiểm tra kết nối internet
2. Tải lại trang (Ctrl+Shift+Delete)
3. Thử trình duyệt khác (Chrome, Firefox)
4. Nếu còn lỗi → Liên hệ Admin

### Q: Có thể sử dụng trên điện thoại không?
**A:** Có. Luna HRM là Progressive Web App (PWA):
- **iPhone:** Safari → Share → Thêm vào Màn hình chính
- **Android:** Chrome → Menu → Cài đặt ứng dụng

### Q: Dữ liệu có an toàn không?
**A:** Có. Luna HRM sử dụng:
- Mã hóa HTTPS (SSL certificate)
- Supabase Cloud (Cloud Database)
- Xác thực 2 yếu tố (nếu cấp)
- Backup hàng ngày

### Q: Lịch làm việc hỗ trợ là bao giờ?
**A:**
- Thứ 2-5: 9:00 - 17:00
- Thứ 6: 9:00 - 16:00
- Thứ 7-CN: Không hỗ trợ (trường hợp khẩn cấp liên hệ Admin)

---

## 📧 Liên Hệ

### Bộ Phận Hỗ Trợ

| Phòng | Email | Chuyên Môn |
|-------|-------|-----------|
| Admin | `admin@luna-hrm.local` | Tài khoản, hệ thống, quyền hạn |
| Quản Lý Tân Mai | `bm.tanmai@luna-hrm.local` | Chấm công, lịch học |
| Quản Lý Quận 1 | `bm.quan1@luna-hrm.local` | Chấm công, lịch học |
| Kế Toán | `accountant@luna-hrm.local` | Lương, KPI, điều chỉnh |

---

## 🎓 Học Tập & Phát Triển

### Video Hướng Dẫn (Nếu Có)
- [YouTube Luna HRM Channel] — Sắp tới

### Khóa Đào Tạo
- Đào tạo online hàng tháng (liên hệ Admin để đăng ký)

### Phiên Bản Tiếng Anh
- English version coming soon

---

## 📝 Ghi Chú

- **Phiên bản hiện tại:** 1.1 (2026-03-18)
- **Hỗ trợ:** Tiếng Việt
- **Hệ thống:** Next.js 16 + Supabase
- **Trạng thái:** ✅ Production Ready

---

## 🚀 Bắt Đầu Ngay

1. Chọn vai trò của bạn từ trên
2. Đọc hướng dẫn tương ứng
3. Đăng nhập vào https://hrm.lunaenglish.io.vn
4. Thao tác theo step-by-step trong hướng dẫn
5. Nếu có thắc mắc → Liên hệ phòng hỗ trợ

---

**Happy Working! 🎉**
