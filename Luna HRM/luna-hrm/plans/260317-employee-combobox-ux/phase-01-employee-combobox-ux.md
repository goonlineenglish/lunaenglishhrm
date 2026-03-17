# Phase 1: Employee Combobox UX Improvement

**Priority:** High (UX pain point)
**Status:** ✅ Complete + Codex Approved
**Completed:** 2026-03-18
**Estimated effort:** ~2-3h

## Context Links

- Brainstorm: conversation 2026-03-17 (Approach A selected)
- Current component: `components/class-schedules/employee-code-lookup.tsx`
- Form 1: `components/class-schedules/class-schedule-form.tsx` (L166-185)
- Form 2: `components/attendance/attendance-add-note-form.tsx` (L79-82)
- Server action: `lib/actions/class-schedule-query-actions.ts` → `lookupEmployeeByCode()`
- Barrel: `lib/actions/class-schedule-actions.ts`

## Overview

Thay thế `EmployeeCodeLookup` (search-by-code, server call mỗi keystroke, 4-5s latency) bằng `EmployeeCombobox` (prefetch 1 lần + shadcn Combobox/cmdk, client-side fuzzy filter, instant).

## Key Insights

- Dataset nhỏ (~20-100 NV/branch) → prefetch all là optimal, không cần pagination
- `cmdk` là dependency chính thức của shadcn Combobox, ~3KB gzipped
- `EmployeeCodeLookup` dùng ở 2 nơi → thay cả 2 cùng lúc
- Edit mode cần prefill: có `teacher_id`/`assistant_id` nhưng không có `employee_code` → prefetch list giải quyết tự nhiên (find by id)
- BM branch scoping đã có sẵn trong `getCurrentUser()`
- **🐛 BUG phát hiện:** `ClassScheduleForm` dùng `useState(initialValue)` (L53-64) nhưng component không bao giờ unmount (render cố định trong page L93-99). `useState` chỉ init lần đầu → khi user chuyển từ "Thêm" sang "Sửa" hoặc sửa schedule khác, form state KHÔNG reset → hiện data cũ/trống. **Fix:** thêm `useEffect` sync form state khi `open` hoặc `editSchedule` thay đổi.

## Requirements

### Functional
- [x] Combobox hiển thị danh sách NV: **Tên (Mã NV)** — ưu tiên tên
- [x] Tìm kiếm fuzzy: gõ tên hoặc mã đều match
- [x] Filter theo position (teacher/assistant) nếu cần
- [x] Branch scoping: BM chỉ thấy NV cùng branch
- [x] Edit form: prefill đúng NV từ `teacher_id`/`assistant_id`
- [x] Loading state khi đang fetch danh sách

### Non-Functional
- Latency: < 100ms cho filter (client-side)
- Fetch: 1 server call khi form mở (thay vì N calls mỗi keystroke)
- Accessibility: keyboard navigation (Arrow, Enter, Escape)
- Mobile: touch-friendly dropdown

## Architecture

```
ClassScheduleForm / AddNoteForm
  │
  ├─ useEffect(() => fetchEmployees(branchId), [])   ← 1 fetch
  │     └─ Server Action: getEmployeesForSelection(branchId)
  │           └─ Supabase: employees WHERE is_active=true AND branch_id=?
  │
  └─ <EmployeeCombobox
        employees={teachers}     ← pre-filtered by position
        value={form.teacher_id}  ← controlled
        onSelect={handleTeacher}
      />
        └─ shadcn Popover + Command (cmdk)
              └─ Client-side fuzzy filter on full_name + employee_code
```

## Related Code Files

### Tạo mới
| File | Mô tả |
|------|--------|
| `components/ui/popover.tsx` | shadcn Popover (Radix) |
| `components/ui/command.tsx` | shadcn Command (cmdk wrapper) |
| `components/class-schedules/employee-combobox.tsx` | Combobox chọn NV (thay EmployeeCodeLookup) |

### Sửa
| File | Thay đổi |
|------|----------|
| `lib/actions/class-schedule-query-actions.ts` | Thêm `getEmployeesForSelection()`, giữ `lookupEmployeeByCode` (deprecate) |
| `lib/actions/class-schedule-actions.ts` | Export thêm `getEmployeesForSelection` |
| `components/class-schedules/class-schedule-form.tsx` | Thay `EmployeeCodeLookup` → `EmployeeCombobox`, thêm fetch logic |
| `components/attendance/attendance-add-note-form.tsx` | Thay `EmployeeCodeLookup` → `EmployeeCombobox`, thêm fetch logic |

### Xóa
| File | Lý do |
|------|-------|
| `components/class-schedules/employee-code-lookup.tsx` | Replaced by EmployeeCombobox |

## Implementation Steps

### Step 1: Install cmdk dependency
```bash
npm install cmdk
```

### Step 2: Add shadcn Popover component
- Tạo `components/ui/popover.tsx` từ shadcn template
- Uses `@radix-ui/react-popover` (đã có qua radix-ui package)

### Step 3: Add shadcn Command component
- Tạo `components/ui/command.tsx` từ shadcn template
- Wrapper cho `cmdk` với shadcn styling

### Step 4: Create server action `getEmployeesForSelection`
File: `lib/actions/class-schedule-query-actions.ts`

```typescript
/** Fetch all active employees for combobox selection. Role-gated + branch-scoped. */
export async function getEmployeesForSelection(
  branchId?: string
): Promise<ActionResult<EmployeeLookup[]>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập.' }

  // ISSUE-4 fix: Enforce role authorization — only admin/BM/accountant can fetch bulk list
  const canAccess = hasAnyRole(user, 'admin', 'branch_manager', 'accountant')
  if (!canAccess) return { success: false, error: 'Không có quyền.' }

  const supabase = await createClient()
  const sb = supabase as any

  // ISSUE-3 fix: Admin with branchId="" → fetch all (acceptable for ~100 NV total)
  // BM → always scoped to own branch regardless of branchId param
  const effectiveBranch = user.roles.includes('branch_manager')
    ? user.branch_id
    : branchId || undefined  // empty string → undefined = no filter (admin sees all)

  let query = sb
    .from('employees')
    .select('id, employee_code, full_name, position, rate_per_session')
    .eq('is_active', true)
    .order('full_name')

  if (effectiveBranch) query = query.eq('branch_id', effectiveBranch)

  const { data, error } = await query
  if (error) throw error
  return { success: true, data: (data ?? []) as EmployeeLookup[] }
}
```

**Branch behavior (ISSUE-3 clarification):**
- **Admin:** `branchId=""` from page → fetch ALL active employees across branches. Acceptable vì scale ~100 NV max.
- **BM:** Always scoped to `user.branch_id` regardless of param. Cannot see other branch employees.
- **Accountant:** Same as admin — needs to see all employees for weekly notes.

### Step 5: Export from barrel
File: `lib/actions/class-schedule-actions.ts`
- Add `getEmployeesForSelection` to exports

### Step 6: Create EmployeeCombobox component
File: `components/class-schedules/employee-combobox.tsx`

Props:
```typescript
interface Props {
  employees: EmployeeLookup[]  // prefetched list
  value: string                // employee_id (controlled)
  onSelect: (emp: EmployeeLookup) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean            // show skeleton while fetching
}
```

Behavior:
- Hiển thị button trigger: tên NV đã chọn hoặc placeholder
- Click → Popover mở với Command (search input + list)
- **ISSUE-1 fix:** Mỗi `CommandItem` cần `value={emp.full_name + " " + emp.employee_code}` để cmdk filter cả tên lẫn mã. Hoặc dùng `keywords={[emp.employee_code]}` prop nếu cmdk v1+ hỗ trợ.
- Mỗi item hiển thị: **Tên NV** `(Mã NV)` — position label
- Select → close popover, callback onSelect
- Keyboard: Arrow navigate, Enter select, Escape close
- **ISSUE-2 fix — Async hydration + fallback:**
  - Khi `loading=true`: hiển thị skeleton/spinner trên trigger button
  - Khi `employees` load xong: derive display label bằng `employees.find(e => e.id === value)`
  - Nếu `value` có nhưng không tìm thấy trong `employees` (NV inactive/xóa): hiển thị `"NV không hoạt động (ID: ...)"` styled muted, cho phép user chọn NV mới
  - **Manual test:** Edit lịch cũ mà GV/TG đã bị deactivate → form phải hiện warning, không crash

### Step 7: Integrate into ClassScheduleForm + Fix stale state bug
File: `components/class-schedules/class-schedule-form.tsx`

Changes:
1. Import `EmployeeCombobox` thay `EmployeeCodeLookup`
2. Import `getEmployeesForSelection` + `useEffect`
3. Add state: `employees: EmployeeLookup[]`, `loadingEmployees: boolean`
4. **🐛 FIX stale state bug:** Add `useEffect` sync form state khi `open`/`editSchedule` thay đổi:
   ```typescript
   useEffect(() => {
     if (!open) return
     if (editSchedule) {
       setForm({
         class_code: editSchedule.class_code,
         class_name: editSchedule.class_name,
         shift_time: editSchedule.shift_time,
         days_of_week: editSchedule.days_of_week,
         teacher_id: editSchedule.teacher_id,
         assistant_id: editSchedule.assistant_id,
         teacher_rate: editSchedule.teacher_rate?.toString() ?? '',
         assistant_rate: editSchedule.assistant_rate?.toString() ?? '',
       })
     } else {
       setForm(EMPTY)  // Thêm mới → form trống
     }
     setError(null)
   }, [open, editSchedule])
   ```
5. Add `useEffect` fetch employees khi form open (depend on `open`, `branchId`)
6. Filter `teachers = employees.filter(e => e.position === 'teacher')`
7. Filter `assistants = employees.filter(e => e.position === 'assistant')`
8. Replace `<EmployeeCodeLookup>` × 2 → `<EmployeeCombobox>`
9. Remove `teacher_code`, `assistant_code` from FormState (không cần nữa — Combobox dùng `value={teacher_id}` match trong employees list)
10. Edit prefill: value={form.teacher_id} → Combobox tự hiển thị tên từ employees list

### Step 8: Integrate into AttendanceAddNoteForm
File: `components/attendance/attendance-add-note-form.tsx`

Changes:
1. Import `EmployeeCombobox` thay `EmployeeCodeLookup`
2. Import `getEmployeesForSelection`
3. Add state: `employees: EmployeeLookup[]`, `loadingEmployees: boolean`
4. Add `useEffect` fetch employees khi showForm=true
5. Replace `<EmployeeCodeLookup>` → `<EmployeeCombobox employees={employees} value={employeeId}>`
6. Remove `employeeCode` state (không cần nữa)

### Step 9: Delete old component
- Remove `components/class-schedules/employee-code-lookup.tsx`
- Remove `lookupEmployeeByCode` from barrel export (optional — keep for backward compat)

### Step 10: Build verify
```bash
npm run build
```

## Todo List

- [x] Install `cmdk` dependency
- [x] Create `components/ui/popover.tsx`
- [x] Create `components/ui/command.tsx`
- [x] Add `getEmployeesForSelection()` server action
- [x] Export from barrel `class-schedule-actions.ts`
- [x] Create `components/class-schedules/employee-combobox.tsx`
- [x] 🐛 Fix stale state bug: add `useEffect` sync form in `class-schedule-form.tsx`
- [x] Update `class-schedule-form.tsx` — use EmployeeCombobox
- [x] Update `attendance-add-note-form.tsx` — use EmployeeCombobox
- [x] Delete `employee-code-lookup.tsx`
- [x] `npm run build` — 0 errors, 27 routes
- [x] Codex review — 4 issues fixed (type=button, server-side is_active, fallbackLabel, updateClassSchedule validation)
- [x] Codex verdict: APPROVE (Round 3)

## Success Criteria

- ✅ Combobox mở instant (không delay 4-5s)
- ✅ Tìm theo tên hoặc mã đều hoạt động (ISSUE-1: cả 2 field searchable)
- ✅ Edit form prefill đúng GV/TG (ISSUE-2: async hydration handled)
- ✅ Edit form với NV inactive hiện fallback warning (ISSUE-2)
- ✅ Branch scoping hoạt động — Admin thấy all, BM chỉ branch mình (ISSUE-3)
- ✅ Role authorization: chỉ admin/BM/accountant gọi được bulk list (ISSUE-4)
- ✅ Keyboard navigation hoạt động
- ✅ Build clean, 0 errors, 27 routes
- ✅ Codex Round 3: APPROVE (4 issues fixed)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stale employee data | Low | Data chỉ stale nếu NV thêm mới trong lúc form đang mở. Acceptable — reopen form = fresh data |
| cmdk version conflict | Low | Check latest cmdk compatible with shadcn v2/radix |
| Popover positioning on mobile | Low | shadcn Popover handles responsive by default |
| **Admin branchId="" on mutation** | Medium | **Pre-existing issue (Codex R2 ISSUE-1):** Page truyền `branchId=""` cho admin. Mutation `createClassSchedule` sẽ nhận `branch_id: ""`. **Ngoài scope plan này** — plan chỉ thay đổi employee selection, không thay đổi mutation flow. Tuy nhiên, trên thực tế BM là người chính dùng trang này (BM luôn có branch). Admin hiếm khi tạo lịch trực tiếp. **Recommend:** Tạo follow-up ticket để fix admin branch selection nếu cần. |

## Security Considerations

- **ISSUE-4 fix:** `getEmployeesForSelection()` enforces `hasAnyRole(user, 'admin', 'branch_manager', 'accountant')` — employee role cannot call bulk list
- BM always scoped to own branch via `user.branch_id` — cannot bypass to see other branches
- Giữ nguyên RLS policies trên Supabase (belt-and-suspenders with server action check)

## Next Steps

✅ **All 7 phases complete + Codex approved.**
- Branch ready to merge into main
- Deploy on next production release
