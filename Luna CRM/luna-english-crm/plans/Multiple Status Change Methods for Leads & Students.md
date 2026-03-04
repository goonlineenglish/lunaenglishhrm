 Plan updated with all 7 review findings addressed:

  1. [Critical] Student RLS → Added Phase 0 with migration 027 to open UPDATE for advisors
  2. [High] userRole prop missing → Phase 3 explicitly threads userRole through KanbanBoard → KanbanColumn → LeadCard. Phase 5 adds
  it to LeadListView + PipelineView
  3. [High] Event propagation → All inline selects and checkboxes explicitly use e.stopPropagation() (noted in Phase 3, 5, 6)
  4. [Medium] Server-side reason enforcement → Phase 0 adds required lostReason check for mat_lead in updateLeadStage
  5. [Medium] Bulk revalidation → Phase 2 specifies single revalidatePath at end, not per-record
  6. [Medium] Constants duplication order → Moved constants extraction to Phase 1 (before Phase 5/6 use them)
  7. [Low] Verification gaps → Added lint, role matrix table, partial-failure case, event propagation test

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Plan: Multiple Status Change Methods for Leads & Students

 Context

 Lead stage can only be changed via Kanban drag-drop. Student status requires opening detail sheet. User wants faster individual +
 bulk status updates for both leads and students, all synchronized through the same server actions.

 Scope

 - Lead: 8 stages, updateLeadStage() — no transition restrictions
 - Student: 4 statuses, changeStudentStatus() — VALID_TRANSITIONS enforced
 - Both: Individual quick actions + bulk operations
 - Additive only — existing Kanban drag-drop unchanged

 ---
 Phase 0: RLS + Server-Side Enforcement

 Priority: Critical (blocker for student features)

 Problem

 DB RLS: only admin can UPDATE/DELETE students. Advisors = SELECT only. Inline/bulk student status changes by advisor will fail
 100%. Also: updateLeadStage doesn't enforce lostReason for mat_lead.

 Files to Create

 - supabase/migrations/027_allow-advisor-update-student-status.sql — New RLS policy: advisor can UPDATE students.status +
 students.updated_at columns

 Files to Modify

 - lib/actions/lead-actions.ts — Enforce lostReason required when newStage === "mat_lead", return error if missing

 Migration SQL

 -- Advisor can update student status (limited columns)
 CREATE POLICY advisor_students_update ON public.students
   FOR UPDATE
   USING (public.get_user_role() = 'advisor')
   WITH CHECK (public.get_user_role() = 'advisor');

 Key Details

 - Run migration on Supabase Dashboard SQL Editor (same pattern as 025/026)
 - Server action updateLeadStage: add if (newStage === "mat_lead" && !lostReason) return { error: "..." }

 ---
 Phase 1: Student Constants Extraction

 Priority: High (prerequisite for Phase 5/6 — avoid duplicate-then-cleanup)

 Files to Create

 - lib/constants/student-statuses.ts — STUDENT_STATUSES config array + VALID_TRANSITIONS map + getStatusConfig() helper

 Files to Modify

 - components/students/student-status-badge.tsx — Import from constants (remove inline STATUS_CONFIG)
 - components/students/student-status-transition.tsx — Import from constants (remove inline TRANSITIONS)

 Key Details

 - Mirrors pipeline-stages.ts pattern: { id, label, color, bgColor }
 - VALID_TRANSITIONS extracted from student-actions.ts (server keeps its own copy for enforcement)
 - DRY: single source of truth for UI

 ---
 Phase 2: Shared Confirmation Dialog + Bulk Server Actions

 Priority: Critical (dependency for all UI phases)

 Files to Create

 - components/shared/status-change-confirmation-dialog.tsx — Reusable AlertDialog for destructive transitions requiring reason

 Files to Modify

 - lib/actions/lead-actions.ts — Add bulkUpdateLeadStage(leadIds[], newStage, lostReason?)
 - lib/actions/student-actions.ts — Add bulkChangeStudentStatus(studentIds[], newStatus, reason?)

 Key Details

 - Confirmation dialog: title, description, requireReason: boolean, onConfirm(reason?)
 - Bulk actions: perform updates in loop without calling revalidatePath per record. Call revalidatePath once at the end. Return {
 succeeded: string[], failed: { id, error }[] }
 - Internally reuse validation logic from single-record actions (UUID check, auth, transition rules) but skip per-record
 revalidation

 ---
 Phase 3: Quick Stage Selector on Lead Card

 Priority: High (most impactful UX improvement)

 Files to Modify

 - components/pipeline/lead-card.tsx — Add userRole prop + MoreHorizontal icon → DropdownMenu
 - components/pipeline/kanban-column.tsx — Pass userRole to LeadCard
 - components/pipeline/kanban-board.tsx — Pass userRole to KanbanColumn

 Key Details

 - LeadCard new prop: userRole: UserRole
 - MoreHorizontal button positioned top-right of card, with e.stopPropagation() to prevent card click opening detail sheet, and
 separate from drag handle
 - DropdownMenu: 8 stages with color dots, current stage disabled/checked
 - mat_lead → opens confirmation dialog for reason
 - Hidden for marketing role
 - Uses PIPELINE_STAGES constant

 ---
 Phase 4: Clickable Stage Badge in Lead Detail Sheet

 Priority: High

 Files to Modify

 - components/pipeline/lead-detail-info.tsx — Replace read-only Badge with Popover stage selector (view mode only)

 Key Details

 - Click stage badge → Popover with list of stages (color dot + label)
 - Current stage highlighted, select new → updateLeadStage()
 - mat_lead → confirmation dialog
 - Marketing role: read-only badge (no Popover trigger)

 ---
 Phase 5: Inline Stage Change + Bulk Actions in Lead List View

 Priority: Medium

 Files to Modify

 - components/pipeline/lead-list-view.tsx — Add userRole prop, inline Select for stage column, checkbox column, floating bar
 - components/pipeline/pipeline-view.tsx — Pass userRole to LeadListView

 Files to Create

 - components/pipeline/lead-bulk-action-bar.tsx — Floating bar: selected count + stage dropdown + action button

 Key Details

 - Inline select: Compact Select (size="sm") replaces Badge in stage column. onChange → updateLeadStage(). mat_lead → confirmation
 dialog. Marketing sees read-only badge.
 - Event propagation: Select click uses e.stopPropagation() to prevent row click opening detail sheet. Checkbox column also stops
 propagation.
 - Bulk: Checkbox column + header select-all. 1+ selected → floating bar at bottom. Bar calls bulkUpdateLeadStage(). Clear selection
  after success. Only in list view.

 ---
 Phase 6: Inline Student Status Change + Bulk Actions in Table

 Priority: Medium

 Files to Modify

 - components/students/student-columns.tsx — Add inline Select for status column + checkbox column. Uses STUDENT_STATUSES +
 VALID_TRANSITIONS from Phase 1 constants
 - components/students/student-data-table.tsx — Pass onRefresh + userRole to columns, add floating bar

 Files to Create

 - components/students/student-bulk-action-bar.tsx — Floating bar: selected count + status dropdown + action button

 Key Details

 - Inline select: Select filtered to valid transitions only. paused/dropped → confirmation dialog for reason. e.stopPropagation() on
  select.
 - Role visibility: marketing = read-only badge. advisor/admin = inline select.
 - Bulk: Checkbox + floating bar. Status dropdown only shows transitions valid for all selected students. Calls
 bulkChangeStudentStatus(). Clear selection after success.

 ---
 Implementation Order

 Phase 0 (RLS migration + server enforcement)  ← DB prerequisite
   └── Phase 1 (student constants extraction)   ← DRY prerequisite
         └── Phase 2 (shared dialog + bulk actions)  ← UI foundation
               ├── Phase 3 (lead card quick selector)
               ├── Phase 4 (lead detail badge popover)
               ├── Phase 5 (lead list inline + bulk)
               └── Phase 6 (student table inline + bulk)

 File Summary

 ┌────────┬─────────────────────────────────────────────────────────────────┬───────┐
 │ Action │                              File                               │ Phase │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Create │ supabase/migrations/027_allow-advisor-update-student-status.sql │ 0     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Create │ lib/constants/student-statuses.ts                               │ 1     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Create │ components/shared/status-change-confirmation-dialog.tsx         │ 2     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Create │ components/pipeline/lead-bulk-action-bar.tsx                    │ 5     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Create │ components/students/student-bulk-action-bar.tsx                 │ 6     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ lib/actions/lead-actions.ts                                     │ 0, 2  │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ lib/actions/student-actions.ts                                  │ 2     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/students/student-status-badge.tsx                    │ 1     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/students/student-status-transition.tsx               │ 1     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/pipeline/lead-card.tsx                               │ 3     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/pipeline/kanban-column.tsx                           │ 3     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/pipeline/kanban-board.tsx                            │ 3     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/pipeline/lead-detail-info.tsx                        │ 4     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/pipeline/lead-list-view.tsx                          │ 5     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/pipeline/pipeline-view.tsx                           │ 5     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/students/student-columns.tsx                         │ 6     │
 ├────────┼─────────────────────────────────────────────────────────────────┼───────┤
 │ Modify │ components/students/student-data-table.tsx                      │ 6     │
 └────────┴─────────────────────────────────────────────────────────────────┴───────┘

 Verification

 1. Build + lint: npm run build && npm run lint passes after each phase
 2. Role matrix test (manual):
 | Action                     | admin | advisor | marketing |
 |----------------------------|-------|---------|-----------|
 | Lead quick selector (card) | Yes   | Yes     | Hidden    |
 | Lead detail badge popover  | Yes   | Yes     | Read-only |
 | Lead list inline select    | Yes   | Yes     | Read-only |
 | Lead bulk change           | Yes   | Yes     | Hidden    |
 | Student inline select      | Yes   | Yes     | Read-only |
 | Student bulk change        | Yes   | Yes     | Hidden    |

 3. Destructive transitions: mat_lead requires reason (server enforced). paused/dropped requires reason (server enforced). Missing
 reason → error toast.
 4. Bulk partial failure: If 5 selected, 3 succeed, 2 fail → toast shows "3/5 thành công, 2 thất bại"
 5. Event propagation: Clicking select/checkbox in table row does NOT open detail sheet
 6. Kanban unchanged: Drag-drop still works exactly as before