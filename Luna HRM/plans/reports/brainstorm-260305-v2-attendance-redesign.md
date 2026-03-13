# Brainstorm V2: Redesign Chấm Công & Cập Nhật Business Model

> Cập nhật từ brainstorm v1. Context: **Trung tâm tiếng Anh** (không phải công ty thông thường).

## Business Context Mới (Thay đổi quan trọng)

| Yếu tố | V1 (cũ) | V2 (mới) |
|---------|---------|----------|
| Loại hình | Công ty chung | **Trung tâm tiếng Anh** |
| Đơn vị chấm công | Nhân viên/ngày | **Lớp học + Ca dạy/tuần** |
| Cách tính lương | Lương cố định × ngày công | **Số buổi dạy thực tế × đơn giá/buổi** |
| OT/Tăng ca | Giờ OT × 1.5 | **Dạy thay + Phụ đạo (ghi chú → kế toán tính)** |
| Cấu trúc NV | 1 NV = 1 dòng | **1 NV có thể nhiều dòng (nhiều lớp)** |
| Nhân sự/lớp | N/A | **1 GV tiếng Anh + 1 Trợ giảng VN** |
| Lịch lớp | N/A | **Cố định vài ngày/tuần (VD: T2-T4-T6)** |
| Ca làm | N/A | **Nhiều ca nhỏ (VD: 17h15-19h15, 18h45-20h45)** |
| Trạng thái chấm | ✅❌🟡🔵 | **1 / 0 / KP / 0.5** |

## Phân Tích Yêu Cầu Chấm Công V2

### Input từ user
- Giao diện dạng **bảng tuần**: hàng = lớp × vị trí, cột = T2→CN
- Cột: Tên lớp | Vị trí | Mã NV | Tên VN | Tên EN | Ghi chú | T2 | T3 | T4 | T5 | T6 | T7 | CN
- Input: `1` = đi dạy, `0` = vắng có phép, `KP` = không phép, `0.5` = nửa buổi
- Ô trống = ngày không có lịch (lớp không học ngày đó)
- Branch Manager ghi chú dạy thay/phụ đạo → kế toán nhìn thấy khi tính lương

### Đề xuất thêm

1. **Cột "Ca" (thời gian)**: Hiển thị giờ dạy cạnh tên lớp (VD: 17h15-19h15) giúp BM biết đúng ca
2. **Auto-fill**: Ô có lịch mặc định `1`, BM chỉ sửa ô ngoại lệ (vắng/KP) → nhanh gấp 5 lần
3. **Highlight ngoại lệ**: Ô `0`, `KP`, `0.5` highlight đỏ/vàng để BM review nhanh
4. **Tổng buổi dạy cuối bảng**: Mỗi NV hiện tổng buổi tuần + tổng tháng (dữ liệu cho payroll)
5. **Lock tuần cũ**: Tuần đã qua → chỉ xem, không sửa (trừ admin unlock)
6. **Copy tuần trước**: Vì lịch cố định, tuần mới auto-copy lịch lớp từ tuần trước

## Module Mới: Ca Làm Việc (Class Schedules)

### Mục đích
Lưu lịch học cố định của từng lớp → tự sinh bảng chấm công tuần

### Cấu trúc dữ liệu

```
class_schedules (Lịch lớp)
├── id
├── branch_id         → Cơ sở
├── class_name        → Tên lớp (VD: "IELTS 6.5 - A1")
├── shift_time        → Ca (VD: "17:15-19:15")
├── day_of_week       → Thứ (1=T2, 2=T3, ..., 7=CN)
├── teacher_id        → GV tiếng Anh (FK → employees)
├── assistant_id      → Trợ giảng VN (FK → employees)
├── status            → active / inactive
└── created_at
```

### Workflow
```
Admin/BM tạo lịch lớp 1 LẦN
       │
       ▼
Hệ thống tự sinh bảng chấm công tuần
       │
       ▼
BM mở ra → đã có sẵn lịch + mặc định "1" (đi dạy)
       │
       ▼
BM CHỈ SỬA NV VẮNG → nhập 0, KP, hoặc 0.5
       │
       ▼
~2 phút xong cả cơ sở (thay vì 15-20 phút)
```

## Mockup UI V2: Chấm Công Tuần (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  🏢 HRM Luna  │ Cơ sở │ Lịch lớp │ ★ Chấm công │ Tính lương │ NV │         👤 Minh (BM) ▾    │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  Chấm công tuần ─ CS Tân Mai                                    Tuần: 02/03 - 08/03/2026  ◀ ▶  │
│                                                                                                  │
│  ┌─ Trạng thái: 1=Đi dạy  0=Vắng phép  KP=Ko phép  0.5=Nửa buổi  ░=Ko có lịch ────────────┐  │
│  │                                                                                            │  │
│  │                                                    │ T2    │ T3    │ T4    │ T5    │ T6    │  │
│  │  Lớp          Ca          Vị trí  Mã   Tên VN     │ 02/03 │ 03/03 │ 04/03 │ 05/03 │ 06/03 │  │
│  │  ──────────── ─────────── ─────── ──── ────────── │───────│───────│───────│───────│───────│  │
│  │                                                    │       │       │       │       │       │  │
│  │  IELTS 6.5   17:15-19:15  GV      E01  (empty)   │  [1]  │  ░░░  │  [1]  │  ░░░  │  [1]  │  │
│  │  A1                       TG      E08  Thị Hà    │  [1]  │  ░░░  │  [1]  │  ░░░  │  [1]  │  │
│  │                                                    │       │       │       │       │       │  │
│  │  TOEIC 500   17:15-19:15  GV      E03  (empty)   │  ░░░  │  [1]  │  ░░░  │  [1]  │  ░░░  │  │
│  │  B2                       TG      E04  Thị Dung  │  ░░░  │  [1]  │  ░░░  │  [0]  │  ░░░  │  │
│  │                                                    │       │       │       │       │       │  │
│  │  Kids 1      18:45-20:45  GV      E05  (empty)   │  [1]  │  [1]  │  ░░░  │  [1]  │  [1]  │  │
│  │  C1                       TG      E02  Thị Bình  │  [1]  │  [KP] │  ░░░  │  [1]  │  [1]  │  │
│  │                                                    │       │       │       │       │       │  │
│  │  IELTS 7.0   18:45-20:45  GV      E06  (empty)   │  ░░░  │  ░░░  │  [1]  │  ░░░  │  ░░░  │  │
│  │  D1                       TG      E09  Văn Khoa  │  ░░░  │  ░░░  │  [1]  │  ░░░  │  ░░░  │  │
│  │                                                    │       │       │       │       │       │  │
│  │  Giao tiếp    17:15-19:15  GV      E01  (empty)   │  ░░░  │  [1]  │  ░░░  │  [1]  │  ░░░  │  │
│  │  E1                       TG      E10  Thị Lan   │  ░░░  │  [1]  │  ░░░  │ [0.5] │  ░░░  │  │
│  │  ──────────── ─────────── ─────── ──── ────────── │───────│───────│───────│───────│───────│  │
│  │                                                    │       │       │       │       │       │  │
│  │  (tiếp T7, CN nếu có lịch)                       │ T7    │ CN    │ Tổng  │       │       │  │
│  │                                                    │ 07/03 │ 08/03 │ buổi  │       │       │  │
│  │  ──────────── ─────────── ─────── ──── ────────── │───────│───────│───────│       │       │  │
│  │  IELTS 6.5   10:00-12:00  GV      E01  (empty)   │  [1]  │  ░░░  │       │       │       │  │
│  │  A1                       TG      E08  Thị Hà    │  [1]  │  ░░░  │       │       │       │  │
│  │                                                    │       │       │       │       │       │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│  ┌─ Ghi chú tuần (per-employee structured notes) ─────────────────────────────────────────┐   │
│  │  📋 Dạy thay                                                                           │   │
│  │  E01 John Smith → thay E07, lớp Giao tiếp E1, 2 buổi                              [✎] │   │
│  │                                                                                         │   │
│  │  📝 Ghi chú                                                                            │   │
│  │  E02 Trần Thị Bình → KP T3 03/03, không báo trước                                 [✎] │   │
│  │  E04 Phạm Thị Dung → vắng T5 05/03, khám bệnh                                    [✎] │   │
│  │                                                                                         │   │
│  │  [+ Thêm ghi chú]                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                  │
│  ┌─ Tổng hợp NV tuần này ──────────────────────────────────────────────────────────────────┐   │
│  │  Mã   Tên              Tổng buổi  Vắng  KP   Ghi chú                                    │   │
│  │  E01  (GV nước ngoài)      5       0    0    +2 buổi dạy thay (lớp E1)                  │   │
│  │  E02  Trần Thị Bình        3       0    1    KP T3                                       │   │
│  │  E04  Phạm Thị Dung        0.5     1    0    Vắng T5, nửa buổi T5(?)                    │   │
│  │  E08  Vũ Thị Hà            4       0    0                                                │   │
│  │  ...                                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                  │
│  [💾 Lưu tuần]   [🔒 Khóa tuần]   [📥 Xuất Excel]         Lưu lần cuối: 06/03/2026 21:30     │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Giải thích thiết kế

**Tại sao nhanh hơn gấp 5 lần:**
1. Lịch lớp cố định → hệ thống tự tạo bảng, auto-fill `1` cho ô có lịch
2. BM chỉ sửa **ô ngoại lệ** (vắng = `0`, KP, 0.5) — thường chỉ 1-3 ô/tuần
3. 1 màn hình = cả cơ sở cả tuần, không cần chuyển trang
4. Ghi chú dạy thay/phụ đạo gom 1 chỗ cuối bảng → kế toán đọc luôn

**Quy tắc ô:**
- `[1]` = đi dạy (mặc định, tự điền)
- `[0]` = vắng có phép (BM sửa)
- `[KP]` = vắng không phép (BM sửa, highlight đỏ)
- `[0.5]` = nửa buổi (BM sửa, highlight vàng)
- `░░░` = không có lịch (disabled, không click được)

## Mockup UI V2: Chấm Công Tuần (Mobile)

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
│  │                      ││
│  │ GV E01               ││
│  │ T2[1] T4[1] T6[1]   ││
│  │ T7[1]                ││
│  │                      ││
│  │ TG E08 Thị Hà       ││
│  │ T2[1] T4[1] T6[1]   ││
│  │ T7[1]                ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │ TOEIC 500 B2         ││
│  │ 17:15-19:15          ││
│  │                      ││
│  │ GV E03               ││
│  │ T3[1] T5[1]          ││
│  │                      ││
│  │ TG E04 Thị Dung      ││
│  │ T3[1] T5[ 0 ]        ││
│  │         ↑ Bấm sửa    ││
│  └──────────────────────┘│
│                          │
│  ┌──────────────────────┐│
│  │ 📝 Ghi chú (2)       ││
│  │ 📋 E01 thay E07 ×2  ││
│  │ 📝 E04 vắng T5      ││
│  │ [+ Thêm ghi chú]    ││
│  └──────────────────────┘│
│                          │
│  [💾 Lưu tuần]           │
│                          │
├──────────────────────────┤
│  🏠    📋    💰    👤    │
└──────────────────────────┘
```

## Mockup UI V2: Tính Lương (Desktop — Kế Toán)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  🏢 HRM Luna  │ Cơ sở │ Lịch lớp │ Chấm công │ ★ Tính lương │ NV │      👤 Hà (KT) ▾  │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Bảng lương ─ Tháng 3/2026 ─ CS Tân Mai                    [+ Tạo kỳ lương] [⚡ Tính]  │
│                                                                                          │
│  ┌── Tổng quan ────────────────────────────────────────────────────────────────────────┐ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │ │
│  │  │ 10 GV      │  │ Tổng GROSS │  │ Tổng NET   │  │ Tổng thuế  │                    │ │
│  │  │ + 8 TG     │  │ 185,400,000│  │ 162,300,000│  │  8,500,000 │                    │ │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘                    │ │
│  └─────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                          │
│  ┌── Bảng lương chi tiết ──────────────────────────────────────────────────────────────┐ │
│  │                                                                                      │ │
│  │  #  Mã   Tên           Vị trí  Buổi  Đơn giá   Lương    Dạy    Phụ    GROSS        │ │
│  │                                 dạy   /buổi     buổi    thay   cấp                  │ │
│  │  ── ──── ────────────  ──────  ────  ────────  ────────  ─────  ─────  ──────────── │ │
│  │  1  E01  (GV ngoài)    GV       20   500,000  10,000,000 1,000k  0    11,000,000   │ │
│  │  2  E02  Trần Thị Bình TG       15   250,000   3,750,000     0  300k   4,050,000   │ │
│  │  3  E03  (GV ngoài)    GV       18   450,000   8,100,000     0    0    8,100,000   │ │
│  │  4  E04  Phạm Thị Dung TG       14   250,000   3,500,000     0  300k   3,800,000   │ │
│  │  5  E05  (GV ngoài)    GV       16   500,000   8,000,000     0    0    8,000,000   │ │
│  │  ...                                                                                 │ │
│  │  ── ──── ────────────  ──────  ────  ────────  ────────  ─────  ─────  ──────────── │ │
│  │                                                                                      │ │
│  │  #  (tiếp)   BHXH     BHYT     BHTN     TNCN     Khấu trừ  NET PAY       ✉️        │ │
│  │  ── ──────── ──────── ──────── ──────── ──────── ───────── ──────────── ──────      │ │
│  │  1           880,000   165,000  110,000        0         0   9,845,000    ⬜         │ │
│  │  2           324,000    60,750   40,500        0         0   3,624,750    ⬜         │ │
│  │  ...                                                                                 │ │
│  │                                                                                      │ │
│  │  ┌─ Ghi chú từ chấm công (Branch Manager) ───────────────────────────────────────┐ │ │
│  │  │  📋 Tuần 1 (02-08/03): E01 dạy thay 2 buổi lớp E1 cho E07                    │ │ │
│  │  │  📋 Tuần 2 (09-15/03): E02 KP 1 buổi T3                                      │ │ │
│  │  │  📋 Tuần 3 (16-22/03): Không có ghi chú                                        │ │ │
│  │  │  📋 Tuần 4 (23-29/03): E04 vắng 1 buổi T5 (khám bệnh)                        │ │ │
│  │  └────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │  ↑ Kế toán đọc ghi chú này để tính lương dạy thay, phụ đạo                        │ │
│  │                                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                          │
│  Click vào NV → Phiếu lương chi tiết (slide-out bên phải)                               │
│  ╔═══════════════════════════════════════════════╗                                        │
│  ║  PHIẾU LƯƠNG — Trần Thị Bình (E02)           ║                                        │
│  ║  Trợ giảng — CS Tân Mai — T3/2026            ║                                        │
│  ║  ─────────────────────────────────────        ║                                        │
│  ║  THU NHẬP                                      ║                                        │
│  ║  Buổi dạy: 15 buổi × 250,000 = 3,750,000     ║                                        │
│  ║  Dạy thay:  0 buổi × 250,000 =         0     ║                                        │
│  ║  Phụ cấp:                         300,000     ║                                        │
│  ║  ─────────────────────────────────────        ║                                        │
│  ║  GROSS:                         4,050,000     ║                                        │
│  ║  ─────────────────────────────────────        ║                                        │
│  ║  KHẤU TRỪ                                      ║                                        │
│  ║  BHXH (8%):                      -324,000     ║                                        │
│  ║  BHYT (1.5%):                     -60,750     ║                                        │
│  ║  BHTN (1%):                       -40,500     ║                                        │
│  ║  Thu nhập chịu thuế:                          ║                                        │
│  ║  4,050,000 - 425,250 - 11,000,000 = < 0      ║                                        │
│  ║  Thuế TNCN:                             0     ║                                        │
│  ║  ─────────────────────────────────────        ║                                        │
│  ║  THỰC LÃNH:                     3,624,750 VND ║                                        │
│  ║                                                ║                                        │
│  ║  [✏️ Sửa]  [✅ OK]  [📧 Gửi]                 ║                                        │
│  ╚═══════════════════════════════════════════════╝                                        │
│                                                                                          │
│  [✅ Xác nhận tất cả]   [📧 Gửi email tất cả]                                           │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Cập Nhật Database Schema V2

```
── TABLES MỚI ──

class_schedules (Lịch lớp cố định)
├── id               UUID PK
├── branch_id        FK → branches
├── class_name       TEXT         "IELTS 6.5 - A1"
├── shift_time       TEXT         "17:15-19:15"
├── day_of_week      INT          1=T2, 2=T3, ..., 7=CN
├── teacher_id       FK → employees (GV)
├── assistant_id     FK → employees (TG)
├── status           TEXT         active / inactive
└── created_at

── TABLES SỬA ──

employees (cập nhật)
├── ...existing fields...
├── employee_code    TEXT         "E01", "E02"  ← MỚI
├── name_en          TEXT         Tên tiếng Anh ← MỚI (cho GV nước ngoài)
├── position         TEXT         "teacher" / "assistant" / "receptionist" / ... ← CẬP NHẬT
├── rate_per_session BIGINT       Đơn giá/buổi dạy (VD: 250000, 500000) ← MỚI
└── ...

attendance (cập nhật — chấm theo tuần/lớp)
├── id               UUID PK
├── schedule_id      FK → class_schedules  ← MỚI (thay employee_id trực tiếp)
├── employee_id      FK → employees
├── date             DATE
├── status           TEXT         "1" / "0" / "KP" / "0.5"  ← CẬP NHẬT
├── marked_by        FK → employees (BM)
└── created_at

employee_weekly_notes (Ghi chú tuần per-employee — MỚI, thay weekly_notes)
├── id               UUID PK
├── branch_id        FK → branches
├── week_start       DATE         Ngày T2 đầu tuần
├── employee_id      FK → employees  NV liên quan
├── note_type        TEXT         substitute | bonus | penalty | extra_job | general
├── description      TEXT         Mô tả chi tiết
├── amount           NUMERIC      nullable — số buổi hoặc VND
├── amount_unit      TEXT         sessions | vnd (nullable)
├── is_processed     BOOLEAN      DEFAULT false — kế toán tick khi xử lý
├── processed_by     FK → employees (nullable)
├── created_by       FK → employees (BM)
└── created_at

payslips (cập nhật)
├── ...existing fields...
├── sessions_worked  INT          Số buổi dạy thực tế ← MỚI
├── rate_per_session BIGINT       Đơn giá/buổi tại thời điểm tính ← MỚI
├── substitute_pay   BIGINT       Lương dạy thay ← MỚI
├── extra_notes      TEXT         Ghi chú từ BM (dạy thay, phụ đạo) ← MỚI
└── ...
```

## Cập Nhật Công Thức Tính Lương V2

```
── CÔNG THỨC MỚI (Lương theo buổi dạy) ──

INPUT:
  sessions_worked    = Tổng buổi dạy trong tháng (tự đếm từ attendance)
  rate_per_session   = Đơn giá/buổi (từ hồ sơ NV)
  substitute_sessions = Số buổi dạy thay (kế toán nhập từ ghi chú BM)
  substitute_rate    = Đơn giá dạy thay (có thể = rate_per_session hoặc khác)
  allowances         = Phụ cấp cố định (xăng, ăn...)

FORMULA:
  Teaching Pay = sessions_worked × rate_per_session
  Substitute Pay = substitute_sessions × substitute_rate
  GROSS = Teaching Pay + Substitute Pay + Allowances + Bonuses

  BHXH = GROSS × 8%
  BHYT = GROSS × 1.5%
  BHTN = GROSS × 1%

  Taxable = GROSS - BHXH - BHYT - BHTN - 11,000,000 - 4,400,000 × NPT
  TNCN = progressive_tax(Taxable)  (7 bậc lũy tiến)

  NET = GROSS - BHXH - BHYT - BHTN - TNCN - Other Deductions
```

## So Sánh V1 vs V2

| Khía cạnh | V1 | V2 |
|-----------|----|----|
| Chấm công | Từng NV × từng ngày | Bảng tuần: lớp × ngày, auto-fill |
| Thời gian BM | ~15-20 phút/ngày | **~2 phút/tuần** (chỉ sửa ngoại lệ) |
| OT tracking | Nhập giờ OT | Ghi chú dạy thay → kế toán tính |
| Lương | Lương cố định × ngày | Buổi dạy × đơn giá + dạy thay |
| DB tables | 7 | **9** (+class_schedules, employee_weekly_notes) |
| Phù hợp | Công ty chung | **Trung tâm đào tạo** |

## Risk Assessment V2

| Risk | Severity | Mitigation |
|------|----------|------------|
| GV nghỉ giữa kỳ, thay GV lớp | Medium | class_schedules cho phép đổi teacher_id |
| 1 GV nhiều lớp → đếm buổi sai | Medium | SQL đếm DISTINCT (employee_id, date, schedule_id) |
| Ghi chú dạy thay không rõ ràng | Medium | Form structured: ai dạy thay, lớp nào, mấy buổi |
| BM quên chấm tuần | Low | Notification nhắc T7 nếu chưa lưu |

## Unresolved Questions

1. **GV nước ngoài**: Cột "Tên VN" để trống? Hay hiển thị tên tiếng Anh?
2. **Rate dạy thay**: Bằng rate bình thường hay có đơn giá riêng?
3. **Lịch lớp thay đổi giữa kỳ**: Thêm lớp mới / đóng lớp — workflow thế nào?
4. **Nhân viên không phải GV** (lễ tân, bảo vệ, kế toán): Vẫn chấm theo lớp hay chấm kiểu khác?

---

*Updated: 2026-03-05 | Brainstorm V2 — Redesign for English Language Center*
