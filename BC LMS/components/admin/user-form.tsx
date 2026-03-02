'use client';

// User form component — create and edit user dialog
// Handles: email (unique), name, school (required for MANAGER), role, password (create only)

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { createUser, updateUser } from '@/lib/actions/user-actions';
import type { UserListItem, Role } from '@/lib/types/user';

const createSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  school: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT']),
}).refine(
  (d) => d.role !== 'MANAGER' || (d.school && d.school.trim().length > 0),
  { message: 'Quản lý phải có trường/cơ sở', path: ['school'] }
);

const editSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  school: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'TEACHER', 'TEACHING_ASSISTANT']),
}).refine(
  (d) => d.role !== 'MANAGER' || (d.school && d.school.trim().length > 0),
  { message: 'Quản lý phải có trường/cơ sở', path: ['school'] }
);

type FieldErrors = Record<string, string>;

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  editUser?: UserListItem | null;
  onSuccess: () => void;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Quản lý' },
  { value: 'TEACHER', label: 'Giáo viên' },
  { value: 'TEACHING_ASSISTANT', label: 'Trợ giảng' },
];

export function UserForm({ open, onClose, editUser, onSuccess }: UserFormProps) {
  const isEdit = !!editUser;
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState('');
  const [role, setRole] = useState<Role>('TEACHER');

  // Populate form when editing
  useEffect(() => {
    if (editUser) {
      // Use queueMicrotask to batch state updates and avoid synchronous setState in effect
      queueMicrotask(() => {
        setEmail(editUser.email);
        setName(editUser.name);
        setRole(editUser.role);
        setSchool(editUser.school ?? '');
        setErrors({});
        setServerError('');
      });
    } else {
      queueMicrotask(() => {
        setEmail('');
        setName('');
        setPassword('');
        setSchool('');
        setRole('TEACHER');
        setErrors({});
        setServerError('');
      });
    }
  }, [editUser, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const data = isEdit
      ? { name, school: school || undefined, role }
      : { email, name, password, school: school || undefined, role };

    const schema = isEdit ? editSchema : createSchema;
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'root');
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    startTransition(async () => {
      const result = isEdit && editUser
        ? await updateUser(editUser.id, { name, school: school || null, role })
        : await createUser({ email, name, password, school: school || undefined, role });

      if (result.success) {
        toast.success(isEdit ? 'Cập nhật thành công' : 'Tạo người dùng thành công');
        onSuccess();
        onClose();
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {serverError && (
            <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">
              {serverError}
            </div>
          )}

          {/* Email — read-only in edit mode */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEdit || isPending}
              placeholder="user@buttercuplearning.com"
              className={errors.email ? 'border-rose-500' : ''}
            />
            {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder="Nguyễn Văn A"
              className={errors.name ? 'border-rose-500' : ''}
            />
            {errors.name && <p className="text-xs text-rose-600">{errors.name}</p>}
          </div>

          {/* Password — create only */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                placeholder="Tối thiểu 8 ký tự"
                className={errors.password ? 'border-rose-500' : ''}
              />
              {errors.password && <p className="text-xs text-rose-600">{errors.password}</p>}
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="role">Vai trò</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isPending}>
              <SelectTrigger id="role" className={errors.role ? 'border-rose-500' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-rose-600">{errors.role}</p>}
          </div>

          {/* School */}
          <div className="space-y-1.5">
            <Label htmlFor="school">
              Trường/Cơ sở {role === 'MANAGER' && <span className="text-rose-500">*</span>}
            </Label>
            <Input
              id="school"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              disabled={isPending}
              placeholder="Tên trường hoặc cơ sở"
              className={errors.school ? 'border-rose-500' : ''}
            />
            {errors.school && <p className="text-xs text-rose-600">{errors.school}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: '#4F46E5' }}
              className="text-white hover:opacity-90"
            >
              {isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
