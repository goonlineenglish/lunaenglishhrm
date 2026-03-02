// Profile page — shows current user info; allows editing name, school, password
// Server component; loads user from DB using JWT sub

import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-guard';
import { prisma } from '@/lib/prisma';
import { ProfileForm } from '@/components/dashboard/profile-form';

export default async function ProfilePage() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) redirect('/login');

  // Load full user record for current name + school
  const user = await prisma.user.findUnique({
    where: { id: authUser.sub },
    select: { email: true, name: true, school: true },
  });

  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Hồ sơ của tôi</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Cập nhật thông tin cá nhân và mật khẩu
        </p>
      </div>

      <ProfileForm user={user} />
    </div>
  );
}
