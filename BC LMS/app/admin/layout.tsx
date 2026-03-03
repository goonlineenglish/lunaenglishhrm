// Admin layout — sidebar with nav + admin-only access guard
// Reads x-user-role from headers via getAuthenticatedUser(); redirects non-ADMIN to /dashboard

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getAuthenticatedUser();

  // Redirect non-admins
  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <AdminSidebar userEmail={user.email} userName={user.school ?? user.email} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
