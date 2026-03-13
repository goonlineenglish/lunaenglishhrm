# Code Review: Phase 5 — Employee Self-Service Portal

**Date:** 2026-03-07
**Reviewer:** code-reviewer agent (adversarial)
**Scope:** 14 files (4 new pages, 3 new components, 1 server-action module, 2 PWA files, 4 modified files)
**LOC:** ~1,023

---

## Overall Assessment

Phase 5 is a solid, clean implementation. Security is well-layered: RLS at DB level + server-action ownership checks + page-level role guards. PWA service worker is correctly scoped. UI is mobile-optimized with Vietnamese labels. However, several security and robustness issues need attention before production.

---

## [P0] Critical — Must Fix Before Production

### P0-1. Middleware does not protect employee portal routes (IDOR via URL access)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\proxy.ts` (line 7)
**Description:** The `PROTECTED_PATHS` array is:
```ts
const PROTECTED_PATHS = ['/dashboard', '/branches', '/employees', '/attendance', '/payroll', '/kpi', '/profile']
```
The new employee portal routes `/my-attendance`, `/my-payslips`, `/my-profile` are **NOT listed**. This means an unauthenticated user can hit these pages without middleware redirecting to `/login`. The pages themselves call `getCurrentUser()` and redirect, but:
1. The server-side redirect in the page component fires after the full RSC render pipeline begins, wasting server resources.
2. The Supabase session cookie is still refreshed by `updateSession()` — but only if the middleware path matches. Without matching, the session may expire faster.
3. Inconsistent with the existing pattern (all other dashboard routes are protected in middleware).

**Suggested fix:**
```ts
const PROTECTED_PATHS = [
  '/dashboard', '/branches', '/employees', '/attendance', '/payroll',
  '/kpi', '/profile', '/my-attendance', '/my-payslips', '/my-profile',
]
```

### P0-2. getEmployeeById leaks full employee data to any authenticated role

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-actions.ts` (lines 83-114)
**Used by:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\my-profile\page.tsx` (line 33)

**Description:** The `getEmployeeById(id)` function checks `branch_manager` scoping but has **no explicit employee-role guard**. It relies entirely on RLS (`employees_self_select` policy: `id = auth.uid()`). If the action is called with a different employee's ID:
- RLS will return empty → function returns "Không tìm thấy" error — this is safe.
- But the function returns the **full Employee object** including `rate_per_session`, `sub_rate`, `has_labor_contract`, `dependent_count`, `id_number`, `bank_account_number`. For an employee viewing their **own** profile, most of these are fine, but `rate_per_session` and `sub_rate` are salary configuration fields that may be considered sensitive in some organizations.

While RLS protects against IDOR, the server action lacks a defence-in-depth ownership check for employee role (unlike `getMyPayslipDetail` which checks `payslip.employee_id !== user.id`).

**Suggested fix:**
```ts
// After line 104, add:
if (user.role === 'employee' && emp.id !== user.id) {
  return { success: false, error: 'Bạn không có quyền xem nhân viên này.' }
}
```

### P0-3. PWA manifest references non-existent icon files

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\public\manifest.json` (lines 11-12)
**Description:** The manifest references `/icons/icon-192.png` and `/icons/icon-512.png`, but the `public/icons/` directory does not exist. This causes:
1. PWA install prompt fails on Android/Chrome — icons are required.
2. Lighthouse PWA audit fails.
3. Console errors in production.

**Suggested fix:** Create the icons directory and add properly sized PNG icons:
```bash
mkdir public/icons
# Generate icon-192.png (192x192) and icon-512.png (512x512) with Luna HRM branding
```

---

## [P1] High — Should Fix

### P1-1. getMyPayslips exposes draft payslip existence via timing/count

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-portal-actions.ts` (lines 135-139)
**Description:** The query fetches ALL payslips for the employee (including drafts), then filters client-side:
```ts
const { data, error } = await sb
  .from('payslips')
  .select('id, net_pay, payroll_periods(month, year, status)')
  .eq('employee_id', user.id)
  .order('created_at', { ascending: false })
// ...
.filter((row) => row.payroll_periods && row.payroll_periods.status !== 'draft')
```
This means:
- Draft payslip data (id, net_pay) is fetched from DB and transmitted to the server action, even though it's filtered before returning.
- While this is server-side filtering (not client-side), it's still unnecessary data transfer from DB.

**Suggested fix:** Filter at the DB level. Since Supabase doesn't support nested `.neq()` on joined tables easily, use an RPC or filter the payroll_periods:
```ts
const { data, error } = await sb
  .from('payslips')
  .select('id, net_pay, payroll_periods!inner(month, year, status)')
  .eq('employee_id', user.id)
  .neq('payroll_periods.status', 'draft')
  .order('created_at', { ascending: false })
```
The `!inner` join modifier ensures only payslips with matching period are returned, and the `.neq` on the joined table filters drafts at DB level.

### P1-2. No input validation on month/year URL params (DoS vector)

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\my-attendance\page.tsx` (lines 25-26)
**Description:**
```ts
const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1
const year = params.year ? parseInt(params.year, 10) : now.getFullYear()
```
No validation on parsed values. A malicious URL like `?month=99999&year=-1` will:
- `parseInt` returns `99999` and `-1` respectively.
- `getMyAttendance(99999, -1)` generates nonsensical date strings like `-1-99999-01`.
- `new Date(-1, 99998, 0)` computes an absurd date, potentially causing very large date ranges.
- Supabase query may return unexpected results or errors.

The `MonthYearPicker` component also doesn't bound navigation (user can go to year 1 or year 99999).

**Suggested fix:**
```ts
const rawMonth = params.month ? parseInt(params.month, 10) : now.getMonth() + 1
const rawYear = params.year ? parseInt(params.year, 10) : now.getFullYear()
const month = Math.min(12, Math.max(1, isNaN(rawMonth) ? now.getMonth() + 1 : rawMonth))
const year = Math.min(2100, Math.max(2020, isNaN(rawYear) ? now.getFullYear() : rawYear))
```

### P1-3. Payslip detail derives month from created_at instead of payroll_period

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\my-payslips\[id]\page.tsx` (line 61)
**Description:**
```tsx
<CardTitle className="text-base">
  Phiếu lương tháng {p.created_at ? new Date(p.created_at).getMonth() + 1 : '—'}
</CardTitle>
```
The `Payslip` type has `payroll_period_id` but does not directly carry `month`/`year`. The code derives the month from `created_at` which is the *creation timestamp*, not the payroll month. If a payslip is created on Jan 31 for December payroll, it shows "Tháng 1" instead of "Tháng 12".

**Suggested fix:** Join with `payroll_periods` in `getMyPayslipDetail` to return month/year:
```ts
// In getMyPayslipDetail, change select to include payroll period:
const { data, error } = await sb
  .from('payslips')
  .select('*, payroll_periods(month, year)')
  .eq('id', payslipId)
  .maybeSingle()
```
Then use `data.payroll_periods.month` in the page.

### P1-4. Service worker caches opaque responses from CDN

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\public\sw.js` (line 52)
**Description:**
```js
if (response.ok) {
  const clone = response.clone()
  caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
}
```
The `response.ok` check is good (avoids caching 404s/500s), but for cross-origin requests (e.g., Google Fonts loaded via `next/font/google`), the response type may be `opaque` where `.ok` is always `false`. This is not a bug per se, but cross-origin font files will never be cached even though they're static.

More importantly, there is **no cache size limit or eviction strategy**. Over time, the cache can grow unbounded as new builds deploy (each `/_next/static/` build has unique hashes).

**Suggested fix:** Add cache eviction in the activate handler — already partially done (line 33-34 deletes old cache names). But also limit entries within the current cache:
```js
// After cache.put, trim old entries:
cache.keys().then((keys) => {
  if (keys.length > 100) {
    keys.slice(0, keys.length - 100).forEach((k) => cache.delete(k))
  }
})
```

---

## [P2] Medium — Logic Error or Edge Case

### P2-1. getMyAttendance position check may miss valid positions

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-portal-actions.ts` (line 70)
**Description:**
```ts
if (user.position === 'office' || user.position === 'admin') {
  // Office staff: query office_attendance table
} else {
  // Teacher / assistant: query attendance table
}
```
The `EmployeePosition` type is `'teacher' | 'assistant' | 'office' | 'admin'`. If a new position is added in the future, it falls into the `else` branch (class-based attendance) which may be incorrect. Also, `admin` position employees querying `office_attendance` may have no records if they don't have office attendance entries — this is a business logic question but worth documenting.

**Suggested fix:** Use explicit position matching:
```ts
const isClassBased = user.position === 'teacher' || user.position === 'assistant'
if (isClassBased) {
  // query attendance table
} else {
  // query office_attendance table
}
```
This way, any new unknown position defaults to office (safer default). Also add a comment explaining the branching logic.

### P2-2. Attendance calendar uses Date constructor that's locale-sensitive

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\attendance\employee-attendance-calendar.tsx` (line 45)
**Description:**
```ts
const firstOfMonth = new Date(year, month - 1, 1)
```
Using `new Date(year, month - 1, 1)` is fine for calendar rendering since it's client-side and uses local timezone. However, the server-side action `getMyAttendance` builds date strings and compares them with DB dates. Since attendance dates in the DB are `DATE` type (no timezone), the date comparison is correct. No actual bug here, but the dual approach (server uses string-based dates, client uses Date object) should be documented for maintainability.

### P2-3. Teacher with multiple classes sees flat attendance list

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-portal-actions.ts` (lines 87-104)
**Description:** A teacher assigned to multiple classes (e.g., class A on Mon-Wed, class B on Tue-Thu) will have multiple attendance records per day. The calendar grid shows only one dot per day (last entry wins in the `Map`). The `class_code` in the data is present but the calendar component does not display it.

This is a UX issue more than a bug. The calendar `dayMap` overwrites entries with the same date:
```ts
const dayMap = new Map<string, MyAttendanceDay>()
for (const d of days) {
  dayMap.set(d.date, d) // overwrites if multiple entries for same date
}
```

**Suggested fix:** Either:
1. Group by date and show multiple dots (complex UI change), or
2. Change `MyAttendanceDay[]` to support multiple entries per date, or
3. At minimum, document this limitation and ensure the tooltip shows all classes for that date.

### P2-4. BottomNav renders for employee role but doesn't verify auth state

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\shared\bottom-nav.tsx`
**Description:** The `BottomNav` component is a `'use client'` component that renders unconditionally. The role check happens in the parent `DashboardLayout` (line 49: `{isEmployee && <BottomNav />}`). This is correct. However, the BottomNav itself has no role awareness — if it were ever rendered outside the layout (e.g., in a test or a different layout), it would show employee tabs to any user. This is low risk since the layout guards it.

No fix needed — documenting for awareness.

### P2-5. MonthYearPicker doesn't prevent future navigation

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\shared\month-year-picker.tsx` (lines 37-38)
**Description:** The forward button has no upper bound. Employees can navigate to future months (e.g., December 2030) where no data exists. While this shows an empty calendar (not harmful), it's a minor UX issue.

**Suggested fix (optional):** Disable the "next" button when month/year exceeds current month:
```ts
const now = new Date()
const isCurrentOrFuture = year > now.getFullYear() ||
  (year === now.getFullYear() && month >= now.getMonth() + 1)
// Disable goNext button when isCurrentOrFuture
```

---

## [P3] Low — Style, Performance, Minor Improvement

### P3-1. Duplicate ActionResult type definition

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-portal-actions.ts` (lines 15-19)
**Description:** `ActionResult<T>` is defined both here and in `employee-actions.ts` (line 8). Should import from a shared location.

**Suggested fix:** Extract to `lib/types/action-result.ts` and import in both files.

### P3-2. `as any` cast on Supabase client used 3 times

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\lib\actions\employee-portal-actions.ts` (lines 61, 132, 177)
**Description:** Pattern `const sb = supabase as any` is used to bypass type checking on Supabase queries. This is a known workaround when the `Database` type doesn't fully cover all query patterns. The eslint-disable comments are present. Acceptable for now but should be tracked as tech debt.

### P3-3. Payslip detail page imports `formatVND` and `formatVNDFull` but appends manual "VND" symbol

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\(dashboard)\my-payslips\[id]\page.tsx` (lines 79-81, 86, etc.)
**Description:** The `formatVND()` function returns a plain formatted number (e.g., "1.780.000"), and the template adds `₫` manually: `${formatVND(p.teaching_pay)} ₫`. Meanwhile, `formatVNDFull()` already includes the currency symbol. Inconsistent usage — some places use `formatVNDFull()`, others use `formatVND() + " ₫"`.

**Suggested fix:** Use `formatVNDFull()` consistently, or use `formatVND()` consistently with `₫` suffix. The current approach works but is inconsistent.

### P3-4. TopNavbar profile link points to `/profile` not `/my-profile`

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\components\shared\top-navbar.tsx` (line 81)
**Description:**
```tsx
<Link href="/profile" className="flex items-center gap-2 cursor-pointer">
```
For employee role, the profile page is at `/my-profile`, but the top navbar link goes to `/profile`. This will lead to a 404 or wrong page for employees.

**Suggested fix:** Conditionally set the profile link based on role:
```tsx
<Link href={user.role === 'employee' ? '/my-profile' : '/profile'} ...>
```
Or unify to a single profile route.

### P3-5. `dangerouslySetInnerHTML` for SW registration

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\app\layout.tsx` (lines 36-48)
**Description:** Using `dangerouslySetInnerHTML` for inline scripts works but bypasses React's XSS protections. In this case, the content is a static string with no user input, so it's safe. However, Next.js 14+ supports `<Script>` component from `next/script` which is the recommended approach.

**Suggested fix:**
```tsx
import Script from 'next/script'
// ...
<Script id="sw-register" strategy="afterInteractive">
  {`if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function(err) {
      console.warn('SW registration failed:', err);
    });
  }`}
</Script>
```

### P3-6. Service worker skipWaiting without user prompt

**File:** `F:\APP ANTIGRAVITY\Tool\Luna HRM\luna-hrm\public\sw.js` (line 27)
**Description:** `self.skipWaiting()` immediately activates the new service worker, replacing the old one mid-session. For an HRM app this is generally fine (no offline-first functionality), but it means users may see style changes mid-session if CSS is cached from the old build. Since the cache strategy is cache-first for static assets, a stale CSS file might persist until the next navigation.

Low risk — the `activate` handler deletes old caches, so the next fetch will get fresh assets.

---

## Positive Observations

1. **Defence-in-depth on payslip ownership** — `getMyPayslipDetail` checks `payslip.employee_id !== user.id` even with RLS. Good pattern.
2. **RLS policies are comprehensive** — `attendance_employee_select_own`, `office_attendance_employee_select_own`, `payslips_employee_select_own` all correctly use `employee_id = auth.uid()`.
3. **Role guard at page level** — All 4 pages check `user.role !== 'employee'` and redirect, preventing non-employee access.
4. **Service worker correctly excludes `/api/*` and `/_next/data/`** — Prevents caching sensitive server responses.
5. **CSS-responsive approach** — `md:hidden` / `hidden md:flex` pattern avoids SSR hydration mismatches (no `useMediaQuery`).
6. **Vietnamese labels throughout** — Consistent UX for target users.
7. **Safe-area padding** — `env(safe-area-inset-bottom)` on BottomNav handles iPhone notch/home indicator.
8. **Clean file sizes** — All files under 200 lines, well-organized.
9. **Navigation role filtering** — `getNavItemsForRole()` correctly shows employee-only items.
10. **Proper `searchParams` as Promise** — Correctly uses Next.js 16 `Promise<{}>` pattern for search params.

---

## Edge Cases Found by Scouting

| Edge Case | Status | Notes |
|-----------|--------|-------|
| Employee with no attendance data | Handled | Empty array → empty calendar, summary shows all zeros |
| Employee with no payslips | Handled | Empty state card with icon displayed |
| Employee with no branch | Partial | `branch_name: null` → shows "—" in profile. Works but no branch context |
| Null payslip fields (e.g., null net_pay) | Risk | `formatVND(null)` would throw. DB schema has NOT NULL on numeric fields, so safe if data integrity holds |
| Teacher in multiple classes same day | Not handled | Calendar overwrites — see P2-3 |
| Inactive employee accessing portal | Safe | `getCurrentUser()` returns null for inactive → redirect to login |
| Non-employee accessing /my-* URLs | Safe | Page-level redirect to /dashboard + RLS blocks data |
| Draft payslip visibility | Partial | Filtered in JS, not at DB level — see P1-1 |

---

## Summary of Required Actions

| Priority | Count | Key Items |
|----------|-------|-----------|
| P0 (Critical) | 3 | Middleware route gap, missing icons, getEmployeeById no employee guard |
| P1 (High) | 4 | Draft payslip DB filter, input validation, month derivation bug, cache eviction |
| P2 (Medium) | 5 | Position branching, multi-class overlap, future month nav |
| P3 (Low) | 6 | Type dedup, formatVND consistency, profile link mismatch, Script component |

**Recommendation:** Fix all P0 items before deploy. P1-1 and P1-3 are correctness bugs that should also ship with the initial release. P1-2 (input validation) is good practice but the blast radius is low (empty results, no crash). P2/P3 items can be addressed in Phase 7 Polish.

---

## Metrics

- **Type Coverage:** ~85% (some `as any` casts on Supabase client)
- **Test Coverage:** 0% (no unit tests for portal actions — recommend adding in Phase 7)
- **Linting Issues:** 3 eslint-disable comments (justified for Supabase `as any`)
- **Security Layers:** 3-deep (RLS + server action + page guard) — strong

---

*Report generated by code-reviewer agent | Luna HRM Phase 5*
