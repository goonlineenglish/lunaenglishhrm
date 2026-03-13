-- ============================================================
-- Luna HRM — Seed Data
-- Realistic data for 2 branches: CS Tân Mai + CS Quận 1
-- ============================================================
-- NOTE: auth.users accounts must be created separately via Supabase Admin API.
-- Use the service role key (server-side only) to call:
--   supabase.auth.admin.createUser({ email, password, app_metadata: { role, branch_id } })
-- Then insert an employees row with id = the returned auth user UUID.
--
-- The UUIDs below are pre-generated to match between auth.users and employees.
-- When running this seed, first create auth users with these exact UUIDs via Admin API,
-- then run this SQL to populate employees and all other tables.
-- ============================================================

-- ============================================================
-- BRANCHES (must be inserted before employees)
-- manager_id left NULL initially; updated after employees inserted
-- ============================================================
INSERT INTO branches (id, name, address, phone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'CS Tân Mai',  '123 Tân Mai, Hoàng Mai, Hà Nội',   '024-3868-0001'),
  ('00000000-0000-0000-0000-000000000002', 'CS Quận 1',   '456 Nguyễn Huệ, Quận 1, TP.HCM',   '028-3824-0002');

-- ============================================================
-- EMPLOYEES
-- Roles: admin(1), branch_manager(2), accountant(1)
-- Teachers: 6 (4 foreign, 2 Vietnamese)
-- Assistants: 8
-- Office staff: 3
-- Total: 20 employees
-- ============================================================

-- Admin (global)
INSERT INTO employees
  (id, branch_id, employee_code, full_name, email, phone, position, role,
   rate_per_session, sub_rate, has_labor_contract, dependent_count, is_active, join_date, nationality)
VALUES
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'ADMIN01', 'Quản Trị Hệ Thống', 'admin@luna-hrm.local', '0900000001',
   'admin', 'admin', 0, 0, false, 0, true, '2026-01-01', 'Việt Nam');

-- Branch Managers
INSERT INTO employees
  (id, branch_id, employee_code, full_name, email, phone, position, role,
   rate_per_session, sub_rate, has_labor_contract, dependent_count, is_active, join_date, nationality)
VALUES
  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'BM-TM01', 'Nguyễn Thị Minh', 'bm.tanmai@luna-hrm.local', '0901234001',
   'office', 'branch_manager', 150000, 0, true, 1, true, '2025-03-01', 'Việt Nam'),

  ('10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'BM-Q101', 'Trần Văn Hùng', 'bm.quan1@luna-hrm.local', '0901234002',
   'office', 'branch_manager', 150000, 0, true, 2, true, '2025-04-01', 'Việt Nam');

-- Accountant (global, works across branches)
INSERT INTO employees
  (id, branch_id, employee_code, full_name, email, phone, position, role,
   rate_per_session, sub_rate, has_labor_contract, dependent_count, is_active, join_date, nationality)
VALUES
  ('10000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'ACC01', 'Phạm Thị Lan', 'accountant@luna-hrm.local', '0901234003',
   'office', 'accountant', 150000, 0, true, 0, true, '2025-05-01', 'Việt Nam');

-- ============================================================
-- TEACHERS — CS Tân Mai (3 foreign + 1 Vietnamese)
-- ============================================================
INSERT INTO employees
  (id, branch_id, employee_code, full_name, email, phone, position, role,
   rate_per_session, sub_rate, has_labor_contract, dependent_count, is_active, join_date,
   nationality, qualifications, teaching_license)
VALUES
  ('10000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   'T-TM01', 'John Smith', 'john.smith@luna-hrm.local', '0901234011',
   'teacher', 'employee', 500000, 300000, true, 0, true, '2025-06-01',
   'Mỹ', 'TESOL, CELTA, IELTS 9.0', 'VN-ENG-2025-001'),

  ('10000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000001',
   'T-TM02', 'Sarah Johnson', 'sarah.johnson@luna-hrm.local', '0901234012',
   'teacher', 'employee', 480000, 280000, true, 0, true, '2025-07-15',
   'Anh', 'DELTA, IELTS 8.5', 'VN-ENG-2025-002'),

  ('10000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000001',
   'T-TM03', 'Michael Brown', 'michael.brown@luna-hrm.local', '0901234013',
   'teacher', 'employee', 450000, 270000, false, 1, true, '2025-09-01',
   'Canada', 'CELTA, B.Ed', 'VN-ENG-2025-003'),

  ('10000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000001',
   'T-TM04', 'Lê Thị Hoa', 'le.hoa@luna-hrm.local', '0901234014',
   'teacher', 'employee', 350000, 200000, true, 2, true, '2024-08-01',
   'Việt Nam', 'Thạc sĩ Ngôn ngữ Anh, IELTS 8.0', NULL);

-- ============================================================
-- TEACHERS — CS Quận 1 (1 foreign + 1 Vietnamese)
-- ============================================================
INSERT INTO employees
  (id, branch_id, employee_code, full_name, email, phone, position, role,
   rate_per_session, sub_rate, has_labor_contract, dependent_count, is_active, join_date,
   nationality, qualifications, teaching_license)
VALUES
  ('10000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000002',
   'T-Q101', 'Emily Davis', 'emily.davis@luna-hrm.local', '0901234021',
   'teacher', 'employee', 500000, 300000, true, 0, true, '2025-01-15',
   'Úc', 'TESOL, M.Ed, IELTS 9.0', 'VN-ENG-2025-004'),

  ('10000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000002',
   'T-Q102', 'Đỗ Minh Tuấn', 'do.tuan@luna-hrm.local', '0901234022',
   'teacher', 'employee', 320000, 190000, true, 1, true, '2024-11-01',
   'Việt Nam', 'Cử nhân Sư phạm Anh, IELTS 7.5', NULL);

-- ============================================================
-- TEACHING ASSISTANTS — CS Tân Mai (5 assistants)
-- rate_per_session fixed 75k for assistants, sub_rate 40k
-- ============================================================
INSERT INTO employees
  (id, branch_id, employee_code, full_name, email, phone, position, role,
   rate_per_session, sub_rate, has_labor_contract, dependent_count, is_active, join_date, nationality)
VALUES
  ('10000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'A-TM01', 'Trần Thị Linh', 'tran.linh@luna-hrm.local', '0901234031',
   'assistant', 'employee', 75000, 40000, false, 0, true, '2025-08-01', 'Việt Nam'),

  ('10000000-0000-0000-0000-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'A-TM02', 'Nguyễn Thị Hương', 'nguyen.huong@luna-hrm.local', '0901234032',
   'assistant', 'employee', 75000, 40000, false, 0, true, '2025-09-15', 'Việt Nam'),

  ('10000000-0000-0000-0000-000000000013',
   '00000000-0000-0000-0000-000000000001',
   'A-TM03', 'Lê Thị Hoài Tú', 'le.tu@luna-hrm.local', '0901234033',
   'assistant', 'employee', 75000, 40000, false, 1, true, '2025-10-01', 'Việt Nam'),

  ('10000000-0000-0000-0000-000000000014',
   '00000000-0000-0000-0000-000000000001',
   'A-TM04', 'Phạm Hoàng Nam', 'pham.nam@luna-hrm.local', '0901234034',
   'assistant', 'employee', 75000, 40000, false, 0, true, '2025-11-01', 'Việt Nam'),

  ('10000000-0000-0000-0000-000000000015',
   '00000000-0000-0000-0000-000000000001',
   'A-TM05', 'Vũ Thị An', 'vu.an@luna-hrm.local', '0901234035',
   'assistant', 'employee', 75000, 40000, false, 0, true, '2025-12-01', 'Việt Nam');

-- ============================================================
-- TEACHING ASSISTANTS — CS Quận 1 (3 assistants)
-- ============================================================
INSERT INTO employees
  (id, branch_id, employee_code, full_name, email, phone, position, role,
   rate_per_session, sub_rate, has_labor_contract, dependent_count, is_active, join_date, nationality)
VALUES
  ('10000000-0000-0000-0000-000000000016',
   '00000000-0000-0000-0000-000000000002',
   'A-Q101', 'Hoàng Thị Mai', 'hoang.mai@luna-hrm.local', '0901234041',
   'assistant', 'employee', 75000, 40000, false, 0, true, '2025-06-01', 'Việt Nam'),

  ('10000000-0000-0000-0000-000000000017',
   '00000000-0000-0000-0000-000000000002',
   'A-Q102', 'Bùi Thị Dung', 'bui.dung@luna-hrm.local', '0901234042',
   'assistant', 'employee', 75000, 40000, false, 0, true, '2025-07-01', 'Việt Nam'),

  ('10000000-0000-0000-0000-000000000018',
   '00000000-0000-0000-0000-000000000002',
   'A-Q103', 'Đặng Văn Kiên', 'dang.kien@luna-hrm.local', '0901234043',
   'assistant', 'employee', 75000, 40000, false, 0, true, '2025-08-15', 'Việt Nam');

-- ============================================================
-- OFFICE STAFF — 2 at CS Tân Mai, 1 at CS Quận 1
-- ============================================================
INSERT INTO employees
  (id, branch_id, employee_code, full_name, email, phone, position, role,
   rate_per_session, sub_rate, has_labor_contract, dependent_count, is_active, join_date, nationality)
VALUES
  ('10000000-0000-0000-0000-000000000019',
   '00000000-0000-0000-0000-000000000001',
   'O-TM01', 'Lê Thị Ngân', 'le.ngan@luna-hrm.local', '0901234051',
   'office', 'employee', 150000, 0, true, 1, true, '2025-01-15', 'Việt Nam'),

  ('10000000-0000-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000001',
   'O-TM02', 'Trương Văn Bảo', 'truong.bao@luna-hrm.local', '0901234052',
   'office', 'employee', 120000, 0, false, 0, true, '2025-03-01', 'Việt Nam'),

  ('10000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000002',
   'O-Q101', 'Võ Thị Thảo', 'vo.thao@luna-hrm.local', '0901234053',
   'office', 'employee', 150000, 0, true, 0, true, '2025-02-01', 'Việt Nam');

-- ============================================================
-- UPDATE branches.manager_id now that employees exist
-- ============================================================
UPDATE branches SET manager_id = '10000000-0000-0000-0000-000000000002'
  WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE branches SET manager_id = '10000000-0000-0000-0000-000000000003'
  WHERE id = '00000000-0000-0000-0000-000000000002';

-- ============================================================
-- CLASS SCHEDULES — 5 per branch = 10 total
-- days_of_week: 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
-- ============================================================

-- CS Tân Mai classes
INSERT INTO class_schedules
  (id, branch_id, class_code, class_name, shift_time, days_of_week, teacher_id, assistant_id, status)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'TM-IELTS-A1', 'IELTS 6.5 - A1', '17:15-19:15',
   ARRAY[2,4,6],
   '10000000-0000-0000-0000-000000000005',  -- John Smith
   '10000000-0000-0000-0000-000000000011',  -- Trần Linh
   'active'),

  ('20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'TM-IELTS-B1', 'IELTS 7.0 - B1', '19:30-21:30',
   ARRAY[2,4,6],
   '10000000-0000-0000-0000-000000000006',  -- Sarah Johnson
   '10000000-0000-0000-0000-000000000012',  -- Nguyễn Hương
   'active'),

  ('20000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'TM-KIDS-C1', 'Kids English 1 - C1', '15:00-16:30',
   ARRAY[3,5,7],
   '10000000-0000-0000-0000-000000000007',  -- Michael Brown
   '10000000-0000-0000-0000-000000000013',  -- Lê Tú
   'active'),

  ('20000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'TM-COMM-D1', 'Giao tiếp Căn Bản - D1', '17:15-19:15',
   ARRAY[3,5],
   '10000000-0000-0000-0000-000000000008',  -- Lê Hoa
   '10000000-0000-0000-0000-000000000014',  -- Phạm Nam
   'active'),

  ('20000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000001',
   'TM-BUS-E1', 'Business English - E1', '19:30-21:30',
   ARRAY[3,5,7],
   '10000000-0000-0000-0000-000000000005',  -- John Smith (2nd class)
   '10000000-0000-0000-0000-000000000015',  -- Vũ An
   'active');

-- CS Quận 1 classes
INSERT INTO class_schedules
  (id, branch_id, class_code, class_name, shift_time, days_of_week, teacher_id, assistant_id, status)
VALUES
  ('20000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000002',
   'Q1-IELTS-A1', 'IELTS 6.5 - A1', '17:00-19:00',
   ARRAY[2,4,6],
   '10000000-0000-0000-0000-000000000009',  -- Emily Davis
   '10000000-0000-0000-0000-000000000016',  -- Hoàng Mai
   'active'),

  ('20000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000002',
   'Q1-IELTS-B2', 'IELTS 7.5 - B2', '19:15-21:15',
   ARRAY[2,4,6],
   '10000000-0000-0000-0000-000000000009',  -- Emily Davis (2nd class)
   '10000000-0000-0000-0000-000000000017',  -- Bùi Dung
   'active'),

  ('20000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000002',
   'Q1-KIDS-C1', 'Kids English 1 - C1', '15:30-17:00',
   ARRAY[3,5,7],
   '10000000-0000-0000-0000-000000000010',  -- Đỗ Tuấn
   '10000000-0000-0000-0000-000000000018',  -- Đặng Kiên
   'active'),

  ('20000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000002',
   'Q1-COMM-D2', 'Giao tiếp Trung Cấp - D2', '17:00-19:00',
   ARRAY[3,5],
   '10000000-0000-0000-0000-000000000010',  -- Đỗ Tuấn (2nd class)
   '10000000-0000-0000-0000-000000000016',  -- Hoàng Mai (2nd class)
   'active'),

  ('20000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000002',
   'Q1-TEEN-F1', 'Teen English - F1', '09:00-11:00',
   ARRAY[7],
   '10000000-0000-0000-0000-000000000009',  -- Emily Davis (3rd class, weekend)
   '10000000-0000-0000-0000-000000000018',  -- Đặng Kiên (2nd class)
   'active');

-- ============================================================
-- SALARY COMPONENTS — recurring allowances for contracted staff
-- ============================================================
INSERT INTO salary_components
  (employee_id, component_type, name, amount, is_recurring)
VALUES
  ('10000000-0000-0000-0000-000000000002', 'allowance', 'Phụ cấp xăng xe',    300000, true),
  ('10000000-0000-0000-0000-000000000003', 'allowance', 'Phụ cấp xăng xe',    300000, true),
  ('10000000-0000-0000-0000-000000000004', 'allowance', 'Phụ cấp điện thoại', 200000, true),
  ('10000000-0000-0000-0000-000000000005', 'allowance', 'Phụ cấp ăn trưa',   150000, true),
  ('10000000-0000-0000-0000-000000000006', 'allowance', 'Phụ cấp ăn trưa',   150000, true),
  ('10000000-0000-0000-0000-000000000019', 'allowance', 'Phụ cấp xăng xe',   200000, true),
  ('10000000-0000-0000-0000-000000000021', 'allowance', 'Phụ cấp xăng xe',   200000, true);

-- ============================================================
-- EVALUATION TEMPLATE — standard teacher/assistant template
-- ============================================================
INSERT INTO evaluation_templates
  (id, name, applies_to, max_total_score, is_active, created_by)
VALUES
  ('30000000-0000-0000-0000-000000000001',
   'Đánh giá GV & TG cuối kì', 'all', 50, true,
   '10000000-0000-0000-0000-000000000001');

INSERT INTO evaluation_criteria
  (template_id, name, description, max_score, weight, sort_order)
VALUES
  ('30000000-0000-0000-0000-000000000001',
   'Kỹ năng giảng dạy', 'Phương pháp giảng dạy, giải thích rõ ràng, tương tác học sinh', 15, 1.0, 1),

  ('30000000-0000-0000-0000-000000000001',
   'Chuẩn bị bài giảng', 'Giáo án đầy đủ, tài liệu hỗ trợ, kế hoạch bài học', 10, 1.0, 2),

  ('30000000-0000-0000-0000-000000000001',
   'Quản lý lớp học', 'Duy trì kỷ luật, tạo môi trường học tích cực', 10, 1.0, 3),

  ('30000000-0000-0000-0000-000000000001',
   'Tương tác phụ huynh', 'Phản hồi kịp thời, báo cáo tiến độ học sinh', 10, 1.0, 4),

  ('30000000-0000-0000-0000-000000000001',
   'Tác phong & Kỷ luật', 'Đúng giờ, trang phục chuyên nghiệp, tuân thủ nội quy', 5, 1.0, 5);

-- ============================================================
-- EVALUATION PERIOD — Kì 1/2026
-- ============================================================
INSERT INTO evaluation_periods
  (id, name, start_date, end_date, status, created_by)
VALUES
  ('40000000-0000-0000-0000-000000000001',
   'Kì 1/2026', '2026-01-01', '2026-06-30', 'open',
   '10000000-0000-0000-0000-000000000001');
