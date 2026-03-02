# Phase 02 — Stage Notes UI: Note/Result/NextSteps per Lead Card

## Context Links
- Plan: [plan.md](./plan.md)
- Depends on: [Phase 01](./phase-01-db-schema-stage-notes-activities.md)
- Existing component: `components/pipeline/lead-detail-sheet.tsx`
- Existing component: `components/pipeline/lead-detail-info.tsx`
- Server actions: `lib/actions/lead-actions.ts`

## Overview
- **Priority**: P1
- **Status**: completed
- **Description**: Add 3 editable fields to each lead card's detail sheet — per-stage Note, Result, and Next Steps. These persist per stage and are archived when lead moves to a new stage.

## Key Insights
- `lead_detail_sheet.tsx` uses tabs: Info | Activities | Reminders | Zalo
- Stage notes should be a new tab or section within the Info tab
- Records are per `(lead_id, stage)` — multiple records allowed (history), show latest
- When lead changes stage, user starts fresh notes for new stage; old notes preserved as history
- Max ~3 fields, keep it lightweight — no markdown editor needed

## Requirements

### Functional
1. In lead detail sheet (or lead card expand), show 3 text areas:
   - **Ghi chú** (Note) — what happened in this stage
   - **Kết quả** (Result) — outcome so far
   - **Bước tiếp theo** (Next Steps) — what advisor plans to do next
2. Auto-save or Save button (prefer explicit Save to avoid accidental overwrites)
3. Show history of previous stage notes (collapsed, read-only)
4. Stage badge shown above the notes section so advisor knows context

### Non-functional
- Mobile-friendly (vertical stack layout)
- Debounce save to avoid excessive DB calls if auto-save used

## Architecture

### Component: `lead-stage-notes-panel.tsx`
```tsx
// components/pipeline/lead-stage-notes-panel.tsx
"use client"

interface Props {
  leadId: string
  currentStage: LeadStage
}

export function LeadStageNotesPanel({ leadId, currentStage }: Props) {
  // Load current stage note for this lead+stage
  // Form: note textarea, result textarea, next_steps textarea
  // Save button → calls saveStageNote server action
  // Below: collapsed "Lịch sử ghi chú" accordion showing past stages
}
```

### Server Actions to Add in `lib/actions/lead-actions.ts`
```ts
export async function saveStageNote(
  leadId: string,
  stage: LeadStage,
  data: { note?: string; result?: string; next_steps?: string }
): Promise<{ success: boolean; error?: string }>

export async function getStageNotes(
  leadId: string
): Promise<{ data?: StageNote[]; error?: string }>
```

## Related Code Files

### To Create
- `components/pipeline/lead-stage-notes-panel.tsx` (~120 lines)

### To Update
- `lib/actions/lead-actions.ts` — add `saveStageNote`, `getStageNotes`
- `lib/types/leads.ts` — add `StageNote` interface
- `components/pipeline/lead-detail-sheet.tsx` — add StageNotes tab or section

## Implementation Steps

1. **Add TypeScript types** for `StageNote` in `lib/types/leads.ts`
2. **Add server actions** `saveStageNote` + `getStageNotes` to `lib/actions/lead-actions.ts`
3. **Create component** `lead-stage-notes-panel.tsx`:
   - Load current stage note on mount
   - Three `<Textarea>` fields (note, result, next_steps)
   - "Lưu ghi chú" button → calls server action
   - Sonner toast on success/error
   - Collapsed accordion showing notes history from previous stages
4. **Integrate into lead-detail-sheet.tsx** — add as new tab "Ghi chú stage"
5. **Test**: Create note → save → reload → note persists; change stage → note archived → new stage starts blank

## Todo List
- [x] Add StageNote type to lib/types/leads.ts (done in Phase 01)
- [x] Add saveStageNote server action (with UUID validation)
- [x] Add getStageNotes server action
- [x] Create lead-stage-notes-panel.tsx component
- [x] Integrate into lead-detail-sheet.tsx as new tab
- [ ] Test save/load/history (manual verification needed)

## Success Criteria
- Note, Result, Next Steps save correctly for current stage
- Previous stage notes visible in history (read-only, collapsed by default)
- Stage label shown above note section
- Works on mobile (vertical layout, full-width textareas)
- No data lost when lead moves to new stage

## Risk Assessment
- **Low**: Pure add-on, no changes to existing lead update flow
- **Low**: Textarea is simple, no rich text needed

## Security Considerations
- `saveStageNote` validates UUID for leadId
- Advisor can only save notes for leads they are assigned to (RLS enforced)
- No HTML/script injection risk (plain text stored, displayed with whitespace-pre-wrap)

## Next Steps
- Phase 03: Scheduled Activity Management (adds Activity button to lead card)
