# Debug Report: /students Page Performance

**Date:** 2026-03-02
**Severity:** High — page freezes on every visit
**Investigator:** debugger agent

---

## Executive Summary

The /students page lags and freezes due to **three compounding bottlenecks**:

1. **Double full-table fetch on every page load** — server fetches all students, then `refresh()` fetches all again without pagination args
2. **Client-side filtering on unbounded dataset** — all rows loaded into memory, `Array.filter()` runs on every keystroke
3. **`useMemo` on columns rebuilds on every `selectedIds` change** — causes full TanStack table re-render for every checkbox tick

No realtime subscription on students (good). DB indexes exist (good). The bottleneck is entirely in data fetching strategy and re-render logic.

---

## Bottleneck 1 — Double Fetch, No Pagination Enforced on Refresh

**Files:**
- `app/(dashboard)/students/page.tsx` line 25
- `app/(dashboard)/students/students-client.tsx` lines 26–33

**Evidence:**

`page.tsx:25` calls `getStudents()` with no args → defaults to `page=1, pageSize=20`.
Then `students-client.tsx:27` `refresh()` also calls `getStudents()` with no args → again page 1, pageSize 20.

This is *not* the load volume problem by itself. The real issue is that `pageSize=20` is hardcoded in `getStudents()` default, but the **client never sends current pagination state** back when refreshing. If a user is on page 3 and triggers a refresh (status change, create, import), the list snaps back to page 1 silently — causing confusion that mimics lag.

More critically: **there is no pagination UI at all**. The client receives 20 rows but the `count` can be 200+. Users see 20 rows and a count of 200, with no way to see the rest. This is a UX freeze: the page appears to hang because the user clicks "load more" that does not exist.

**Root cause:** No pagination controls passed from `StudentsClient` → `StudentDataTable` → back to server action.

---

## Bottleneck 2 — Client-Side Search Runs on Every Keystroke Against Full Local Array

**Files:**
- `components/students/student-data-table.tsx` lines 57–70

**Evidence:**

```tsx
// student-data-table.tsx:57-70
const filtered = data.filter((s) => {
  if (statusFilter !== "all" && s.status !== statusFilter) return false;
  if (classFilter !== "all" && s.current_class !== classFilter) return false;
  if (search) {
    const term = search.toLowerCase();
    const name = ...toLowerCase();
    ...
  }
  return true;
});
```

This `filtered` computation is **not memoized**. It runs on every render of `StudentDataTable`. Any state change (checkbox selection, dialog open/close, status filter dropdown) re-runs the full `Array.filter()` over the entire `data` array.

With 20 rows this is negligible. But `count` display shows total DB count (200+), meaning the server action's `pageSize=20` silently caps display. If `pageSize` is ever raised or removed, this becomes O(n) on every render with no memoization protection.

Additionally, **search in `getStudents()` (server action line 67–81) is also client-side** — it applies `Array.filter()` after the DB query, meaning the DB always returns `pageSize` rows then search further reduces them. Search that matches few results but fetches 20 rows first is wasteful.

---

## Bottleneck 3 — `useMemo` on Columns Invalidates on Every Checkbox Click

**Files:**
- `components/students/student-data-table.tsx` lines 116–128

**Evidence:**

```tsx
// student-data-table.tsx:116-128
const columns = useMemo(
  () =>
    buildStudentColumns({
      canEdit,
      selectedIds,          // <-- Set object, new reference every toggle
      onToggleSelect: toggleSelect,   // <-- inline, no useCallback
      onToggleAll: toggleAll,         // <-- inline, no useCallback
      totalCount: filtered.length,
      onStatusSelect: handleStatusSelect,  // <-- inline, no useCallback
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [canEdit, selectedIds, filtered.length]
);
```

`selectedIds` is a `Set<string>`. Every call to `toggleSelect` creates a **new Set object** via `new Set(prev)` (line 73). This means `selectedIds` reference changes on every checkbox tick → `useMemo` invalidates → `buildStudentColumns()` re-runs → TanStack `useReactTable` receives new `columns` array → full table rebuild including re-rendering all visible rows.

`toggleSelect` and `toggleAll` and `handleStatusSelect` are plain functions defined inside the component body — new references every render — but they are NOT in the `useMemo` deps array (suppressed with eslint-disable). This is a ticking bomb: if deps are ever corrected, it will invalidate on every render.

The practical effect: clicking a single checkbox causes the entire table to rebuild and re-render all rows.

---

## Bottleneck 4 (Secondary) — `bulkChangeStudentStatus` is O(n) Sequential DB Calls

**File:** `lib/actions/student-actions.ts` lines 284–318

**Evidence:**

```ts
// student-actions.ts:284-318
for (const studentId of studentIds) {
  const { data: current } = await supabase.from("students").select("status")...  // 1 query per student
  ...
  const { error } = await supabase.from("students").update({ status: newStatus })... // 1 query per student
}
```

For N selected students = 2N sequential round-trips to Supabase. For 50 students = 100 sequential DB queries, each with network latency. This causes noticeable freeze during bulk operations, especially on the Singapore-hosted Supabase from Vietnam.

---

## Summary Table

| # | Bottleneck | File | Lines | Impact |
|---|---|---|---|---|
| 1 | No pagination UI — user sees 20/200 rows, no way to navigate | `students-client.tsx`, `student-data-table.tsx` | 26–33, all | High — perceived freeze |
| 2 | Client-side filter not memoized, runs every render | `student-data-table.tsx` | 57–70 | Medium |
| 3 | `useMemo(columns)` invalidates on every checkbox tick | `student-data-table.tsx` | 116–128 | High — full table rebuild per click |
| 4 | Bulk status change: 2N sequential DB queries | `student-actions.ts` | 284–318 | Medium-High for large selections |

---

## Recommended Fixes (Priority Order)

### Fix 1 — Add Pagination UI (Highest Priority)

Add page state to `StudentsClient`, pass current page to `StudentDataTable`, call `getStudents({ page, pageSize: 20 })` instead of re-fetching page 1.

```tsx
// students-client.tsx — add page state
const [page, setPage] = useState(1);
const refresh = useCallback(async (p = page) => {
  const result = await getStudents({ page: p, pageSize: 20 });
  ...
}, [page]);
```

Add prev/next buttons in `StudentDataTable` using `count` and `pageSize` to compute total pages.

### Fix 2 — Memoize `filtered` Array

```tsx
// student-data-table.tsx — wrap filter in useMemo
const filtered = useMemo(() => data.filter((s) => {
  ...
}), [data, search, statusFilter, classFilter]);
```

### Fix 3 — Stabilize `columns` useMemo Dependencies

Wrap `toggleSelect`, `toggleAll`, `handleStatusSelect` in `useCallback` and add them properly to `useMemo` deps, OR — simpler — move column definitions outside the component and pass callbacks via context/ref.

Quick fix:
```tsx
const toggleSelectCb = useCallback((id: string) => {
  setSelectedIds((prev) => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
}, []);

const toggleAllCb = useCallback(() => {
  setSelectedIds((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map(s=>s.id)));
}, [filtered.length]);
```

Then add `toggleSelectCb`, `toggleAllCb` to `useMemo` deps (remove eslint-disable comment).

### Fix 4 — Batch Bulk Status Update

Replace sequential loop in `bulkChangeStudentStatus` with a single `UPDATE ... WHERE id = ANY(array)`:

```ts
// student-actions.ts — replace loop with batch update
const { error } = await supabase
  .from("students")
  .update({ status: newStatus })
  .in("id", validIds);
```

Pre-validate statuses with a single `SELECT id, status FROM students WHERE id = ANY(validIds)` before the update.

### Fix 5 — Move Search to DB (Optional but Recommended)

Add `ilike` filter to `getStudents` query for `search` param rather than post-filtering in JS:

```ts
if (search) {
  query = query.or(`student_code.ilike.%${search}%`);
  // For joined fields: use a DB view or full-text search
}
```

Note: searching joined `leads` fields (student_name, parent_phone) requires either a DB view or denormalized columns on `students` table.

---

## Unresolved Questions

1. What is the current production row count in `students` table? If <100, Bottleneck 2/3 are low urgency. If >500, all fixes are critical.
2. Is server-side search on joined `leads` fields a hard requirement? If yes, consider a `students_view` that denormalizes name/phone, or add a `tsvector` column.
3. Was `pageSize=20` intentional cap or a forgotten default? The `count` display shows total rows but only 20 are visible — confirm UX intent.
