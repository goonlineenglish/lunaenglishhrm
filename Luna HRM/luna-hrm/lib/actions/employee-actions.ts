/**
 * Employee actions — barrel re-export.
 * Split into query (read) + mutation (create/update).
 */

export type { ActionResult, EmployeeWithBranch } from './employee-query-actions'
export { getEmployees, getEmployeeById } from './employee-query-actions'

export type { CreateEmployeeInput } from './employee-mutation-actions'
export { createEmployee, updateEmployee } from './employee-mutation-actions'
