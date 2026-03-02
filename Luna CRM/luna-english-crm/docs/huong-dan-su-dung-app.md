# Hướng Dẫn Sử Dụng Luna English CRM

> Tài liệu dành cho nhân viên Luna English (Tân Mai). Viết dễ hiểu, không cần biết IT.

---

## Giới thiệu nhanh

Luna CRM là phần mềm quản lý học viên từ lúc **tiếp nhận liên hệ** đến khi **đăng ký thành công** và theo dõi quá trình học. Toàn bộ giao diện bằng **tiếng Việt**.

**3 loại tài khoản:**

| Vai trò | Thấy gì | Làm gì |
|---------|---------|--------|
| **Quản lý** (Admin) | Tất cả | Toàn quyền: leads, học viên, báo cáo, cài đặt, phân quyền |
| **Tư vấn viên** (Advisor) | Pipeline, Nhắc nhở, Hoạt động, Học viên | Chăm sóc lead được giao, tạo nhắc nhở, ghi chú |
| **Marketing** | Pipeline (xem), Báo cáo | Chỉ xem, không sửa được lead |

---

## Menu chính (thanh bên trái)

| Menu | Mô tả | Ai thấy |
|------|-------|---------|
| **Pipeline** | Bảng Kanban quản lý lead qua các giai đoạn | Tất cả |
| **Leads** | Vào thẳng Pipeline | Admin, Tư vấn |
| **Nhắc nhở** | Lịch nhắc follow-up, học thử, chốt đơn | Admin, Tư vấn |
| **Hoạt động** | Lịch hẹn, cuộc gọi đã lên kế hoạch | Admin, Tư vấn |
| **Học viên** | Danh sách học sinh đã đăng ký | Admin, Tư vấn |
| **Báo cáo** | Biểu đồ, KPI, hiệu suất tư vấn | Admin, Marketing |
| **Cài đặt** | Kết nối Zalo/Facebook, webhook | Chỉ Admin |

---

## CHỨC NĂNG 1 — Pipeline (Bảng Kanban)

Đây là màn hình chính, nơi bạn theo dõi mọi lead.

### Các cột (giai đoạn) của Pipeline

| Cột | Ý nghĩa | Khi nào lead ở đây |
|-----|---------|-------------------|
| **Mới tiếp nhận** | Vừa có liên hệ mới | Lead mới tạo hoặc từ Facebook/Zalo vào |
| **Đã tư vấn** | Đã gọi/nhắn tin lần đầu | Sau khi tư vấn viên liên hệ xong |
| **Đang nurture** | Đang chăm sóc, chưa quyết định | Phụ huynh cần thời gian suy nghĩ |
| **Đặt lịch học thử** | Đã hẹn ngày học thử | Phụ huynh đồng ý cho con thử |
| **Đang học thử** | Con đang học thử | Trong tuần học thử |
| **Chờ chốt** | Chờ phụ huynh quyết định đăng ký | Sau học thử, đang thương lượng |
| **Đã đăng ký** | Thành công! Đã đóng tiền | Chuyển thành học viên chính thức |
| **Mất lead** | Không đăng ký | Phụ huynh từ chối, mất liên lạc |

### Cách dùng Pipeline

**Kéo thả lead giữa các cột:**
- Bấm giữ vào thẻ lead → kéo sang cột mới → thả ra
- Hệ thống tự ghi lại lịch sử "Chuyển từ [cột cũ] sang [cột mới]"
- Nếu kéo vào "Mất lead" → hệ thống hỏi lý do

**Lọc lead:**
- Bấm vào thanh lọc phía trên để lọc theo: nguồn (Facebook, Zalo, Walk-in...), chương trình (Buttercup, IELTS...), giai đoạn, tư vấn viên phụ trách

**Tìm lead nhanh:**
- Bấm **Ctrl+K** (hoặc Cmd+K trên Mac)
- Gõ tên phụ huynh, tên học sinh, hoặc số điện thoại
- Bấm vào kết quả để mở chi tiết

**Chuyển sang dạng danh sách:**
- Bấm nút chuyển view ở góc trên → xem lead dạng bảng thay vì Kanban

### Thêm lead mới

Bấm nút **"+ Thêm lead"** ở góc trên, điền:
- **Tên phụ huynh** (bắt buộc)
- **Số điện thoại** (bắt buộc, đúng 10 số)
- **Nguồn** (bắt buộc): Facebook, Zalo, Walk-in, Website, Phone, Referral
- **Chương trình quan tâm** (tùy chọn): Buttercup, Primary Success, Secondary, IELTS
- **Tên học sinh**, **Ghi chú** (tùy chọn)

Lead mới sẽ xuất hiện ở cột **"Mới tiếp nhận"**.

### Xem chi tiết lead

Bấm vào thẻ lead → mở panel bên phải với 5 tab:

| Tab | Nội dung |
|-----|---------|
| **Thông tin** | Tên, SĐT, email, địa chỉ, chương trình, ghi chú. Bấm "Sửa" để chỉnh |
| **Lịch sử** | Mọi hoạt động: cuộc gọi, tin nhắn, ghi chú, thay đổi giai đoạn |
| **Nhắc nhở** | Các lịch nhắc liên quan lead này. Tạo mới hoặc hoàn thành |
| **Zalo** | Gửi tin nhắn Zalo cho phụ huynh (nếu đã kết nối Zalo OA) |
| **Ghi chú** | Ghi chú riêng theo từng giai đoạn: kết quả, bước tiếp theo |

### Ghi hoạt động cho lead

Trong tab **Lịch sử**, bấm "Thêm hoạt động", chọn loại:
- **Cuộc gọi** — đã gọi điện
- **Tin nhắn** — đã nhắn tin
- **Gặp mặt** — đã gặp trực tiếp
- **Ghi chú** — note nội bộ
- **Tư vấn** — buổi tư vấn chính thức
- **Lịch gọi** — đặt lịch gọi lại
- **Học thử** — buổi học thử

---

## CHỨC NĂNG 2 — Nhắc nhở

Trang này hiển thị tất cả lịch nhắc của bạn, chia 3 nhóm:

| Nhóm | Màu | Ý nghĩa |
|------|-----|---------|
| **Quá hạn** | Đỏ | Nhắc nhở đã qua ngày mà chưa xử lý |
| **Hôm nay** | Mặc định | Việc cần làm hôm nay |
| **Sắp tới** | Xám nhạt | 7 ngày tới |

### 4 loại nhắc nhở

| Loại | Ý nghĩa |
|------|---------|
| **Follow-up** | Gọi lại/nhắn lại cho phụ huynh |
| **Nhắc học thử** | Nhắc phụ huynh về buổi học thử sắp tới |
| **Nhắc chốt** | Nhắc follow-up để chốt đăng ký |
| **Gia hạn** | Nhắc gia hạn cho học viên sắp hết khóa |

### Thao tác với nhắc nhở

- **Hoàn thành** → bấm nút xong. Nếu là loại "Follow-up", hệ thống tự tạo nhắc nhở mới sau 7 ngày
- **Bỏ qua** → bấm bỏ qua (có thể ghi lý do)
- **Tạo mới** → bấm nút "Tạo nhắc nhở", chọn lead và loại nhắc

### Nhắc nhở tự động

Hệ thống tự tạo nhắc nhở khi:
- Lead chuyển sang giai đoạn mới (trigger từ database)
- Lead đăng ký thành công → tạo nhắc "Gia hạn"
- Hoàn thành follow-up → tạo follow-up tiếp theo sau 7 ngày

---

## CHỨC NĂNG 3 — Hoạt động

Trang tổng hợp các hoạt động đã lên lịch:
- Cuộc gọi đã hẹn
- Buổi tư vấn sắp tới
- Buổi học thử
- Các hoạt động định kỳ (hàng tuần)

Mỗi hoạt động có trạng thái: **Chờ xử lý**, **Hoàn thành**, **Đã hủy**.

---

## CHỨC NĂNG 4 — Học viên

Trang quản lý học sinh đã đăng ký chính thức.

### Bảng học viên hiển thị

| Cột | Ý nghĩa |
|-----|---------|
| **Tên học sinh** | Tên hoặc tên phụ huynh |
| **Mã HS** | Mã học sinh nội bộ |
| **Lớp** | Lớp đang học |
| **Trình độ** | Level hiện tại |
| **Trạng thái** | Đang học / Bảo lưu / Tốt nghiệp / Nghỉ |
| **Ngày nhập học** | Ngày bắt đầu học |
| **Còn lại** | Số ngày còn lại trong khóa (đếm ngược) |

### Trạng thái học viên

| Trạng thái | Màu | Ý nghĩa |
|-----------|------|---------|
| **Đang học** | Xanh lá | Đang tham gia lớp bình thường |
| **Bảo lưu** | Vàng | Tạm nghỉ, giữ chỗ (cần ghi lý do) |
| **Tốt nghiệp** | Xanh dương | Hoàn thành khóa học |
| **Nghỉ** | Đỏ | Rời trung tâm (cần ghi lý do) |

### Thao tác

- **Tìm kiếm**: gõ tên, mã HS, hoặc SĐT phụ huynh
- **Lọc**: theo trạng thái, theo lớp
- **Thêm học viên**: bấm nút "Thêm", điền thông tin
- **Import từ Excel/CSV**: bấm nút "Import CSV" → chọn file → map cột → import
- **Xem chi tiết**: bấm vào hàng → mở panel bên phải để sửa thông tin, đổi trạng thái

---

## CHỨC NĂNG 5 — Báo cáo

Trang dashboard với biểu đồ và chỉ số (chỉ Admin và Marketing thấy).

### 4 thẻ KPI chính

| Thẻ | Ý nghĩa | Ví dụ |
|-----|---------|-------|
| **Tổng leads** | Số lead trong khoảng thời gian | 128 (+12% so với kỳ trước) |
| **Tỉ lệ chuyển đổi** | % lead đăng ký thành công | 23.5% (+2.1%) |
| **Thời gian phản hồi** | Trung bình bao lâu sau khi nhận lead thì liên hệ | 1.5 giờ |
| **Học viên đang học** | Số học sinh active | 45 |

### 4 biểu đồ

1. **Phễu Pipeline** — cột dọc cho mỗi giai đoạn, thấy rõ lead rơi ở đâu nhiều nhất
2. **Nguồn lead** — biểu đồ tròn: Facebook bao nhiêu %, Zalo bao nhiêu %...
3. **Xu hướng tháng** — đường biểu diễn số lead mới theo tháng
4. **Hiệu suất tư vấn** — bảng xếp hạng: ai chuyển đổi nhiều nhất, nhanh nhất

### Lọc thời gian

Chọn khoảng thời gian: **7 ngày**, **30 ngày**, **90 ngày**, hoặc **tùy chọn** (chọn ngày bắt đầu-kết thúc).

---

## CHỨC NĂNG 6 — Cài đặt (chỉ Admin)

### Tab Kết nối
- **Zalo OA**: Bấm "Kết nối" → đăng nhập Zalo → cho phép truy cập → xong
- **Facebook**: Bấm "Kết nối" → đăng nhập Facebook → chọn Page → xong
- Hiển thị trạng thái: đã kết nối từ ngày nào, token hết hạn khi nào

### Tab Webhook Events
- Bảng ghi lại mọi sự kiện đến từ Zalo/Facebook
- Dùng để kiểm tra xem tin nhắn/lead từ MXH có vào đúng không

### Tab Cấu hình Pipeline
- Thiết lập "Bước tiếp theo" mặc định cho từng giai đoạn
- Ví dụ: Khi lead ở "Mới tiếp nhận" → checklist: "Gọi trong 2h", "Hỏi nhu cầu"...

---

## CHỨC NĂNG 7 — Thông báo

Biểu tượng **chuông** ở góc trên bên phải:
- Số đỏ = số thông báo chưa đọc
- Bấm vào → xem 20 thông báo gần nhất
- Bấm "Đánh dấu tất cả đã đọc" để xóa số đỏ

Hệ thống gửi thông báo khi:
- Lead thay đổi giai đoạn
- Có nhắc nhở đến hạn
- Nhận tin nhắn mới từ Zalo/Facebook
- Hoạt động hoàn thành

---

## CHỨC NĂNG 8 — Gửi tin nhắn Zalo / Email

### Gửi Zalo (trong chi tiết lead → tab Zalo)
1. Bấm "Gửi tin nhắn Zalo"
2. Chọn mẫu tin nhắn (hệ thống có sẵn mẫu theo từng giai đoạn)
3. Nội dung tự điền tên phụ huynh, tên học sinh
4. Bấm Gửi → tin nhắn vào hàng đợi, gửi tự động trong vài phút

### Gửi Email (trong chi tiết lead → nút Email)
1. Bấm biểu tượng email
2. Chọn mẫu email hoặc viết tùy ý
3. Điền tiêu đề, nội dung
4. Bấm Gửi

> **Lưu ý:** Zalo yêu cầu phụ huynh đã follow Zalo OA của Luna English trước. Nếu chưa follow, không gửi được.

---

# HƯỚNG DẪN CÔNG VIỆC HÀNG NGÀY

## Checklist buổi sáng (đầu ngày làm việc)

Mở Luna CRM, làm theo thứ tự:

### 1. Kiểm tra Nhắc nhở
Vào menu **Nhắc nhở**, xử lý theo thứ tự ưu tiên:

- [ ] Xem nhóm **"Quá hạn"** (đỏ) → xử lý hết trước
  - Gọi/nhắn cho phụ huynh
  - Bấm "Hoàn thành" sau khi liên hệ xong
  - Hoặc bấm "Bỏ qua" nếu không cần thiết nữa (ghi lý do)
- [ ] Xem nhóm **"Hôm nay"** → lên kế hoạch xử lý trong ngày
- [ ] Xem nhóm **"Sắp tới"** → nắm lịch tuần

### 2. Kiểm tra Thông báo
- [ ] Bấm biểu tượng **chuông** → đọc thông báo mới
- [ ] Có lead mới từ Facebook/Zalo? → vào Pipeline kiểm tra cột "Mới tiếp nhận"

### 3. Xử lý lead "Mới tiếp nhận"
- [ ] Vào **Pipeline** → xem cột đầu tiên
- [ ] Mỗi lead mới: gọi điện/nhắn tin trong vòng **2 giờ**
- [ ] Sau khi tư vấn → kéo lead sang cột **"Đã tư vấn"**
- [ ] Ghi hoạt động: bấm vào lead → tab Lịch sử → Thêm hoạt động → chọn "Cuộc gọi"

---

## Checklist trong ngày (khi có phát sinh)

### Khi có lead mới (từ bất kỳ nguồn nào)

- [ ] Kiểm tra thông tin: tên, SĐT đã đúng chưa
- [ ] Gọi điện tư vấn lần đầu
- [ ] Ghi lại kết quả cuộc gọi vào tab **Lịch sử**
- [ ] Kéo lead sang giai đoạn phù hợp
- [ ] Tạo nhắc nhở follow-up nếu phụ huynh chưa quyết định

### Khi phụ huynh đồng ý học thử

- [ ] Kéo lead sang **"Đặt lịch học thử"**
- [ ] Ghi chú ngày/giờ học thử vào tab **Ghi chú**
- [ ] Tạo nhắc nhở loại **"Nhắc học thử"** trước ngày học thử 1 ngày
- [ ] Gửi tin nhắn Zalo/email xác nhận cho phụ huynh

### Khi học sinh đang học thử

- [ ] Kéo lead sang **"Đang học thử"**
- [ ] Sau buổi học thử → ghi nhận xét vào tab Ghi chú
- [ ] Tạo nhắc nhở loại **"Nhắc chốt"** sau 1–2 ngày

### Khi phụ huynh đăng ký thành công

- [ ] Kéo lead sang **"Đã đăng ký"**
- [ ] Hệ thống tự tạo hồ sơ học viên trong mục Học viên
- [ ] Hệ thống tự tạo nhắc nhở "Gia hạn"
- [ ] Vào **Học viên** → kiểm tra thông tin: lớp, trình độ, ngày nhập học

### Khi phụ huynh từ chối

- [ ] Kéo lead sang **"Mất lead"**
- [ ] Hệ thống hỏi lý do → chọn/ghi lý do
- [ ] (Không cần làm gì thêm, lead được lưu trữ để phân tích sau)

### Khi học viên muốn bảo lưu

- [ ] Vào **Học viên** → tìm học sinh → bấm vào
- [ ] Đổi trạng thái sang **"Bảo lưu"**
- [ ] Ghi lý do bảo lưu
- [ ] Tạo nhắc nhở follow-up để hỏi thăm sau 2–4 tuần

### Khi có tin nhắn Zalo/Facebook từ phụ huynh

- [ ] Kiểm tra **Thông báo** (chuông)
- [ ] Vào lead liên quan → tab **Zalo** hoặc **Lịch sử**
- [ ] Trả lời phụ huynh
- [ ] Ghi hoạt động "Tin nhắn" vào lịch sử

---

## Checklist cuối ngày

- [ ] Vào **Pipeline** → kiểm tra: còn lead nào ở "Mới tiếp nhận" chưa xử lý?
- [ ] Vào **Nhắc nhở** → còn mục nào "Quá hạn" chưa xử lý?
- [ ] Đảm bảo mọi cuộc gọi/tư vấn trong ngày đều đã ghi vào **Lịch sử**

---

# HƯỚNG DẪN CÔNG VIỆC HÀNG TUẦN

## Checklist thứ Hai đầu tuần

### Admin / Quản lý

- [ ] Vào **Báo cáo** → xem 4 thẻ KPI tuần trước (chọn "7 ngày")
  - Tổng leads mới?
  - Tỉ lệ chuyển đổi tăng hay giảm?
  - Thời gian phản hồi có nhanh hơn không?
- [ ] Xem **biểu đồ Phễu Pipeline** → lead rơi nhiều nhất ở giai đoạn nào?
- [ ] Xem **Hiệu suất tư vấn** → ai cần hỗ trợ thêm?
- [ ] Xem **Nguồn lead** → nguồn nào hiệu quả nhất tuần qua?
- [ ] Kiểm tra hệ thống tự gửi **Báo cáo tuần** vào thứ 2 lúc 8h sáng (cron tự động)

### Tư vấn viên

- [ ] Xem lại toàn bộ lead đang phụ trách trên **Pipeline**
- [ ] Kiểm tra lead nào ở **"Đang nurture"** quá lâu (hơn 2 tuần) → cần follow-up mạnh hơn hoặc chuyển sang "Mất lead"
- [ ] Kiểm tra lead ở **"Chờ chốt"** quá 3 ngày → gọi lại ngay

---

## Checklist cuối tuần (thứ Sáu)

- [ ] Rà soát **Nhắc nhở sắp tới** → có gì cần xử lý trước cuối tuần?
- [ ] Cập nhật ghi chú cho lead quan trọng
- [ ] Đảm bảo không có lead "Mới tiếp nhận" tồn đọng qua cuối tuần

---

# HƯỚNG DẪN CÔNG VIỆC HÀNG THÁNG

## Checklist đầu tháng (dành cho Admin)

- [ ] Vào **Báo cáo** → chọn "30 ngày" → xem tổng quan tháng trước
- [ ] So sánh với tháng trước:
  - Tổng leads tăng/giảm?
  - Tỉ lệ chuyển đổi?
  - Nguồn lead hiệu quả nhất?
- [ ] Vào **Học viên** → lọc trạng thái "Đang học":
  - Ai sắp hết khóa? (cột "Còn lại" < 30 ngày)
  - Có ai cần gia hạn?
- [ ] Rà soát lead **"Đang nurture"** quá 30 ngày → quyết định: tiếp tục chăm hay đóng
- [ ] Rà soát lead **"Mất lead"** → phân tích lý do phổ biến → cải thiện quy trình
- [ ] Kiểm tra **Cài đặt → Kết nối**: Zalo/Facebook vẫn connected? Token chưa hết hạn?

---

# MẸO SỬ DỤNG

### Phím tắt
- **Ctrl+K** (hoặc Cmd+K): Tìm lead nhanh — gõ tên hoặc SĐT

### Tiết kiệm thời gian
- Dùng **mẫu tin nhắn Zalo** có sẵn thay vì gõ tay mỗi lần
- Khi hoàn thành follow-up, hệ thống **tự tạo nhắc nhở tiếp theo sau 7 ngày** — không cần tạo tay
- Dùng **bộ lọc** trên Pipeline để chỉ xem lead của mình (lọc theo Tư vấn viên)

### Tránh sai sót
- Luôn ghi **hoạt động** sau mỗi cuộc gọi/tư vấn — để đồng nghiệp nắm được nếu cần hỗ trợ
- Ghi **lý do** khi chuyển lead sang "Mất lead" — dữ liệu này giúp cải thiện quy trình
- Kiểm tra **nhắc nhở quá hạn** mỗi sáng — đừng để phụ huynh chờ quá lâu
- Số điện thoại phải đúng **10 số** — kiểm tra kỹ khi nhập lead mới

### Quy tắc vàng
> **Lead mới phải được liên hệ trong vòng 2 giờ.** Phản hồi càng nhanh, tỉ lệ chuyển đổi càng cao.
