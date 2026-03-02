'use client';

// ProfileForm — edit name, school, and change password
// Email is displayed as read-only

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { updateProfile, changePassword } from '@/lib/actions/profile-actions';

interface ProfileFormProps {
  user: {
    email: string;
    name: string;
    school: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  // Profile fields state
  const [name, setName] = useState(user.name);
  const [school, setSchool] = useState(user.school ?? '');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password fields state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const result = await updateProfile(name, school || null);
      if (result.success) {
        toast.success('Cập nhật thông tin thành công');
      } else {
        toast.error(result.error);
      }
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    setPasswordLoading(true);
    try {
      const result = await changePassword(oldPassword, newPassword);
      if (result.success) {
        toast.success('Đổi mật khẩu thành công');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(result.error);
      }
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled className="bg-neutral-50" />
              <p className="text-xs text-neutral-400">Email không thể thay đổi</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Tên hiển thị</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên của bạn"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="school">Trường / Cơ sở</Label>
              <Input
                id="school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Nhập tên trường hoặc cơ sở"
              />
            </div>

            <Button type="submit" disabled={profileLoading} className="w-full">
              {profileLoading ? 'Đang lưu...' : 'Lưu thông tin'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Password change */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="oldPassword">Mật khẩu cũ</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ít nhất 8 ký tự"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="outline" disabled={passwordLoading} className="w-full">
              {passwordLoading ? 'Đang đổi...' : 'Đổi mật khẩu'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
