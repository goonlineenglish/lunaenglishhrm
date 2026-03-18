/**
 * Employee actions — barrel re-export.
 * Split into query (read) + mutation (create/update).
 */

export type { ActionResult, EmployeeWithBranch, EmployeeCountStats } from './employee-query-actions'
export { getEmployees, getEmployeeById, checkEmployeeClassAssignments, getEmployeeCountStats } from './employee-query-actions'

export type { CreateEmployeeInput } from './employee-mutation-actions'
export { createEmployee, updateEmployee } from './employee-mutation-actions'

export type { EmployeeImportResult } from './employee-import-actions'
export { batchImportEmployees } from './employee-import-actions'
