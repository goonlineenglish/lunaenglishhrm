// Login page — server component, centered card layout

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import LoginForm from './login-form';

export default async function LoginPage() {
  // Redirect already-authenticated users
  const user = await getAuthenticatedUser();
  if (user) {
    redirect(user.role === 'ADMIN' ? '/admin' : '/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: '#4F46E5' }}
          >
            Buttercup LMS
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Hệ thống quản lý học tập
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          <h2 className="text-lg font-semibold text-neutral-800 mb-6">
            Đăng nhập
          </h2>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
