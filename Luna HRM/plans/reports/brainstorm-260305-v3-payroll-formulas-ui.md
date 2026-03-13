# Brainstorm V3: Công Thức Lương & Giao Diện Tính Lương — Final

> Cập nhật từ V2 + dữ liệu thực tế từ file Excel "Bảng lương + đánh giá trợ giảng.xlsx"

## Phát Hiện Từ File Excel

### Sheet 1: Bảng KPI Trợ Giảng (Form đánh giá chi tiết)

**Lương cứng = 75,000 VND/buổi** — Đạt nếu hoàn thành 4 tiêu chí bắt buộc:

| # | Tiêu chí bắt buộc (Pass/Fail) |
|---|-------------------------------|
| 1 | Hoàn thành tất cả nhiệm vụ trợ giảng theo mô tả công việc |
| 2 | Chuẩn bị phòng học: bàn ghế, tài liệu, vệ sinh; bảo quản vật tư |
| 3 | Đúng giờ (đến trước ít nhất 15 phút) |
| 4 | Điểm danh HS hàng ngày + báo quản lý khi HS vắng không phép |

→ **Đạt** = nhận lương cứng 75k/buổi × số buổi. **Không đạt** = 0 (hoặc giảm).

### Sheet 1: Thưởng KPI (5 tiêu chí, tổng 100 điểm)

| # | Tiêu chí | Điểm tối đa | Chi tiết |
|---|----------|-------------|----------|
| 1 | **Giờ TSI** | 10 | Hỗ trợ GV duy trì kỷ luật cho 80% HS |
| 2 | **Giờ Funtime** | 30 | Theo kế hoạch Funtime (10đ), hiểu tình hình HS (10đ), đạt mục tiêu Funtime (10đ) |
| 3 | **Phụ huynh** | 20 | Thân thiện (10đ), chia sẻ tình hình HS (10đ) |
| 4 | **Học sinh** | 30 | Giao tiếp 100% tiếng Anh (10đ), kỷ luật lớp (10đ), an toàn trẻ em (10đ) |
| 5 | **Tác phong** | 10 | Không vắng quá 2 lần, trang phục, không dùng điện thoại |

Thang chấm: 9-10 Xuất sắc | 7-8 Rất tốt | 5-6 Tốt | 3-5 Yếu | 1-2 Rất yếu

### Sheet 2: Bảng Lương (Công thức thực tế)

```
Tổng lương = (Lương cứng × Số buổi) + (Lương dạy thay × Số buổi thay) + Lương khác + KPI bonus

KPI bonus = (TSI + Funtime + Phụ huynh + Học sinh + Tác phong) × 50,000
```

**KPI trong bảng lương dùng thang rút gọn** (không phải /100 mà /10):

| Tiêu chí | Thang đầy đủ (Sheet1) | Thang rút gọn (Sheet2) | Quy đổi |
|----------|----------------------|------------------------|---------|
| TSI | /10 | 0-1 | ÷10 |
| Funtime | /30 | 0-3 | ÷10 |
| Phụ huynh | /20 | 0-2 | ÷10 |
| Học sinh | /30 | 0-3 | ÷10 |
| Tác phong | /10 | 0-1 | ÷10 |
| **Tổng** | **/100** | **0-10** | |

**Bonus = Tổng KPI rút gọn × 50,000 VND**
→ Tối đa: 10 × 50,000 = 500,000 VND/tháng
→ Thực tế: 100,000 - 400,000/tháng

---

## 3 Loại Công Thức Lương

### 1. Lương Văn Phòng (Lễ tân, bảo vệ, hành chính)

```
┌──────────────────────────────────────────────────────────┐
│  LƯƠNG VĂN PHÒNG                                        │
│                                                          │
│  Lương cứng  = Số buổi đi làm × Đơn giá/buổi           │
│  Dạy thay    = Số buổi thay × Đơn giá thay              │
│  Lương khác  = Phụ đạo + Lương extra                    │
│  ─────────────────────────────────────────               │
│  GROSS       = Lương cứng + Dạy thay + Lương khác       │
│                                                          │
│  Khấu trừ (nếu có HĐ):                                  │
│  BHXH = GROSS × 8%                                       │
│  BHYT = GROSS × 1.5%                                     │
│  BHTN = GROSS × 1%                                       │
│  TNCN = thuế lũy tiến (nếu vượt ngưỡng)                │
│  Khấu trừ/Phạt = nhập tay                               │
│  ─────────────────────────────────────────               │
│  NET = GROSS - BHXH - BHYT - BHTN - TNCN - Khấu trừ    │
└──────────────────────────────────────────────────────────┘
```

### 2. Lương Giáo Viên (GV nước ngoài + GV Việt)

```
┌──────────────────────────────────────────────────────────┐
│  LƯƠNG GIÁO VIÊN                                         │
│                                                          │
│  Lương cứng  = Số buổi dạy × Đơn giá/buổi              │
│  Dạy thay    = Số buổi thay × Đơn giá thay              │
│  Lương khác  = Phụ đạo + Lương extra                    │
│  ─────────────────────────────────────────               │
│  GROSS       = Lương cứng + Dạy thay + Lương khác       │
│                                                          │
│  Khấu trừ (tùy hợp đồng):                               │
│  BHXH/BHYT/BHTN = nếu có HĐLĐ                           │
│  TNCN = nếu vượt ngưỡng                                 │
│  Khấu trừ/Phạt = nhập tay                               │
│  ─────────────────────────────────────────               │
│  NET = GROSS - BH (nếu có) - TNCN - Khấu trừ           │
└──────────────────────────────────────────────────────────┘
```

### 3. Lương Trợ Giảng (Có thêm KPI)

```
┌──────────────────────────────────────────────────────────┐
│  LƯƠNG TRỢ GIẢNG                                         │
│                                                          │
│  Lương cứng  = Số buổi dạy × 75,000                     │
│  Dạy thay    = Số buổi thay × Đơn giá thay              │
│  Lương khác  = Phụ đạo + Lương extra                    │
│  Thưởng KPI  = (TSI + Funtime + PH + HS + Tác phong)   │
│                × 50,000                                  │
│  ─────────────────────────────────────────               │
│  GROSS       = Lương cứng + Dạy thay + Lương khác       │
│                + Thưởng KPI                              │
│                                                          │
│  Khấu trừ:                                               │
│  BHXH/BHYT/BHTN = nếu có HĐLĐ                           │
│  TNCN = nếu vượt ngưỡng                                 │
│  Khấu trừ/Phạt = nhập tay                               │
│  ─────────────────────────────────────────               │
│  NET = GROSS - BH (nếu có) - TNCN - Khấu trừ           │
└──────────────────────────────────────────────────────────┘
```

---

## Mockup: Giao Diện Tính Lương — Chia Tab Theo Vị Trí (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  🏢 HRM Luna  │ Cơ sở │ Lịch lớp │ Chấm công │ ★ Tính lương │ NV │      👤 Hà (KT) ▾  │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Bảng lương T3/2026 — CS Tân Mai         [+ Tạo kỳ lương]  [⚡ Tính tự động]           │
│                                                                                          │
│  ┌─────────────────────┬─────────────────────┬─────────────────────┐                     │
│  │  ★ Trợ giảng (8)    │  Giáo viên (5)      │  Văn phòng (3)      │  ← TABS            │
│  └─────────────────────┴─────────────────────┴─────────────────────┘                     │
│                                                                                          │
│  ══════════════════════════════════════════════════════════════════                       │
│  TAB: TRỢ GIẢNG — Công thức: Cứng×Buổi + Thay×Buổi + Khác + KPI                       │
│  ══════════════════════════════════════════════════════════════════                       │
│                                                                                          │
│  ┌── Tổng hợp tab ──────────────────────────────────────────────────────────────────┐   │
│  │  8 trợ giảng  │  Tổng buổi: 128  │  Tổng GROSS: 12,480,000  │  Tổng KPI: 1,850k│   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌── Phần A: Lương cứng + Dạy thay ─────────────────────────────────────────────────┐  │
│  │                                                                                    │  │
│  │  #  Mã   Tên VN        Tên EN     Lớp       Cứng    Buổi  Thay   Buổi  Khác     │  │
│  │                                              /buổi   làm   /buổi  thay            │  │
│  │  ── ──── ──────────── ────────── ────────── ─────── ───── ────── ───── ────────  │  │
│  │  1  E02  Trần Thị Bình T.Binh   Kids 1 C1   75,000  16   40,000   2       0     │  │
│  │  2  E04  Phạm Thị Dung T.Dung   TOEIC B2    75,000  14   40,000   0       0     │  │
│  │  3  E08  Vũ Thị Hà     T.Ha     IELTS A1    75,000  16   40,000   1   50,000    │  │
│  │  4  E09  Bùi Văn Khoa  V.Khoa   IELTS D1    75,000  16   40,000   0       0     │  │
│  │  5  E10  Đinh Thị Lan  T.Lan    Giao tiếp   75,000  15   40,000   0       0     │  │
│  │  ...                                                                               │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  ┌── Phần B: Đánh giá KPI (chỉ Trợ giảng) ──────────────────────────────────────────┐  │
│  │                                                                                    │  │
│  │  #  Mã   Tên VN         TSI  Funtime  PH   HS   Tác    Tổng  Bonus              │  │
│  │                          /1    /3     /2   /3   phong  /10                         │  │
│  │  ── ──── ──────────────  ───  ──────  ───  ───  ─────  ────  ──────────           │  │
│  │  1  E02  Trần Thị Bình   1     2      2    3     1      9    450,000              │  │
│  │  2  E04  Phạm Thị Dung   1     2      1    2     1      7    350,000              │  │
│  │  3  E08  Vũ Thị Hà       0     3      2    3     0      8    400,000              │  │
│  │  4  E09  Bùi Văn Khoa    1     1      1    2     1      6    300,000              │  │
│  │  5  E10  Đinh Thị Lan    1     2      1    2     0      6    300,000              │  │
│  │  ...                                                                               │  │
│  │                                                                                    │  │
│  │  [📝 Mở form KPI chi tiết] ← BM chấm KPI ở đây mỗi tháng                       │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  ┌── Phần C: Tổng lương + Khấu trừ ─────────────────────────────────────────────────┐  │
│  │                                                                                    │  │
│  │  #  Mã   Tên VN         Lương    Dạy     Khác    KPI      GROSS    BH+Thuế  NET  │  │
│  │                          cứng    thay            bonus                              │  │
│  │  ── ──── ──────────────  ──────  ──────  ──────  ───────  ───────  ───────  ─────  │  │
│  │  1  E02  Trần Thị Bình  1,200k   80k      0     450k     1,730k     0     1,730k │  │
│  │  2  E04  Phạm Thị Dung  1,050k    0       0     350k     1,400k     0     1,400k │  │
│  │  3  E08  Vũ Thị Hà      1,200k   40k    50k     400k     1,690k     0     1,690k │  │
│  │  4  E09  Bùi Văn Khoa   1,200k    0       0     300k     1,500k     0     1,500k │  │
│  │  5  E10  Đinh Thị Lan   1,125k    0       0     300k     1,425k     0     1,425k │  │
│  │  ...                                                                               │  │
│  │  ─────────────────────────────────────────────────────────────────────────────     │  │
│  │  TỔNG TAB TRỢ GIẢNG:                                   10,745k           10,745k │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  ┌── Ghi chú từ BM ─────────────────────────────────────────────────────────────────┐  │
│  │  📋 Tuần 1: E02 dạy thay 2 buổi lớp E1 cho E07 (nghỉ ốm)                       │  │
│  │  📋 Tuần 3: E08 dạy phụ đạo 1 buổi (50k)                                        │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  [✅ Xác nhận tab Trợ giảng]   [📧 Gửi email]   [📥 Xuất Excel]                       │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Tab Giáo Viên (Click tab "Giáo viên")

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┬─────────────────────┬─────────────────────┐                     │
│  │  Trợ giảng (8)      │  ★ Giáo viên (5)    │  Văn phòng (3)      │                     │
│  └─────────────────────┴─────────────────────┴─────────────────────┘                     │
│                                                                                          │
│  ══════════════════════════════════════════════════════════════════                       │
│  TAB: GIÁO VIÊN — Công thức: Cứng×Buổi + Thay×Buổi + Khác                             │
│  ══════════════════════════════════════════════════════════════════                       │
│  (KHÔNG có phần KPI — chỉ Trợ giảng mới có KPI)                                        │
│                                                                                          │
│  ┌── Bảng lương GV ─────────────────────────────────────────────────────────────────┐   │
│  │                                                                                    │  │
│  │  #  Mã   Tên EN          Lớp           Cứng    Buổi  Thay   Buổi  Khác   GROSS  │  │
│  │                                         /buổi   dạy   /buổi  thay                │  │
│  │  ── ──── ──────────────  ──────────── ─────── ───── ────── ───── ────── ──────── │  │
│  │  1  E01  John Smith      IELTS A1      500k    20     0      0     0    10,000k  │  │
│  │                          Giao tiếp E1                                             │  │
│  │  2  E03  Mike Johnson    TOEIC B2      450k    18     0      0     0     8,100k  │  │
│  │  3  E05  Sarah Williams  Kids 1 C1     500k    16     0      0     0     8,000k  │  │
│  │  4  E06  David Brown     IELTS D1      450k    8      0      0     0     3,600k  │  │
│  │  5  E07  (nghỉ ốm)      —              —      0      0      0     0         0   │  │
│  │  ─────────────────────────────────────────────────────────────────────────────     │  │
│  │                                                                                    │  │
│  │  #  (tiếp)    HĐ lao động  BHXH     BHYT     BHTN    TNCN    Khấu trừ  NET      │  │
│  │  ── ────────  ──────────── ──────── ──────── ─────── ──────  ──────── ────────   │  │
│  │  1  E01       ☐ Không       0        0        0       0        0     10,000k     │  │
│  │  2  E03       ☐ Không       0        0        0       0        0      8,100k     │  │
│  │  3  E05       ☑ Có         640k     120k      80k     0        0      7,160k     │  │
│  │  4  E06       ☐ Không       0        0        0       0        0      3,600k     │  │
│  │  5  E07       —             —        —        —       —        —          0      │  │
│  │  ─────────────────────────────────────────────────────────────────────────────     │  │
│  │  TỔNG TAB GV:                                                         28,860k    │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  [✅ Xác nhận tab GV]   [📧 Gửi email]   [📥 Xuất Excel]                               │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Tab Văn Phòng

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┬─────────────────────┬─────────────────────┐                     │
│  │  Trợ giảng (8)      │  Giáo viên (5)      │  ★ Văn phòng (3)    │                     │
│  └─────────────────────┴─────────────────────┴─────────────────────┘                     │
│                                                                                          │
│  ══════════════════════════════════════════════════════════════════                       │
│  TAB: VĂN PHÒNG — Công thức: Cứng×Buổi + Thay×Buổi + Khác                             │
│  ══════════════════════════════════════════════════════════════════                       │
│                                                                                          │
│  ┌── Bảng lương VP ─────────────────────────────────────────────────────────────────┐   │
│  │                                                                                    │  │
│  │  #  Mã   Tên VN         Vị trí    Cứng    Buổi  Thay   Buổi  Khác    GROSS      │  │
│  │                                    /buổi   làm   /buổi  thay                      │  │
│  │  ── ──── ──────────────  ──────── ─────── ───── ────── ───── ─────── ─────────   │  │
│  │  1  E20  Nguyễn Thị Mai  Lễ tân   150k    24     0      0     0      3,600k      │  │
│  │  2  E21  Đỗ Văn Giang    Bảo vệ   120k    26     0      0     0      3,120k      │  │
│  │  3  E22  Lê Thị Oanh     HC       180k    22     0      0     0      3,960k      │  │
│  │  ─────────────────────────────────────────────────────────────────────────────     │  │
│  │                                                                                    │  │
│  │  #  (tiếp)   HĐ LĐ  BHXH    BHYT    BHTN   TNCN  Khấu trừ/Phạt   NET           │  │
│  │  ── ──────── ─────── ─────── ─────── ────── ────── ──────────────── ─────────     │  │
│  │  1  E20      ☑ Có    288k    54k     36k      0       0            3,222k         │  │
│  │  2  E21      ☑ Có    249k    46k     31k      0       0            2,794k         │  │
│  │  3  E22      ☑ Có    316k    59k     39k      0    -200k (phạt)   3,346k         │  │
│  │  ─────────────────────────────────────────────────────────────────────────────     │  │
│  │  TỔNG TAB VP:                                                      9,362k         │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│  [✅ Xác nhận tab VP]   [📧 Gửi email]   [📥 Xuất Excel]                               │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Mockup: Form KPI Trợ Giảng (BM chấm hàng tháng)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  Đánh giá KPI Trợ giảng — T3/2026                              Trần Thị Bình (E02)     │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ── LƯƠNG CỨNG (Pass/Fail) ──                                                           │
│  ┌────────────────────────────────────────────────────────────────┬──────────────────┐   │
│  │  Tiêu chí                                                     │ Đạt?             │   │
│  │  ─────────────────────────────────────────────────────────    │                  │   │
│  │  1. Hoàn thành nhiệm vụ TG theo mô tả công việc             │ [✅ Đạt]  [❌]   │   │
│  │  2. Chuẩn bị phòng học, bảo quản vật tư                      │ [✅ Đạt]  [❌]   │   │
│  │  3. Đúng giờ (trước 15 phút)                                 │ [✅ Đạt]  [❌]   │   │
│  │  4. Điểm danh HS + báo vắng                                  │ [✅ Đạt]  [❌]   │   │
│  │                                                                │                  │   │
│  │  → Kết quả: ✅ ĐẠT — Nhận lương cứng 75,000/buổi            │                  │   │
│  └────────────────────────────────────────────────────────────────┴──────────────────┘   │
│                                                                                          │
│  ── THƯỞNG KPI (Chấm điểm) ──                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                  │   │
│  │  1. GIỜ TSI (0-1)                                          Điểm: [ 1 ▾]        │   │
│  │     Hỗ trợ GV duy trì kỷ luật 80% HS                                            │   │
│  │     Nhận xét: [Tốt, quản lý lớp chủ động                                  ]    │   │
│  │                                                                                  │   │
│  │  2. GIỜ FUNTIME (0-3)                                      Điểm: [ 2 ▾]        │   │
│  │     a) Theo kế hoạch Funtime (0-1): [1]                                         │   │
│  │     b) Hiểu tình hình từng HS (0-1): [1]                                        │   │
│  │     c) Đạt mục tiêu Funtime (0-1):  [0]                                         │   │
│  │     Nhận xét: [Cần cải thiện mục tiêu level cuối kỳ                       ]    │   │
│  │                                                                                  │   │
│  │  3. PHỤ HUYNH (0-2)                                        Điểm: [ 2 ▾]        │   │
│  │     a) Thân thiện, nhiệt tình (0-1): [1]                                        │   │
│  │     b) Chia sẻ tình hình HS (0-1):   [1]                                        │   │
│  │     Nhận xét: [Phụ huynh feedback tích cực                                ]    │   │
│  │                                                                                  │   │
│  │  4. HỌC SINH (0-3)                                         Điểm: [ 3 ▾]        │   │
│  │     a) Giao tiếp 100% tiếng Anh (0-1): [1]                                      │   │
│  │     b) Kỷ luật lớp (0-1):              [1]                                       │   │
│  │     c) An toàn trẻ em (0-1):            [1]                                      │   │
│  │     Nhận xét: [Xuất sắc                                                    ]    │   │
│  │                                                                                  │   │
│  │  5. TÁC PHONG (0-1)                                        Điểm: [ 1 ▾]        │   │
│  │     Không vắng quá 2 lần, trang phục đúng, không dùng ĐT                        │   │
│  │     Nhận xét: [Đạt                                                         ]    │   │
│  │                                                                                  │   │
│  │  ─────────────────────────────────────────────────────────────────────────        │   │
│  │  TỔNG KPI: 9/10        THƯỞNG: 9 × 50,000 = 450,000 VND                        │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  [💾 Lưu KPI]   [Hủy]                                                                   │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Mockup: Phiếu Lương Trợ Giảng (Mobile — Employee View)

```
┌──────────────────────────┐
│ ◀  Phiếu lương       🔔  │
├──────────────────────────┤
│                          │
│  👤 Trần Thị Bình (E02)  │
│  Trợ giảng — CS Tân Mai  │
│                          │
│  Kỳ: T3/2026   ◀  ▶    │
│                          │
│  ╔══════════════════════╗│
│  ║  💰 THỰC LÃNH        ║│
│  ║   1,730,000 VND      ║│
│  ║  ✅ Đã xác nhận      ║│
│  ╚══════════════════════╝│
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
│  │  Lương cứng:          ││
│  │  16 × 75k = 1,200,000││
│  │  Dạy thay:            ││
│  │  2 × 40k =     80,000││
│  │  Lương khác:        0 ││
│  │  ─────────────────── ││
│  │  Thưởng KPI:          ││
│  │  9/10 × 50k = 450,000││
│  │  ─────────────────── ││
│  │  GROSS:     1,730,000 ││
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
│  │  BHXH/BHYT/BHTN: 0   ││
│  │  TNCN: 0              ││
│  │  Khấu trừ: 0          ││
│  └──────────────────────┘│
│                          │
├──────────────────────────┤
│  🏠    📋    💰    👤    │
└──────────────────────────┘
```

## Cập Nhật Database Schema V3

```
── BẢNG MỚI ──

class_schedules (Lịch lớp cố định)
├── id, branch_id, class_name, shift_time
├── day_of_week, teacher_id, assistant_id
├── status, created_at

employee_weekly_notes (Ghi chú tuần per-employee — thay weekly_notes)
├── id, branch_id, week_start
├── employee_id, note_type (substitute|bonus|penalty|extra_job|general)
├── description, amount (nullable), amount_unit (sessions|vnd)
├── is_processed (bool), processed_by, created_by, created_at

kpi_evaluations (Đánh giá KPI trợ giảng — MỚI)
├── id
├── employee_id        FK → employees
├── branch_id          FK → branches
├── month, year
├── base_pass          BOOLEAN    (đạt/không đạt lương cứng)
├── tsi_score          INT 0-1
├── tsi_comment        TEXT
├── funtime_score      INT 0-3
├── funtime_comment    TEXT
├── parent_score       INT 0-2
├── parent_comment     TEXT
├── student_score      INT 0-3
├── student_comment    TEXT
├── demeanor_score     INT 0-1
├── demeanor_comment   TEXT
├── total_score        INT 0-10 (computed)
├── bonus_amount       BIGINT (total_score × 50,000)
├── evaluated_by       FK → employees (BM)
└── created_at

── BẢNG CẬP NHẬT ──

employees (thêm fields)
├── employee_code      TEXT       "E01"
├── name_en            TEXT       "John Smith" (GV nước ngoài)
├── position           TEXT       "teacher" / "assistant" / "office"
├── rate_per_session   BIGINT     Đơn giá/buổi (75000, 500000...)
├── sub_rate           BIGINT     Đơn giá dạy thay (40000...)
├── has_labor_contract BOOLEAN    Có HĐLĐ → đóng BHXH

payslips (thêm fields)
├── sessions_worked    INT        Số buổi làm
├── rate_per_session   BIGINT     Đơn giá snapshot
├── substitute_sessions INT       Số buổi dạy thay
├── substitute_pay     BIGINT     Lương dạy thay
├── other_pay          BIGINT     Lương khác (phụ đạo)
├── kpi_bonus          BIGINT     Thưởng KPI (chỉ TG)
├── penalties          BIGINT     Khấu trừ/Phạt
├── extra_notes        TEXT       Ghi chú từ BM

── TỔNG: 10 BẢNG ──
branches, employees, class_schedules, attendance,
employee_weekly_notes, kpi_evaluations, payroll_periods,
payslips, salary_components, evaluations
```

## Tổng Hợp Thay Đổi So Với V1

| Thay đổi | V1 | V3 (Final) |
|-----------|----|----|
| Chấm công | NV × ngày | Lớp × ca × tuần, auto-fill |
| Thời gian BM | 15-20 phút/ngày | **2 phút/tuần** |
| Lương | 1 công thức | **3 công thức** (VP/GV/TG) |
| KPI | Đánh giá 1-5 sao chung | **5 tiêu chí KPI chi tiết** (chỉ TG) |
| Bonus | Không | **KPI × 50k** (0-500k/tháng) |
| BHXH | Tất cả | **Tùy hợp đồng lao động** |
| Giao diện lương | 1 bảng chung | **3 tabs theo vị trí** |
| DB tables | 7 | **10** |
| GV nước ngoài | Không rõ | Tên EN, có thể không HĐLĐ |

---

*Updated: 2026-03-05 | Brainstorm V3 — Final payroll formulas & UI for English Center*
