import { SidebarNavItems } from "@/components/layout/sidebar-nav-items";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { NavItem } from "@/lib/constants/navigation";
import type { UserRole } from "@/lib/types/users";
import { ROLES } from "@/lib/constants/roles";

interface SidebarProps {
  navItems: NavItem[];
  fullName: string;
  role: UserRole;
}

export function Sidebar({ navItems, fullName, role }: SidebarProps) {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-14 items-center px-6">
        <span className="text-lg font-bold text-sidebar-foreground">
          Luna English
        </span>
      </div>
      <Separator className="bg-sidebar-border" />
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNavItems items={navItems} />
      </div>
      <Separator className="bg-sidebar-border" />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
            {fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[140px]">
              {fullName}
            </span>
            <Badge
              variant="secondary"
              className="mt-0.5 w-fit text-[10px] px-1.5 py-0"
            >
              {ROLES[role].label}
            </Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
