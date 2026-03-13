# Luna HRM — System Workflow Diagrams

> ASCII workflow diagrams for all key system processes.
> Created: 2026-03-06 | Based on Brainstorm V1/V2/V3 + 18 MVP Optimizations

---

## Table of Contents

1. [Monthly Operations Cycle](#1-monthly-operations-cycle)
2. [Weekly Attendance Workflow](#2-weekly-attendance-workflow)
3. [Payroll Processing Workflow](#3-payroll-processing-workflow)
4. [KPI Evaluation Workflow](#4-kpi-evaluation-workflow)
5. [Employee Self-Service Workflow](#5-employee-self-service-workflow)
6. [System Setup Workflow](#6-system-setup-workflow)
7. [Audit Log Flow](#7-audit-log-flow)
8. [Conflict Detection Workflow](#8-conflict-detection-workflow)

---

## 1. Monthly Operations Cycle

> Chu Kỳ Hàng Tháng — Full month from attendance to payslip delivery

```
THÁNG MỚI BẮT ĐẦU
     │
     ▼
┌────────────────────────────────────────────────────────────────────┐
│  TUẦN 1-4  (Ngày 1 → 28)  BM CHẤM CÔNG & GHI CHÚ                 │
│                                                                    │
│  Thứ Hai đầu tuần                                                  │
│       │                                                            │
│       ▼                                                            │
│  Hệ thống tự sinh bảng chấm tuần mới từ class_schedules           │
│  Auto-fill "1" tất cả ô có lịch                                    │
│       │                                                            │
│       ▼                                                            │
│  BM sửa ngoại lệ (vắng/KP/0.5) + ghi chú dạy thay                │
│  (~2 phút/tuần)                                                    │
│       │                                                            │
│       ▼                                                            │
│  Thứ Bảy tối ── [Chưa lưu?] ──► Hệ thống nhắc BM qua thông báo   │
│                                                                    │
│  3 ngày sau khi tuần kết thúc ──► Auto-lock (không sửa được nữa)  │
└────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────┐
│  NGÀY 25  HỆ THỐNG NHẮC BM ĐÁNH GIÁ KPI                          │
│                                                                    │
│  Thông báo tự động → BM: "Chưa đánh giá KPI cho X trợ giảng"     │
└────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────┐
│  NGÀY 25-28  BM ĐÁNH GIÁ KPI (chỉ Trợ Giảng)                     │
│                                                                    │
│  BM mở form KPI từng TG → chấm 5 tiêu chí → lưu kpi_evaluations  │
│  Bonus tự động = Tổng điểm /10 × 50,000 VND                       │
└────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────┐
│  NGÀY 28-30  KẾ TOÁN TẠO KỲ LƯƠNG                                 │
│                                                                    │
│  Kế toán mở "Tạo kỳ lương" → chọn cơ sở + tháng                  │
│  Hệ thống tự đếm buổi từ attendance, lấy KPI từ kpi_evaluations   │
│  Tính GROSS → áp dụng BH → tính TNCN → ra NET                     │
│                                                                    │
│  Kế toán review 3 tabs:                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Trợ Giảng  │  │  Giáo Viên  │  │  Văn Phòng  │               │
│  │ (A+B+C)    │  │             │  │             │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                    │
│  Kế toán đọc ghi chú BM → nhập thủ công dạy thay/phụ đạo         │
│  Preview so sánh tháng trước → cảnh báo nếu >20% chênh lệch       │
└────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────┐
│  NGÀY 30  XÁC NHẬN & GỬI PHIẾU LƯƠNG                              │
│                                                                    │
│  Kế toán double-confirm: "XX,XXX,XXX VND cho YY nhân viên?"       │
│  Xác nhận → payslips tạo (snapshot rate tại thời điểm này)        │
│  Gửi email phiếu lương từng người                                  │
│  Cửa sổ undo 24h mở → kế toán có thể hoàn tác nếu cần            │
└────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────────────────┐
│  NGÀY 1-3 THÁNG SAU  AUTO-LOCK CHẤM CÔNG THÁNG CŨ                 │
│                                                                    │
│  Hệ thống tự khóa toàn bộ attendance của tháng vừa qua            │
│  Admin có thể mở khóa thủ công nếu cần điều chỉnh                 │
└────────────────────────────────────────────────────────────────────┘
     │
     ▼
  THÁNG MỚI LẶP LẠI
```

---

## 2. Weekly Attendance Workflow

> Quy Trình Chấm Công Tuần — Step-by-step from auto-generation to lock

```
                     ┌─────────────────────┐
                     │  Thứ Hai đầu tuần   │
                     └──────────┬──────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │  BƯỚC 1: Hệ thống tự sinh bảng tuần │
              │                                     │
              │  Đọc class_schedules → lọc theo     │
              │  tuần hiện tại + branch              │
              │  → tạo attendance records            │
              └──────────────────┬──────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │  BƯỚC 2: Auto-fill mặc định "1"     │
              │                                     │
              │  Tất cả ô có lịch → status = "1"   │
              │  Ô không có lịch → disabled (░░░)   │
              └──────────────────┬──────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │  BƯỚC 3: BM mở bảng chấm công       │
              │                                     │
              │  Desktop: bảng lớn toàn cơ sở       │
              │  Mobile: xem từng lớp dạng card      │
              └──────────────────┬──────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │  BƯỚC 4: BM sửa ngoại lệ            │
              │                                     │
              │  [1] → đi dạy (mặc định, không cần) │
              │  [0] → vắng có phép    (BM sửa)     │
              │  [KP]→ vắng không phép (BM sửa) ■   │
              │  [0.5]→ nửa buổi       (BM sửa) ▲   │
              │                                     │
              │  Ô KP highlight đỏ                  │
              │  Ô 0.5 highlight vàng               │
              └──────────────────┬──────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │  BƯỚC 5: BM viết ghi chú tuần       │
              │                                     │
              │  Ghi: dạy thay, phụ đạo, lý do vắng│
              │  VD: "E02 dạy thay 2 buổi E1        │
              │       cho E07 nghỉ ốm"              │
              └──────────────────┬──────────────────┘
                                 │
                                 ▼
              ┌─────────────────────────────────────┐
              │  BƯỚC 6: BM lưu bảng                │
              │                                     │
              │  Diff view hiển thị:                │
              │  "Đã thay đổi: E02 T3: 1 → KP,     │
              │               E04 T5: 1 → 0"        │
              │                                     │
              │  BM xác nhận → lưu vào DB           │
              └──────────────────┬──────────────────┘
                                 │
                      ┌──────────┴──────────┐
                      │                     │
                      ▼                     ▼
           ┌────────────────┐    ┌────────────────────┐
           │  Thứ Bảy tối   │    │  Tuần kết thúc     │
           │                │    │                    │
           │ Kiểm tra: BM   │    │  3 ngày sau ──►    │
           │ đã lưu chưa?   │    │  AUTO-LOCK         │
           └───────┬────────┘    │  (không sửa được)  │
                   │             └────────────────────┘
           ┌───────┴───────┐
           │               │
           ▼               ▼
      ┌─────────┐    ┌───────────┐
      │ Đã lưu  │    │ Chưa lưu  │
      │         │    │           │
      │  OK     │    │ Gửi nhắc  │
      └─────────┘    │ nhở BM    │
                     └───────────┘

                         ▼ (nếu cần sửa sau lock)
              ┌─────────────────────────────────────┐
              │  BƯỚC 9: Admin mở khóa (nếu cần)    │
              │                                     │
              │  Admin chọn tuần → unlock           │
              │  Ghi audit log: ai mở khóa + lý do  │
              │  BM sửa xong → lock lại             │
              └─────────────────────────────────────┘
```

---

## 3. Payroll Processing Workflow

> Quy Trình Tính Lương — Accountant creates payroll period to payslip delivery

```
                    ┌──────────────────────────────┐
                    │  KẾ TOÁN tạo kỳ lương mới    │
                    │  Chọn: Cơ sở + Tháng/Năm     │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────────┐
          │  HỆ THỐNG TỰ ĐỘNG TÍNH (BƯỚC 1-9)                  │
          │                                                    │
          │  1. Đếm sessions từ attendance                     │
          │     WHERE status = '1' OR status = '0.5'          │
          │     GROUP BY employee_id                           │
          │     (0.5 tính = 0.5 buổi)                         │
          │                                                    │
          │  2. Lấy rate_per_session từ employees              │
          │     (snapshot tại thời điểm tính)                  │
          │                                                    │
          │  3. Lấy KPI scores từ kpi_evaluations              │
          │     (chỉ employee.position = 'assistant')          │
          │                                                    │
          │  4. Tính GROSS cho từng nhân viên:                 │
          │                                                    │
          │   ┌── Văn Phòng / Giáo Viên ───────────────────┐  │
          │   │  GROSS = (buổi × đơn giá) + dạy thay       │  │
          │   │        + lương khác                         │  │
          │   └──────────────────────────────────────────── ┘  │
          │                                                    │
          │   ┌── Trợ Giảng ───────────────────────────────┐  │
          │   │  GROSS = (buổi × 75k) + dạy thay           │  │
          │   │        + lương khác + (KPI × 50k)          │  │
          │   └────────────────────────────────────────────┘  │
          │                                                    │
          │  5. Kiểm tra has_labor_contract                    │
          │                                                    │
          │       Có HĐLĐ?                                     │
          │       ┌──┴──┐                                      │
          │      Có     Không                                  │
          │       │       │                                    │
          │       ▼       ▼                                    │
          │  BHXH=8%   BH = 0                                  │
          │  BHYT=1.5%                                         │
          │  BHTN=1%                                           │
          │                                                    │
          │  6. Tính TNCN (lũy tiến 7 bậc)                    │
          │     Chịu thuế = GROSS - BH - 11M (giảm trừ cá     │
          │     nhân) - 4.4M × số người phụ thuộc             │
          │     Nếu ≤ 0 → TNCN = 0                            │
          │                                                    │
          │  7. Nhập thủ công: phạt/khấu trừ                  │
          │     (kế toán đọc ghi chú BM → nhập)               │
          │                                                    │
          │  8. NET = GROSS - BHXH - BHYT - BHTN              │
          │              - TNCN - Khấu trừ                    │
          │                                                    │
          │  9. Hiển thị kết quả 3 tabs                        │
          └────────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────────┐
          │  BƯỚC 10: KẾ TOÁN REVIEW 3 TABS                   │
          │                                                    │
          │  ┌─────────────────┐                              │
          │  │ Tab Trợ Giảng   │  Phần A: Lương cứng + thay  │
          │  │                 │  Phần B: KPI chi tiết        │
          │  │                 │  Phần C: GROSS → NET         │
          │  └─────────────────┘                              │
          │  ┌─────────────────┐                              │
          │  │ Tab Giáo Viên   │  Lương + thay + khấu trừ    │
          │  │                 │  (KHÔNG có phần KPI)         │
          │  └─────────────────┘                              │
          │  ┌─────────────────┐                              │
          │  │ Tab Văn Phòng   │  Lương + thay + khấu trừ    │
          │  └─────────────────┘                              │
          └────────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────────┐
          │  BƯỚC 11: ĐỌC GHI CHÚ BM → NHẬP DẠY THAY         │
          │                                                    │
          │  ┌──────────────────────────────────────────────┐ │
          │  │ Ghi chú BM (checklist):                      │ │
          │  │  [ ] Tuần 1: E02 dạy thay 2 buổi E1 (E07)   │ │
          │  │  [ ] Tuần 3: E08 phụ đạo 1 buổi (50k)       │ │
          │  └──────────────────────────────────────────────┘ │
          │  Kế toán tick từng mục → nhập buổi thay vào form  │
          └────────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────────┐
          │  BƯỚC 12: PREVIEW SO SÁNH THÁNG TRƯỚC              │
          │                                                    │
          │   NV       Tháng trước   Tháng này   Chênh lệch   │
          │   E01       10,000k       12,000k     +20% ⚠       │
          │   E02        3,624k        3,624k       0%  ✓      │
          │   E08        1,690k        2,200k     +30% ⚠       │
          │                                                    │
          │  Cảnh báo màu cam nếu chênh lệch > 20%            │
          │  Kế toán xem lý do → xác nhận tiếp                 │
          └────────────────────────────────────────────────────┘
                                   │
                                   ▼
          ┌────────────────────────────────────────────────────┐
          │  BƯỚC 13: DOUBLE CONFIRM                           │
          │                                                    │
          │  ┌──────────────────────────────────────────────┐ │
          │  │  Xác nhận bảng lương T3/2026                 │ │
          │  │  Cơ sở: Tân Mai                              │ │
          │  │  Tổng NET: 48,967,000 VND                    │ │
          │  │  Số nhân viên: 16                            │ │
          │  │                                              │ │
          │  │  [Xác nhận]    [Hủy bỏ]                     │ │
          │  └──────────────────────────────────────────────┘ │
          └──────────────┬─────────────────┬──────────────────┘
                         │                 │
                         ▼                 ▼
                    [Xác nhận]         [Hủy bỏ]
                         │                 │
                         ▼                 ▼
          ┌──────────────────────┐    Quay lại review
          │  BƯỚC 14: TẠO       │
          │  PAYSLIPS            │
          │                      │
          │  Tạo payslip record  │
          │  cho từng NV với     │
          │  rate snapshot       │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  BƯỚC 15: GỬI EMAIL  │
          │                      │
          │  Gửi phiếu lương     │
          │  cho từng NV qua     │
          │  Resend/Supabase     │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────────────────────────────────┐
          │  BƯỚC 16: CỬA SỔ UNDO 24H                       │
          │                                                  │
          │  Trong 24h sau khi xác nhận, kế toán có thể:    │
          │  → [Hoàn tác kỳ lương] → xóa payslips           │
          │  → Sửa lại → xác nhận lần 2                     │
          │                                                  │
          │  Sau 24h → khóa vĩnh viễn, cần admin để sửa     │
          └──────────────────────────────────────────────────┘
```

---

## 4. KPI Evaluation Workflow

> Quy Trình Đánh Giá KPI — Monthly KPI scoring for Teaching Assistants only

```
            ┌───────────────────────────────────────┐
            │  NGÀY 25 HÀNG THÁNG                   │
            │  Hệ thống gửi nhắc nhở tự động → BM   │
            │  "Chưa đánh giá KPI cho X trợ giảng"  │
            └───────────────────┬───────────────────┘
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │  BM mở form KPI từng Trợ Giảng        │
            │                                       │
            │  Hệ thống pre-fill điểm tháng trước   │
            │  → BM chỉ sửa điểm thay đổi           │
            └───────────────────┬───────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│  PHẦN 1 — LƯƠNG CỨNG (Pass/Fail)                                      │
│                                                                       │
│  4 tiêu chí bắt buộc:                                                 │
│  ┌──────────────────────────────────────────────────────┬──────────┐  │
│  │  1. Hoàn thành nhiệm vụ TG (mô tả công việc)        │ [Đạt/KĐ] │  │
│  │  2. Chuẩn bị phòng học, bàn ghế, vật tư             │ [Đạt/KĐ] │  │
│  │  3. Đúng giờ (trước ít nhất 15 phút)                │ [Đạt/KĐ] │  │
│  │  4. Điểm danh HS + báo quản lý khi HS vắng KP       │ [Đạt/KĐ] │  │
│  └──────────────────────────────────────────────────────┴──────────┘  │
│                                                                       │
│  Kết quả:                                                             │
│       ┌───────────────┴────────────────┐                             │
│       ▼                                ▼                             │
│  Tất cả ĐẠT              Có 1+ KHÔNG ĐẠT                            │
│       │                                │                             │
│       ▼                                ▼                             │
│  Nhận lương cứng               Lương cứng = 0                        │
│  75,000 VND/buổi                                                      │
└───────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│  PHẦN 2 — THƯỞNG KPI (Chấm điểm 5 tiêu chí)                         │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  1. GIỜ TSI               Thang: 0-1  │ Điểm: [ _ ]           │   │
│  │     Hỗ trợ GV kỷ luật 80% học sinh   │                        │   │
│  │     Nhận xét: [____________________] │                        │   │
│  ├───────────────────────────────────────┤                        │   │
│  │  2. GIỜ FUNTIME           Thang: 0-3  │ Điểm: [ _ ]           │   │
│  │     a) Theo kế hoạch FT    (0-1)      │                        │   │
│  │     b) Hiểu tình hình HS   (0-1)      │                        │   │
│  │     c) Đạt mục tiêu FT     (0-1)      │                        │   │
│  │     Nhận xét: [____________________] │                        │   │
│  ├───────────────────────────────────────┤                        │   │
│  │  3. PHỤ HUYNH             Thang: 0-2  │ Điểm: [ _ ]           │   │
│  │     a) Thân thiện nhiệt tình (0-1)    │                        │   │
│  │     b) Chia sẻ tình hình HS (0-1)    │                        │   │
│  │     Nhận xét: [____________________] │                        │   │
│  ├───────────────────────────────────────┤                        │   │
│  │  4. HỌC SINH              Thang: 0-3  │ Điểm: [ _ ]           │   │
│  │     a) Giao tiếp 100% tiếng Anh (0-1) │                        │   │
│  │     b) Kỷ luật lớp học     (0-1)      │                        │   │
│  │     c) An toàn trẻ em      (0-1)      │                        │   │
│  │     Nhận xét: [____________________] │                        │   │
│  ├───────────────────────────────────────┤                        │   │
│  │  5. TÁC PHONG             Thang: 0-1  │ Điểm: [ _ ]           │   │
│  │     Không vắng >2 lần, trang phục,   │                        │   │
│  │     không dùng điện thoại            │                        │   │
│  │     Nhận xét: [____________________] │                        │   │
│  ├───────────────────────────────────────┴────────────────────────┤   │
│  │  TỔNG KPI: _/10        THƯỞNG: _ × 50,000 = _______ VND       │   │
│  └────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │  BM lưu đánh giá                      │
            │  → kpi_evaluations lưu vào DB         │
            │  → bonus_amount = total_score × 50k   │
            └───────────────────┬───────────────────┘
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │  BIỂU ĐỒ LỊCH SỬ 6 THÁNG             │
            │                                       │
            │  9 ┤ ████                    ████     │
            │  8 ┤      ████  ████  ████         │
            │  7 ┤                              │
            │    └──T10──T11──T12──T1───T2───T3  │
            │                                       │
            │  BM xem → đảm bảo đánh giá nhất quán │
            └───────────────────┬───────────────────┘
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │  Bonus tự động đổ vào payroll          │
            │  khi kế toán tạo kỳ lương             │
            │  (không cần nhập thủ công)            │
            └───────────────────────────────────────┘
```

---

## 5. Employee Self-Service Workflow

> Nhân Viên Tự Tra Cứu — PWA mobile portal (read-only)

```
          ┌──────────────────────────────────────────┐
          │  NV mở PWA trên điện thoại                │
          │  (Progressive Web App — không cần app     │
          │  store, thêm vào màn hình chính)          │
          └───────────────────┬──────────────────────┘
                              │
                              ▼
          ┌──────────────────────────────────────────┐
          │  Đăng nhập                               │
          │  → Supabase Auth (email + password)      │
          │  → JWT với role = employee               │
          │  → RLS tự giới hạn: chỉ xem data của    │
          │    bản thân                              │
          └───────────────────┬──────────────────────┘
                              │
                              ▼
          ┌──────────────────────────────────────────┐
          │  DASHBOARD (Trang chính)                  │
          │                                          │
          │  ┌────────────┐  ┌────────────┐         │
          │  │ Lịch dạy   │  │ Chấm công  │         │
          │  │ tuần này   │  │ tháng này  │         │
          │  │ 3 buổi     │  │ 14/16 buổi │         │
          │  └────────────┘  └────────────┘         │
          │  ┌────────────┐                          │
          │  │ Phiếu lương│                          │
          │  │ T2: 1,730k │                          │
          │  └────────────┘                          │
          └───────────────────┬──────────────────────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
          ┌───────────┐ ┌──────────┐ ┌──────────────┐
          │ Tab CHẤM  │ │Tab LƯƠNG │ │ Tab HỒ SƠ    │
          │   CÔNG    │ │          │ │              │
          │           │ │          │ │              │
          │ Lịch tháng│ │Phiếu     │ │Thông tin cá  │
          │ dạng      │ │lương     │ │nhân          │
          │ calendar  │ │tháng hiện│ │(chỉ xem,     │
          │           │ │tại       │ │không sửa)    │
          │ Màu ô:    │ │          │ │              │
          │ xanh = 1  │ │Chi tiết: │ │Tên, mã NV,   │
          │ đỏ = KP   │ │ - Buổi   │ │vị trí, CS    │
          │ vàng = 0.5│ │ - GROSS  │ │              │
          │ xám = 0   │ │ - Khấu   │ │              │
          │           │ │   trừ    │ │              │
          │ Chỉ XEM   │ │ - NET    │ │              │
          │ (read-only│ │          │ │              │
          │ )         │ │Nếu là TG:│ │              │
          │           │ │ - KPI    │ │              │
          │           │ │   scores │ │              │
          │           │ │ - Biểu   │ │              │
          │           │ │   đồ 6T  │ │              │
          │           │ │          │ │              │
          │           │ │Lịch sử   │ │              │
          │           │ │lương bar │ │              │
          │           │ │chart 12T │ │              │
          └───────────┘ └──────────┘ └──────────────┘
```

---

## 6. System Setup Workflow

> Quy Trình Khởi Tạo Hệ Thống — Admin sets up HRM from scratch

```
BƯỚC 1: HẠ TẦNG
─────────────────────────────────────────────────────────────────
  Tạo Supabase project
       │
       ▼
  Chạy SQL migration (10 tables + RLS policies)
       │
       ▼
  Cấu hình Supabase Auth (email/password)
       │
       ▼
  Deploy Next.js app lên server Dell Ubuntu port 3001
       │
       ▼
  Tạo tài khoản admin đầu tiên qua Supabase dashboard


BƯỚC 2: CẤU HÌNH CƠ SỞ
─────────────────────────────────────────────────────────────────
  Admin đăng nhập
       │
       ▼
  Tạo branches (cơ sở)
  VD: "CS Tân Mai", "CS Lĩnh Nam"
       │
       ▼
  Tạo tài khoản nhân viên
  ┌──────────────────────────────────────────────────────────┐
  │  Mỗi NV: employee_code, tên, role, vị trí,             │
  │           rate_per_session, has_labor_contract          │
  └──────────────────────────────────────────────────────────┘
       │
       ▼
  Gán role cho từng tài khoản:
  ┌─────────────────────────────────────────────────────────┐
  │  admin          → toàn quyền, tất cả cơ sở             │
  │  branch_manager → cơ sở được gán, chấm công + KPI      │
  │  accountant     → xem tất cả, tính lương, gửi email    │
  │  employee       → chỉ xem data bản thân                │
  └─────────────────────────────────────────────────────────┘


BƯỚC 3: THIẾT LẬP LỊCH LỚP
─────────────────────────────────────────────────────────────────
  Admin hoặc BM tạo class_schedules (1 lần duy nhất)
       │
       ▼
  Mỗi lớp cần điền:
  ┌──────────────────────────────────────────────────────────┐
  │  class_code    VD: "BC04"                                │
  │  class_name    VD: "IELTS 6.5 - A1"                     │
  │  shift_time    VD: "19:00-20:30"                         │
  │  days_of_week  VD: [2, 4, 5] → 1 record, nhiều ngày     │
  │  teacher_id    → Nhập mã NV → auto-fill GV               │
  │  assistant_id  → Nhập mã NV → auto-fill TG               │
  │  branch_id     → cơ sở                                   │
  └──────────────────────────────────────────────────────────┘
       │
       ▼
  Hệ thống kiểm tra xung đột lịch (xem Workflow 8)
       │
       ▼
  Lưu → class_schedules active


BƯỚC 4: VẬN HÀNH BÌNH THƯỜNG BẮT ĐẦU
─────────────────────────────────────────────────────────────────
  Thứ Hai đầu tiên sau setup
       │
       ▼
  Hệ thống tự sinh bảng chấm công tuần đầu tiên
       │
       ▼
  BM bắt đầu chấm công (Workflow 2)
       │
       ▼
  Cuối tháng: kế toán xử lý lương lần đầu (Workflow 3)
       │
       ▼
  Hệ thống vận hành tự động theo chu kỳ (Workflow 1)
```

---

## 7. Audit Log Flow

> Luồng Ghi Nhật Ký — Every mutation is tracked for accountability

```
   BẤT KỲ THAO TÁC THAY ĐỔI DỮ LIỆU NÀO
              │
              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  TRIGGER GHI AUDIT LOG                                       │
   │                                                              │
   │  audit_log entry:                                            │
   │  ┌────────────────────────────────────────────────────────┐  │
   │  │  user_id    → ai thực hiện (FK → employees/auth.users) │  │
   │  │  action     → "create" / "update" / "delete"           │  │
   │  │  table_name → bảng bị ảnh hưởng                        │  │
   │  │  record_id  → ID bản ghi bị ảnh hưởng                  │  │
   │  │  old_value  → JSON giá trị trước                        │  │
   │  │  new_value  → JSON giá trị sau                          │  │
   │  │  timestamp  → thời điểm chính xác                       │  │
   │  │  ip_address → địa chỉ IP (bảo mật)                     │  │
   │  └────────────────────────────────────────────────────────┘  │
   └──────────────────────────────────────────────────────────────┘
              │
              ▼
   CÁC SỰ KIỆN ĐẶC BIỆT ĐƯỢC THEO DÕI:

   ┌────────────────────────────────────────────────────────────────┐
   │                                                                │
   │  attendance                                                    │
   │  ├── Thay đổi sau auto-lock (admin unlock → edit)             │
   │  ├── Sửa trạng thái: "1" → "KP" (vắng không phép)            │
   │  └── Sửa sau khi tuần đã qua                                  │
   │                                                                │
   │  payslips                                                      │
   │  ├── Tạo mới (xác nhận kỳ lương)                             │
   │  ├── Sửa trong 24h undo window                                │
   │  └── Admin force-edit sau 24h                                 │
   │                                                                │
   │  kpi_evaluations                                               │
   │  ├── Tạo/cập nhật điểm KPI                                   │
   │  └── Sửa sau khi payslip đã xác nhận                         │
   │                                                                │
   │  employees                                                     │
   │  ├── Thay đổi rate_per_session                                │
   │  ├── Thay đổi has_labor_contract                              │
   │  └── Thay đổi role                                            │
   │                                                                │
   │  payroll_periods                                               │
   │  ├── Xác nhận kỳ lương                                        │
   │  └── Hoàn tác (undo) kỳ lương                                 │
   │                                                                │
   └────────────────────────────────────────────────────────────────┘
              │
              ▼
   ADMIN XEM AUDIT LOG:
   ┌───────────────────────────────────────────────────────────────┐
   │  Filter theo: user / action / table / date range             │
   │                                                               │
   │  Thời gian    Người dùng   Hành động   Chi tiết              │
   │  ──────────── ──────────── ─────────── ──────────────────    │
   │  06/03 21:30  Minh (BM)    update      attendance E02         │
   │                                        T3: "1" → "KP"         │
   │  06/03 21:35  Minh (BM)    create      employee_weekly_notes   │
   │                                        E01 substitute ×2       │
   │  07/03 14:20  Hà (KT)      create      payroll_period         │
   │                                        T3/2026 CS Tân Mai     │
   └───────────────────────────────────────────────────────────────┘
```

---

## 8. Conflict Detection Workflow

> Phát Hiện Xung Đột Lịch — When creating or editing class schedules

```
   ADMIN/BM NHẬP LỊCH LỚP MỚI HOẶC SỬA LỊCH
              │
              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  Input:                                                      │
   │  - days_of_week = [2, 4, 5] (T2, T4, T5)                    │
   │  - shift_time  = "19:00-20:30"                               │
   │  - teacher_id  = E01 (Rosie Mai)                             │
   │  - assistant_id = E08 (Mai Anh Rose)                         │
   └──────────────────────────────────────────────────────────────┘
              │
              ▼
   KIỂM TRA 1: Xung đột giáo viên
   ┌──────────────────────────────────────────────────────────────┐
   │  SELECT * FROM class_schedules                               │
   │  WHERE teacher_id = E01                                      │
   │    AND days_of_week && ARRAY[2,4,5]  -- array overlap        │
   │    AND shift_time OVERLAP "19:00-20:30"                      │
   │    AND status = 'active'                                     │
   └──────────────────────────────────────────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
   Không tìm thấy  Tìm thấy lớp khác
       │             │
       │             ▼
       │        ┌─────────────────────────────────────────────┐
       │        │  CẢNH BÁO ĐỎ — BLOCK LƯU                   │
       │        │                                             │
       │        │  "E01 (John Smith) đã có lịch dạy:          │
       │        │   TOEIC B2 — 17:15-19:15 — Thứ Hai"        │
       │        │                                             │
       │        │  [Đổi giáo viên]  [Đổi ca]  [Hủy]         │
       │        └─────────────────────────────────────────────┘
       │
       ▼
   KIỂM TRA 2: Xung đột trợ giảng
   ┌──────────────────────────────────────────────────────────────┐
   │  SELECT * FROM class_schedules                               │
   │  WHERE assistant_id = E08                                    │
   │    AND days_of_week && ARRAY[2,4,5]  -- array overlap        │
   │    AND shift_time OVERLAP "19:00-20:30"                      │
   │    AND status = 'active'                                     │
   └──────────────────────────────────────────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
   Không tìm thấy  Tìm thấy lớp khác
       │             │
       │             ▼
       │        ┌─────────────────────────────────────────────┐
       │        │  CẢNH BÁO ĐỎ — BLOCK LƯU                   │
       │        │                                             │
       │        │  "E08 (Vũ Thị Hà) đã có lịch:              │
       │        │   IELTS A1 — 17:15-19:15 — Thứ Hai"        │
       │        │                                             │
       │        │  [Đổi trợ giảng]  [Đổi ca]  [Hủy]         │
       │        └─────────────────────────────────────────────┘
       │
       ▼
   KHÔNG CÓ XUNG ĐỘT → CHO PHÉP LƯU
   ┌──────────────────────────────────────────────────────────────┐
   │  Lưu class_schedules record                                  │
   │  Ghi audit log                                               │
   │  Bảng chấm công tuần tiếp theo sẽ tự động bao gồm lớp này   │
   └──────────────────────────────────────────────────────────────┘

   ──────────────────────────────────────────────────────────────────
   LƯU Ý VỀ OVERLAP CA HỌC:
   ──────────────────────────────────────────────────────────────────

   Ca A: 17:15-19:15
   Ca B: 18:45-20:45

   Overlap? → 18:45 < 19:15 → CÓ xung đột (chồng lên 30 phút)

   Ca A: 17:15-19:15
   Ca C: 19:15-21:15

   Overlap? → 19:15 = 19:15 → KHÔNG xung đột (kế tiếp nhau, OK)
```

---

*Created: 2026-03-06 | Luna HRM Project — All 8 system workflow diagrams*
*Source: Brainstorm V1/V2/V3 + 18 MVP Optimizations*
