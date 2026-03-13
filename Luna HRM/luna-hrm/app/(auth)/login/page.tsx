import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

/**
 * Login page — entry point for all users.
 * LoginForm uses useSearchParams() so must be wrapped in Suspense.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm h-96 rounded-xl border bg-card animate-pulse" />}>
      <LoginForm />
    </Suspense>
  )
}
