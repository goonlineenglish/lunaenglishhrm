'use server'

/**
 * Shared BM branch-access verification helper.
 * Used by evaluation, notes, and other actions that need BM branch scoping.
 * Returns error string if access denied, null if OK.
 */

export async function checkBmBranchAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  employeeId: string,
  userBranchId: string | null
): Promise<string | null> {
  const { data: emp } = await sb
    .from('employees').select('branch_id').eq('id', employeeId).maybeSingle()
  if (!emp) return 'Nhân viên không tồn tại.'
  if (emp.branch_id !== userBranchId) return 'Bạn không có quyền truy cập nhân viên này.'
  return null
}
