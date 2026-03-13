# Luna HRM — Design Guidelines

---

## Brand Identity

### **Colors**

**Primary palette:**
- **Primary:** #3E1A51 (Luna purple, matches Luna CRM)
- **Secondary:** #3FA5DC (Luna cyan, matches Luna CRM)
- **Accent:** #F59E0B (Orange/amber for alerts)

**Semantic colors:**
- **Success:** #10B981 (Green) — Confirmed payroll, saved attendance
- **Warning:** #F59E0B (Amber) — Salary change >20%, exceptions
- **Error:** #EF4444 (Red) — KP (no permission), conflicts, failures
- **Neutral:** #6B7280 (Gray) — Disabled, locked weeks

**Dark mode:**
- Background: #1F2937 (Dark gray)
- Surface: #374151 (Lighter gray)
- Text: #F3F4F6 (Off-white)

### **Fonts**

- **Headings:** System font stack (no web fonts — performance)
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  ```
- **Body:** Same system stack (consistency)

### **Spacing**

Follow Tailwind's 4px grid:
- `gap-2` (8px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px)
- Consistent padding inside cards/sections

---

## Component Patterns

### **Buttons**

All buttons use shadcn/ui `<Button>` component:

```tsx
import { Button } from '@/components/ui/button'

// Primary (most common)
<Button>Lưu chấm công</Button>

// Secondary
<Button variant="outline">Hủy</Button>

// Destructive (delete/undo)
<Button variant="destructive">Xóa</Button>

// Ghost (subtle)
<Button variant="ghost">Chi tiết</Button>

// Size variants
<Button size="sm">Nhỏ</Button>
<Button size="lg">Lớn</Button>

// Loading state
<Button disabled>Đang lưu...</Button>
```

**Rules:**
- Always use Vietnamese labels
- Primary action = filled button
- Secondary = outline
- Destructive = red background
- Never use plain HTML button

### **Tables (Attendance, Payroll)**

Use shadcn/ui `<Table>` component:

```tsx
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table'

// Scrollable on mobile
<div className="overflow-x-auto">
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Nhân viên</TableCell>
        <TableCell>T2</TableCell>
        ...
      </TableRow>
    </TableHead>
    <TableBody>
      {data.map(row => (
        <TableRow key={row.id}>
          <TableCell>{row.name}</TableCell>
          <TableCell>{row.monday}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

**Rules:**
- Header sticky on scroll
- Rows alternate background (striped)
- Highlight cell on hover
- Support horizontal scroll on mobile
- Max 50 rows per page (pagination)

### **Forms (KPI Evaluation, Employee CRUD)**

Use shadcn/ui form components:

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

<form className="space-y-4">
  <div>
    <Label htmlFor="name">Tên nhân viên</Label>
    <Input id="name" placeholder="Nhập tên..." />
  </div>

  <div>
    <Label htmlFor="position">Vị trí</Label>
    <Select defaultValue="teacher">
      <SelectTrigger id="position">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="teacher">Giáo viên</SelectItem>
        <SelectItem value="assistant">Trợ giảng</SelectItem>
        <SelectItem value="office">Văn phòng</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div>
    <Label htmlFor="notes">Ghi chú</Label>
    <Textarea id="notes" placeholder="Nhập ghi chú..." />
  </div>

  <Button type="submit">Lưu</Button>
</form>
```

**Rules:**
- Each input has Label
- Use placeholder for hints (not label inside)
- Errors shown inline + red border
- Form fields stack vertically on mobile
- Submit button at bottom

### **Dialogs & Modals**

Use shadcn/ui `<Dialog>`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Xác nhận lưu lương</DialogTitle>
      <DialogDescription>
        Bạn sắp xác nhận lương cho 50 nhân viên.
      </DialogDescription>
    </DialogHeader>

    <div className="py-4">
      <p>Tổng chi: <strong>48,967,000 VND</strong></p>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Hủy
      </Button>
      <Button onClick={handleConfirm}>
        Xác nhận
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### **Alerts & Notifications**

Use shadcn/ui `<Alert>`:

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Warning
<Alert variant="warning">
  <AlertTitle>Cảnh báo</AlertTitle>
  <AlertDescription>
    Lương NV E02 thay đổi 25% so với tháng trước.
  </AlertDescription>
</Alert>

// Error
<Alert variant="destructive">
  <AlertTitle>Lỗi</AlertTitle>
  <AlertDescription>Không thể lưu chấm công. Vui lòng thử lại.</AlertDescription>
</Alert>

// Success
<Alert variant="default">
  <AlertTitle>Thành công</AlertTitle>
  <AlertDescription>Đã lưu tuần chấm công.</AlertDescription>
</Alert>
```

---

## Page Layouts

### **Attendance Grid (Desktop BM — Class-Based)**

```
┌─────────────────────────────────────────────────────┐
│  Navbar (logo, user menu)                           │
├─────────────────────────────────────────────────────┤
│ Sidebar (Lịch lớp, Chấm công, Chấm công VP, ...)  │
│                                                     │
│  Main Content                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ Title: Chấm công tuần — CS Tân Mai             │  │
│  │ Week: ◀ 02/03-08/03 ▶                          │  │
│  │                                                 │  │
│  │ [Attendance Grid — class×day, auto-fill 1]    │  │
│  │ [Weekly Notes — per-employee structured]       │  │
│  │ [Save] [Lock]                                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### **Class Schedule Management (Desktop Admin/BM)**

```
┌─────────────────────────────────────────────────────┐
│  Navbar                                             │
├─────────────────────────────────────────────────────┤
│ Sidebar                                             │
│                                                     │
│  Main Content                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ Title: Thời Khóa Biểu — CS Tân Mai            │  │
│  │ [+ Thêm lớp] [Filter: status]                │  │
│  │                                                 │  │
│  │ [Class Table — code, name, shift, days,       │  │
│  │  teacher, assistant, status]                   │  │
│  │                                                 │  │
│  │ [Create/Edit Form — inline or modal]          │  │
│  │  Mã lớp, Tên lớp, Ca dạy, Ngày học checkbox  │  │
│  │  GV (lookup by employee code)                  │  │
│  │  TG (lookup by employee code)                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### **Office Attendance (Desktop BM — VP Staff)**

```
┌─────────────────────────────────────────────────────┐
│  Navbar                                             │
├─────────────────────────────────────────────────────┤
│ Sidebar                                             │
│                                                     │
│  Main Content                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ Title: Chấm công VP — CS Tân Mai               │  │
│  │ Week: ◀ 02/03-08/03 ▶                          │  │
│  │                                                 │  │
│  │ [Daily Grid — employee×day, simpler than      │  │
│  │  class-based, default "1" for work days]      │  │
│  │ [Weekly Notes]                                 │  │
│  │ [Save] [Lock]                                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### **Payroll Grid (Desktop Accountant)**

```
┌─────────────────────────────────────────────────────┐
│  Navbar                                             │
├─────────────────────────────────────────────────────┤
│ Sidebar                                             │
│                                                     │
│  Main Content                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ Title: Tính lương — T3/2026 — CS Tân Mai     │  │
│  │ Summary: 10 GV, 8 TG, 3 VP                    │  │
│  │ Total GROSS: 185.4M | Total NET: 162.3M      │  │
│  │                                                 │  │
│  │ [Tabs: Trợ giảng | Giáo viên | Văn phòng]   │  │
│  │                                                 │  │
│  │ [Payroll Table — scrollable]                  │  │
│  │ [Month Comparison on right — side panel]      │  │
│  │                                                 │  │
│  │ [Confirm] [Export Excel] [Send Email]         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### **Mobile Employee Portal**

```
┌────────────────────────┐
│  Attendance       🔔   │
├────────────────────────┤
│                        │
│ 👤 Trần Thị Bình       │
│ Trợ giảng              │
│                        │
│ [Monthly View]         │
│ [Weekly View]          │
│ [Payslip List]         │
│ [Profile]              │
│                        │
├────────────────────────┤
│ 🏠 | 📋 | 💰 | 👤     │
└────────────────────────┘
```

**Mobile rules:**
- Bottom tab navigation (fixed)
- Content scrolls vertically
- No horizontal scroll
- Large touch targets (48px+)
- Minimal back buttons (use browser back)

---

## Attendance Grid Design Patterns

### **Cell Status Styling**

```tsx
function getCellStyles(status: AttendanceStatus): string {
  switch (status) {
    case '1':      return 'bg-green-50 text-green-900 border-green-200'
    case '0':      return 'bg-blue-50 text-blue-900 border-blue-200'
    case 'KP':     return 'bg-red-50 text-red-900 border-red-200'
    case '0.5':    return 'bg-yellow-50 text-yellow-900 border-yellow-200'
    default:       return 'bg-gray-50 text-gray-400'  // Disabled (no schedule)
  }
}
```

**Legend above grid:**
```
┌──────────────────────────────────────┐
│ 1 = Đi dạy  |  0 = Vắng có phép    │
│ KP = Ko phép | 0.5 = Nửa buổi       │
│ ░░░ = Không có lịch                 │
└──────────────────────────────────────┘
```

### **Conflict Highlighting**

If teacher scheduled 2 classes same time:

```tsx
function getConflictStyle(hasConflict: boolean): string {
  return hasConflict ? 'ring-2 ring-red-500 bg-red-100' : ''
}

// Display warning
{hasConflict && (
  <AlertCircle className="text-red-500 w-4 h-4" />
)}
```

### **Exception Highlighting**

Mark rows where changes exist:

```tsx
{changedRows.includes(row.id) && (
  <TableRow className="bg-yellow-50">
    {/* Row content */}
  </TableRow>
)}
```

---

## Payroll Formulas Display

### **Teaching Assistant Payslip (Employee View)**

```
╔════════════════════════════════════╗
║   PHIẾU LƯƠNG — T3/2026            ║
║   Trần Thị Bình (E02)              ║
║   Trợ giảng — CS Tân Mai           ║
╚════════════════════════════════════╝

💰 THỰC LÃNH: 1,730,000 VND

───── THU NHẬP ─────
Buổi dạy:    16 × 75,000 = 1,200,000
Dạy thay:     2 × 40,000 =    80,000
Phụ cấp:                       50,000
KPI (9/10):   9 × 50,000 =   450,000
              ────────────────────────
BRUTTO:                    1,780,000

───── KHẤU TRỪ ─────
BHXH, BHYT, BHTN: 0 (No contract)
Thuế TNCN: 0 (Below threshold)
          ─────────────────────
NET PAY:                   1,780,000

───── KPI THÁNG ─────
TSI:    1/1 ⭐
Funtime: 2/3 ⭐⭐
Parents: 2/2 ⭐⭐
Students: 3/3 ⭐⭐⭐
Demeanor: 1/1 ⭐
Tổng: 9/10 ⭐⭐⭐⭐
```

---

## Responsive Design

### **Breakpoints (Tailwind)**

```
sm: 640px    (tablets)
md: 768px    (tablets+)
lg: 1024px   (small desktop)
xl: 1280px   (desktop)
2xl: 1536px  (large desktop)
```

### **Mobile-First Approach**

```tsx
// Mobile by default
<div className="w-full">
  {/* Mobile layout */}
</div>

// Tablet and up
<div className="md:flex md:w-1/2">
  {/* Desktop layout */}
</div>
```

### **Attendance Grid Mobile**

```
Mobile (< 640px):
- Vertical stack: Class name, then weekdays below
- Swipe to navigate weeks
- Tab key jumps to next cell (Excel-like)

Tablet (640-1024px):
- Condensed: Class name (left), 3 days visible, scroll right

Desktop (> 1024px):
- Full grid: All 7 days visible, all classes visible
```

---

## Accessibility

### **Color Contrast**

- Text: AA standard (4.5:1 for body, 3:1 for headings)
- Use Color Contrast Analyzer to verify

### **Keyboard Navigation**

- Tab: Move to next focusable element
- Shift+Tab: Previous
- Enter: Activate button
- Arrow keys: Navigate table cells (attendance grid)

### **Screen Reader**

- Use semantic HTML (`<button>`, `<label>`, `<table>`)
- Add `aria-label` for icon-only buttons:
  ```tsx
  <Button>
    <Lock className="w-4 h-4" />
    <span className="sr-only">Khóa tuần</span>
  </Button>
  ```

### **Dark Mode**

Support `prefers-color-scheme` CSS query:

```tsx
// Tailwind dark mode
<html className="dark">
  {/* Content adapts automatically */}
</html>
```

---

*Design Guidelines v1.1 | 2026-03-06 | Added class schedule CRUD layout, office attendance layout*
