// Dashboard layout — sidebar + header shell for all /(dashboard) routes
// Server component; redirects unauthenticated users to /login
// ADMIN is allowed here too (per spec: ADMIN can also access /dashboard)

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar — hidden on mobile, visible md+ */}
      <div className="hidden md:flex">
        <DashboardSidebar
          role={user.role}
          userName={user.email}
          userEmail={user.email}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <DashboardHeader
          userName={user.email}
          userRole={user.role}
        />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
