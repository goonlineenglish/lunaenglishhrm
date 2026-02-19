"use client";

import { SidebarMobile } from "@/components/layout/sidebar-mobile";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import type { NavItem } from "@/lib/constants/navigation";
import type { UserRole } from "@/lib/types/users";

interface HeaderProps {
  navItems: NavItem[];
  fullName: string;
  email: string;
  role: UserRole;
  userId: string;
}

export function Header({ navItems, fullName, email, role, userId }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <SidebarMobile navItems={navItems} />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <NotificationBell userId={userId} />
        <UserMenu fullName={fullName} email={email} role={role} />
      </div>
    </header>
  );
}
