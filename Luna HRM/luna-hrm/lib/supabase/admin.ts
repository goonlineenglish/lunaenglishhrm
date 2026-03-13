import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/**
 * Admin Supabase client using service role key.
 * NEVER import this in client-side code or expose to browser.
 * Used for: creating auth users, setting app_metadata, admin-only operations.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create an auth user and set role + branch_id in app_metadata.
 * Returns the new user's UUID for use as employees.id.
 */
export async function createAuthUser(params: {
  email: string
  password: string
  role: string
  branchId?: string
}) {
  const admin = createAdminClient()

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    app_metadata: {
      role: params.role,
      branch_id: params.branchId ?? null,
    },
  })

  if (authError) throw authError
  return authData.user
}

/**
 * Delete an auth user by ID (used for rollback on failed employee create).
 */
export async function deleteAuthUser(userId: string) {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw error
}

/**
 * Update role and/or branch_id in app_metadata for an existing user.
 */
export async function updateAuthUserMetadata(
  userId: string,
  updates: { role?: string; branchId?: string | null }
) {
  const admin = createAdminClient()

  const metadataUpdate: Record<string, string | null | undefined> = {}
  if (updates.role !== undefined) metadataUpdate.role = updates.role
  if (updates.branchId !== undefined) metadataUpdate.branch_id = updates.branchId

  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: metadataUpdate,
  })

  if (error) throw error
  return data.user
}
