import { Suspense } from 'react'

/**
 * Reset password page stub.
 * Full implementation: Phase 1 — send password reset email via Supabase.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Đặt lại mật khẩu</h1>
          <p className="text-sm text-muted-foreground">
            Chức năng đang được phát triển.
          </p>
          <a
            href="/login"
            className="text-sm text-primary hover:underline underline-offset-4"
          >
            Quay lại đăng nhập
          </a>
        </div>
      </div>
    </Suspense>
  )
}
