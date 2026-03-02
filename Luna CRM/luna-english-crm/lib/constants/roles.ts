import type { UserRole } from "@/lib/types/users";

export const ROLES: Record<UserRole, { label: string; description: string }> = {
  admin: {
    label: "Quan ly",
    description: "Toan quyen quan tri he thong",
  },
  advisor: {
    label: "Tu van vien",
    description: "Quan ly leads duoc phan cong, ghi chu, keo pipeline",
  },
  marketing: {
    label: "Marketing",
    description: "Xem dashboard va nguon leads, khong sua leads",
  },
};

export type Permission =
  | "leads:read"
  | "leads:write"
  | "leads:delete"
  | "students:read"
  | "students:write"
  | "reports:read"
  | "settings:read"
  | "settings:write"
  | "users:manage";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "leads:read",
    "leads:write",
    "leads:delete",
    "students:read",
    "students:write",
    "reports:read",
    "settings:read",
    "settings:write",
    "users:manage",
  ],
  advisor: [
    "leads:read",
    "leads:write",
    "students:read",
    "reports:read",
  ],
  marketing: [
    "leads:read",
    "reports:read",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
