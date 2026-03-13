import { redirect } from 'next/navigation'

/**
 * Root page — middleware handles redirect, but this is a fallback.
 * Authenticated users → /dashboard, unauthenticated → /login
 */
export default function Home() {
  redirect('/login')
}
