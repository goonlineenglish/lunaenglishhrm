# Luna HRM — Code Standards

---

## File Structure

```
luna-hrm/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Dashboard layout (sidebar)
│   │   ├── page.tsx               # Dashboard home
│   │   ├── class-schedules/
│   │   │   └── page.tsx           # Class schedule management
│   │   ├── attendance/
│   │   │   ├── page.tsx           # Attendance grid (teachers + assistants)
│   │   │   └── [week]/page.tsx    # Week detail
│   │   ├── office-attendance/
│   │   │   └── page.tsx           # Office staff daily attendance
│   │   ├── payroll/
│   │   │   ├── page.tsx           # Payroll grid
│   │   │   └── [period]/page.tsx  # Period detail
│   │   ├── kpi/
│   │   │   ├── page.tsx           # KPI evaluation list
│   │   │   └── [employee]/page.tsx # KPI form
│   │   ├── employees/
│   │   │   ├── page.tsx           # Employee list
│   │   │   └── [id]/page.tsx      # Employee detail
│   │   └── branches/
│   │       └── page.tsx           # Branch management (admin only)
│   ├── api/
│   │   ├── auth/
│   │   │   └── route.ts           # Auth endpoints (if needed)
│   │   └── cron/
│   │       ├── weekly-reminder/route.ts    # Attendance reminder
│   │       └── monthly-notification/route.ts # KPI 25th reminder
│   └── error.tsx
├── components/
│   ├── shared/
│   │   ├── navbar.tsx             # Top navbar
│   │   ├── sidebar.tsx            # Left sidebar (nav)
│   │   ├── footer.tsx             # Footer
│   │   ├── breadcrumb.tsx         # Breadcrumbs
│   │   ├── loading-spinner.tsx    # Loading state
│   │   └── alert-dialog.tsx       # Confirmation dialog
│   ├── class-schedules/
│   │   ├── class-schedule-table.tsx     # Class schedule data table
│   │   ├── class-schedule-form.tsx      # Create/edit class form
│   │   └── class-schedule-detail.tsx    # Class detail panel
│   ├── attendance/
│   │   ├── attendance-grid.tsx    # Weekly attendance table (class-based)
│   │   ├── attendance-week-selector.tsx  # Week picker
│   │   ├── class-schedule-list.tsx      # Class schedule sidebar
│   │   └── attendance-notes.tsx   # Weekly notes textarea
│   ├── office-attendance/
│   │   └── office-attendance-grid.tsx   # Daily attendance for VP staff
│   ├── payroll/
│   │   ├── payroll-tabs.tsx       # 3 tabs (TA/Teacher/Office)
│   │   ├── payroll-table.tsx      # Payroll data table
│   │   ├── kpi-column.tsx         # KPI bonus display
│   │   ├── payslip-detail.tsx     # Payslip slide-out panel
│   │   ├── payslip-preview.tsx    # Month comparison
│   │   └── email-dispatch.tsx     # Email sender UI
│   ├── kpi/
│   │   ├── kpi-evaluation-form.tsx    # 5-criteria form
│   │   ├── kpi-score-input.tsx   # Individual criterion
│   │   ├── kpi-history-chart.tsx # 6-month trend
│   │   └── kpi-summary.tsx       # Monthly summary
│   ├── employees/
│   │   ├── employee-table.tsx     # Employee data table
│   │   ├── employee-form.tsx      # Create/edit form
│   │   └── employee-detail.tsx    # Side panel
│   └── auth/
│       ├── login-form.tsx         # Email/password form
│       └── reset-password-form.tsx
├── lib/
│   ├── actions/
│   │   ├── class-schedule-actions.ts   # CRUD class schedules
│   │   ├── attendance-actions.ts       # Mark attendance, fetch weekly grid
│   │   ├── office-attendance-actions.ts # Daily office staff attendance
│   │   ├── payroll-actions.ts          # Calculate payslip, confirm period
│   │   ├── kpi-actions.ts            # Save/fetch KPI evaluations
│   │   ├── employee-actions.ts       # CRUD employees
│   │   ├── branch-actions.ts         # CRUD branches
│   │   ├── auth-actions.ts           # Login/logout/reset
│   │   └── email-actions.ts          # Send payslip email
│   ├── services/
│   │   ├── supabase-service.ts      # Supabase client + auth
│   │   ├── payroll-calculation.ts   # All 3 salary formulas + TNCN
│   │   ├── attendance-service.ts    # Attendance grid generation
│   │   ├── kpi-service.ts           # KPI calculation
│   │   └── audit-log-service.ts     # Log all changes
│   ├── utils/
│   │   ├── date-helpers.ts          # Week/month utilities
│   │   ├── number-format.ts         # VND currency formatter
│   │   ├── tax-calculator.ts        # Progressive tax function
│   │   ├── constants.ts             # Salary rates, positions
│   │   └── validators.ts            # Form validation
│   ├── types/
│   │   ├── database.ts              # Generated from Supabase schema
│   │   ├── class-schedule.ts        # Class schedule types
│   │   ├── attendance.ts            # Attendance types
│   │   ├── payroll.ts               # Payslip types
│   │   ├── kpi.ts                   # KPI types
│   │   └── user.ts                  # User/role types
│   ├── hooks/
│   │   ├── use-auth.ts              # Auth context hook
│   │   ├── use-branch.ts            # Current branch context
│   │   ├── use-supabase.ts          # Supabase client hook
│   │   └── use-form-state.ts        # Server action form state
│   ├── constants/
│   │   ├── navigation.ts            # Menu items (Vietnamese)
│   │   ├── roles.ts                 # Role permissions
│   │   └── messages.ts              # UI messages (i18n-ready)
│   └── db/
│       └── schema.ts                # Supabase table definitions
├── styles/
│   ├── globals.css                  # Tailwind base + theme
│   └── variables.css                # CSS variables (dark mode)
├── public/
│   ├── favicon.ico
│   ├── manifest.json                # PWA manifest
│   └── icons/                       # PWA icons (192x192, 512x512)
├── tests/
│   ├── unit/
│   │   ├── payroll-calculation.test.ts  # Tax, deductions
│   │   ├── attendance-grid.test.ts
│   │   └── kpi-calculation.test.ts
│   ├── integration/
│   │   └── payroll-workflow.test.ts
│   └── fixtures/
│       └── test-data.ts             # Sample employees, attendance
├── .env.example                     # Template
├── .env.local                       # (git ignored) Supabase keys
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── package.json
├── README.md
└── CLAUDE.md
```

---

## Naming Conventions

### **Files & Directories**
- **kebab-case** for all file/folder names
- **Descriptive names** — LLM tools (Grep, Glob) should understand purpose at a glance
- **Components:** `component-name.tsx` (not `ComponentName.tsx`)
- **Utilities:** `utility-name.ts` (not `utilityName.ts`)
- **Actions:** `action-description-actions.ts` (e.g., `attendance-actions.ts`)

### **Variables & Functions**
- **camelCase** for variables, functions, constants
- **SCREAMING_SNAKE_CASE** for true constants (e.g., `TAX_BRACKETS`, `MIN_WAGE`)
- **PascalCase** for React components and classes

### **Database**
- **snake_case** for table/column names (PostgreSQL convention)
- **Tables:** Plural (`employees`, `branches`, not `employee`, `branch`)
- **Foreign keys:** `{table_singular}_id` (e.g., `employee_id`, `branch_id`)

---

## Code Organization Principles

### **Max File Size: 200 Lines**
If a file exceeds 200 lines, split it:
- **Components:** Extract sub-components to `components/{feature}/` subdirectory
- **Utilities:** Extract helpers to `lib/utils/`
- **Actions:** One server action per major workflow

### **Single Responsibility Principle**
- **Components:** Render only; no business logic
- **Actions:** Fetch/mutate only; no calculations
- **Services:** Business logic only; no component rendering
- **Types:** Data structure definitions only

### **Separation of Concerns**
```
UI Layer          (components/)       — React, shadcn/ui
Server Actions    (lib/actions/)      — Supabase queries
Services          (lib/services/)     — Calculations, business logic
Types             (lib/types/)        — TypeScript interfaces
Hooks             (lib/hooks/)        — React/Supabase hooks
Utils             (lib/utils/)        — Pure functions (date, format, etc.)
```

---

## Next.js & TypeScript Patterns

### **App Router (Next.js 16)**
- Use `app/` directory structure, NOT pages/
- Use `layout.tsx` for shared UI (navbar, sidebar)
- Use `loading.tsx` for Suspense boundaries
- Use `error.tsx` for error boundaries
- Route groups: `(dashboard)`, `(auth)` — don't appear in URL

### **Server Actions**
All data mutations through server actions (not API routes):
```typescript
// lib/actions/attendance-actions.ts
'use server'

import { createClient } from '@supabase/supabase-js'

export async function markAttendance(
  scheduleId: string,
  employeeId: string,
  date: string,
  status: '1' | '0' | 'KP' | '0.5'
) {
  const supabase = createClient(...)
  const { data, error } = await supabase
    .from('attendance')
    .upsert({ schedule_id: scheduleId, employee_id: employeeId, date, status })
    .select()

  if (error) throw error
  return data
}
```

### **Type Safety**
```typescript
// lib/types/attendance.ts
export interface AttendanceRecord {
  id: string
  schedule_id: string
  employee_id: string
  date: string
  status: AttendanceStatus
  marked_by: string
  created_at: string
  updated_at: string
}

export type AttendanceStatus = '1' | '0' | 'KP' | '0.5'
```

### **Environment Variables**
```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx  # Secret, never expose

# Cron (optional)
CRON_SECRET=xxxxx
```

---

## Component Structure

### **Functional Components Only**
```typescript
// components/attendance/attendance-grid.tsx
import { AttendanceGridProps } from '@/lib/types/attendance'
import { markAttendance } from '@/lib/actions/attendance-actions'

export default function AttendanceGrid({
  week,
  branch
}: AttendanceGridProps) {
  const [loading, setLoading] = useState(false)

  async function handleCellChange(
    scheduleId: string,
    employeeId: string,
    status: AttendanceStatus
  ) {
    setLoading(true)
    try {
      await markAttendance(scheduleId, employeeId, week.date, status)
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  return (
    <table className="w-full">
      {/* Grid rendering */}
    </table>
  )
}
```

### **No Class Components**
React.FC syntax is discouraged. Use function signature + return type:
```typescript
// ✅ Good
export default function MyComponent({ prop }: Props) {
  return <div>...</div>
}

// ❌ Avoid
export default class MyComponent extends React.Component { ... }
export const MyComponent: React.FC<Props> = ({ prop }) => { ... }
```

### **shadcn/ui Integration**
All UI built with shadcn/ui + Tailwind. No custom CSS (except Tailwind):
```typescript
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'

export default function Form() {
  return (
    <div className="space-y-4">
      <Input placeholder="Nhập tên..." />
      <Button onClick={handleSubmit}>Lưu</Button>
    </div>
  )
}
```

---

## Business Logic: Payroll Calculations

### **Location: `lib/services/payroll-calculation.ts`**

Keep ALL salary logic here. Exported as pure functions:

```typescript
// lib/services/payroll-calculation.ts
import { Employee, Payslip } from '@/lib/types'
import { calculateProgressiveTax } from '@/lib/utils/tax-calculator'

export function calculatePayslip(
  employee: Employee,
  sessionsWorked: number,
  kpiScore?: number  // 0-10, only for assistants
): Payslip {
  // 1. Base salary
  const baseTeachingPay = sessionsWorked * employee.rate_per_session

  // 2. KPI bonus (if assistant)
  const kpiBonus = employee.position === 'assistant'
    ? (kpiScore || 0) * 50000
    : 0

  // 3. GROSS
  const gross = baseTeachingPay + kpiBonus

  // 4. Insurance (if contract)
  const bhxh = employee.has_labor_contract ? gross * 0.08 : 0
  const bhyt = employee.has_labor_contract ? gross * 0.015 : 0
  const bhtn = employee.has_labor_contract ? gross * 0.01 : 0

  // 5. Tax (progressive)
  const taxableIncome = gross - bhxh - bhyt - bhtn - 11_000_000
    - (4_400_000 * (employee.dependent_count || 0))
  const tncn = calculateProgressiveTax(Math.max(0, taxableIncome))

  // 6. NET
  const net = gross - bhxh - bhyt - bhtn - tncn

  return {
    gross_pay: gross,
    bhxh,
    bhyt,
    bhtn,
    tncn,
    net_pay: net
  }
}
```

### **Unit Test (Jest)**
```typescript
// tests/unit/payroll-calculation.test.ts
describe('calculatePayslip', () => {
  it('calculates teaching assistant salary correctly', () => {
    const employee = {
      position: 'assistant',
      rate_per_session: 75000,
      has_labor_contract: false,
      dependent_count: 0
    } as Employee

    const result = calculatePayslip(employee, 16, 9)  // 16 sessions, KPI 9/10

    expect(result.gross_pay).toBe(1_780_000)  // 16×75k + 9×50k
    expect(result.bhxh).toBe(0)  // no contract
    expect(result.net_pay).toBe(1_780_000)
  })

  it('applies BHXH deduction with labor contract', () => {
    const employee = { ...mockEmployee, has_labor_contract: true }
    const result = calculatePayslip(employee, 20, 0)

    expect(result.bhxh).toBe(result.gross_pay * 0.08)
  })

  it('calculates progressive tax correctly', () => {
    // Taxable income of 15M (bracket 2) should be:
    // 5M × 5% + 10M × 10% = 250k + 1M = 1.25M
    const tax = calculateProgressiveTax(15_000_000)
    expect(tax).toBe(1_250_000)
  })
})
```

---

## Error Handling

### **Server Actions**
```typescript
'use server'

export async function markAttendance(...) {
  try {
    const { data, error } = await supabase.from('attendance').insert(...)

    if (error) {
      // Log for audit trail
      console.error('[AUDIT] Attendance mark failed:', error)
      throw new Error(`Không thể lưu chấm công: ${error.message}`)
    }

    return { success: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định'
    return { success: false, error: message }
  }
}
```

### **Component Error Boundaries**
```typescript
'use client'

import { ReactNode } from 'react'

export function ErrorBoundary({
  children,
  fallback
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  // Use React's error boundary pattern or external lib
  return children
}
```

---

## Testing Requirements

### **Payroll Calculations: Unit Tests**
- ✅ Test all 3 salary formulas (Office, Teacher, Assistant)
- ✅ Test BHXH/BHYT/BHTN with/without contract
- ✅ Test TNCN (tax) for all 7 brackets
- ✅ Test KPI bonus calculation (0-500k range)
- ✅ Test edge cases (negative income, dependents, etc.)

### **Attendance: Component Tests**
- ✅ Grid renders correct rows (classes) and columns (days)
- ✅ Auto-fill works for scheduled slots
- ✅ Cell editing saves to database
- ✅ Diff preview shows changes

### **Integration Tests**
- ✅ Create payroll period → auto-calculate all payslips → email
- ✅ BM marks attendance → accountant sees sessions_worked count
- ✅ KPI evaluation saves → bonus appears in payslip

---

## Vietnamese Localization

### **UI Labels**
All user-facing text in Vietnamese. Create `lib/constants/messages.ts`:

```typescript
// lib/constants/messages.ts
export const MESSAGES = {
  ATTENDANCE: {
    TITLE: 'Chấm công',
    MARK_ATTENDANCE: 'Đánh dấu chấm công',
    WEEK: 'Tuần',
    STATUS_PRESENT: 'Đi dạy',
    STATUS_ABSENT_PERMISSION: 'Vắng có phép',
    STATUS_ABSENT_NO_PERMISSION: 'Vắng không phép',
    STATUS_HALF: 'Nửa buổi',
    SAVE: 'Lưu tuần',
    SAVING: 'Đang lưu...',
    SAVED: 'Đã lưu'
  },
  PAYROLL: {
    TITLE: 'Tính lương',
    GROSS: 'Lương brutto',
    NET: 'Lương thực lãnh',
    BHXH: 'BHXH (8%)',
    TNCN: 'Thuế TNCN'
  },
  // ... more
}
```

Use throughout components:
```typescript
<h1>{MESSAGES.ATTENDANCE.TITLE}</h1>
<Button>{MESSAGES.ATTENDANCE.SAVE}</Button>
```

---

## Performance Standards

- **Attendance grid:** Load in <2s (100 rows)
- **Payroll calculation:** Complete in <5s (200 employees)
- **Bundle size:** Keep Next.js bundle < 300KB gzipped
- **Lighthouse score:** Aim for 80+ on all metrics

---

## Pre-commit Checklist

Before committing:
```bash
npm run lint          # Fix code style
npm run type-check   # Verify TypeScript
npm test             # Run unit tests
npm run build        # Check build succeeds
```

---

*Code Standards v1.1 | 2026-03-06 | Added class-schedules module, office-attendance, updated file structure*
