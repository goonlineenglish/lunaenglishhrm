# Phase 3: Student Actions Refactor

## Context
- Parent plan: [plan.md](./plan.md)
- Depends on: Phase 2 (types must exist)
- Current: `lib/actions/student-actions.ts` — 398 lines (exceeds 200-line limit)

## Overview
- **Priority**: P1
- **Status**: Pending
- **Description**: Split student-actions.ts into 3 focused files, update CRUD for new fields

## Key Insights
- File is 398 lines — must split per code standards (200-line limit)
- Current exports: getStudents, createStudent, updateStudent, changeStudentStatus, bulkChangeStudentStatus, importStudentsCSV
- Natural split: CRUD (get/create/update) | Status (change/bulk) | Import (CSV)
- StudentWithLead interface needs updating for new fields

## Related Code Files
- **Modify**:
  - `lib/actions/student-actions.ts` → becomes barrel re-export file (~20 lines)
- **Create**:
  - `lib/actions/student-crud-actions.ts` — getStudents, createStudent, updateStudent
  - `lib/actions/student-status-actions.ts` — changeStudentStatus, bulkChangeStudentStatus
  - `lib/actions/student-import-actions.ts` — importStudentsCSV
  - `lib/actions/student-learning-actions.ts` — getLearningPath, upsertLearningPath (new)

## Implementation Steps

### 1. Create student-crud-actions.ts
- Move: `getStudents`, `createStudent`, `updateStudent`, `StudentFilters`, `StudentWithLead`, `PaginatedStudents`
- Update `getStudents` query: select new columns (date_of_birth, gender, address, teacher_name, tuition_amount, payment_status, program_type)
- Update `createStudent`: accept new fields
- Update `updateStudent`: accept new fields
- Keep `StudentWithLead` extending updated `Student` interface

### 2. Create student-status-actions.ts
- Move: `changeStudentStatus`, `bulkChangeStudentStatus`
- No changes needed (status logic unchanged)

### 3. Create student-import-actions.ts
- Move: `importStudentsCSV`
- Update CSV mapping to handle new columns (program_type, teacher_name, payment_status)

### 4. Create student-learning-actions.ts (new)
- `getLearningPath(studentId)` — fetch learning path + milestones
- `upsertLearningPath(studentId, data)` — create/update learning path
- `addMilestone(learningPathId, data)` — add milestone

### 5. Convert student-actions.ts to barrel
```typescript
"use server";
// Re-export all student actions for backward compatibility
export * from "./student-crud-actions";
export * from "./student-status-actions";
export * from "./student-import-actions";
export * from "./student-learning-actions";
```

### 6. Verify imports
- Search all files importing from `student-actions` — barrel ensures no breaking changes
- Components importing specific functions will still work

## Todo List
- [ ] Create student-crud-actions.ts (~150 lines)
- [ ] Create student-status-actions.ts (~80 lines)
- [ ] Create student-import-actions.ts (~100 lines)
- [ ] Create student-learning-actions.ts (~80 lines)
- [ ] Convert student-actions.ts to barrel re-export (~20 lines)
- [ ] Update createStudent/updateStudent for new fields
- [ ] Verify all imports work (`npm run build`)

## Success Criteria
- No file exceeds 200 lines
- All existing imports still work (barrel re-export)
- CRUD actions handle 8 new student fields
- Learning path actions functional
- `npm run build` passes

## Risk Assessment
- Barrel re-export must maintain "use server" directive — Next.js requires it per file
- Each split file needs its own "use server" directive at top
