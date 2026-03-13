# Phase 5: Testing + Build Validation

## Overview
- **Priority**: High
- **Status**: Pending
- **Depends on**: Phase 1-4 complete

## Implementation Steps

### 1. Build + Lint
```bash
npm run build && npm run lint
```

### 2. Existing Tests
```bash
npm test
```
Ensure all 6 existing tests still pass.

### 3. Manual Verification Checklist
- [ ] Advisor: delete own lead → disappears from pipeline + Kanban
- [ ] Advisor: cannot delete other advisor's lead → error toast
- [ ] Admin: delete any lead → activities + stage notes cascade-deleted
- [ ] Admin: restore lead from trash → lead + children restored
- [ ] Admin: restore lead → does NOT restore individually-deleted activities
- [ ] Dashboard counts exclude deleted leads
- [ ] Sheet sync outbound: deleted students/leads not exported
- [ ] Sheet sync inbound: deleted student_code not matched by resolveLeadId
- [ ] Realtime: soft-delete lead → other users see it disappear live
- [ ] /trash page: only admin can access, shows 3 tabs

### 4. Edge Cases to Verify
- Delete lead that has active reminders → reminders still fire? (expected: yes, reminders not cascade-deleted)
- Delete student linked to Sheet → next sync doesn't recreate student
- Bulk delete 5+ leads → all cascade correctly
- Restore lead → stage is preserved, not reset

## Success Criteria
- `npm run build` clean
- `npm run lint` clean
- `npm test` 6/6 pass
- All manual checks pass

## Risk
- Cascade trigger runs as SECURITY DEFINER — ensure it doesn't escalate beyond intended scope
- Reminder cron should check if parent lead is deleted before processing
