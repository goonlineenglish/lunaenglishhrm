# Phase 4: UI — Delete Buttons + Admin Trash View

## Overview
- **Priority**: Medium
- **Status**: Pending
- **Depends on**: Phase 2 (actions), Phase 3 (query filters)

## Key Insights
- No delete button exists anywhere in current UI (deleteLead is dead code)
- Need: delete button on lead detail + student detail + activity items
- Need: admin-only "Thùng rác" (trash) page for viewing/restoring deleted items
- Confirm dialog before every delete (irreversible from user's perspective)

## Related Code Files
### Modify
- `components/pipeline/lead-detail-sheet.tsx` — add delete button to lead detail
- `components/pipeline/lead-list-view.tsx` — add delete to row actions
- `components/pipeline/lead-bulk-action-bar.tsx` — add bulk soft-delete
- `components/students/student-detail-sheet.tsx` — add delete button (admin only)
- `components/pipeline/activity-list-item.tsx` or equivalent — add delete per activity

### Create
- `app/(dashboard)/trash/page.tsx` — admin trash page with tabs (Leads, Students, Activities)
- `components/trash/deleted-leads-table.tsx` — table of deleted leads with restore button
- `components/trash/deleted-students-table.tsx` — table of deleted students with restore button
- `components/trash/deleted-activities-table.tsx` — table of deleted activities with restore button

## Implementation Steps

### 1. Shared Delete Confirmation Dialog
Reuse existing `AlertDialog` from shadcn/ui:
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Xóa {entityName}?</AlertDialogTitle>
      <AlertDialogDescription>
        Dữ liệu sẽ được chuyển vào Thùng rác. Admin có thể khôi phục sau.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Hủy</AlertDialogCancel>
      <AlertDialogAction onClick={onDelete} className="bg-destructive">Xóa</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 2. Lead Detail — Delete Button
In `lead-detail-sheet.tsx` header area:
- Show delete button for admin (always) and advisor (own leads only)
- Call `deleteLead(leadId)` → toast success → close sheet → refresh list
- Hide for marketing role

### 3. Lead List View — Row Action
In `lead-list-view.tsx` row actions dropdown:
- Add "Xóa" option with trash icon
- Same permission check as detail view

### 4. Student Detail — Delete Button (Admin Only)
In `student-detail-sheet.tsx` header:
- Only show for admin role
- Call `softDeleteStudent(studentId)` → toast → close → refresh

### 5. Activity Item — Delete Button
On each activity card/item:
- Advisor: show delete for own activities
- Admin: show delete for all
- Call `softDeleteActivity(activityId)` → toast → refresh

### 6. Admin Trash Page (`/trash`)
Route: `app/(dashboard)/trash/page.tsx`
- Admin-only access (redirect non-admin)
- 3 tabs: Leads | Học sinh | Hoạt động
- Each tab: DataTable with columns: Name, Deleted at, Deleted by(?), Restore button
- Restore button calls `restoreLead`/`restoreStudent`/`restoreActivity`
- Add "Thùng rác" nav item in sidebar (admin only)

### 7. Navigation — Add Trash to Sidebar
In `lib/constants/navigation.ts`:
- Add `{ label: "Thùng rác", href: "/trash", iconName: "Trash2", roles: ["admin"] }`

## Todo
- [ ] Add delete button to lead-detail-sheet.tsx
- [ ] Add delete to lead-list-view.tsx row actions
- [ ] Add delete to lead-bulk-action-bar.tsx
- [ ] Add delete button to student-detail-sheet.tsx (admin only)
- [ ] Add delete to activity items
- [ ] Create trash page with 3 tabs
- [ ] Create deleted-leads-table.tsx component
- [ ] Create deleted-students-table.tsx component
- [ ] Create deleted-activities-table.tsx component
- [ ] Add Thùng rác to sidebar navigation (admin only)

## Success Criteria
- Advisor can delete own lead → disappears from pipeline
- Admin can delete any lead/student → goes to trash
- Trash page shows all deleted items with restore button
- Restore brings item back to original state
- Non-admin cannot access /trash page
- Delete always shows confirmation dialog

## Risk
- Permission check must happen server-side (actions), not just UI hide/show
- Bulk delete on large selections could be slow — use Promise.allSettled
