# Student Hub — Nguyên tắc vận hành & Sơ đồ hệ thống

> Tài liệu tham chiếu cho giai đoạn phát triển v0.5.0
> Brainstorm date: 2026-03-04

---

## Nguyên tắc cốt lõi

**TỰ ĐỘNG HÓA TỐI ĐA — CON NGƯỜI DUYỆT THÔNG TIN QUAN TRỌNG**

Mọi tác vụ lặp đi lặp lại, thông tin cố định có sẵn → hệ thống tự xử lý.
Con người chỉ can thiệp khi cần phán đoán, duyệt nội dung gửi ra ngoài (PH).

---

## Phân chia Tự động vs Con người duyệt

### Tự động 100% (không cần người)

| Tác vụ | Tần suất | Cách thực hiện |
|--------|----------|----------------|
| Crawl EasyCheck (điểm danh, điểm, homework, học phí) | Hàng ngày 23:00 | Puppeteer script, Ubuntu cron |
| Sync Google Sheet ⇄ CRM | Mỗi 15 phút (*/15) | Google API, cron endpoint |
| Tính tỷ lệ điểm danh % | Realtime khi có data mới | Supabase computed |
| Tính tiến độ level (buổi X/35) | Realtime | Supabase computed |
| Tổng hợp điểm trung bình | Cuối tuần/tháng | Cron job |
| Gửi báo cáo tuần (email + PDF) | Chủ nhật 20:00 | Cron + Resend |
| Cập nhật Parent Portal data | Sau mỗi sync | Auto trigger |
| Nhắc GV nhập nhận xét (nếu thiếu) | Hàng ngày 08:00 | Notification + Zalo/Email |
| Cảnh báo sớm: vắng 3 buổi liên tiếp | Realtime | DB trigger → notify advisor |
| Cảnh báo sớm: điểm giảm 2+ điểm | Sau mỗi sync | Compare logic → notify GV |
| Cảnh báo sớm: homework không nộp 2 tuần | Sau mỗi sync | Check logic → notify PH |
| AI phân tích xu hướng tiến độ | Cuối tuần/tháng | Gemini/Claude API |
| AI draft nhận xét cho GV | Cuối tuần | Gemini/Claude API |
| AI tóm tắt báo cáo tháng | Ngày 26 hàng tháng | Gemini/Claude API |

### Con người duyệt (approve/sửa trước khi gửi)

| Tác vụ | Ai duyệt | Cách duyệt |
|--------|----------|-------------|
| Nhận xét GV gửi PH (AI draft hoặc GV tự viết) | **Giáo viên** | Đọc draft AI → sửa/approve trên CRM |
| Báo cáo tháng trước khi gửi PH | **Quản lý** | Xem preview → 1 click approve → auto gửi |
| Điều chỉnh lộ trình đặc biệt cho HS cá nhân | **Advisor/QL** | Edit learning path trên CRM UI |
| Xử lý case bất thường (vắng nhiều, điểm giảm mạnh) | **Advisor** | Nhận alert → liên hệ PH → ghi note |

---

## Sơ đồ luồng dữ liệu tổng thể

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HỆ SINH THÁI LUNA ENGLISH                        │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Luna CRM    │     │  EasyCheck   │     │ Google Sheet │
  │ (tuyển sinh) │     │ (GV nhập)    │     │ (QL nhập ĐK) │
  │              │     │              │     │              │
  │ • leads      │     │ • Điểm danh  │     │ • enrollment │
  │ • students   │     │ • Nhận xét   │     │   data       │
  │ • PH contact │     │ • Điểm số    │     │ • class info │
  │ • advisors   │     │ • Homework   │     │              │
  │              │     │ • Học phí    │     │              │
  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │                    │                     │
         │              🤖 Puppeteer           🤖 Google API
         │              crawl 23:00             sync */15 min
         │              (Ubuntu cron)          (Vercel cron)
         │                    │                     │
         ▼                    ▼                     ▼
  ┌─────────────────────────────────────────────────────────┐
  │           SUPABASE — Single Source of Truth              │
  │                                                          │
  │  ┌─────────────┐  ┌───────────────────┐                 │
  │  │  Existing    │  │  New tables (v0.5) │                │
  │  │  • students  │  │  • attendance_records│              │
  │  │  • leads     │  │  • teacher_comments  │              │
  │  │  • users     │  │  • student_scores    │              │
  │  │             │  │  • fee_records        │              │
  │  │             │  │  • learning_paths     │              │
  │  │             │  │  • learning_milestones│              │
  │  │             │  │  • parent_reports     │              │
  │  │             │  │  • parent_portal_tokens│             │
  │  └─────────────┘  └───────────────────┘                 │
  └──────────────────────┬──────────────────────────────────┘
                         │
                    🤖 AI Engine
                    (Gemini/Claude API)
                         │
          ┌──────────────┼──────────────────┐
          ▼              ▼                  ▼
   ┌────────────┐ ┌────────────┐   ┌─────────────┐
   │ 🤖 Auto    │ │ 🤖 AI draft│   │ 🤖 Cảnh báo │
   │ Weekly     │ │ nhận xét   │   │ sớm         │
   │ Report     │ │ cho GV     │   │ (realtime)  │
   │ (Sun 20h)  │ │ (cuối tuần)│   │             │
   └─────┬──────┘ └─────┬──────┘   └──────┬──────┘
         │              │                  │
         │         👤 GV duyệt        👤 Advisor
         │         sửa/approve         xử lý case
         │              │
         ▼              ▼
   ┌────────────────────────────────┐
   │  👤 Quản lý duyệt báo cáo     │
   │  (preview → 1 click approve)  │
   └──────────────┬─────────────────┘
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
   📧 Email    📄 PDF    🌐 Parent Portal
   (Resend)    (auto)    /parent/[token]
        │         │          │
        └─────────┴──────────┘
                  ▼
            📱 Phụ huynh
```

---

## Sơ đồ Ubuntu Cron Jobs

```
┌──────────────────────────────────────────────────────────┐
│              UBUNTU HOMESERVER (24/7)                      │
│              Dell Inspiron 3442, Ubuntu                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Systemd Timers / Crontab:                                │
│                                                           │
│  ┌─ */15 min ────── Google Sheet 2-Way Sync ─────────┐   │
│  │  Vercel cron → Google API ⇄ Supabase upsert      │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ 08:00 daily ──── Nhắc GV nhập nhận xét ─────────┐   │
│  │  Check missing comments → Notify GV via CRM/Zalo  │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ 23:00 daily ──── EasyCheck Crawler ──────────────┐   │
│  │  Puppeteer headless → Login → Scrape 4 data types │   │
│  │  → Normalize → Dedup → Upsert Supabase            │   │
│  │  → Alert email nếu fail                            │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Sun 18:00 ───── AI Draft nhận xét ───────────────┐   │
│  │  Gemini API → Draft comments → Save for GV review │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Sun 20:00 ───── Weekly Report ───────────────────┐   │
│  │  Aggregate data → Generate PDF → Send Email       │   │
│  │  → Update Parent Portal                            │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ 26th monthly ── AI Monthly Summary ──────────────┐   │
│  │  Full month analysis → Draft report → Save for QL │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ 28th 20:00 ──── Monthly Report ──────────────────┐   │
│  │  (After QL approval) → PDF + Email + Portal       │   │
│  └───────────────────────────────────────────────────┘   │
│                                                           │
│  Logs: /var/log/luna-cron/                                │
│  Stack: Node.js + Puppeteer + Supabase client             │
│  Standalone scripts (không cần CRM server chạy)          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Sơ đồ AI Engine

```
┌──────────────────────────────────────────────────────────┐
│                    AI ENGINE                              │
│              (Gemini API / Claude API)                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  INPUT (từ Supabase):                                     │
│  • attendance_records → tỷ lệ chuyên cần                 │
│  • student_scores → xu hướng điểm                        │
│  • teacher_comments → nhận xét GV các tuần trước         │
│  • homework tracking → tỷ lệ hoàn thành                 │
│  • learning_milestones → progress vs target               │
│                                                           │
│  OUTPUT:                                                  │
│                                                           │
│  1. PHÂN TÍCH TIẾN ĐỘ (tự động)                          │
│     → "Minh Anh tiến bộ Listening, chậm Speaking"         │
│                                                           │
│  2. ĐỀ XUẤT CẢI THIỆN (tự động → GV duyệt)              │
│     → "Tăng luyện Speaking 10ph/ngày qua app"            │
│                                                           │
│  3. DRAFT NHẬN XÉT (tự động → GV duyệt/sửa)             │
│     → Nhận xét tiếng Việt, giọng văn thân thiện          │
│     → GV chỉ cần đọc + sửa + approve                    │
│                                                           │
│  4. CẢNH BÁO SỚM (tự động → notify)                      │
│     → Vắng 3 buổi liên tiếp → alert advisor              │
│     → Điểm giảm 2+ → alert GV + advisor                  │
│     → Homework trễ 2 tuần → alert PH                     │
│     → Tiến độ chậm vs target → suggest intervention      │
│                                                           │
│  5. TÓM TẮT BÁO CÁO THÁNG (tự động → QL duyệt)         │
│     → Narrative report cho từng HS                        │
│     → QL duyệt 1 click → auto gửi PH                    │
│                                                           │
│  Tech choice:                                             │
│  • Gemini API free tier (đủ cho 200 HS)                   │
│  • Claude API nếu cần chất lượng cao hơn                 │
│  • Fallback: template-based nếu API down                 │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Sơ đồ Approval Workflow

```
  ┌─────────────────────────────────────────────────┐
  │          APPROVAL WORKFLOW                       │
  └─────────────────────────────────────────────────┘

  BÁO CÁO TUẦN:
  ┌────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐
  │ 🤖 Data │──▶│ 🤖 AI    │──▶│ 👤 GV    │──▶│ 🤖 Auto│
  │ Crawl   │   │ Draft    │   │ Approve  │   │ Send   │
  │ (auto)  │   │ nhận xét │   │ nhận xét │   │ Email  │
  └────────┘    └──────────┘    └──────────┘    └────────┘

  BÁO CÁO THÁNG:
  ┌────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐
  │ 🤖 Data │──▶│ 🤖 AI    │──▶│ 👤 GV    │──▶│ 👤 QL    │──▶│ 🤖 Auto│
  │ Crawl   │   │ Summary  │   │ Approve  │   │ Approve  │   │ Send   │
  │ (auto)  │   │ + Draft  │   │ nhận xét │   │ toàn bộ  │   │ Email  │
  └────────┘    └──────────┘    └──────────┘    └──────────┘    └────────┘

  CẢNH BÁO SỚM:
  ┌────────┐    ┌──────────┐    ┌──────────┐
  │ 🤖 Data │──▶│ 🤖 Check │──▶│ 👤 Advisor│
  │ Crawl   │   │ Triggers │   │ Xử lý    │
  │ (auto)  │   │ (auto)   │   │ case     │
  └────────┘    └──────────┘    └──────────┘
```
