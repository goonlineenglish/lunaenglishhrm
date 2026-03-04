/**
 * student-actions.ts — barrel re-export for backward compatibility.
 * Implementation split into focused modules:
 *   student-crud-actions.ts   — getStudents, createStudent, updateStudent
 *   student-status-actions.ts — changeStudentStatus, bulkChangeStudentStatus
 *   student-import-actions.ts — importStudentsCSV
 *   student-learning-actions.ts — getLearningPath, upsertLearningPath, addMilestone
 */
export type { StudentFilters, StudentWithLead, PaginatedStudents } from "./student-crud-actions";
export { getStudents, createStudent, updateStudent } from "./student-crud-actions";

export type { BulkStudentResult } from "./student-status-actions";
export { changeStudentStatus, bulkChangeStudentStatus } from "./student-status-actions";

export { importStudentsCSV } from "./student-import-actions";

export { getLearningPath, upsertLearningPath, addMilestone } from "./student-learning-actions";
