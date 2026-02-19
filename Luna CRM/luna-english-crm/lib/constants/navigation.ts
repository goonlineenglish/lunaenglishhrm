import type { UserRole } from "@/lib/types/users";

export type NavIconName =
  | "LayoutDashboard"
  | "Users"
  | "Bell"
  | "GraduationCap"
  | "BarChart3"
  | "Settings";

export interface NavItem {
  label: string;
  href: string;
  iconName: NavIconName;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Pipeline",
    href: "/pipeline",
    iconName: "LayoutDashboard",
    roles: ["admin", "advisor", "marketing"],
  },
  {
    label: "Leads",
    href: "/leads",
    iconName: "Users",
    roles: ["admin", "advisor"],
  },
  {
    label: "Nhac nho",
    href: "/reminders",
    iconName: "Bell",
    roles: ["admin", "advisor"],
  },
  {
    label: "Hoc vien",
    href: "/students",
    iconName: "GraduationCap",
    roles: ["admin", "advisor"],
  },
  {
    label: "Bao cao",
    href: "/reports",
    iconName: "BarChart3",
    roles: ["admin", "marketing"],
  },
  {
    label: "Cai dat",
    href: "/settings",
    iconName: "Settings",
    roles: ["admin"],
  },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
