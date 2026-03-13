# Luna HRM Code Standards & Best Practices

**Project:** Luna HRM
**Status:** All 7 phases complete
**Last Updated:** 2026-03-07

---

## Table of Contents

1. [File Organization](#file-organization)
2. [Naming Conventions](#naming-conventions)
3. [Code Style](#code-style)
4. [TypeScript Standards](#typescript-standards)
5. [React & Components](#react--components)
6. [Server Actions & API](#server-actions--api)
7. [Database & RLS](#database--rls)
8. [Authentication & Authorization](#authentication--authorization)
9. [Error Handling](#error-handling)
10. [Testing](#testing)
11. [Documentation](#documentation)
12. [Git Workflow](#git-workflow)

---

## File Organization

### Directory Structure

```
luna-hrm/
├── app/
│   ├── (auth)/                       # Auth pages (public)
│   │   ├── login/
│   │   ├── signup/
│   │   └── verify-email/
│   ├── (dashboard)/                  # Protected pages
│   │   ├── class-schedules/
│   │   ├── attendance/
│   │   ├── employees/
│   │   ├── payroll/
│   │   ├── kpi/
│   │   ├── evaluation-templates/
│   │   ├── evaluation-periods/
│   │   ├── my-attendance/
│   │   ├── my-payslips/
│   │   ├── my-profile/
│   │   └── layout.tsx                # Dashboard layout
│   ├── api/
│   │   ├── auth/
│   │   ├── class-schedules/
│   │   ├── attendance/
│   │   ├── employees/
│   │   ├── payroll/
│   │   ├── kpi/
│   │   ├── evaluation/
│   │   ├── audit/
│   │   └── cron/
│   ├── globals.css
│   └── layout.tsx                    # Root layout
├── components/
│   ├── layout/
│   │   ├── sidebar-nav.tsx
│   │   ├── topbar.tsx
│   │   ├── footer.tsx
│   │   └── mobile-nav.tsx
│   ├── class-schedules/
│   │   ├── class-schedule-form.tsx
│   │   ├── class-schedule-table.tsx
│   │   ├── excel-import-dialog.tsx
│   │   └── index.ts                  # Barrel export
│   ├── attendance/
│   │   ├── attendance-grid.tsx
│   │   ├── attendance-grid-helpers.ts
│   │   ├── attendance-notes-panel.tsx
│   │   ├── attendance-diff-viewer.tsx
│   │   └── index.ts
│   ├── [other feature components]/
│   └── shared/
│       ├── dialog-confirm.tsx
│       ├── alert-banner.tsx
│       ├── loading-spinner.tsx
│       └── index.ts
├── lib/
│   ├── actions/
│   │   ├── class-schedule-actions.ts
│   │   ├── attendance-actions.ts
│   │   ├── [other actions]/
│   │   └── index.ts                  # Barrel export
│   ├── services/
│   │   ├── auth-service.ts
│   │   ├── payroll-calculation-service.ts
│   │   ├── audit-log-service.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-permissions.ts
│   │   ├── use-attendance-keyboard.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── employee.ts
│   │   ├── attendance.ts
│   │   ├── payroll.ts
│   │   └── index.ts                  # Barrel export
│   ├── utils/
│   │   ├── date-helpers.ts
│   │   ├── format-helpers.ts
│   │   ├── excel-schedule-parser.ts
│   │   ├── validation.ts
│   │   └── index.ts
│   ├── constants/
│   │   ├── messages.ts               # Vietnamese labels
│   │   ├── navigation.ts             # Route definitions
│   │   ├── business-rules.ts         # KPI scale, tax brackets
│   │   └── index.ts
│   ├── db/
│   │   └── supabase.ts               # Supabase client
│   └── middleware.ts                 # Auth middleware
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_audit_logs.sql
│   │   └── seed.ts
├── public/
│   ├── manifest.json
│   └── sw.js                         # Service worker
├── tests/
│   ├── attendance-lock.test.ts
│   ├── payroll-calculation.test.ts
│   └── kpi-bonus.test.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

### File Size Limits

- **Components:** Max 200 LOC (split into smaller components + helpers)
- **Server Actions:** Max 200 LOC per file (split by feature)
- **Types:** Max 150 LOC per file
- **Utils/Services:** Max 250 LOC per file

If approaching limit, create helpers file or split into multiple focused files.

---

## Naming Conventions

### Files

- **Components:** PascalCase, descriptive name
  ```
  ✅ ClassScheduleForm.tsx
  ✅ AttendanceGridHelpers.ts
  ❌ form.tsx
  ❌ helpers.ts
  ```

- **Server Actions:** kebab-case, action-focused
  ```
  ✅ class-schedule-actions.ts
  ✅ attendance-save-actions.ts
  ❌ classScheduleActions.ts
  ❌ service-class-schedule.ts
  ```

- **Types/Interfaces:** Suffix with .types or inside file
  ```
  ✅ attendance.ts (contains AttendanceRecord, AttendanceStatus)
  ✅ types/payroll.ts
  ❌ attendance-types.ts
  ```

- **Hooks:** Prefix with `use-`
  ```
  ✅ use-auth.ts
  ✅ use-attendance-keyboard.ts
  ❌ auth-hook.ts
  ❌ keyboard.ts
  ```

- **Utils:** Suffix with `-helpers` or `-utils`
  ```
  ✅ date-helpers.ts
  ✅ excel-schedule-parser.ts
  ❌ dates.ts
  ❌ schedule-parser.ts
  ```

### Variables & Constants

- **Constants:** UPPER_SNAKE_CASE
  ```typescript
  ✅ const MAX_SESSIONS_PER_DAY = 5;
  ✅ const ATTENDANCE_STATUSES = ['1', '0', 'KP', '0.5'];
  ❌ const maxSessions = 5;
  ❌ const statuses = [...];
  ```

- **Variables:** camelCase
  ```typescript
  ✅ const attendanceData = [...];
  ✅ let isLoading = false;
  ❌ const attendance_data = [...];
  ❌ let IsLoading = false;
  ```

- **Boolean Prefixes:** `is`, `has`, `can`, `should`
  ```typescript
  ✅ const isActive = true;
  ✅ const hasLaborContract = false;
  ✅ const canEditAttendance = true;
  ✅ const shouldAutoLock = true;
  ❌ const active = true;
  ❌ const laborContract = false;
  ```

- **Functions:** camelCase, action-focused
  ```typescript
  ✅ const saveAttendance = async (data) => {};
  ✅ const formatCurrency = (amount) => {};
  ✅ const calculateBonus = (score) => {};
  ❌ const save = async (data) => {};
  ❌ const format = (amount) => {};
  ```

### Types & Interfaces

- **Type Names:** PascalCase
  ```typescript
  ✅ type AttendanceRecord = { ... };
  ✅ interface Employee { ... }
  ✅ type PayrollPeriod = { ... };
  ❌ type attendanceRecord = { ... };
  ❌ type ATTENDANCE_RECORD = { ... };
  ```

- **Database Types:** Plural table name as type
  ```typescript
  ✅ type Employee = { id: UUID; full_name: string; ... };
  ✅ type PayrollPeriod = { id: UUID; branch_id: UUID; ... };
  ❌ type EmployeeRecord = { ... };
  ❌ type EmployeeType = { ... };
  ```

- **Enums:** PascalCase
  ```typescript
  ✅ enum AttendanceStatus { Present = '1', Absent = '0', ... }
  ❌ enum ATTENDANCE_STATUS { ... }
  ❌ enum attendanceStatus { ... }
  ```

---

## Code Style

### Formatting

- **Indentation:** 2 spaces (Tailwind/Next.js standard)
- **Line Length:** Max 100 characters (readability)
- **Quotes:** Double quotes for strings
- **Semicolons:** Always (for consistency)
- **Trailing Commas:** In objects/arrays across multiple lines

### Imports

- **Order:** External → Internal → Types
  ```typescript
  ✅
  import React, { useState } from 'react';
  import { Button } from '@/components/ui/button';
  import { saveAttendance } from '@/lib/actions/attendance-actions';
  import type { Attendance } from '@/lib/types';

  ❌
  import type { Attendance } from '@/lib/types';
  import { saveAttendance } from '@/lib/actions';
  import React from 'react';
  import Button from '@/components/ui/button';
  ```

- **Barrel Exports:** Use for cleaner imports
  ```typescript
  // lib/actions/index.ts
  export * from './class-schedule-actions';
  export * from './attendance-actions';

  // Usage
  import { saveAttendance, listClassSchedules } from '@/lib/actions';
  ```

### Comments

- **Block Comments:** For complex logic only
  ```typescript
  ✅
  // Calculate payroll: Sum sessions × rate, apply tax/insurance, deduct penalties
  const grossSalary = sessions * rate + otherAllowances;

  ❌ (obvious)
  // Set isLoading to true
  setIsLoading(true);
  ```

- **JSDoc:** For exported functions
  ```typescript
  ✅
  /**
   * Calculate net salary for teaching assistant
   * @param sessions - Number of sessions worked
   * @param rate - Rate per session (75,000 VND)
   * @param kpiBonus - KPI bonus amount
   * @returns Net salary after deductions
   */
  export const calculateAssistantSalary = (sessions, rate, kpiBonus) => {
    ...
  };

  ❌ (no docs)
  export const calculateAssistantSalary = (sessions, rate, kpiBonus) => {};
  ```

---

## TypeScript Standards

### Strict Mode

- **tsconfig.json:** `strict: true` (all strict checks enabled)
- **No `any` type:** Use `unknown` + type narrowing
  ```typescript
  ✅
  const handleData = (data: unknown) => {
    if (typeof data === 'object' && data !== null && 'id' in data) {
      return (data as { id: string }).id;
    }
  };

  ❌
  const handleData = (data: any) => data.id;
  ```

- **Type Imports:** Use `import type` for types
  ```typescript
  ✅ import type { Employee } from '@/lib/types';
  ❌ import { Employee } from '@/lib/types';
  ```

### Type Definitions

- **Explicit Return Types:** For functions
  ```typescript
  ✅
  const calculateBonus = (score: number): number => {
    return score * 50_000;
  };

  ❌
  const calculateBonus = (score: number) => score * 50_000;
  ```

- **Union Types:** Prefer union over multiple optional fields
  ```typescript
  ✅
  type AttendanceRecord = {
    id: string;
    status: '1' | '0' | 'KP' | '0.5';
  };

  ❌
  type AttendanceRecord = {
    id: string;
    isPresent?: boolean;
    isAbsent?: boolean;
  };
  ```

- **Nullable Types:** Use `null` explicitly
  ```typescript
  ✅ type Employee = { manager_id: string | null; };
  ❌ type Employee = { manager_id?: string; };
  ```

---

## React & Components

### Component Structure

- **Functional Components:** Always
- **Hooks:** Keep near top of component
- **Props Interface:** Define before component
  ```typescript
  ✅
  interface ClassScheduleFormProps {
    onSubmit: (data: ClassSchedule) => Promise<void>;
    isLoading?: boolean;
  }

  export const ClassScheduleForm: React.FC<ClassScheduleFormProps> = ({
    onSubmit,
    isLoading = false,
  }) => {
    const [formData, setFormData] = useState<ClassSchedule>({});
    ...
  };

  ❌
  export const ClassScheduleForm = ({ onSubmit, isLoading }) => {
    ...
  };
  ```

### Component Splitting

- **> 200 LOC:** Split into smaller components + helpers
  ```
  ✅ attendance-grid.tsx (main grid) + attendance-grid-helpers.ts (utilities)
  ✅ payroll-period-form.tsx (form) + payroll-preview.tsx (preview panel)
  ❌ single 400-line component
  ```

### State Management

- **Local State:** `useState` for UI state
- **Server State:** Server Actions via `useTransition` or direct calls
- **Context:** Only for auth/global theme (avoid prop drilling)
  ```typescript
  ✅
  const { authUser, logout } = useAuth();

  ❌
  const { user, setUser, loading, setLoading, error, setError } = useContext(GlobalContext);
  ```

### Event Handlers

- **Naming:** `handle{Event}` or `on{Event}`
  ```typescript
  ✅
  const handleSaveClick = async () => { ... };
  const handleAttendanceChange = (newStatus) => { ... };
  const onSubmit = (data) => { ... };

  ❌
  const save = () => { ... };
  const attendanceChange = (newStatus) => { ... };
  ```

---

## Server Actions & API

### Server Action Files

- **Location:** `/lib/actions/[feature]-actions.ts`
- **Naming:** Verb-focused (`save`, `create`, `update`, `delete`, `query`)
- **Pattern:** All actions are `async`

### Server Action Structure

```typescript
✅
'use server';

import { createClient } from '@/lib/db/supabase';
import type { Attendance } from '@/lib/types';

/**
 * Query attendance grid for week
 */
export const queryAttendanceGrid = async (
  classScheduleId: string,
  weekStart: string
): Promise<Attendance[]> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_schedule_id', classScheduleId)
      .eq('week_start', weekStart);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Query attendance failed:', error);
    throw new Error('Failed to fetch attendance');
  }
};

/**
 * Save attendance grid updates
 */
export const saveAttendanceGrid = async (
  updates: Attendance[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = createClient();

    // Validate input
    if (!updates.length) {
      return { success: false, error: 'No updates to save' };
    }

    // Upsert pattern (single query)
    const { error } = await supabase
      .from('attendance')
      .upsert(updates, { onConflict: 'class_schedule_id,week_start' });

    if (error) throw error;

    // Audit log (fire-and-forget)
    await logAudit('UPDATE', 'attendance', updates[0].id, {
      updated_count: updates.length,
    });

    return { success: true };
  } catch (error) {
    console.error('Save attendance failed:', error);
    return { success: false, error: 'Failed to save attendance' };
  }
};
```

### Error Handling in Actions

- **Try-catch:** Always wrap database calls
- **User-friendly Messages:** Return descriptive errors
- **Logging:** Log technical errors, return safe messages
  ```typescript
  ✅
  try {
    // Action code
  } catch (error) {
    console.error('Action failed:', error); // Technical
    return { success: false, error: 'Failed to save. Please try again.' }; // User-friendly
  }

  ❌
  try {
    // Action code
  } catch (error) {
    return { error: error.message }; // Raw error
  }
  ```

---

## Database & RLS

### Table Naming

- **Plural names:** `employees`, `class_schedules`, `attendance`
- **Snake_case:** Always
- **Abbrev avoided:** Use full names for clarity
  ```sql
  ✅ employee_weekly_notes
  ❌ emp_notes
  ❌ weekly_notes
  ```

### Column Naming

- **Primary key:** `id` (UUID)
- **Foreign keys:** `[table]_id` (e.g., `employee_id`, `branch_id`)
- **Timestamps:** `created_at`, `updated_at` (TIMESTAMPTZ)
- **Boolean flags:** Prefix with `is_` or `has_`
  ```sql
  ✅ is_active BOOLEAN
  ✅ has_labor_contract BOOLEAN
  ✅ is_locked BOOLEAN

  ❌ active BOOLEAN
  ❌ labor_contract BOOLEAN
  ```

### Constraints & Indexes

- **Primary Key:** Always `id UUID PRIMARY KEY`
- **Foreign Keys:** Always (enforce relationships)
- **Unique Constraints:** On natural keys (e.g., employee_code)
- **Indexes:** On filter columns (week_start, branch_id, employee_id)
  ```sql
  ✅
  CREATE INDEX idx_attendance_week_start ON attendance(week_start);
  CREATE INDEX idx_class_schedules_branch ON class_schedules(branch_id);

  ❌ (unused)
  CREATE INDEX idx_attendance_id ON attendance(id); -- Primary key auto-indexed
  ```

### RLS Policies

- **Naming:** `{table}_{action}_{role}` or `{table}_{scope}`
- **Clarity:** Write policies for each role explicitly
  ```sql
  ✅
  CREATE POLICY "employees_select_branch_manager"
  ON employees FOR SELECT
  TO authenticated
  USING (branch_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'branch_id')::uuid);

  ❌
  CREATE POLICY "select_policy" ON employees ...
  ```

---

## Authentication & Authorization

### JWT & app_metadata

- **Identity:** `auth.users.id` = `employees.id` (same UUID)
- **Metadata:** Store role + branch_id in `app_metadata` (admin-only)
  ```json
  ✅ app_metadata = { "role": "branch_manager", "branch_id": "uuid..." }
  ❌ app_metadata = { "role": "branch_manager", "permissions": [...] }
  ```

### Role Checks

- **Server-side:** Always check JWT role in actions
  ```typescript
  ✅
  export const createEvaluationTemplate = async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.app_metadata?.role;

    if (role !== 'admin') {
      throw new Error('Unauthorized');
    }
    // Continue...
  };
  ```

- **Client-side:** UI hints only (server enforces)
  ```typescript
  ✅
  const { canEdit } = usePermissions(); // Hides UI button
  // Server still checks auth in action

  ❌
  if (!canEdit) return null; // No server check
  ```

---

## Error Handling

### Try-Catch Pattern

```typescript
✅
try {
  const result = await someAsyncAction();
  return { success: true, data: result };
} catch (error) {
  console.error('Action failed:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}

❌
try {
  const result = await someAsyncAction();
  return result;
} catch (error) {
  throw error; // Silent failure in component
}
```

### User Feedback

- **Error Messages:** Clear, actionable
  ```
  ✅ "Failed to save attendance. Please check your internet connection and try again."
  ❌ "Error: UNIQUE constraint failed on attendance"
  ❌ "500 Internal Server Error"
  ```

- **Loading States:** Show during async operations
  ```typescript
  ✅
  const { isPending } = useTransition();
  return <Button disabled={isPending}>{isPending ? 'Saving...' : 'Save'}</Button>;

  ❌
  return <Button>Save</Button>; // No feedback
  ```

---

## Testing

### Unit Tests

- **Location:** `tests/[feature].test.ts`
- **Framework:** Jest or Vitest
- **Coverage:** Core logic (payroll, KPI, attendance lock)

```typescript
✅
describe('calculateAssistantSalary', () => {
  it('should calculate correct salary with KPI bonus', () => {
    const result = calculateAssistantSalary({
      sessions: 10,
      rate: 75_000,
      kpiBonus: 250_000,
      bhxh: 60_000,
    });
    expect(result).toBe(935_000); // (10 × 75k) + 250k - 60k
  });

  it('should zero bonus if base_pass is false', () => {
    const result = calculateAssistantSalary({
      sessions: 10,
      rate: 75_000,
      kpiBonus: 250_000,
      basePass: false,
      bhxh: 60_000,
    });
    expect(result).toBe(685_000); // No KPI bonus
  });
});
```

### Integration Tests

- **RLS Policies:** Verify role-based access
- **CRUD Operations:** Test full data flow
- **Calculations:** Verify complex formulas

---

## Documentation

### Code Comments

- **Why, not What:** Explain intent, not obvious code
  ```typescript
  ✅
  // Normalize week_start to Monday for consistent lock grouping
  const weekStart = getWeekStart(date);

  ❌
  // Get week start
  const weekStart = getWeekStart(date);
  ```

### README.md

- Setup instructions
- Environment variables
- npm scripts (dev, build, test, lint)
- Architecture overview
- Common issues & solutions

### Type Documentation

- **JSDoc for exported functions:**
  ```typescript
  ✅
  /**
   * Parse ISO date string to local Date (not UTC)
   * @param isoString - Date in YYYY-MM-DD format
   * @returns Date at local midnight
   * @example
   * parseIsoDateLocal('2026-03-07') // → Date(2026-03-07 00:00:00 local)
   */
  export const parseIsoDateLocal = (isoString: string): Date => {};
  ```

---

## Git Workflow

### Commit Messages

- **Format:** Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **Scope:** Optional but helpful
  ```
  ✅ feat(attendance): add auto-fill from previous week
  ✅ fix(payroll): correct BHXH calculation for labor contracts
  ✅ docs: update system architecture

  ❌ fixed stuff
  ❌ wip
  ❌ random changes
  ```

### Branch Naming

- **Convention:** `{type}/{description}`
  ```
  ✅ feature/class-schedule-import
  ✅ fix/attendance-lock-timezone
  ✅ docs/system-architecture

  ❌ my-branch
  ❌ test
  ❌ feature1
  ```

### PRs

- **Title:** Clear, under 70 chars
- **Description:** What changed, why, test plan
- **Checks:** Build passes, tests pass, no lint errors

---

## Performance Guidelines

### React Component Performance

- **Memoization:** For expensive renders only
  ```typescript
  ✅
  const AttendanceGrid = React.memo(({ data, onChange }) => {
    // Complex rendering...
  });

  ❌ (no benefit)
  const Button = React.memo(({ label, onClick }) => (
    <button onClick={onClick}>{label}</button>
  ));
  ```

### Database Query Optimization

- **Indexes:** Add on filter columns
- **Upsert:** Use single query instead of insert+loop
- **RLS:** Minimize policy evaluation (avoid N+1 joins)

### Code Splitting

- **Dynamic Imports:** For large components
  ```typescript
  ✅ const PayrollChart = dynamic(() => import('@/components/payroll/payroll-chart'));
  ```

---

## Security Best Practices

1. **No Secrets in Code:** Use .env.local (never commit)
2. **Input Validation:** On server (client validation is hints only)
3. **RLS First:** Database enforces access control
4. **XSS Prevention:** React escapes by default (no dangerouslySetInnerHTML)
5. **CSRF:** Next.js handles (no manual tokens needed)
6. **Audit Logging:** All mutations logged

---

## Vietnamese Localization

### Message Constants

```typescript
// lib/constants/messages.ts
export const LABELS = {
  classSchedule: 'Ca Làm Việc',
  attendance: 'Chấm Công',
  payroll: 'Tính Lương',
  kpi: 'KPI Trợ Giảng',
  evaluation: 'Đánh Giá NV',
  profile: 'Hồ Sơ',
  notes: 'Ghi Chú',
};

export const ACTIONS = {
  save: 'Lưu',
  cancel: 'Hủy',
  delete: 'Xóa',
  edit: 'Chỉnh Sửa',
  add: 'Thêm',
};

// Usage
<Button>{ACTIONS.save}</Button>
```

### Date Formatting

- **Display:** `DD/MM/YYYY` (Vietnamese standard)
- **Database:** `YYYY-MM-DD` (ISO, always)
- **Use:** `format.ts` helpers

---

## Checklist Before Commit

- [ ] Code compiles (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console errors in dev
- [ ] No `any` types (strict TypeScript)
- [ ] Comments added for complex logic
- [ ] RLS policies updated (if DB schema changed)
- [ ] Commit message follows convention
- [ ] No secrets in code (.env.local not committed)

---

**Last Updated:** 2026-03-07
**Maintained By:** Luna HRM Team
