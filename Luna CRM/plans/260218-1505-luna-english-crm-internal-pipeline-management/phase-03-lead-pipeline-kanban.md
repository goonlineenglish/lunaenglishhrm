# Phase 03: Lead Pipeline Kanban (MVP Core)

## Context Links

- Parent plan: [plan.md](./plan.md)
- Dependencies: [Phase 02](./phase-02-auth-and-layout-shell.md) (auth, layout shell)
- Research: [Tech Stack](./research/researcher-01-nextjs-supabase-stack.md) -- @dnd-kit, Realtime

## Overview

- **Date:** 2026-02-18
- **Priority:** P1 (MVP core feature)
- **Status:** Pending
- **Effort:** 10h

Build the Kanban board with 8 pipeline columns, drag-drop via @dnd-kit, lead cards with SLA timers, quick-add form, lead detail panel, activity logging, list view alternative, filtering, search, and real-time updates.

## Key Insights

- @dnd-kit is 2026 best choice: 60 FPS, keyboard accessible, works with React 19
- Fetch initial data in Server Component, pass to Client Component for drag interactions
- Optimistic UI on drag: update local state immediately, sync to DB async
- Supabase Realtime: subscribe to `leads` table changes for multi-user Kanban sync
- Stage change must auto-log activity (type: `stage_change`, metadata: `{ from, to }`)
- SLA timer: compare `created_at` to now for MỚI TIẾP NHẬN (2h window)
- Sheet component (slide-over) better than modal for lead detail on mobile

## Requirements

### Functional
- 8-column Kanban board matching Luna pipeline stages
- Drag-drop leads between columns (updates `current_stage` in DB)
- Lead card shows: parent name, phone, program badge, source icon, SLA countdown (stage 1), assigned avatar
- Quick-add lead: Sheet slide-over with form (parent name, phone, source, program, notes)
- Lead detail panel: Sheet slide-over with full info, activity timeline, reminder list
- Add activity: call/message/meeting/note with content and timestamp
- Auto-log stage changes as activities
- List view: DataTable with sortable columns, pagination, same filters
- Assign lead to advisor (admin only): dropdown in lead detail
- Filter bar: source, program, stage, date range, assignee
- Search: Command palette (Cmd+K) for quick lead lookup
- Realtime: other users' changes appear automatically
- Optimistic UI: drag updates immediately, reverts on error

### Non-functional
- Kanban renders < 200ms with 50 leads
- Drag interaction 60 FPS (CSS transforms via @dnd-kit)
- Mobile: horizontal scroll for Kanban columns, or stack vertically
- All labels in Vietnamese

## Architecture

```
Pipeline Page Flow:
  app/(dashboard)/pipeline/page.tsx (Server Component)
  └── Fetch leads + user data from Supabase
      └── <PipelineView /> (Client Component)
          ├── <FilterBar />
          ├── <ViewToggle /> (Kanban | List)
          ├── <KanbanBoard />          # @dnd-kit wrapper
          │   └── <KanbanColumn />     # Per stage
          │       └── <LeadCard />     # Individual lead
          ├── <LeadListView />         # DataTable alternative
          ├── <QuickAddSheet />        # Add new lead
          ├── <LeadDetailSheet />      # View/edit lead
          └── <CommandSearch />        # Cmd+K search

Data Flow:
  Server Component → fetch leads → pass to Client
  Client → @dnd-kit onDragEnd → optimistic update → server action → DB
  Supabase Realtime → postgres_changes on leads table → update client state
```

### Component Hierarchy (each file < 200 lines)

```
components/pipeline/
├── pipeline-view.tsx           # Main orchestrator (view toggle, state)
├── kanban-board.tsx            # DndContext wrapper, columns layout
├── kanban-column.tsx           # Single column with SortableContext
├── lead-card.tsx               # Card UI (drag handle, badges, SLA)
├── lead-card-sla-timer.tsx     # SLA countdown component
├── quick-add-lead-sheet.tsx    # Sheet + form for new lead
├── lead-detail-sheet.tsx       # Sheet for viewing/editing lead
├── lead-detail-info.tsx        # Lead info section (parent, student, program)
├── lead-detail-activities.tsx  # Activity timeline
├── lead-detail-reminders.tsx   # Reminder list (placeholder, enhanced Phase 4)
├── add-activity-form.tsx       # Form to add call/message/note
├── lead-list-view.tsx          # DataTable view
├── lead-list-columns.tsx       # Column definitions for DataTable
├── filter-bar.tsx              # Source, program, stage, date, assignee filters
├── command-search.tsx          # Cmd+K search dialog
└── assign-advisor-select.tsx   # Advisor assignment dropdown (admin only)
```

## Related Code Files

### Files to Create

| File | Purpose |
|------|---------|
| `app/(dashboard)/pipeline/page.tsx` | Server component: fetch leads, render PipelineView |
| `app/(dashboard)/pipeline/loading.tsx` | Skeleton loader for pipeline page |
| `components/pipeline/pipeline-view.tsx` | Client orchestrator: view toggle, filters, state management |
| `components/pipeline/kanban-board.tsx` | DndContext + DragOverlay, horizontal scroll container |
| `components/pipeline/kanban-column.tsx` | Single column: header (stage name, count), SortableContext, cards |
| `components/pipeline/lead-card.tsx` | Draggable card: parent name, phone, badges, SLA |
| `components/pipeline/lead-card-sla-timer.tsx` | Countdown timer for stage 1 SLA (2h) |
| `components/pipeline/quick-add-lead-sheet.tsx` | Sheet: form to create new lead |
| `components/pipeline/lead-detail-sheet.tsx` | Sheet: lead info, activities, reminders tabs |
| `components/pipeline/lead-detail-info.tsx` | Lead info display/edit form |
| `components/pipeline/lead-detail-activities.tsx` | Activity timeline list |
| `components/pipeline/lead-detail-reminders.tsx` | Reminder list (basic, enhanced Phase 4) |
| `components/pipeline/add-activity-form.tsx` | Form: type select, content textarea, submit |
| `components/pipeline/lead-list-view.tsx` | DataTable wrapper for list view |
| `components/pipeline/lead-list-columns.tsx` | TanStack Table column definitions |
| `components/pipeline/filter-bar.tsx` | Filter controls: source, program, stage, date, assignee |
| `components/pipeline/command-search.tsx` | Command palette dialog for lead search |
| `components/pipeline/assign-advisor-select.tsx` | Advisor dropdown (admin only) |
| `lib/actions/lead-actions.ts` | Server actions: createLead, updateLead, updateLeadStage, deleteLead |
| `lib/actions/activity-actions.ts` | Server actions: createActivity, getActivities |
| `lib/hooks/use-realtime-leads.ts` | Custom hook: Supabase Realtime subscription for leads |
| `lib/hooks/use-optimistic-kanban.ts` | Custom hook: optimistic state management for drag-drop |

## Implementation Steps

1. **Create pipeline page** `app/(dashboard)/pipeline/page.tsx`
   - Server component fetches all leads with `assigned_to` user info
   - Fetches list of advisors (for assign dropdown)
   - Groups leads by `current_stage`
   - Renders `<PipelineView leads={groupedLeads} advisors={advisors} />`

2. **Create PipelineView** `components/pipeline/pipeline-view.tsx`
   - `'use client'` component
   - State: viewMode ('kanban' | 'list'), filters, selectedLead
   - Renders FilterBar, ViewToggle (Tabs), KanbanBoard or LeadListView
   - Handles sheet open/close for QuickAdd and LeadDetail

3. **Create KanbanBoard** `components/pipeline/kanban-board.tsx`
   - Import `DndContext`, `DragOverlay`, `closestCorners` from @dnd-kit
   - `onDragStart`: set active dragging lead (for overlay)
   - `onDragEnd`: determine source/dest column, call `updateLeadStage` server action
   - Optimistic update: move lead in local state before server response
   - Revert on error with toast message
   - Horizontal scroll container with `overflow-x-auto`
   - Map 8 stages to `<KanbanColumn />`

4. **Create KanbanColumn** `components/pipeline/kanban-column.tsx`
   - `SortableContext` with `verticalListSortingStrategy`
   - Column header: stage label (Vietnamese), lead count badge, stage color dot
   - `useDroppable` for receiving drops
   - Render list of `<LeadCard />`
   - Empty state: dashed border, "Keo lead vao day" text

5. **Create LeadCard** `components/pipeline/lead-card.tsx`
   - `useSortable` from @dnd-kit
   - Display: parent_name (bold), parent_phone, program badge, source icon
   - SLA timer for stage 1 (MỚI TIẾP NHẬN): red if > 2h
   - Assigned advisor avatar (small circle)
   - Click to open LeadDetailSheet
   - Drag handle visual indicator

6. **Create SLA Timer** `components/pipeline/lead-card-sla-timer.tsx`
   - Calculate time elapsed since `created_at`
   - If stage is `moi_tiep_nhan`: show countdown "Con 1h 23p" or "Qua han 30p"
   - Color: green (< 1h), yellow (1-2h), red (> 2h)
   - Updates every minute via `useEffect` + `setInterval`

7. **Create QuickAddSheet** `components/pipeline/quick-add-lead-sheet.tsx`
   - Sheet slide-over from right
   - Form fields: parent_name*, parent_phone*, source* (select), program (select), student_name, notes
   - Submit calls `createLead` server action
   - Success: close sheet, toast "Da them lead moi", add to Kanban
   - Validation: phone format (10 digits), name required

8. **Create LeadDetailSheet** `components/pipeline/lead-detail-sheet.tsx`
   - Sheet slide-over from right, wider (max-w-lg)
   - Tabs: "Thong tin" (info), "Lich su" (activities), "Nhac nho" (reminders)
   - Renders LeadDetailInfo, LeadDetailActivities, LeadDetailReminders

9. **Create LeadDetailInfo** `components/pipeline/lead-detail-info.tsx`
   - Display/edit: all lead fields
   - Assign advisor dropdown (admin only)
   - Edit mode toggle
   - Save calls `updateLead` server action

10. **Create LeadDetailActivities** `components/pipeline/lead-detail-activities.tsx`
    - Timeline view: newest first
    - Each activity: type icon, content, timestamp, created_by name
    - Stage change activities highlighted differently
    - At bottom: `<AddActivityForm />`

11. **Create AddActivityForm** `components/pipeline/add-activity-form.tsx`
    - Type select: Goi dien, Nhan tin, Gap mat, Ghi chu
    - Content textarea
    - Submit calls `createActivity` server action

12. **Create LeadListView** `components/pipeline/lead-list-view.tsx`
    - shadcn DataTable with TanStack Table
    - Columns defined in separate file
    - Server-side sorting, client-side filtering
    - Row click opens LeadDetailSheet

13. **Create lead-list-columns.tsx**
    - Columns: parent_name, phone, student_name, source (badge), program (badge), stage (badge+color), assigned_to, created_at, actions
    - Sortable headers

14. **Create FilterBar** `components/pipeline/filter-bar.tsx`
    - Select filters: source, program, stage, assignee
    - Date range picker: created_at from/to
    - Clear filters button
    - Filters apply to both Kanban and List views

15. **Create CommandSearch** `components/pipeline/command-search.tsx`
    - Cmd+K opens Command dialog
    - Search leads by parent_name, parent_phone, student_name
    - Results show lead card preview
    - Select result opens LeadDetailSheet

16. **Create server actions** `lib/actions/lead-actions.ts`
    - `createLead(data)`: insert lead, auto-log "lead_created" activity
    - `updateLead(id, data)`: update lead fields
    - `updateLeadStage(id, newStage)`: update stage + auto-log stage_change activity
    - `deleteLead(id)`: soft delete or hard delete
    - `assignLead(id, advisorId)`: update assigned_to (admin only check)

17. **Create activity actions** `lib/actions/activity-actions.ts`
    - `createActivity(leadId, type, content)`: insert activity
    - `getActivities(leadId)`: fetch activities ordered by created_at desc

18. **Create Realtime hook** `lib/hooks/use-realtime-leads.ts`
    - Subscribe to `postgres_changes` on `leads` table
    - On INSERT: add to local state
    - On UPDATE: update in local state (merge)
    - On DELETE: remove from local state
    - Cleanup on unmount

19. **Create optimistic hook** `lib/hooks/use-optimistic-kanban.ts`
    - Manage leads state grouped by stage
    - `moveLeadOptimistic(leadId, fromStage, toStage)`: move immediately
    - `revertMove(leadId, originalStage)`: revert on server error
    - Integrate with Realtime updates

20. **Create loading skeleton** `app/(dashboard)/pipeline/loading.tsx`
    - Skeleton cards in column layout matching Kanban

## Todo List

- [ ] Create pipeline page (server component, data fetching)
- [ ] Create PipelineView orchestrator (client component)
- [ ] Create KanbanBoard with @dnd-kit DndContext
- [ ] Create KanbanColumn with SortableContext
- [ ] Create LeadCard (draggable, badges, SLA)
- [ ] Create SLA timer component
- [ ] Create QuickAddSheet (slide-over form)
- [ ] Create LeadDetailSheet (tabs: info, activities, reminders)
- [ ] Create LeadDetailInfo (display/edit)
- [ ] Create LeadDetailActivities (timeline)
- [ ] Create AddActivityForm
- [ ] Create LeadListView (DataTable)
- [ ] Create lead list column definitions
- [ ] Create FilterBar
- [ ] Create CommandSearch (Cmd+K)
- [ ] Create AssignAdvisorSelect (admin only)
- [ ] Create lead server actions (CRUD + stage change)
- [ ] Create activity server actions
- [ ] Create Realtime hook for live updates
- [ ] Create optimistic Kanban hook
- [ ] Create loading skeleton
- [ ] Test drag-drop between all 8 stages
- [ ] Test optimistic UI + revert on error
- [ ] Test Realtime sync between 2 browsers
- [ ] Test mobile horizontal scroll
- [ ] Test filter + search combinations

## Success Criteria

- Drag-drop lead between columns updates DB and syncs to other users
- Quick-add creates lead in correct stage with auto-logged activity
- Lead detail shows full info, activity timeline, edit capability
- List view shows same data as Kanban with sortable columns
- Filters work on both views (source, program, stage, date, assignee)
- Cmd+K search finds leads by name or phone
- SLA timer shows correct countdown, turns red when overdue
- Admin can assign leads to advisors; advisors cannot reassign
- Mobile: Kanban scrolls horizontally, sheets work as slide-overs

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| @dnd-kit collision detection issues | Cards drop in wrong column | Use `closestCorners` strategy, test edge cases |
| Realtime subscription drops | Users see stale data | Reconnect logic, periodic refresh fallback |
| Too many leads in one column | Performance degradation | Virtual scroll with @dnd-kit (or limit visible, "show more") |
| Optimistic revert confusing UX | User thinks drag worked but reverts | Toast message explaining error, subtle animation on revert |

## Security Considerations

- Server actions verify user role before executing (admin-only for assign)
- RLS policies prevent advisors from seeing unassigned leads (or allow read-all, write-own)
- Lead phone numbers not logged in client-side console
- Activity `created_by` set server-side from auth (not client-provided)

## Next Steps

- Phase 4 builds on lead detail reminders tab
- Phase 5 needs stage 7 (ĐÃ ĐĂNG KÝ) transition to create student record
- Phase 6 dashboard pulls aggregated data from leads table
