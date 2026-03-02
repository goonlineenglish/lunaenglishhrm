"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem, NavIconName } from "@/lib/constants/navigation";
import {
  LayoutDashboard,
  Users,
  Bell,
  CalendarCheck,
  GraduationCap,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<NavIconName, LucideIcon> = {
  LayoutDashboard,
  Users,
  Bell,
  CalendarCheck,
  GraduationCap,
  BarChart3,
  Settings,
};

interface SidebarNavItemsProps {
  items: NavItem[];
  collapsed?: boolean;
}

export function SidebarNavItems({ items, collapsed }: SidebarNavItemsProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const Icon = ICON_MAP[item.iconName];
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
