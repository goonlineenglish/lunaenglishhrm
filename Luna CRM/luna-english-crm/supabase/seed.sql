-- ============================================================================
-- Seed Data for Luna English CRM
-- ============================================================================
-- NOTE: This seed file is for local development only.
-- User IDs here are placeholders — in production, users are created via
-- Supabase Auth and the handle_new_user() trigger auto-creates public.users rows.
-- ============================================================================

-- Create sample users via auth.users (triggers handle_new_user)
-- In local dev, use Supabase Dashboard or supabase auth to create users.
-- The UUIDs below are for referencing in seed data only.

-- Sample lead data across all pipeline stages
INSERT INTO public.leads (student_name, student_dob, parent_name, parent_phone, parent_email, parent_address, source, program_interest, current_stage, notes) VALUES
  ('Nguyễn Minh Anh', '2018-03-15', 'Nguyễn Văn Hùng', '0912345678', 'hung.nguyen@email.com', '12 Tân Mai, Hoàng Mai, HN', 'facebook', 'buttercup', 'moi_tiep_nhan', 'PH quan tâm lớp Buttercup cho bé 8 tuổi'),
  ('Trần Bảo Ngọc', '2016-07-22', 'Trần Thị Lan', '0923456789', NULL, '45 Giáp Bát, Hoàng Mai, HN', 'zalo', 'primary_success', 'da_tu_van', 'Đã tư vấn qua Zalo, PH muốn biết thêm về lịch học'),
  ('Lê Hoàng Nam', '2017-11-01', 'Lê Thị Hoa', '0934567890', 'hoa.le@email.com', '78 Lĩnh Nam, Hoàng Mai, HN', 'walk_in', 'primary_success', 'dang_nurture', 'PH đến cơ sở hỏi thăm, chưa quyết định'),
  ('Phạm Thu Hà', '2015-05-10', 'Phạm Văn Đức', '0945678901', NULL, '23 Định Công, Hoàng Mai, HN', 'phone', 'secondary', 'dat_lich_hoc_thu', 'Đã book 3 buổi trial từ 25/02'),
  ('Hoàng Gia Bảo', '2019-01-20', 'Hoàng Thị Mai', '0956789012', 'mai.hoang@email.com', '56 Tương Mai, Hai Bà Trưng, HN', 'referral', 'buttercup', 'dang_hoc_thu', 'Được giới thiệu bởi PH Nguyễn Văn An. Bé đang học thử buổi 2/3'),
  ('Vũ Đức Minh', '2014-09-30', 'Vũ Thị Ngọc', '0967890123', NULL, '34 Mai Động, Hoàng Mai, HN', 'website', 'ielts', 'cho_chot', 'Học thử xong, PH đang cân nhắc học phí'),
  ('Đỗ Khánh Linh', '2018-12-05', 'Đỗ Văn Thắng', '0978901234', 'thang.do@email.com', '67 Trương Định, Hai Bà Trưng, HN', 'facebook', 'buttercup', 'da_dang_ky', 'Đã đóng phí khóa Buttercup, bắt đầu từ 01/03'),
  ('Bùi Thanh Tùng', '2016-04-18', 'Bùi Thị Hạnh', '0989012345', NULL, '89 Giải Phóng, Đống Đa, HN', 'zalo', 'primary_success', 'da_dang_ky', 'Đăng ký thành công, lớp Primary Success T4-T7'),
  ('Ngô Quang Huy', '2017-08-25', 'Ngô Văn Phong', '0990123456', 'phong.ngo@email.com', '12 Bạch Mai, Hai Bà Trưng, HN', 'walk_in', 'secondary', 'mat_lead', 'PH chọn trung tâm khác gần nhà hơn'),
  ('Đinh Phương Anh', '2015-02-14', 'Đinh Thị Tuyết', '0901234567', NULL, '45 Kim Ngưu, Hai Bà Trưng, HN', 'phone', 'ielts', 'mat_lead', 'PH thấy học phí cao, sẽ cân nhắc sau');
