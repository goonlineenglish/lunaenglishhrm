# Brainstorm: Hồ Sơ Giáo Viên & Hệ Thống Đánh Giá Nhân Viên

> Date: 2026-03-06
> Status: Agreed — Ready for planning

---

## Problem Statement

Luna HRM hiện tại:
- Bảng `employees` chỉ lưu thông tin cơ bản (tên, email, phone, rate, position)
- KPI chỉ dành cho TG (5 tiêu chí cứng, link payroll bonus)
- Bảng `evaluations` quá đơn giản (overall_score 1-5 + notes), chưa sử dụng
- Không có hồ sơ chi tiết: thiếu CCCD, bằng cấp, ngân hàng, đặc tính NV
- Không có hệ thống đánh giá cuối kì cho GV/VP
- BM không có chỗ ghi nhận xét nhanh cho NV bất kì lúc nào

## Requirements (Confirmed)

1. **Hồ sơ NV mở rộng**: CCCD, ngày sinh, địa chỉ, người liên hệ khẩn cấp, tài khoản ngân hàng, bằng cấp/chứng chỉ, ngày bắt đầu, đặc tính NV
2. **Giữ nguyên KPI TG** (`kpi_evaluations`) — không thay đổi
3. **Xóa bảng `evaluations`** — thay bằng hệ thống mới
4. **Template-based evaluation**: Admin tạo bộ tiêu chí, BM chấm điểm từng tiêu chí
5. **Admin tùy chỉnh kì đánh giá**: tạo periods tùy ý (kì 1, kì 2, quý...)
6. **BM đánh giá bất kì lúc nào**: ad-hoc notes + full evaluation
7. **Ảnh hưởng**: HR records + lương/thưởng + tracking lịch sử

---

## Evaluated Approaches

### Option A: Template-Based Evaluation ✅ CHOSEN
- Admin tạo templates (bộ tiêu chí) cho từng role
- BM chấm điểm từng criterion khi đánh giá
- 5 bảng mới, thay thế `evaluations`
- Pros: Linh hoạt, admin tự tạo/sửa tiêu chí, structured data dễ thống kê
- Cons: 5 bảng mới, DB phức tạp hơn

### Option B: Extend evaluations (rejected)
- Giữ evaluations, thêm JSONB cho category scores
- Pros: Đơn giản, 1 bảng mới
- Cons: JSONB không type-safe, khó query thống kê, không linh hoạt tiêu chí

---

## Final Solution

### Part 1: Mở rộng `employees` — Hồ sơ NV

Thêm fields vào bảng `employees`:

```sql
-- Thông tin cá nhân mở rộng
date_of_birth       DATE
id_number           TEXT        -- CCCD/CMND/Passport
id_issue_date       DATE
id_issue_place      TEXT
address             TEXT
emergency_contact   TEXT        -- Tên + SĐT người liên hệ khẩn cấp
bank_account_number TEXT
bank_name           TEXT
nationality         TEXT        -- Quan trọng cho GV nước ngoài

-- Bằng cấp & chứng chỉ
qualifications      TEXT        -- VD: "IELTS 8.0, CELTA, TESOL"
teaching_license    TEXT        -- Số giấy phép dạy (nếu có)

-- Đặc tính nhân sự
characteristics     TEXT        -- BM nhập: "Chăm chỉ, hay trễ deadline", "Tốt với trẻ em"

-- join_date đã có sẵn (ngày bắt đầu làm việc)
```

**Quyết định thiết kế:**
- Dùng TEXT đơn giản cho qualifications/characteristics — không cần JSONB vì đây là ghi chú, không query theo
- Không tách bảng riêng cho bằng cấp (YAGNI — trung tâm tiếng Anh nhỏ, 10-30 NV)
- join_date đã có, không cần thêm

### Part 2: Hệ thống đánh giá Template-Based (5 bảng mới, thay evaluations)

```
evaluation_templates          — Bộ tiêu chí (Admin tạo)
├── id: UUID PK
├── name: TEXT                — VD: "Đánh giá GV cuối kì", "Đánh giá VP quý"
├── applies_to: TEXT          — 'teacher' | 'assistant' | 'office' | 'all'
├── max_total_score: INT      — Tổng điểm tối đa (VD: 50, 100)
├── is_active: BOOLEAN        — Có đang sử dụng không
├── created_by: FK employees
├── created_at, updated_at

evaluation_criteria           — Tiêu chí trong template (N per template)
├── id: UUID PK
├── template_id: FK evaluation_templates
├── name: TEXT                — VD: "Kỹ năng giảng dạy"
├── description: TEXT         — Mô tả chi tiết tiêu chí
├── max_score: INT            — Điểm tối đa (VD: 10, 20)
├── weight: NUMERIC           — Trọng số (mặc định 1.0)
├── sort_order: INT           — Thứ tự hiển thị
├── created_at

evaluation_periods            — Kì đánh giá (Admin tạo)
├── id: UUID PK
├── name: TEXT                — VD: "Kì 1/2026", "Quý 2/2026"
├── start_date: DATE
├── end_date: DATE
├── status: TEXT              — 'open' | 'closed'
├── created_by: FK employees
├── created_at

employee_evaluations          — Bài đánh giá (BM tạo khi đánh giá NV)
├── id: UUID PK
├── employee_id: FK employees
├── evaluator_id: FK employees    — BM / Admin
├── template_id: FK evaluation_templates
├── period_id: FK evaluation_periods (nullable — null = ad-hoc)
├── eval_type: TEXT               — 'periodic' | 'ad_hoc'
├── total_score: NUMERIC          — Computed sum
├── overall_notes: TEXT           — Nhận xét tổng quan
├── bonus_impact: BIGINT          — Ảnh hưởng thưởng (nullable, VND)
├── status: TEXT                  — 'draft' | 'confirmed'
├── created_at, updated_at

evaluation_scores             — Điểm từng tiêu chí (N per evaluation)
├── id: UUID PK
├── evaluation_id: FK employee_evaluations
├── criterion_id: FK evaluation_criteria
├── score: NUMERIC
├── comment: TEXT             — Nhận xét cho tiêu chí này
├── created_at
```

### Part 3: Ad-hoc Notes (BM ghi nhận xét nhanh bất kì lúc nào)

Thêm bảng nhẹ cho quick notes (không cần template/criteria):

```
employee_notes                — Ghi chú nhanh (BM ghi bất kì lúc nào)
├── id: UUID PK
├── employee_id: FK employees
├── author_id: FK employees   — BM / Admin
├── note_type: TEXT           — 'praise' | 'warning' | 'observation' | 'general'
├── content: TEXT             — Nội dung ghi chú
├── created_at
```

**Lý do tách riêng**: Ad-hoc notes khác bản chất so với structured evaluation. Notes = nhẹ, nhanh, không cần template. Evaluations = structured, chấm điểm, theo kì.

### Tổng kết: Thay đổi Schema

| Hành động | Bảng | Ghi chú |
|-----------|------|---------|
| MODIFY | `employees` | +10 fields (CCCD, DOB, ngân hàng, bằng cấp, đặc tính...) |
| DELETE | `evaluations` | Thay bằng employee_evaluations mới |
| NEW | `evaluation_templates` | Bộ tiêu chí (Admin tạo) |
| NEW | `evaluation_criteria` | Tiêu chí chi tiết (N per template) |
| NEW | `evaluation_periods` | Kì đánh giá (Admin tạo) |
| NEW | `employee_evaluations` | Bài đánh giá (BM tạo) |
| NEW | `evaluation_scores` | Điểm từng tiêu chí |
| NEW | `employee_notes` | Ghi chú nhanh ad-hoc |
| KEEP | `kpi_evaluations` | Giữ nguyên — KPI TG link payroll |

**Tổng DB: 10 → 15 bảng** (-1 evaluations +6 mới)

---

## Workflow: Ai làm gì?

### Admin
1. Tạo `evaluation_templates` (VD: "GV Cuối Kì" với 5 tiêu chí)
2. Tạo `evaluation_periods` (VD: "Kì 1/2026" từ T1-T6)
3. Quản lý bộ tiêu chí: thêm/sửa/tắt template

### Branch Manager (BM)
1. **Đánh giá theo kì**: Chọn NV → chọn template → chấm điểm từng tiêu chí → nhận xét → lưu
2. **Ghi chú nhanh**: Profile NV → thêm note (praise/warning/observation)
3. **Đánh giá ad-hoc**: Full evaluation không gắn kì (period_id = null)
4. Xem lịch sử đánh giá + notes của NV trong profile

### Accountant
- Xem evaluations để biết bonus_impact (nếu có)
- Đưa bonus_impact vào payslip khi tính lương

### Employee
- Xem đánh giá của mình (read-only)
- Xem lịch sử KPI TG (như hiện tại)

---

## RLS Policies (Mới)

```
evaluation_templates    │ CRUD (admin)      │ SELECT (BM)       │ SELECT (accountant) │ none (employee)
evaluation_criteria     │ CRUD (admin)      │ SELECT (BM)       │ SELECT (accountant) │ none
evaluation_periods      │ CRUD (admin)      │ SELECT (BM)       │ SELECT (accountant) │ none
employee_evaluations    │ ALL (admin)       │ CRUD own branch   │ SELECT (all)        │ SELECT (own)
evaluation_scores       │ ALL (admin)       │ CRUD own branch   │ SELECT (all)        │ SELECT (own)
employee_notes          │ ALL (admin)       │ CRUD own branch   │ SELECT (all)        │ none
```

---

## UI Screens (Dự kiến)

### Desktop — Admin
1. **Quản lý Templates**: List templates, tạo/sửa template, thêm criteria
2. **Quản lý Periods**: Tạo kì đánh giá, đóng/mở kì

### Desktop — BM
3. **Profile NV** (mở rộng): Tab thông tin cá nhân + Tab lịch sử đánh giá + Tab ghi chú
4. **Form đánh giá**: Chọn NV + template → chấm điểm từng tiêu chí
5. **Bảng tổng hợp đánh giá**: Danh sách NV + điểm đánh giá theo kì

### Mobile — Employee
6. **Xem đánh giá của mình**: List evaluations theo kì + detail

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| 15 bảng phức tạp cho MVP | Medium | KPI TG giữ nguyên, evaluation system là phase riêng |
| BM quên đánh giá đúng kì | Low | Reminder notification khi kì sắp đóng |
| Template thay đổi giữa kì | Medium | Snapshot template_id + criteria tại thời điểm đánh giá |
| bonus_impact chồng chéo với KPI TG | High | Rõ ràng: KPI TG = hàng tháng, evaluation bonus = cuối kì. Không gộp. |

---

## Success Criteria

- [ ] Admin tạo được template với N tiêu chí
- [ ] Admin tạo được evaluation period
- [ ] BM đánh giá NV theo template, chấm từng criterion
- [ ] BM ghi ad-hoc notes bất kì lúc nào
- [ ] Profile NV hiển thị lịch sử đánh giá + notes
- [ ] Employee xem được đánh giá của mình
- [ ] bonus_impact đưa vào payslip

---

## Dependencies & Next Steps

1. Quyết định: nên làm phase này trước hay sau Phase 1-6 (DB+Auth, Attendance, Payroll, KPI, Employee Portal, Polish)?
2. Thiết kế bộ tiêu chí mẫu cho GV và VP
3. Xác định bonus_impact flow → link vào payslip thế nào (cột riêng? field mới trong payslips?)

---

*Brainstorm concluded: 2026-03-06 | Participants: User + Claude*
