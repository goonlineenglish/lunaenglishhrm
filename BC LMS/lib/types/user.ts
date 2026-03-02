// User type definitions — roles, list items, create/update inputs

export type Role = 'ADMIN' | 'MANAGER' | 'TEACHER' | 'TEACHING_ASSISTANT';

export type UserListItem = {
  id: string;
  email: string;
  name: string;
  school: string | null;
  role: Role;
  isDeleted: boolean;
  createdAt: Date;
  _count: { programs: number; enrollments: number };
};

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  school?: string;
  role: Role;
};

export type UpdateUserInput = {
  name?: string;
  school?: string | null;
  role?: Role;
};
