# Hướng Dẫn Sử Dụng V3 — Ai Làm Gì, Ở Đâu, Như Thế Nào

> Cập nhật V3.1: Chấm công theo lớp-tuần, 3 công thức lương, KPI Trợ giảng chi tiết, chấm công VP staff

---

## TỔNG QUAN VAI TRÒ & MÀN HÌNH (V3)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AI LÀM GÌ, Ở ĐÂU? (V3)                                 │
│                                                                                  │
│  🔴 ADMIN           🟠 BRANCH MANAGER      🟢 ACCOUNTANT      🔵 EMPLOYEE       │
│  (Giám đốc)         (Quản lý cơ sở)        (Kế toán)          (Nhân viên)       │
│                                                                                  │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐   ┌─────────────┐   │
│  │ Cơ sở       │    │ Bảng chấm công  │    │ 3-tab payroll│   │ Xem chấm    │   │
│  │ Lịch lớp    │    │ tuần (lớp×ngày) │    │ TG/GV/VP     │   │ công        │   │
│  │ Nhân sự     │    │ Chấm công VP    │    │ Xác nhận +   │   │ Xem phiếu   │   │
│  │ System conf │    │ Ghi chú NV      │    │ gửi email    │   │ lương       │   │
│  │ Audit log   │    │ KPI Trợ giảng   │    │ Xuất Excel   │   │ Xem KPI     │   │
│  └─────────────┘    └─────────────────┘    └──────────────┘   └─────────────┘   │
│        │                    │                      │                 │           │
│        ▼                    ▼                      ▼                 ▼           │
│    Desktop only      Desktop + Mobile          Desktop only      Mobile PWA     │
│                                                                   (read-only)   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Màn Hình & Quyền Truy Cập Theo Vai Trò

```
┌──────────────────────────────────┬────────────┬────────────────┬────────────┬──────────┐
│  Màn hình / Chức năng            │   ADMIN    │ BRANCH MANAGER │ ACCOUNTANT │ EMPLOYEE │
├──────────────────────────────────┼────────────┼────────────────┼────────────┼──────────┤
│  Quản lý cơ sở                   │  CRUD      │  Xem           │  Xem       │  —       │
│  Quản lý lịch lớp                │  CRUD      │  CRUD          │  Xem       │  —       │
│  Quản lý nhân sự                 │  CRUD tất  │  CRUD cơ sở    │  Xem       │  Xem     │
│  Bảng chấm công tuần (GV/TG)    │  CRUD+Unlk │  CRUD          │  Xem       │  Xem     │
│  Chấm công VP (lễ tân/bảo vệ)   │  CRUD+Unlk │  CRUD          │  Xem       │  Xem     │
│  KPI Trợ giảng                   │  CRUD tất  │  CRUD cơ sở    │  Xem       │  Xem     │
│  Tính lương (3 tabs)             │  Xem       │  —             │  CRUD      │  —       │
│  Xác nhận + gửi email            │  —         │  —             │  Thực hiện │  —       │
│  Xuất Excel                      │  Có        │  Có            │  Có        │  —       │
│  Phiếu lương cá nhân             │  Xem tất   │  Xem cơ sở     │  Xem tất   │  Xem mình│
│  Audit log                       │  Xem tất   │  —             │  —         │  —       │
│  System config                   │  CRUD      │  —             │  —         │  —       │
└──────────────────────────────────┴────────────┴────────────────┴────────────┴──────────┘
```

---

## 🔴 ADMIN (Giám đốc / Quản trị viên)

### Vai trò: Setup hệ thống & giám sát toàn bộ

Admin làm việc trên **Desktop**. Công việc chủ yếu là setup một lần đầu, sau đó giám sát.

---

### Màn hình 1: Quản lý Cơ sở

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ADMIN — Quản lý Cơ sở                                     [+ Thêm cơ sở]     │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  Tên cơ sở        Địa chỉ              BM            Trạng thái  Action  │  │
│  │  ───────────────  ───────────────────  ────────────  ──────────  ──────  │  │
│  │  CS Tân Mai       120 Tân Mai, HN      Nguyễn Minh   ● Hoạt động  [Sửa] │  │
│  │  CS Cầu Giấy      55 Trần Duy Hưng     Lê Hương      ● Hoạt động  [Sửa] │  │
│  │  CS Online        Zoom/Google Meet      (Admin)       ● Hoạt động  [Sửa] │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Admin làm gì ở đây:**
- Tạo danh sách cơ sở (branch) — làm 1 lần
- Gán Branch Manager cho từng cơ sở
- Bật/tắt cơ sở khi mở/đóng chi nhánh

---

### Màn hình 2: Quản lý Thời Khóa Biểu (class_schedules)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ADMIN — Thời Khóa Biểu — CS Tân Mai                      [+ Thêm lớp]      │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌── Danh sách lớp (1 record = 1 lớp, nhiều ngày) ────────────────────────┐  │
│  │                                                                          │  │
│  │  Mã lớp  Tên lớp       Ca            Lịch       GV            TG        │  │
│  │  ──────  ────────────  ───────────── ─────────  ─────────────  ────────  │  │
│  │  BC04    IELTS 6.5 A1  19:00-20:30   T2/T4/T5   E01 Rosie     E08 Mai  │  │
│  │  BC05    TOEIC 500 B2  17:15-19:15   T3/T5      E03 Mike       E04 Dung │  │
│  │  BC06    Kids 1 C1     18:45-20:45   T2/T3/T5/T6 E05 Sarah    E02 Bình │  │
│  │  BC07    IELTS 7.0 D1  18:45-20:45   T4          E06 David     E09 Khoa │  │
│  │  BC08    Giao tiếp E1  17:15-19:15   T3/T5       E01 Rosie     E10 Lan  │  │
│  │  BC09    IELTS T7      10:00-12:00   T7          E01 Rosie     E08 Mai  │  │
│  │  ...                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  Form: Nhập mã NV → auto-fill tên, vị trí, rate lương                        │
│  ⚡ Thời khóa biểu setup 1 lần. Hệ thống tự sinh bảng chấm công tuần từ đây. │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Admin làm gì ở đây:**
1. Tạo thời khóa biểu cho từng cơ sở — làm 1 lần khi khai trương
2. Gán GV + Trợ giảng cho mỗi lớp (nhập mã NV → auto-fill thông tin)
3. Cập nhật khi lớp đổi GV, thêm lớp mới, đóng lớp

**Tại sao quan trọng:** Dữ liệu này là nguồn gốc để:
- Tự sinh bảng chấm công tuần (auto-fill "1" cho đúng ngày lớp học)
- Hiển thị đúng ô trắng vs ô disabled (░) trong bảng chấm công

---

### Màn hình 3: Quản lý Nhân sự (toàn hệ thống)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ADMIN — Nhân sự                            [+ Thêm NV]  [📥 Import Excel]    │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Lọc: [Tất cả cơ sở ▾]  [Tất cả vị trí ▾]                                    │
│                                                                                │
│  Mã    Tên VN          Tên EN        Vị trí      Đơn giá  HĐ LĐ   Cơ sở      │
│  ────  ──────────────  ────────────  ──────────  ───────  ──────  ─────────   │
│  E01   —               John Smith    GV n.ngoài  500k/b   Không   Tân Mai     │
│  E02   Trần Thị Bình   —             Trợ giảng    75k/b   Không   Tân Mai     │
│  E03   —               Mike Johnson  GV n.ngoài  450k/b   Không   Tân Mai     │
│  E04   Phạm Thị Dung   —             Trợ giảng    75k/b   Không   Tân Mai     │
│  E20   Nguyễn Thị Mai  —             Lễ tân       150k/b  Có      Tân Mai     │
│  E21   Đỗ Văn Giang    —             Bảo vệ       120k/b  Có      Tân Mai     │
│  ...                                                                           │
│                                                                                │
│  Click vào NV → Xem/Sửa hồ sơ + lịch sử chấm công + KPI                     │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Admin làm gì ở đây:**
1. Tạo tài khoản nhân viên mới
2. Gán vai trò (role): admin / branch_manager / accountant / employee
3. Cập nhật đơn giá/buổi — đây là snapshot rate khi tính lương
4. Bật/tắt cờ `has_labor_contract` → ảnh hưởng BHXH/BHYT/BHTN
5. Import Excel danh sách NV khi setup lần đầu

---

### Màn hình 4: Audit Log

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ADMIN — Audit Log                                     Lọc: [Hôm nay ▾]       │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Thời gian        Người dùng      Hành động              Chi tiết             │
│  ─────────────    ─────────────   ─────────────────────  ───────────────────  │
│  06/03 21:35      Nguyễn Minh     Lưu chấm công tuần     CS Tân Mai, T2 02/03 │
│  06/03 20:18      Lê Hương (KT)   Xác nhận bảng lương    T3/2026 CS Tân Mai   │
│  06/03 09:05      Admin           Sửa đơn giá E01        500k → 520k          │
│  05/03 18:42      Nguyễn Minh     Khóa tuần              Tuần 24/02-01/03     │
│  ...                                                                           │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🟠 BRANCH MANAGER (Quản lý cơ sở)

### Vai trò: Chấm công hàng tuần + Đánh giá KPI Trợ giảng hàng tháng

BM làm việc trên **Desktop** (chính) và **Mobile** (khi cần xem nhanh).

---

### Màn hình 1: Bảng Chấm Công Tuần (V3 — Lớp × Ngày)

#### Desktop View

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🏢 HRM Luna  │ Cơ sở │ Lịch lớp │ ★ Chấm công │ Tính lương │ NV │        👤 Minh (BM) ▾      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  Chấm công tuần — CS Tân Mai                              Tuần: 02/03 - 08/03/2026   ◀  ▶      │
│                                                                                                  │
│  ┌─ Chú thích: 1=Đi dạy  0=Vắng phép  KP=Ko phép  0.5=Nửa buổi  ░=Ko có lịch ──────────────┐  │
│  │                                                                                            │  │
│  │                                              │  T2   │  T3   │  T4   │  T5   │  T6   │   │  │
│  │  Lớp          Ca          Vị trí  Mã  Tên   │ 02/03 │ 03/03 │ 04/03 │ 05/03 │ 06/03 │Tổng│  │
│  │  ──────────── ─────────── ─────── ─── ───── │───────│───────│───────│───────│───────│────│  │
│  │                                              │       │       │       │       │       │    │  │
│  │  IELTS 6.5   17:15-19:15  GV      E01  —    │  [1]  │  ░░░  │  [1]  │  ░░░  │  [1]  │ 3  │  │
│  │  A1                       TG      E08  T.Hà │  [1]  │  ░░░  │  [1]  │  ░░░  │  [1]  │ 3  │  │
│  │                                              │       │       │       │       │       │    │  │
│  │  TOEIC 500   17:15-19:15  GV      E03  —    │  ░░░  │  [1]  │  ░░░  │  [1]  │  ░░░  │ 2  │  │
│  │  B2                       TG      E04  T.Dung│ ░░░  │  [1]  │  ░░░  │ [0]▼  │  ░░░  │1.5 │  │
│  │                                              │       │       │       │       │       │    │  │
│  │  Kids 1      18:45-20:45  GV      E05  —    │  [1]  │  [1]  │  ░░░  │  [1]  │  [1]  │ 4  │  │
│  │  C1                       TG      E02  T.Bình│ [1]  │ [KP]🔴│  ░░░  │  [1]  │  [1]  │ 3  │  │
│  │                                              │       │       │       │       │       │    │  │
│  │  IELTS 7.0   18:45-20:45  GV      E06  —    │  ░░░  │  ░░░  │  [1]  │  ░░░  │  ░░░  │ 1  │  │
│  │  D1                       TG      E09  V.Khoa│ ░░░  │  ░░░  │  [1]  │  ░░░  │  ░░░  │ 1  │  │
│  │                                              │       │       │       │       │       │    │  │
│  │  Giao tiếp   17:15-19:15  GV      E01  —    │  ░░░  │  [1]  │  ░░░  │  [1]  │  ░░░  │ 2  │  │
│  │  E1                       TG      E10  T.Lan │  ░░░  │  [1]  │  ░░░  │[0.5]🟡│ ░░░  │1.5 │  │
│  │  ──────────────────────────────────────────────────────────────────────────────────────  │  │
│  │  (T7-CN nếu có lớp)                         │  T7   │  CN   │       │       │       │    │  │
│  │  IELTS 6.5   10:00-12:00  GV      E01  —    │  [1]  │  ░░░  │       │       │       │    │  │
│  │  A1 (sáng)                TG      E08  T.Hà │  [1]  │  ░░░  │       │       │       │    │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│  ┌─ Ghi chú tuần (per-employee, BM nhập) ────────────────────────────────────────────────────┐  │
│  │  📋 Dạy thay                                                                              │  │
│  │  E01 John → thay E07, lớp Giao tiếp E1, 2 buổi                                      [✎] │  │
│  │                                                                                            │  │
│  │  📝 Ghi chú                                                                               │  │
│  │  E02 T.Bình → KP T3 03/03, vắng không báo trước                                     [✎] │  │
│  │  E04 T.Dung → vắng T5 05/03, khám bệnh có xin phép                                  [✎] │  │
│  │  E10 T.Lan → nửa buổi T5, nghỉ sớm do con ốm                                        [✎] │  │
│  │                                                                                            │  │
│  │  [+ Thêm ghi chú]                                                                         │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│  ┌─ Tổng hợp NV tuần này ─────────────────────────────────────────────────────────────────────┐  │
│  │  Mã   Tên                Tổng buổi  Vắng phép  KP   Ghi chú                               │  │
│  │  E01  John Smith             5          0       0    +2 buổi dạy thay (lớp E1)            │  │
│  │  E02  Trần Thị Bình          3          0       1    KP T3                                 │  │
│  │  E04  Phạm Thị Dung          1.5        1       0    Vắng T5                               │  │
│  │  E08  Vũ Thị Hà              4          0       0                                          │  │
│  │  E09  Bùi Văn Khoa           1          0       0                                          │  │
│  │  E10  Đinh Thị Lan           1.5        0       0    Nửa buổi T5                           │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│  [💾 Lưu tuần]   [🔒 Khóa tuần]   [📥 Xuất Excel]      Lưu lần cuối: 06/03/2026 21:30        │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Mobile View (BM dùng khi ngoài văn phòng)

```
┌──────────────────────────┐
│ ◀  Chấm công tuần    🔔  │
├──────────────────────────┤
│                          │
│  CS Tân Mai              │
│  Tuần 02/03-08/03  ◀ ▶  │
│                          │
│  ┌──────────────────────┐│
│  │ IELTS 6.5 A1         ││
│  │ 17:15-19:15          ││
│  │ T2/T4/T6 + T7        ││
│  │                      ││
│  │ GV E01 John          ││
│  │ T2[1] T4[1] T6[1]   ││
│  │ T7[1]                ││
│  │                      ││
│  │ TG E08 T.Hà          ││
│  │ T2[1] T4[1] T6[1]   ││
│  │ T7[1]                ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │ TOEIC 500 B2         ││
│  │ 17:15-19:15 — T3/T5  ││
│  │                      ││
│  │ GV E03 Mike          ││
│  │ T3[1] T5[1]          ││
│  │                      ││
│  │ TG E04 T.Dung        ││
│  │ T3[1] T5[ 0 ]        ││
│  │         ↑ Tap để sửa ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │ Kids 1 C1            ││
│  │ 18:45-20:45          ││
│  │ T2/T3/T5/T6          ││
│  │                      ││
│  │ GV E05 Sarah         ││
│  │ T2[1] T3[1]          ││
│  │ T5[1] T6[1]          ││
│  │                      ││
│  │ TG E02 T.Bình        ││
│  │ T2[1] T3[KP]🔴       ││
│  │ T5[1] T6[1]          ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │ 📝 Ghi chú (2)       ││
│  │ 📋 E01 thay E07 ×2  ││
│  │ 📝 E02 KP T3        ││
│  │ [+ Thêm ghi chú]    ││
│  └──────────────────────┘│
│                          │
│  [💾 Lưu tuần]           │
│                          │
├──────────────────────────┤
│  🏠    📋    💰    👤    │
└──────────────────────────┘
```

---

### Workflow Chấm Công Tuần (BM — Step by step)

```
THỨ 2 ĐẦU TUẦN MỚI
        │
        ▼
┌───────────────────────────────────────┐
│  1. Mở Bảng Chấm Công                │
│     Hệ thống tự sinh bảng từ lịch lớp │
│     Tất cả ô có lịch = mặc định [1]  │
│     Ô không có lịch = ░░░ (disabled)  │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  2. Review Auto-fill                  │
│     Xem bảng — thường đã đúng ~95%   │
│     Chỉ cần sửa NV vắng / ngoại lệ   │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  3. Sửa Ngoại lệ (nếu có)            │
│     Click ô → đổi: 1 → 0 / KP / 0.5 │
│     KP highlight đỏ 🔴               │
│     0.5 highlight vàng 🟡            │
│     Cảnh báo conflict nếu GV 2 lớp  │
│     cùng giờ cùng ngày               │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  4. Nhập Ghi chú Tuần                 │
│     Dạy thay: E01 thay E07, lớp E1   │
│     Phụ đạo: E08 dạy phụ 1 buổi     │
│     Kế toán đọc ghi chú này khi      │
│     tính lương dạy thay              │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  5. Xem Diff View trước khi Lưu       │
│     Hệ thống hiện: "3 thay đổi so    │
│     với auto-fill: E02 KP T3, ..."   │
│     BM xác nhận → Lưu                │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  6. Lưu & Khóa tuần                   │
│     [💾 Lưu tuần] — lưu bất cứ lúc  │
│     [🔒 Khóa tuần] — khi xong hẳn   │
│     Auto-lock sau 3 ngày từ T2 mới  │
│     ⏰ Nhắc T7 tối nếu chưa lưu      │
└───────────────────────────────────────┘

Tổng thời gian: ~2 phút/tuần (vs 15-20 phút/ngày kiểu cũ)
```

---

### Màn hình 1b: Chấm Công Văn Phòng (VP Staff — Daily Grid)

Dùng cho NV **không gắn với lớp học** (lễ tân, bảo vệ, hành chính). Bảng đơn giản hơn: NV × ngày.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Chấm công VP — CS Tân Mai                  Tuần: 02/03 – 08/03  ◀ ▶  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Mã    Tên              Vị trí  │ T2  │ T3  │ T4  │ T5  │ T6  │ T7 │CN│
│  ────  ───────────────  ─────── │─────│─────│─────│─────│─────│────│───│
│  E20   Nguyễn Thị Mai   Lễ tân  │ [1] │ [1] │ [1] │ [1] │ [1] │[0.5]│░░│
│  E21   Đỗ Văn Giang     Bảo vệ  │ [1] │ [1] │ [1] │ [1] │ [1] │ [1]│[1]│
│  E22   Lê Thị Oanh      HC      │ [1] │ [0] │ [1] │ [1] │ [1] │ ░░░│░░░│
│                                                                          │
│  [💾 Lưu tuần]   [🔒 Khóa tuần]                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

**Khác biệt so với chấm công GV/TG:**
- Không link `class_schedules` — đánh per employee per day
- Lưu vào `office_attendance` table (tách riêng)
- Default `1` cho ngày làm việc bình thường (BM cũng chỉ sửa ngoại lệ)
- Payroll VP: `days_worked × rate_per_session` (không có KPI)

---

### Màn hình 2: Form KPI Trợ Giảng (BM đánh giá hàng tháng)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  Đánh giá KPI Trợ giảng — T3/2026 — CS Tân Mai                    [◀ Trước] [Sau ▶]    │
│                                           Trần Thị Bình (E02) — Trợ giảng              │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ── A. LƯƠNG CỨNG — Điều kiện đạt 75,000 VND/buổi (Pass/Fail) ──                      │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Tiêu chí bắt buộc                                           Đạt?                 │  │
│  │  ────────────────────────────────────────────────────────    ────────             │  │
│  │  1. Hoàn thành nhiệm vụ TG theo mô tả công việc             [✅ Đạt]  [❌]        │  │
│  │  2. Chuẩn bị phòng học, bàn ghế, vật tư, vệ sinh           [✅ Đạt]  [❌]        │  │
│  │  3. Đúng giờ (đến trước ít nhất 15 phút)                    [✅ Đạt]  [❌]        │  │
│  │  4. Điểm danh HS hàng ngày + báo vắng không phép            [✅ Đạt]  [❌]        │  │
│  │                                                                                    │  │
│  │  → Kết quả: ✅ ĐẠT — Nhận lương cứng 75,000 VND/buổi                             │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  ── B. THƯỞNG KPI — 5 tiêu chí, tổng /10 (Pre-filled từ tháng trước) ──               │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                                    │  │
│  │  1. GIỜ TSI (0-1)                                            Điểm: [ 1 ▾]         │  │
│  │     Hỗ trợ GV duy trì kỷ luật cho 80% học sinh                                   │  │
│  │     Nhận xét: [Quản lý lớp tốt, chủ động hỗ trợ GV                          ]    │  │
│  │                                                                                    │  │
│  │  2. GIỜ FUNTIME (0-3)                                        Điểm: [ 2 ▾]         │  │
│  │     a) Theo kế hoạch Funtime (0-1):    [1 ▾]                                      │  │
│  │     b) Hiểu tình hình từng HS (0-1):   [1 ▾]                                      │  │
│  │     c) Đạt mục tiêu Funtime (0-1):     [0 ▾]                                      │  │
│  │     Nhận xét: [Cần cải thiện mục tiêu level cuối kỳ                         ]    │  │
│  │                                                                                    │  │
│  │  3. PHỤ HUYNH (0-2)                                          Điểm: [ 2 ▾]         │  │
│  │     a) Thân thiện, nhiệt tình với phụ huynh (0-1): [1 ▾]                          │  │
│  │     b) Chia sẻ tình hình học sinh (0-1):            [1 ▾]                          │  │
│  │     Nhận xét: [Phụ huynh feedback rất tích cực                               ]    │  │
│  │                                                                                    │  │
│  │  4. HỌC SINH (0-3)                                           Điểm: [ 3 ▾]         │  │
│  │     a) Giao tiếp 100% tiếng Anh (0-1):  [1 ▾]                                     │  │
│  │     b) Kỷ luật lớp (0-1):               [1 ▾]                                     │  │
│  │     c) An toàn trẻ em (0-1):            [1 ▾]                                     │  │
│  │     Nhận xét: [Xuất sắc, lớp kỷ luật và an toàn tốt                          ]    │  │
│  │                                                                                    │  │
│  │  5. TÁC PHONG (0-1)                                          Điểm: [ 1 ▾]         │  │
│  │     Không vắng quá 2 lần, trang phục đúng, không dùng điện thoại trong lớp        │  │
│  │     Nhận xét: [Đạt tiêu chuẩn                                                ]    │  │
│  │                                                                                    │  │
│  │  ───────────────────────────────────────────────────────────────────────────────   │  │
│  │  TỔNG KPI: 9/10   (Thang: ≥9 Xuất sắc | 7-8 Rất tốt | 5-6 Tốt | <5 Yếu)       │  │
│  │  THƯỞNG:   9 × 50,000 = 450,000 VND                                              │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  ── C. Lịch sử KPI 6 tháng (History Chart) ──                                          │
│  ┌─ E02 T.Bình ──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                                    │  │
│  │  10 │                    ●                                                         │  │
│  │   9 │          ●    ●         ●    ●    ●                                         │  │
│  │   8 │     ●                                                                        │  │
│  │   7 │                                                                              │  │
│  │   6 │                                                                              │  │
│  │     └────┬────┬────┬────┬────┬────                                                │  │
│  │         T10  T11  T12  T1   T2   T3/26                                            │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  [💾 Lưu KPI]  [Chuyển sang TG tiếp ▶]  [Hủy]                                          │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Workflow KPI Trợ Giảng (BM — hàng tháng, quanh ngày 25)

```
NGÀY 25 HÀNG THÁNG
        │
        ▼  (⏰ Hệ thống nhắc BM nếu chưa chấm KPI)
┌───────────────────────────────────────┐
│  1. Mở danh sách KPI tháng hiện tại  │
│     Hiện tất cả TG của cơ sở         │
│     TG chưa chấm = badge vàng ⚠️     │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  2. Mở form KPI từng Trợ giảng       │
│     Pre-fill từ tháng trước (tối ưu M)│
│     BM review — chỉ sửa thay đổi     │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  3. Đánh giá Pass/Fail lương cứng     │
│     4 tiêu chí bắt buộc              │
│     Không đạt → lương cứng = 0       │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  4. Chấm điểm 5 tiêu chí KPI         │
│     TSI (0-1) + Funtime (0-3) +      │
│     Phụ huynh (0-2) + HS (0-3) +     │
│     Tác phong (0-1) = Tổng /10       │
│     Nhập nhận xét cho từng tiêu chí  │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  5. Xem History Chart (tối ưu O)      │
│     So sánh với 6 tháng trước        │
│     Đảm bảo chấm nhất quán           │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  6. Lưu KPI → Chuyển TG tiếp         │
│     Lặp lại cho tất cả TG            │
│     Kế toán sẽ thấy điểm KPI này     │
│     trong bảng lương tháng sau       │
└───────────────────────────────────────┘

Tổng thời gian: ~15 phút cho tất cả TG/tháng
```

---

## 🟢 ACCOUNTANT (Kế toán)

### Vai trò: Tính lương 3 tab, xác nhận, gửi email, xuất Excel

Kế toán làm việc trên **Desktop**. Công việc chính từ ngày 1-5 đầu tháng sau.

---

### Màn hình 1: Bảng Lương — Tab Trợ Giảng (với KPI)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  🏢 HRM Luna  │ Cơ sở │ Lịch lớp │ Chấm công │ ★ Tính lương │ NV │    👤 Hà (KT) ▾    │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Bảng lương T3/2026 — CS Tân Mai             [+ Tạo kỳ lương]  [⚡ Tính tự động]       │
│                                                                                          │
│  ┌─ Preview so sánh tháng trước (tối ưu G) ──────────────────────────────────────────┐  │
│  │  Tổng T2/2026: 48,967,000   →   Tổng T3/2026: 50,242,000   (+2.6% bình thường ✅)│  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  ┌─────────────────────┬─────────────────────┬─────────────────────┐                    │
│  │  ★ Trợ giảng (8)    │  Giáo viên (5)      │  Văn phòng (3)      │  ← 3 TABS          │
│  └─────────────────────┴─────────────────────┴─────────────────────┘                    │
│                                                                                          │
│  Công thức: Lương cứng (75k×buổi) + Dạy thay + Lương khác + Thưởng KPI                │
│                                                                                          │
│  ┌── Phần A: Buổi làm + Dạy thay ──────────────────────────────────────────────────┐   │
│  │  #  Mã   Tên VN         Lớp        Cứng   Buổi  Thay   Buổi  Khác              │   │
│  │                                    /buổi  làm   /buổi  thay                     │   │
│  │  1  E02  Trần Thị Bình  Kids 1 C1  75k    16    40k      2      0               │   │
│  │  2  E04  Phạm Thị Dung  TOEIC B2   75k    14    40k      0      0               │   │
│  │  3  E08  Vũ Thị Hà      IELTS A1   75k    16    40k      1    50,000            │   │
│  │  4  E09  Bùi Văn Khoa   IELTS D1   75k    16    40k      0      0               │   │
│  │  5  E10  Đinh Thị Lan   Giao tiếp  75k    15    40k      0      0               │   │
│  │  ...                                                                             │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌── Phần B: Đánh giá KPI (từ BM — chỉ Trợ giảng) ────────────────────────────────┐   │
│  │  #  Mã   Tên VN         TSI  Funtime  PH   HS   Tác phong  Tổng  Bonus          │   │
│  │                          /1    /3     /2   /3       /1      /10                  │   │
│  │  1  E02  Trần Thị Bình   1     2      2    3        1        9    450,000        │   │
│  │  2  E04  Phạm Thị Dung   1     2      1    2        1        7    350,000        │   │
│  │  3  E08  Vũ Thị Hà       0     3      2    3        0        8    400,000        │   │
│  │  4  E09  Bùi Văn Khoa    1     1      1    2        1        6    300,000        │   │
│  │  5  E10  Đinh Thị Lan    1     2      1    2        0        6    300,000        │   │
│  │  ...                                                                             │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌── Phần C: Tổng lương NET ────────────────────────────────────────────────────────┐   │
│  │  #  Mã   Tên VN         L.cứng   Dạy thay  Khác   KPI bonus  GROSS     NET      │   │
│  │  1  E02  Trần Thị Bình  1,200k    80k        0     450k       1,730k  1,730k    │   │
│  │  2  E04  Phạm Thị Dung  1,050k      0        0     350k       1,400k  1,400k    │   │
│  │  3  E08  Vũ Thị Hà      1,200k    40k      50k     400k       1,690k  1,690k    │   │
│  │  4  E09  Bùi Văn Khoa   1,200k      0        0     300k       1,500k  1,500k    │   │
│  │  5  E10  Đinh Thị Lan   1,125k      0        0     300k       1,425k  1,425k    │   │
│  │  ...                                                                             │   │
│  │  ─────────────────────────────────────────────────────────────────────────────   │   │
│  │  TỔNG TAB TRỢ GIẢNG:                                                 10,745k    │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌── Ghi chú từ BM (checklist) ─────────────────────────────────────────────────────┐   │
│  │  ☐  Tuần 1: E01 dạy thay 2 buổi lớp E1 cho E07 (nghỉ ốm) → Thêm 2 buổi thay  │   │
│  │  ☑  Tuần 3: E08 dạy phụ đạo 1 buổi (50k) → ĐÃ tính vào Lương khác            │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  [✅ Xác nhận tab TG]   [📧 Gửi email tab TG]   [📥 Xuất Excel]                        │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Màn hình 2: Tab Giáo viên (không có KPI)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┬─────────────────────┬─────────────────────┐                    │
│  │  Trợ giảng (8)      │  ★ Giáo viên (5)    │  Văn phòng (3)      │                    │
│  └─────────────────────┴─────────────────────┴─────────────────────┘                    │
│                                                                                          │
│  Công thức: Lương cứng (đơn giá×buổi) + Dạy thay + Lương khác — KHÔNG có KPI          │
│                                                                                          │
│  ┌── Bảng lương GV ─────────────────────────────────────────────────────────────────┐   │
│  │  #  Mã   Tên EN         Lớp              Cứng    Buổi  Thay  Buổi  Khác  GROSS  │   │
│  │                                          /buổi   dạy   /buổi thay               │   │
│  │  1  E01  John Smith     IELTS A1+Gt.E1   500k    22     0     0      0   11,000k │   │
│  │                         (2 lớp)                                                  │   │
│  │  2  E03  Mike Johnson   TOEIC B2          450k   18     0     0      0    8,100k │   │
│  │  3  E05  Sarah Williams Kids 1 C1         500k   16     0     0      0    8,000k │   │
│  │  4  E06  David Brown    IELTS D1          450k    8     0     0      0    3,600k │   │
│  │  5  E07  (đang nghỉ)    —                   —    0     0     0      0        0   │   │
│  │  ─────────────────────────────────────────────────────────────────────────────   │   │
│  │                                                                                  │   │
│  │  #  HĐ lao động  BHXH     BHYT     BHTN     TNCN    Khấu trừ   NET             │   │
│  │  1  ☐ Không        0        0        0        0          0    11,000k           │   │
│  │  2  ☐ Không        0        0        0        0          0     8,100k           │   │
│  │  3  ☑ Có         640k     120k      80k       0          0     7,160k  ⚠️>20%  │   │
│  │  4  ☐ Không        0        0        0        0          0     3,600k           │   │
│  │  5  —             —        —        —        —          —         0              │   │
│  │  ─────────────────────────────────────────────────────────────────────────────   │   │
│  │  TỔNG TAB GV:                                                       29,860k     │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  [✅ Xác nhận tab GV]   [📧 Gửi email tab GV]   [📥 Xuất Excel]                        │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Màn hình 3: Tab Văn phòng

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┬─────────────────────┬─────────────────────┐                    │
│  │  Trợ giảng (8)      │  Giáo viên (5)      │  ★ Văn phòng (3)    │                    │
│  └─────────────────────┴─────────────────────┴─────────────────────┘                    │
│                                                                                          │
│  Công thức: Lương cứng (đơn giá×buổi) + Dạy thay + Lương khác — KHÔNG có KPI          │
│                                                                                          │
│  ┌── Bảng lương VP ─────────────────────────────────────────────────────────────────┐   │
│  │  #  Mã   Tên VN         Vị trí    Cứng    Buổi  Thay  Buổi  Khác   GROSS        │   │
│  │                                   /buổi   làm   /buổi thay                       │   │
│  │  1  E20  Nguyễn Thị Mai  Lễ tân   150k    24     0     0     0     3,600k        │   │
│  │  2  E21  Đỗ Văn Giang    Bảo vệ   120k    26     0     0     0     3,120k        │   │
│  │  3  E22  Lê Thị Oanh     HC       180k    22     0     0     0     3,960k        │   │
│  │  ─────────────────────────────────────────────────────────────────────────────   │   │
│  │                                                                                  │   │
│  │  #  HĐ LĐ  BHXH (8%)  BHYT (1.5%)  BHTN (1%)  TNCN  Khấu trừ/Phạt    NET     │   │
│  │  1  ☑ Có    288k        54k          36k          0         0          3,222k    │   │
│  │  2  ☑ Có    249k        46k          31k          0         0          2,794k    │   │
│  │  3  ☑ Có    316k        59k          39k          0    -200k (phạt)   3,346k    │   │
│  │  ─────────────────────────────────────────────────────────────────────────────   │   │
│  │  TỔNG TAB VP:                                                         9,362k    │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  [✅ Xác nhận tab VP]   [📧 Gửi email tab VP]   [📥 Xuất Excel]                        │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Workflow Tính Lương Tháng (Accountant — Step by step)

```
ĐẦU THÁNG (ngày 1-5)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  1. Tạo kỳ lương mới                                      │
│     [+ Tạo kỳ lương] → chọn tháng → chọn cơ sở           │
│     Hệ thống khóa chấm công tháng cũ tự động              │
└───────────────────────────────┬───────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────┐
│  2. Tính tự động                                           │
│     [⚡ Tính tự động] — Hệ thống:                         │
│     - Đếm buổi từ attendance theo từng NV                  │
│     - Lấy snapshot rate (đơn giá tại thời điểm tính)      │
│     - Tải điểm KPI từ BM (chỉ Trợ giảng)                  │
│     - Áp công thức 3 loại (TG / GV / VP)                  │
│     - Tính BHXH/BHYT/BHTN nếu có HĐ LĐ                   │
│     - Tính TNCN nếu vượt ngưỡng                           │
└───────────────────────────────┬───────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────┐
│  3. Xem Preview so sánh tháng trước                        │
│     Bảng tháng này vs tháng trước                          │
│     NV tăng/giảm >20% → cảnh báo vàng ⚠️                  │
│     Xử lý bất thường trước khi xác nhận                   │
└───────────────────────────────┬───────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────┐
│  4. Review Tab Trợ giảng                                   │
│     Kiểm tra 3 phần: Buổi làm / KPI / NET                 │
│     Đọc Ghi chú BM → tick checklist dạy thay/phụ đạo     │
│     Điều chỉnh nếu cần (dạy thay, lương khác)             │
│     [✅ Xác nhận tab TG]                                   │
└───────────────────────────────┬───────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────┐
│  5. Review Tab Giáo viên                                   │
│     Kiểm tra buổi dạy, đơn giá, BHXH nếu có HĐ           │
│     [✅ Xác nhận tab GV]                                   │
└───────────────────────────────┬───────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────┐
│  6. Review Tab Văn phòng                                   │
│     Kiểm tra BHXH/BHYT/BHTN (đều có HĐ)                  │
│     Kiểm tra khấu trừ/phạt nếu có                         │
│     [✅ Xác nhận tab VP]                                   │
└───────────────────────────────┬───────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────┐
│  7. Double Confirm (tối ưu K)                              │
│     "Xác nhận chi trả 50,242,000 VND cho 16 nhân viên?"  │
│     [✅ Xác nhận tất cả]                                   │
└───────────────────────────────┬───────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────┐
│  8. Gửi Email phiếu lương                                  │
│     [📧 Gửi email tất cả] hoặc gửi từng tab              │
│     Mỗi NV nhận phiếu lương cá nhân qua email            │
│     (+ có thể xem trên PWA)                               │
└───────────────────────────────┬───────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────┐
│  9. Xuất Excel (tối ưu S)                                  │
│     Format giống Excel hiện tại để lưu hồ sơ             │
│     [📥 Xuất Excel] → tải về                              │
│                                                            │
│     Undo 24h nếu phát hiện sai (tối ưu L)                 │
└───────────────────────────────────────────────────────────┘

Tổng thời gian: ~30-45 phút/tháng cho toàn cơ sở
```

---

## 🔵 EMPLOYEE (Nhân viên — Self-service PWA)

### Vai trò: Xem chấm công, phiếu lương, KPI của chính mình

Nhân viên dùng **Mobile PWA** — chỉ **đọc**, không sửa gì.

---

### Màn hình: Home PWA

```
┌──────────────────────────┐
│  🏢 HRM Luna         🔔  │
├──────────────────────────┤
│                          │
│  Xin chào, T.Bình ✋     │
│  Trợ giảng — CS Tân Mai  │
│                          │
│  ┌──────────────────────┐│
│  │  📋 CHẤM CÔNG        ││
│  │  Tháng 3: 16 buổi   ││
│  │  KP: 1 buổi (T3/03) ││
│  │  [Xem chi tiết →]    ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │  💰 LƯƠNG T3/2026    ││
│  │  ✅ Đã xác nhận      ││
│  │  1,730,000 VND       ││
│  │  [Xem phiếu lương →] ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │  ⭐ KPI T3/2026       ││
│  │  9/10 — Xuất sắc    ││
│  │  Thưởng: 450,000 VND ││
│  │  [Xem chi tiết →]    ││
│  └──────────────────────┘│
│                          │
├──────────────────────────┤
│  🏠    📋    💰    👤    │
└──────────────────────────┘
```

---

### Màn hình: Phiếu Lương Chi tiết (Trợ giảng)

```
┌──────────────────────────┐
│ ◀  Phiếu lương       🔔  │
├──────────────────────────┤
│                          │
│  👤 Trần Thị Bình (E02)  │
│  Trợ giảng — CS Tân Mai  │
│                          │
│  Kỳ: T3/2026      ◀  ▶  │
│                          │
│  ╔══════════════════════╗ │
│  ║  💰 THỰC LÃNH        ║ │
│  ║   1,730,000 VND      ║ │
│  ║  ✅ Đã xác nhận      ║ │
│  ╚══════════════════════╝ │
│                          │
│  ┌──────────────────────┐│
│  │  📊 BUỔI LÀM VIỆC    ││
│  │  Buổi dạy:      16   ││
│  │  Buổi dạy thay:  2   ││
│  │  Tổng buổi:     18   ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │  💵 THU NHẬP          ││
│  │  Lương cứng:         ││
│  │  16 × 75k = 1,200k   ││
│  │  Dạy thay:           ││
│  │   2 × 40k =    80k   ││
│  │  Lương khác:      0   ││
│  │  ─────────────────── ││
│  │  Thưởng KPI:         ││
│  │  9/10 × 50k = 450k   ││
│  │  ─────────────────── ││
│  │  GROSS:     1,730k   ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │  ⭐ KPI THÁNG NÀY     ││
│  │  TSI:       1/1       ││
│  │  Funtime:   2/3       ││
│  │  Phụ huynh: 2/2       ││
│  │  Học sinh:  3/3       ││
│  │  Tác phong: 1/1       ││
│  │  ─────────────────── ││
│  │  Tổng: 9/10 ⭐⭐⭐⭐  ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │  🔻 KHẤU TRỪ         ││
│  │  (Không có HĐ LĐ)    ││
│  │  BHXH/BHYT/BHTN:  0  ││
│  │  TNCN:            0  ││
│  │  Khấu trừ:        0  ││
│  └──────────────────────┘│
│                          │
├──────────────────────────┤
│  🏠    📋    💰    👤    │
└──────────────────────────┘
```

---

### Màn hình: Chấm Công Tháng (Employee View)

```
┌──────────────────────────┐
│ ◀  Chấm công         🔔  │
├──────────────────────────┤
│                          │
│  T.Bình — CS Tân Mai     │
│  Tháng 3/2026            │
│                          │
│  ┌──────────────────────┐│
│  │  📊 TỔNG KẾT          ││
│  │  Buổi có lịch:  18   ││
│  │  Đi dạy:        16   ││
│  │  Vắng phép (0):  0   ││
│  │  Không phép(KP): 1   ││
│  │  Nửa buổi(0.5):  0   ││
│  └──────────────────────┘│
│                          │
│  Tháng 3: ◀ T ▶          │
│  ┌──────────────────────┐│
│  │  T2  T3  T4  T5  T6  ││
│  │───────────────────── ││
│  │   2   3   4   5   6  ││
│  │ [1] [KP] ░  [1] [1]  ││
│  │  ↑red                ││
│  │                      ││
│  │   9  10  11  12  13  ││
│  │ [1]  ░  ░  [1] [1]   ││
│  │                      ││
│  │  16  17  18  19  20  ││
│  │ [1] [1]  ░  [1] [1]  ││
│  │                      ││
│  │  23  24  25  26  27  ││
│  │ [1] [1]  ░  [1] [1]  ││
│  └──────────────────────┘│
│  ░ = Không có lịch hôm đó│
│                          │
│  Lớp: Kids 1 C1          │
│  18:45-20:45 T2/T3/T5/T6 │
│                          │
├──────────────────────────┤
│  🏠    📋    💰    👤    │
└──────────────────────────┘
```

---

## WORKFLOW HÀNG THÁNG — Sơ Đồ Tổng Quan

```
THÁNG T (T1-T30/31)
═══════════════════════════════════════════════════════════════════════════

  TUẦN 1         TUẦN 2         TUẦN 3         TUẦN 4         THÁNG T+1
  ─────────      ─────────      ─────────      ─────────      ─────────

  BM: Chấm       BM: Chấm       BM: Chấm       BM: Chấm
  công tuần      công tuần      công tuần      công tuần
  (T2, 2')       (T2, 2')       (T2, 2')       (T2, 2')
                                                              ┌──────────┐
  ⏰T7 nhắc      ⏰T7 nhắc      ⏰T7 nhắc      ⏰T7 nhắc     │ KHOÁ kỳ │
  nếu chưa lưu   nếu chưa lưu   nếu chưa lưu   nếu chưa lưu  │ lương    │
                                               ┌──────────┐   └──────────┘
                                               │ Ngày 25: │
                                               │ BM chấm  │
                                               │ KPI TG   │
                                               │ (~15')   │        ▼
                                               └──────────┘
                                                              KT: Tạo kỳ
                                                              lương mới
                                                                  │
                                                                  ▼
                                                              KT: Tính
                                                              tự động
                                                              3 công thức
                                                                  │
                                                                  ▼
                                                              KT: Review
                                                              3 tabs
                                                              (TG/GV/VP)
                                                                  │
                                                                  ▼
                                                              KT: Xác nhận
                                                              + gửi email
                                                              + xuất Excel
                                                                  │
                                                                  ▼
                                                              NV: Nhận
                                                              email +
                                                              xem PWA

═══════════════════════════════════════════════════════════════════════════

Tổng thời gian người dùng/tháng:
  BM:  4 tuần × 2' + KPI ~15' = ~23 phút/tháng
  KT:  ~30-45 phút tính lương 1 lần/tháng
  NV:  0 phút (chỉ nhận kết quả — read-only)
```

---

## Tổng Hợp: V1 → V3 Thay Đổi Gì?

```
┌────────────────────────┬───────────────────────────┬────────────────────────────────┐
│  Khía cạnh             │  V1 (cũ)                  │  V3 (hiện tại)                 │
├────────────────────────┼───────────────────────────┼────────────────────────────────┤
│  Đơn vị chấm công      │  NV × ngày                │  Lớp × ca × ngày/tuần         │
│  Auto-fill             │  Không                    │  Có — ô có lịch mặc định = 1  │
│  Thời gian BM          │  15-20 phút/ngày          │  ~2 phút/tuần                  │
│  Ghi chú dạy thay      │  Ghi chú tự do            │  BM nhập → KT đọc checklist    │
│  Lock tuần             │  Không                    │  Auto-lock sau 3 ngày          │
│  Công thức lương       │  1 công thức chung        │  3 công thức (TG/GV/VP)        │
│  KPI                   │  Đánh giá 1-5 sao         │  5 tiêu chí chi tiết /10       │
│  KPI áp dụng           │  Tất cả NV                │  CHỈ Trợ giảng                │
│  KPI bonus             │  Không                    │  Điểm × 50,000 VND (max 500k)  │
│  Giao diện lương       │  1 bảng chung             │  3 tabs: TG / GV / VP          │
│  BHXH                  │  Tất cả                   │  Tùy `has_labor_contract`       │
│  Employee portal       │  Desktop                  │  Mobile PWA (read-only)        │
│  DB tables             │  7                        │  10                            │
└────────────────────────┴───────────────────────────┴────────────────────────────────┘
```

---

*Updated: 2026-03-06 | V3 — Attendance weekly grid, 3 payroll formulas, KPI Teaching Assistants*
