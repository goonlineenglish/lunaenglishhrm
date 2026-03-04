# Phase 2: Types & Constants

## Context
- Parent plan: [plan.md](./plan.md)
- Depends on: Phase 1 (DB schema must exist)
- Current types: `lib/types/users.ts` (Student interface, 10 fields)

## Overview
- **Priority**: P1
- **Status**: Pending
- **Description**: Update Student interface, create new types for EasyCheck/learning data, update program constants

## Related Code Files
- **Modify**:
  - `lib/types/users.ts` — extend Student interface with 8 new fields
  - `lib/constants/pipeline-stages.ts` — if program labels needed
- **Create**:
  - `lib/types/student-hub-types.ts` — new interfaces for all hub tables
  - `lib/constants/student-hub-constants.ts` — payment statuses, program configs, attendance statuses

## Implementation Steps

### 1. Update Student interface (`lib/types/users.ts`)
Add 8 new optional fields matching migration 029:
```typescript
export interface Student {
  // ... existing 10 fields
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  teacher_name: string | null;
  tuition_amount: number | null;
  payment_status: string;
  program_type: ProgramType | null;
  sheet_row_index: number | null;
}
```

### 2. Create student-hub-types.ts
```typescript
export interface AttendanceRecord {
  id: string; student_id: string; class_date: string;
  status: AttendanceStatus; note: string | null;
  source: string; synced_at: string;
}

export interface TeacherComment {
  id: string; student_id: string; class_date: string;
  comment: string; teacher_name: string | null;
  source: string; synced_at: string;
}

export interface StudentScore {
  id: string; student_id: string; test_name: string;
  score: number; max_score: number; test_date: string;
  source: string; synced_at: string;
}

export interface HomeworkRecord {
  id: string; student_id: string; homework_name: string;
  submitted: boolean; due_date: string | null;
  submitted_at: string | null; source: string; synced_at: string;
}

export interface StudentNote {
  id: string; student_id: string; note: string;
  source: string; internal_only: boolean; created_at: string;
}

export interface LearningPath {
  id: string; student_id: string; program_type: ProgramType;
  current_level: string | null; total_levels: number;
  sessions_per_level: number; current_session: number;
  started_at: string | null; updated_at: string;
}

export interface LearningMilestone {
  id: string; learning_path_id: string;
  milestone_type: string; milestone_name: string;
  achieved_at: string | null; created_at: string;
}

export interface SheetSyncSnapshot {
  id: string; snapshot_data: Record<string, unknown>[];
  row_count: number; synced_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';
```

### 3. Create student-hub-constants.ts
- `PAYMENT_STATUSES` — label map (Vietnamese)
- `ATTENDANCE_STATUSES` — label map
- `PROGRAM_CONFIGS` — levels/sessions per program (6 programs)
- `GENDER_OPTIONS` — male/female/other with VN labels

### 4. Update ProgramType
Current enum in leads.ts or types: 'buttercup' | 'primary_success' | 'secondary' | 'ielts'
Add: 'primary_basic' | 'secondary_basic' | 'secondary_advanced'

## Todo List
- [ ] Update Student interface in users.ts
- [ ] Create student-hub-types.ts
- [ ] Create student-hub-constants.ts
- [ ] Update ProgramType union type
- [ ] Verify no import errors (`npm run build`)

## Success Criteria
- All types compile without errors
- Student interface has 18 fields
- All 8 new table interfaces defined
- Constants have Vietnamese labels
