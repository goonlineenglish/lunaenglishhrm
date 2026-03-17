# Plan: Employee Combobox UX Improvement

**Created:** 2026-03-17
**Completed:** 2026-03-18
**Status:** ✅ Complete + Codex Approved
**Effort:** ~2-3h
**Branch:** `feat/employee-combobox-ux`

## Problem

1. **Slow selection:** `EmployeeCodeLookup` yêu cầu gõ mã NV → debounce → server call mỗi keystroke → 4-5s latency
2. **🐛 Stale state bug:** `ClassScheduleForm` dùng `useState(init)` nhưng component không unmount → khi chuyển giữa Thêm/Sửa hoặc sửa schedule khác, form KHÔNG reset → hiện data cũ/trống

## Solution

1. Thay thế bằng **shadcn Combobox** (Popover + Command/cmdk): prefetch danh sách NV 1 lần khi form mở → client-side fuzzy filter → instant response. Tìm theo cả tên lẫn mã.
2. Fix stale state: thêm `useEffect` sync form state khi `open`/`editSchedule` thay đổi.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | Install dependencies + shadcn UI components | ✅ Done |
| 2 | Server action: prefetch employees | ✅ Done |
| 3 | Create EmployeeCombobox component | ✅ Done |
| 4 | Integrate into ClassScheduleForm | ✅ Done |
| 5 | Integrate into AttendanceAddNoteForm | ✅ Done |
| 6 | Cleanup: remove old component | ✅ Done |
| 7 | Build verify + manual test | ✅ Done |

## Detailed Phases

→ [Phase 1-7: phase-01-employee-combobox-ux.md](./phase-01-employee-combobox-ux.md)
