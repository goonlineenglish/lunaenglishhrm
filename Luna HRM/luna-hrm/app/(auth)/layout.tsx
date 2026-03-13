import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Đăng nhập — Luna HRM',
}

/**
 * Auth route group layout.
 * Centers the login/reset card vertically and horizontally.
 * Does NOT include sidebar or navbar.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      {children}
    </main>
  )
}
