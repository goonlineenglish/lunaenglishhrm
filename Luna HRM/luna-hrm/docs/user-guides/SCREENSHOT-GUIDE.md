# Hướng Dẫn Thêm Hình Ảnh Vào Guides — Cho Antigravity

**Ngày tạo:** 2026-03-18
**File chính:** `docs/user-guides/user-guide-branch-manager-setup.md`
**Mục đích:** Hướng dẫn AI/người dùng cách chụp screenshot và thêm vào placeholder

---

## 📋 Tổng Quan

File `user-guide-branch-manager-setup.md` đã có **30+ IMAGE PLACEHOLDER** chờ screenshots.

**Task của bạn:**
1. Chụp screenshot từng bước theo hướng dẫn
2. Lưu vào thư mục `docs/user-guides/images/`
3. Thay `[IMAGE PLACEHOLDER — Description]` bằng `![Description](./images/filename.png)`

---

## 🎯 Danh Sách Screenshots Cần Chụp

### Quy Trình 1: Setup Cơ Sở

| # | Step | Description | Notes | Priority |
|---|------|-------------|-------|----------|
| 1.1 | Login | Login screen (email + password fields) | Trên `/login` | 🔴 P0 |
| 1.2 | Menu | Left sidebar with Branches option highlighted | Trên `/dashboard` | 🔴 P0 |
| 1.3 | Branch Form | Branch creation form (Tên, Mã, Địa Chỉ, Quản Lý) | Modal form | 🔴 P0 |
| 1.3.2 | Success | Success notification after branch creation | Green toast/alert | 🟠 P1 |

### Quy Trình 2: Thêm Nhân Viên

| # | Step | Description | Notes | Priority |
|---|------|-------------|-------|----------|
| 2.1 | List | Employees list page with table & action buttons | `/dashboard/employees` | 🔴 P0 |
| 2.2.1 | Form Tab 1 | Employee form - Basic Info (Mã, Tên, Email, Chức Vụ, Tỷ Giá) | First wizard tab | 🔴 P0 |
| 2.2.2 | Form Tab 2 | Employee form - Personal Info (CCCD, Ngày Sinh, Địa Chỉ) | Second wizard tab | 🔴 P0 |
| 2.2.3 | Form Tab 3 | Employee form - Bank Info (Ngân Hàng, Chủ Tài Khoản, Số TK) | Third wizard tab | 🟠 P1 |
| 2.2 | Success | Success message after employee creation | Toast notification | 🟠 P1 |
| 2.3 | Import Dialog | Import Excel dialog with template download button | Modal | 🟠 P1 |
| 2.3.1 | Template | Excel template with sample data (columns + 3 rows) | Spreadsheet | 🔴 P0 |
| 2.3.2 | Upload | Upload area and preview of imported employees | Upload zone + table | 🔴 P0 |
| 2.3.2 | Import Success | Success message + updated employees list | Toast + table | 🟠 P1 |

### Quy Trình 3: Tạo Lịch Học

| # | Step | Description | Notes | Priority |
|---|------|-------------|-------|----------|
| 3.1 | List | Class schedules list page | `/dashboard/class-schedules` | 🟠 P1 |
| 3.2 | Form | Class schedule creation form (Mã Lớp, Tên, GV, Trợ, Giờ, Ngày) | Modal form | 🔴 P0 |
| 3.3 | Success | Success notification after creation | Toast | 🟠 P1 |
| 3.4 | Template | Class schedule Excel template with sample | Spreadsheet | 🟠 P1 |
| 3.4 | Import | Upload and import confirmation | Upload zone | 🟠 P1 |

### Quy Trình 4: Chấm Công

| # | Step | Description | Notes | Priority |
|---|------|-------------|-------|----------|
| 4.1 | Attendance Page | Attendance page with week selector and grid | `/dashboard/attendance` | 🔴 P0 |
| 4.2 | Week Selector | Week selector dropdown/calendar | Selector UI | 🟠 P1 |
| 4.3a | Cell Cycle | Attendance cell with cycling statuses (1→0→KP→0.5) | Individual cell | 🔴 P0 |
| 4.3b | Auto-fill | Auto-fill button + confirmation | Button + modal | 🟠 P1 |
| 4.4 | Preview Modal | Diff/preview modal (Before vs After) | Modal comparison | 🔴 P0 |
| 4.4 | Confirm | Confirmation and success message | Toast | 🟠 P1 |
| 4.5 | Lock Dialog | Lock confirmation dialog | Modal | 🟠 P1 |
| 4.6 | Unlock Dialog | Unlock dialog | Modal | 🟠 P1 |
| 4.7 | Export Button | Export button and sample downloaded file | Button + icon | 🟠 P1 |
| 4.8 | Summary Tab | Attendance Summary tab with per-employee per-class sessions | Tab content | 🟠 P1 |

### Quy Trình 5: VP Attendance

| # | Step | Description | Notes | Priority |
|---|------|-------------|-------|----------|
| 5.1 | VP Page | Office attendance page with daily grid | `/dashboard/office-attendance` | 🟠 P1 |
| 5.2 | VP Grid | Office attendance grid for daily entry | Grid UI | 🟠 P1 |

---

## 📸 Hướng Dẫn Chụp Screenshot

### Setup Test Data (Trước khi chụp)

```bash
# Đảm bảo có test data:
cd F:/APP ANTIGRAVITY/Tool/Luna HRM/luna-hrm
npm run dev  # Chạy dev server, truy cập http://localhost:3000

# Login với test account:
- Email: bm.tanmai@luna-hrm.local
- Password: Luna@2026
```

### Cách Chụp Screenshot

#### Chrome DevTools
1. F12 → Device toolbar (Ctrl+Shift+M)
2. Desktop size: 1024x768 hoặc 1280x720
3. Chụp (Ctrl+Shift+P → "Screenshot")
4. Lưu vào `docs/user-guides/images/step-X-description.png`

#### Filename Convention
```
docs/user-guides/images/
├── 01-login-screen.png
├── 02-sidebar-menu.png
├── 03-branch-form.png
├── 04-branch-success.png
├── 05-employees-list.png
├── 06-employee-form-tab1.png
├── 07-employee-form-tab2.png
├── 08-employee-form-tab3.png
├── 09-employee-success.png
├── 10-import-dialog.png
├── 11-excel-template.png
├── 12-upload-preview.png
├── 13-import-success.png
├── 14-class-list.png
├── 15-class-form.png
├── 16-class-success.png
├── 17-class-template.png
├── 18-class-import.png
├── 19-attendance-page.png
├── 20-week-selector.png
├── 21-attendance-cell-cycle.png
├── 22-auto-fill.png
├── 23-preview-modal.png
├── 24-confirm-success.png
├── 25-lock-dialog.png
├── 26-unlock-dialog.png
├── 27-export-button.png
├── 28-summary-tab.png
├── 29-vp-attendance-page.png
└── 30-vp-grid.png
```

---

## 🔍 Checklist Chụp Screenshot

```
Quy Trình 1: Setup Cơ Sở
☐ 01-login-screen.png
☐ 02-sidebar-menu.png
☐ 03-branch-form.png
☐ 04-branch-success.png

Quy Trình 2: Thêm Nhân Viên
☐ 05-employees-list.png
☐ 06-employee-form-tab1.png
☐ 07-employee-form-tab2.png
☐ 08-employee-form-tab3.png
☐ 09-employee-success.png
☐ 10-import-dialog.png
☐ 11-excel-template.png
☐ 12-upload-preview.png
☐ 13-import-success.png

Quy Trình 3: Tạo Lịch Học
☐ 14-class-list.png
☐ 15-class-form.png
☐ 16-class-success.png
☐ 17-class-template.png
☐ 18-class-import.png

Quy Trình 4: Chấm Công
☐ 19-attendance-page.png
☐ 20-week-selector.png
☐ 21-attendance-cell-cycle.png
☐ 22-auto-fill.png
☐ 23-preview-modal.png
☐ 24-confirm-success.png
☐ 25-lock-dialog.png
☐ 26-unlock-dialog.png
☐ 27-export-button.png
☐ 28-summary-tab.png

Quy Trình 5: VP Attendance
☐ 29-vp-attendance-page.png
☐ 30-vp-grid.png
```

---

## 📝 Thay Thế [IMAGE PLACEHOLDER]

### Trước (Hiện tại)
```markdown
[IMAGE PLACEHOLDER — Step 1.1: Login screen with email/password fields]
```

### Sau (Với hình ảnh)
```markdown
![Login screen with email/password fields](./images/01-login-screen.png)
```

### Script Tự động (Python)

Nếu muốn tự động hóa việc thay thế:

```python
import re
import os

# Đọc file
with open('docs/user-guides/user-guide-branch-manager-setup.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Tìm tất cả [IMAGE PLACEHOLDER]
placeholders = re.findall(r'\[IMAGE PLACEHOLDER — (.*?)\]', content)

# In danh sách (để xác nhận)
for i, placeholder in enumerate(placeholders, 1):
    print(f"{i:02d}. {placeholder}")

# Thay thế (template)
for i, placeholder in enumerate(placeholders, 1):
    old = f"[IMAGE PLACEHOLDER — {placeholder}]"
    filename = f"image-{i:02d}.png"
    new = f"![{placeholder}](./images/{filename})"
    content = content.replace(old, new)

# Lưu
with open('docs/user-guides/user-guide-branch-manager-setup.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Đã thay thế tất cả placeholders")
```

---

## 📤 Upload Hình Ảnh Lên GitHub

```bash
# 1. Tạo thư mục images
mkdir -p docs/user-guides/images

# 2. Copy các file PNG vào
cp /path/to/screenshots/* docs/user-guides/images/

# 3. Commit
cd Luna HRM/luna-hrm
git add docs/user-guides/images/
git commit -m "docs: add 30+ screenshots for branch manager setup guide"
git push origin main
```

---

## 🎨 Yêu Cầu Về Chất Lượng Screenshot

### Kích Thước
- Chiều rộng: 1024 hoặc 1280 px
- Chiều cao: tùy (thường 600-800 px)
- Format: **PNG** (không JPEG để tránh artifact)

### Contrast & Readability
- Text phải rõ ràng, dễ đọc
- Không có thông tin cá nhân (email, số điện thoại thực)
- Nếu cần ẩn → Dùng "X" hoặc "***"

### Annotation (Tuỳ chọn)
- Có thể thêm mũi tên → vùng cần focus
- Highlight các nút quan trọng
- Dùng tool: Snagit, Annotate, Paint (Windows 11)

---

## 🔗 Tham Khảo

- Placeholder file: `docs/user-guides/user-guide-branch-manager-setup.md`
- Images folder: `docs/user-guides/images/` (tạo mới)
- Markdown format: `![alt text](./images/filename.png)`
- GitHub raw URL: `https://raw.githubusercontent.com/goonlineenglish/lunaenglishhrm/main/Luna%20HRM/luna-hrm/docs/user-guides/images/filename.png`

---

## 📞 Hỗ Trợ

Nếu cần giúp về:
- **Screenshot tools:** Dùng Chrome DevTools (F12 + Device toolbar)
- **Image optimization:** TinyPNG (https://tinypng.com)
- **Markdown syntax:** https://www.markdownguide.org/
- **Git workflow:** `git add` → `git commit` → `git push`
