# Luna English CRM - Brainstorm Report

> **Date:** 2026-02-18
> **Status:** Brainstorm Complete - Pending Implementation Plan

---

## 1. Problem Statement

Luna English (cơ sở Tân Mai, ~95 HS, 9 lớp) đang gặp vấn đề nghiêm trọng trong quản lý học sinh tiềm năng:

- **Mất leads**: Leads từ Facebook/Zalo/walk-in bị bỏ quên, không ai follow up
- **Không trực quan hóa pipeline**: Không biết lead đang ở bước nào
- **Thiếu nhắc nhở tự động**: Không biết khi nào gọi lại, nhắc follow-up ai
- **Mất lịch sử tư vấn**: Tư vấn viên không nhớ hết lịch sử trao đổi với PH

**Hệ thống hiện tại:** Google Sheets (dữ liệu gốc) + EasyCheck (quản lý lớp/điểm danh). EasyCheck **không có** tính năng quản lý leads/pipeline tuyển sinh.

**Quy mô:** 20-50 leads/tháng, 3-5 người dùng (quản lý + tư vấn viên)

---

## 2. Approaches Evaluated

### A. SaaS CRM (Bitrix24 Free / HubSpot Free)
- **Pros:** Miễn phí, có sẵn, không cần dev
- **Cons:** UI phức tạp, không tích hợp Zalo OA, generic workflow, phụ thuộc vendor, data không sở hữu

### B. Custom Build (Next.js + Supabase) ✅ SELECTED
- **Pros:** Tùy biến 100%, tích hợp Zalo/FB, tiếng Việt, chi phí vận hành ~$0, sở hữu data
- **Cons:** Cần 4-8 tuần build, cần maintain

### C. Low-code (Airtable/Notion)
- **Pros:** Setup nhanh, UI đẹp
- **Cons:** Tiếng Anh, giới hạn free plan, khó tích hợp Zalo, chi phí tăng nhanh

**Decision:** Phương án B - Custom Build, vì đáp ứng đầy đủ yêu cầu tích hợp Zalo OA, pipeline custom theo quy trình Luna, chi phí vận hành thấp nhất.

---

## 3. Final Recommended Solution

### 3.1 Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Frontend** | Next.js 15 (App Router) | SSR/SSG, React ecosystem, deploy free Vercel |
| **UI** | shadcn/ui + Tailwind CSS | Component library, responsive, dark mode |
| **Database** | Supabase (PostgreSQL) | Free tier (500MB, 50k rows), Auth, Realtime, Edge Functions |
| **Auth** | Supabase Auth | Built-in, email/password, role-based |
| **Hosting** | Vercel (free tier) | Auto deploy, serverless, edge network |
| **Cron Jobs** | Supabase Edge Functions / Vercel Cron | Nhắc nhở tự động, báo cáo tuần |
| **Zalo OA** | Zalo OA API (REST) | Gửi tin nhắn tự động, nhận leads |
| **Facebook** | Facebook Webhook / Graph API | Nhận leads từ Facebook forms/inbox |

**Chi phí vận hành:** ~$0/tháng (free tier đủ cho quy mô Luna)

### 3.2 Pipeline Stages

Theo đúng quy trình tuyển sinh Luna English (ref: `quy_trinh_van_hanh_luna_english_tan_mai.md`):

```
Stage 1: MỚI TIẾP NHẬN      → Lead mới từ MKT/walk-in (SLA: liên hệ trong 2h)
                                Mời PH đưa con đến test đầu vào, thăm cơ sở, lớp học thực tế & nhận tư vấn
Stage 2: ĐÃ TƯ VẤN          → Đã gọi/nhắn tư vấn PH
Stage 3: ĐANG NURTURE        → PH chưa quyết định, follow-up 7 ngày/lần
Stage 4: ĐẶT LỊCH HỌC THỬ   → PH đồng ý, đã book 3 buổi trial
Stage 5: ĐANG HỌC THỬ       → HS đang học thử 3 buổi miễn phí
Stage 6: CHỜ CHỐT           → Học thử xong, follow-up 3 ngày chốt
Stage 7: ĐÃ ĐĂNG KÝ ✅      → PH đóng phí, nhập học thành công
Stage 8: MẤT LEAD ❌         → PH từ chối (ghi lý do để phân tích)
```

### 3.3 Core Features

#### Module 1: Lead Management & Pipeline
- Kanban board drag-n-drop theo 8 stages
- Thêm lead nhanh (tên PH, SĐT, nguồn, chương trình quan tâm)
- Ghi chú lịch sử tương tác (gọi, nhắn, gặp mặt)
- Assign lead cho tư vấn viên
- Filter/search theo: nguồn, chương trình, stage, ngày, người phụ trách

#### Module 2: Follow-up & Automation
- Nhắc nhở follow-up tự động (in-app notification + Zalo OA)
- SLA alerts: lead > 2h chưa liên hệ → cảnh báo đỏ
- Nurture auto-reminder: 7 ngày/lần cho leads đang nurture
- Nhắc chốt: 3 ngày sau học thử → nhắc tư vấn viên

#### Module 3: Retention Management
- Tracking HS đang học, ngày hết level
- Nhắc gia hạn trước 2 tuần khi gần hết level
- Quản lý HS bảo lưu / nghỉ tạm
- Referral tracking (mã giới thiệu PH)

#### Module 4: Dashboard & Reports
- Tổng leads theo tháng, theo nguồn (FB/Zalo/walk-in/website)
- Tỷ lệ chuyển đổi (conversion rate) theo stage
- Pipeline funnel visualization
- Revenue forecast (doanh thu dự kiến từ leads đang chốt)
- Báo cáo hiệu suất tư vấn viên
- So sánh CPL (cost per lead) giữa các kênh
- Báo cáo tự động gửi hàng tuần

#### Module 5: Integration
- **Facebook Lead Ads Webhook**: Auto-import leads từ FB forms
- **Zalo OA API**: Gửi tin nhắn tự động, nhận tin nhắn PH
- **EasyCheck**: Giữ song song, CRM đánh dấu "Đã nhập học" khi HS chuyển sang EasyCheck

### 3.4 User Roles

| Role | Quyền |
|------|-------|
| **Admin (QLCS/QLTTT)** | Toàn quyền, xem dashboard, quản lý users, cấu hình pipeline |
| **Tư vấn viên** | Thêm/sửa leads, ghi chú, kéo pipeline, xem leads được assign |
| **Marketing** | Xem dashboard, xem nguồn leads, không sửa leads |

### 3.5 Database Schema (Core)

```
leads
├── id, created_at, updated_at
├── student_name, student_dob, student_age
├── parent_name, parent_phone, parent_email, parent_address
├── source (facebook | zalo | walk_in | website | phone | referral)
├── referral_code (nullable)
├── program_interest (buttercup | primary_success | secondary | ielts)
├── current_stage (enum 8 stages)
├── assigned_to (user_id)
├── expected_class (nullable - lớp dự kiến xếp)
├── notes (text)
└── lost_reason (nullable - lý do mất lead)

lead_activities
├── id, lead_id, created_at
├── type (call | message | meeting | note | stage_change | trial_booked)
├── content (text)
├── created_by (user_id)
└── metadata (jsonb - stage from/to, etc.)

follow_up_reminders
├── id, lead_id, created_at
├── remind_at (timestamp)
├── type (follow_up | trial_reminder | close_reminder | renewal)
├── status (pending | done | skipped)
├── assigned_to (user_id)
└── note (text)

students (for retention tracking)
├── id, lead_id (link to original lead)
├── student_code (mã HS từ EasyCheck)
├── current_class, current_level
├── enrollment_date, level_end_date
├── status (active | paused | graduated | dropped)
└── renewal_status (pending | renewed | lost)

users
├── id, email, name, role (admin | advisor | marketing)
└── is_active
```

---

## 4. UI/UX Concept

### Main Views
1. **Kanban Board** (default): Kéo thả leads giữa các stages, nhìn toàn bộ pipeline
2. **List View**: Bảng danh sách leads với filter/sort/search
3. **Lead Detail**: Sidebar slide-out khi click lead → xem lịch sử, ghi chú, set reminder
4. **Dashboard**: Cards tổng quan + Charts (funnel, trend, source breakdown)
5. **Retention**: Danh sách HS đang học, sắp hết level, cần gia hạn

### Design
- Brand colors Luna English: tím #3E1A51, xanh dương #3FA5DC, xanh lá #00B273, vàng #FFC021, hồng #EC3563
- Clean, simple UI cho nhân viên non-tech
- Mobile responsive (nhân viên dùng điện thoại ghi lead tại chỗ)
- Tiếng Việt 100%

---

## 5. Implementation Considerations

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Zalo OA API giới hạn (cần OA verified) | Không gửi tin nhắn tự động | Register OA trước, test API sớm. Fallback: chỉ nhắc nhở in-app |
| Facebook API thay đổi | Import leads bị gián đoạn | Giữ manual import option song song |
| Supabase free tier hết quota | App chậm/down | Monitor usage, upgrade khi cần ($25/tháng) |
| Nhân viên không quen dùng | Adoption thấp | UI đơn giản, training 1 buổi, hỗ trợ 2 tuần đầu |
| Data migration từ Google Sheets | Mất dữ liệu cũ | Import tool CSV → DB, verify trước khi go-live |

### Security
- Supabase Auth + Row Level Security (RLS) cho multi-user access
- HTTPS everywhere (Vercel default)
- Không lưu token/API key ở client
- PII data (SĐT, email PH) encrypted at rest (Supabase default)

---

## 6. Success Metrics

| Metric | Trước CRM | Mục tiêu sau 3 tháng |
|--------|----------|----------------------|
| Leads bị sót (không follow-up) | ~30-40% | **< 5%** |
| Thời gian liên hệ lead mới | Không track | **< 2h** |
| Tỷ lệ chuyển đổi (lead → đăng ký) | ~20% (ước) | **≥ 30%** |
| Retention rate (tái đăng ký level) | Không track | **≥ 85%** |
| Thời gian tạo báo cáo tuần | 2-3h thủ công | **Tự động** |

---

## 7. Next Steps

1. ✅ Brainstorm & chọn phương án — **Done**
2. ⏳ Tạo implementation plan chi tiết (phases, tasks, timeline)
3. ⏳ Design database schema chi tiết
4. ⏳ UI/UX wireframe
5. ⏳ Setup project (Next.js + Supabase)
6. ⏳ Build MVP (Pipeline + Lead Management)
7. ⏳ Add automation (follow-up reminders)
8. ⏳ Add dashboard
9. ⏳ Tích hợp Zalo OA + Facebook
10. ⏳ Testing & deploy
11. ⏳ Training & go-live

---

> **Kết luận:** Custom-build CRM với Next.js + Supabase là lựa chọn tối ưu cho Luna English. Chi phí vận hành gần $0/tháng, tùy biến 100% theo quy trình tuyển sinh, tích hợp Zalo OA + Facebook, và đặc biệt giải quyết triệt để 4 pain points: không sót leads, pipeline trực quan, nhắc nhở tự động, lưu trọn lịch sử tư vấn.
