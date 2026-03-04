# Brainstorm Deep-Dive: Student Hub v0.5.0 — Các vấn đề tích hợp

**Date:** 2026-03-04
**Status:** Complete
**Context:** Đào sâu các vấn đề kỹ thuật trước khi triển khai implementation plan

---

## Tóm tắt

21 câu hỏi đã được giải quyết qua 5 vòng brainstorm. Dưới đây là toàn bộ quyết định kỹ thuật đã thống nhất, cảnh báo rủi ro, và kiến trúc cuối cùng.

---

## 1. Google Sheet Sync — Chiến lược 2 chiều

### Quyết định
- **Direction**: 2 chiều (Sheet ⇄ CRM), cả 2 nơi đều thêm mới + sửa được
- **Conflict resolution**: **Sheet ưu tiên** khi data khác nhau
- **Tần suất**: Mỗi 15 phút (giữ nguyên như hiện tại)
- **Data trên Sheet**: 4 nhóm — Thông tin HS, Thông tin PH, Lớp học, Tài chính

### Luồng sync chi tiết
```
SHEET → CRM (inbound):
  1. Đọc tất cả rows trên Sheet
  2. So sánh với Supabase students table
  3. Row mới (student_code chưa có) → INSERT vào Supabase
  4. Row đã có + data khác → UPDATE Supabase (Sheet wins)

CRM → SHEET (outbound):
  1. Query students mới/sửa từ Supabase (updated_at > last_sync)
  2. So sánh với Sheet data
  3. Student mới từ CRM (chưa có trên Sheet) → APPEND row
  4. Student sửa trên CRM → UPDATE row ONLY IF Sheet chưa sửa cùng field

CONFLICT RULE:
  - Nếu cùng 1 field khác nhau giữa Sheet và CRM → Sheet wins
  - CRM ghi đè Sheet CHỈ KHI data trên Sheet chưa thay đổi kể từ lần sync trước
```

### Cảnh báo kỹ thuật
- Google Sheet KHÔNG có `updated_at` tự động → cần track bằng snapshot comparison
- Mỗi lần sync: lưu snapshot Sheet data vào Supabase (bảng `sheet_sync_snapshots`)
- So sánh snapshot trước vs Sheet hiện tại → phát hiện thay đổi trên Sheet
- So sánh Supabase data hiện tại vs snapshot → phát hiện thay đổi trên CRM
- Nếu cả 2 thay đổi cùng field → Sheet wins

### Cột mapping (Sheet → Supabase)
| Sheet Column | Supabase Field | Nhóm |
|---|---|---|
| Mã HS | student_code | HS |
| Họ tên HS | student_name (→ leads.student_name) | HS |
| Ngày sinh | date_of_birth | HS |
| Giới tính | gender | HS |
| Tên PH | parent_name (→ leads.parent_name) | PH |
| SĐT PH | parent_phone (→ leads.parent_phone) | PH |
| Email PH | parent_email (→ leads.parent_email) | PH |
| Địa chỉ | address | PH |
| Chương trình | program_type | Lớp |
| Level | current_level | Lớp |
| Lớp | current_class | Lớp |
| GV phụ trách | teacher_name | Lớp |
| Ngày đăng ký | enrollment_date | TC |
| Ngày hết hạn | level_end_date | TC |
| Học phí | tuition_amount | TC |
| Trạng thái TT | payment_status | TC |

---

## 2. EasyCheck Crawler

### Quyết định
- **Quy mô**: 10-20 lớp, ~200 HS
- **Account**: 1 admin account thấy tất cả
- **Data crawl**: 5 loại — Điểm danh, Nhận xét GV, Điểm số, Homework, Notes
- **Notes**: Crawl để tham khảo nội bộ, KHÔNG đưa vào báo cáo PH
- **Fallback khi lỗi**: Chờ fix, không cần form nhập tay
- **Alert**: Email alert cho dev/QL khi crawler fail
- **Host**: Standalone Node.js scripts riêng trên Ubuntu (không chung container CRM)

### Student Mapping
- **Key**: `student_code` — đã quy ước chung giữa Sheet, CRM, và EasyCheck
- GV nhập student_code trên EasyCheck → crawler match bằng code
- Nếu không tìm thấy code → log warning + skip record

### Crawler Architecture
```
Ubuntu homeserver:
├── /opt/luna-crawlers/
│   ├── easycheck-crawler.js     (Puppeteer, 23:00 daily)
│   ├── google-sheet-sync.js     (Google API, */15 min)
│   ├── shared/
│   │   ├── supabase-client.js   (service key connection)
│   │   └── logger.js            (file + email alert)
│   ├── .env                     (credentials)
│   └── package.json
├── /var/log/luna-cron/          (log files)
└── systemd timers / crontab     (scheduling)
```

### Crawl Flow (EasyCheck)
```
1. Launch Puppeteer headless
2. Navigate → login page
3. Login with admin credentials
4. Navigate → class list
5. For each class (10-20):
   a. Open class page
   b. Extract: attendance, scores, homework, comments, notes
   c. Match student_code → Supabase student ID
   d. Upsert to Supabase tables
   e. Random delay 2-5s between classes
6. Close browser
7. Log results + email summary
8. Alert email nếu có errors

Estimated time: 15-30 phút cho 200 HS (with delays)
```

---

## 3. AI Engine

### Quyết định
- **Model**: Gemini Flash free tier (default)
- **Fallback**: Template-based (nếu Gemini API down)
- **Cost**: $0 (free tier: 15 RPM, 1M tokens/day — đủ cho 200 HS)
- **Use cases**: Phân tích tiến độ, draft nhận xét, cảnh báo sớm, tóm tắt tháng

### Gemini Free Tier Capacity
| Task | HS/batch | Tokens/HS | Total tokens | Calls | Thời gian |
|---|---|---|---|---|---|
| Weekly draft nhận xét | 200 | ~500 | ~100K | 200 | ~14 phút |
| Monthly summary | 200 | ~1000 | ~200K | 200 | ~14 phút |
| Early warnings | ~20 | ~300 | ~6K | 20 | ~2 phút |
| Progress analysis | 200 | ~500 | ~100K | 200 | ~14 phút |
| **Total/week** | | | **~406K** | **~620** | **~44 phút** |

Free tier limit: 1M tokens/day, 15 RPM → **đủ dùng, không vấn đề**

### Fallback Template (khi API down)
```
Báo cáo tuần — {{student_name}} — {{class_name}}
• Điểm danh: {{attendance_pct}}% ({{present}}/{{total}} buổi)
• Điểm TB: {{avg_score}}/10
• Homework: {{hw_complete}}/{{hw_total}} bài đã nộp
• Tiến độ: Buổi {{current_session}}/{{total_sessions}} (Level {{level}})
• Nhận xét GV: {{teacher_comment}}
```

---

## 4. Parent Reporting

### Quyết định
- **Token**: Vĩnh viễn, không hết hạn → PH bookmark link
- **Language**: Tiếng Việt 100%
- **Báo cáo**: Theo từng HS riêng (không gộp PH có nhiều con)
- **Email sender**: 1 địa chỉ chung (VD: baocao@lunaenglish.com)
- **Portal domain**: Subdomain riêng (parent.lunaenglish.com)

### Parent Portal URL Structure
```
https://parent.lunaenglish.com/[permanent-token]

Token format: UUID v4 (36 chars)
Example: https://parent.lunaenglish.com/a1b2c3d4-e5f6-7890-abcd-ef1234567890

Page shows:
├── Student Info (tên, lớp, chương trình, level)
├── Latest Weekly Report
├── Monthly Reports (archive)
├── Learning Journey Map (visual progress)
└── Attendance Calendar
```

### Report Schedule
| Báo cáo | Thời gian | Approval | Kênh |
|---|---|---|---|
| Tuần | CN 20:00 | GV duyệt nhận xét | Email + Portal update |
| Tháng | 28th 20:00 | GV duyệt → QL duyệt | Email + PDF + Portal |
| Cảnh báo | Realtime | Auto (nếu vắng 3 buổi, điểm giảm) | Email ngay |

---

## 5. Deployment Architecture

### Quyết định
- **Crawler host**: Standalone scripts riêng trên Ubuntu (không chung Docker container)
- **Phase order**: Tuần tự 1→2→3→4
- **Parent Portal**: Subdomain riêng (parent.lunaenglish.com)

### Architecture Diagram (updated)
```
┌──────────────────────────────────────────────────────────┐
│                 UBUNTU HOMESERVER (24/7)                   │
│                 Dell Inspiron 3442, 8GB RAM                │
├────────────────────────┬─────────────────────────────────┤
│  Docker (512MB)        │  Standalone (native Node.js)    │
│  ┌──────────────────┐  │  ┌────────────────────────────┐ │
│  │ Luna CRM         │  │  │ /opt/luna-crawlers/        │ │
│  │ (Next.js app)    │  │  │                            │ │
│  │ Port 3000        │  │  │ • easycheck-crawler.js     │ │
│  └────────┬─────────┘  │  │   (Puppeteer, 23:00)       │ │
│           │            │  │                            │ │
│  ┌────────┴─────────┐  │  │ • google-sheet-sync.js     │ │
│  │ Caddy (reverse   │  │  │   (API, */15 min)          │ │
│  │ proxy + TLS)     │  │  │                            │ │
│  │ crm.luna...      │  │  │ • ai-weekly-draft.js       │ │
│  │ parent.luna...   │  │  │   (Gemini, Sun 18:00)      │ │
│  └──────────────────┘  │  │                            │ │
│                        │  │ • alert-checker.js          │ │
│                        │  │   (post-crawl, 23:30)       │ │
│                        │  └────────────────────────────┘ │
│                        │                                 │
│  Shared: Supabase Cloud (Singapore)                      │
│  Logs: /var/log/luna-cron/                               │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Rủi ro & Giải pháp

| # | Rủi ro | Mức độ | Giải pháp |
|---|---|---|---|
| 1 | EasyCheck thay đổi UI → crawler vỡ | **CAO** | Monitor + email alert, fix ASAP |
| 2 | EasyCheck block IP/session | Trung bình | 1 lần/ngày, delay 2-5s giữa requests |
| 3 | Google Sheet conflict (cùng sửa 1 field) | Trung bình | Sheet wins, snapshot comparison |
| 4 | Gemini API down/rate limit | Thấp | Template fallback, retry 3 lần |
| 5 | Student code không match | Trung bình | Log warning, skip + alert QL |
| 6 | Ubuntu server restart/downtime | Thấp | Systemd auto-restart, miss → catch up next run |
| 7 | Puppeteer memory leak (200 HS crawl) | Trung bình | Close browser after each session, limit 50 HS/batch |
| 8 | Parent token bị leak/share | Thấp | Token chỉ xem (read-only), không thao tác được |

---

## 7. Schema Mới (Preview cho Phase 1)

### Bảng mới cần tạo
1. `attendance_records` — Điểm danh crawl từ EasyCheck
2. `teacher_comments` — Nhận xét GV crawl từ EasyCheck
3. `student_scores` — Điểm số crawl từ EasyCheck
4. `homework_records` — Homework tracking crawl từ EasyCheck
5. `student_notes` — Ghi chú đặc điểm HS (nội bộ, từ EasyCheck)
6. `learning_paths` — Lộ trình học (chương trình + level)
7. `learning_milestones` — Mốc tiến độ (buổi X/35, level X/15)
8. `parent_reports` — Báo cáo đã tạo (tuần/tháng)
9. `parent_portal_tokens` — Token vĩnh viễn cho PH
10. `sheet_sync_snapshots` — Snapshot Google Sheet data cho conflict resolution
11. `crawler_logs` — Log crawl EasyCheck (success/fail/warnings)
12. `ai_drafts` — AI draft nhận xét chờ GV duyệt

### Cột mới trên bảng students
- `date_of_birth` — Ngày sinh
- `gender` — Giới tính
- `address` — Địa chỉ
- `teacher_name` — GV phụ trách
- `tuition_amount` — Học phí
- `payment_status` — Trạng thái thanh toán
- `program_type` — Chương trình (buttercup, primary_success...)
- `sheet_row_index` — Vị trí row trên Google Sheet (for sync tracking)

---

## 8. Phase Breakdown (Updated)

| Phase | Scope | Estimated | Dependencies |
|---|---|---|---|
| **1. Student Data Hub** | 12 tables, schema migrations, Student profile UI, Sheet sync 2-way upgrade | 2-3 weeks | None |
| **2. Crawlers** | EasyCheck Puppeteer crawler, Ubuntu systemd setup, crawler logs + alerts | 2 weeks | Phase 1 (tables must exist) |
| **3. AI Engine** | Gemini integration, draft nhận xét, cảnh báo sớm, approval UI | 1-2 weeks | Phase 2 (data must flow in) |
| **4. Parent Reporting** | Email templates, PDF generation, Parent Portal, approval workflow, subdomain | 2 weeks | Phase 3 (AI drafts must work) |

---

## Unresolved Questions

1. **Subdomain DNS**: Ai quản lý DNS cho lunaenglish.com? Cần thêm A record cho `parent.lunaenglish.com`
2. **Email domain**: Đã có email domain setup cho Resend chưa? (cần SPF/DKIM cho baocao@lunaenglish.com)
3. **EasyCheck actual UI**: Cần manual exploration session để screenshot actual UI, xác nhận selectors cho crawler
4. **Google Sheet structure**: Cần bản Sheet hiện tại để map chính xác cột ↔ Supabase fields
5. **Puppeteer on Ubuntu**: Dell Inspiron 3442 (i3-4005U, 8GB) — Puppeteer cần ~512MB, CRM 512MB → còn ~7GB cho OS + swap. Đủ nhưng tight nếu crawl song song

---

## Kết luận

Kế hoạch tích hợp Student Hub v0.5.0 đã được làm rõ toàn bộ 21 quyết định kỹ thuật qua 5 vòng brainstorm. Kiến trúc cuối cùng:

- **Google Sheet ⇄ CRM**: 2 chiều, Sheet ưu tiên, snapshot-based conflict detection, 15 phút/lần
- **EasyCheck → CRM**: Puppeteer crawl 23:00 daily, student_code match, 5 loại data + notes nội bộ
- **AI Engine**: Gemini Flash free, template fallback
- **Parent Portal**: Subdomain riêng, token vĩnh viễn, VN 100%, báo cáo/HS
- **Deploy**: Crawler standalone scripts riêng, phases tuần tự 1→4

Sẵn sàng để tạo implementation plan chi tiết cho Phase 1.
