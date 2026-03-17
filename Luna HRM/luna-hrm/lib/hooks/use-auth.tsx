'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SessionUser } from '@/lib/types/user'
import type { UserRole } from '@/lib/types/database'
import type { User } from '@supabase/supabase-js'

// ─── Auth Context ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
})

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode
  initialUser?: SessionUser | null
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(initialUser)
  const [loading, setLoading] = useState(!initialUser)

  useEffect(() => {
    const supabase = createClient()

    async function fetchEmployee(authUser: User): Promise<SessionUser | null> {
      type EmployeeRow = {
        id: string
        full_name: string
        position: string
        branch_id: string | null
        is_active: boolean
      }

      const result = await supabase
        .from('employees')
        .select('id, full_name, position, branch_id, is_active')
        .eq('id', authUser.id)
        .maybeSingle()

      const data = result.data as EmployeeRow | null
      if (!data || !data.is_active) return null

      // Multi-role: read from JWT app_metadata.roles[], fallback to legacy role
      const meta = (authUser.app_metadata ?? {}) as Record<string, unknown>
      let roles: UserRole[]
      if (Array.isArray(meta.roles) && meta.roles.length > 0) {
        roles = meta.roles as UserRole[]
      } else if (typeof meta.role === 'string' && meta.role) {
        roles = [meta.role as UserRole]
      } else {
        roles = ['employee']
      }

      return {
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: data.full_name,
        role: roles[0],
        roles,
        position: data.position as SessionUser['position'],
        branch_id: data.branch_id,
        branch_name: null,
        is_active: data.is_active,
      }
    }

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const sessionUser = await fetchEmployee(session.user)
          setUser(sessionUser)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth
