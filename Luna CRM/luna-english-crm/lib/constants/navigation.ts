import {
  LayoutDashboard,
  Users,
  Bell,
  GraduationCap,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types/users";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Pipeline",
    href: "/pipeline",
    icon: LayoutDashboard,
    roles: ["admin", "advisor", "marketing"],
  },
  {
    label: "Leads",
    href: "/leads",
    icon: Users,
    roles: ["admin", "advisor"],
  },
  {
    label: "Nhac nho",
    href: "/reminders",
    icon: Bell,
    roles: ["admin", "advisor"],
  },
  {
    label: "Hoc vien",
    href: "/students",
    icon: GraduationCap,
    roles: ["admin", "advisor"],
  },
  {
    label: "Bao cao",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin", "marketing"],
  },
  {
    label: "Cai dat",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
