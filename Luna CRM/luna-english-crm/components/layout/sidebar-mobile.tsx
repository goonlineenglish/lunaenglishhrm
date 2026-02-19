"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { SidebarNavItems } from "@/components/layout/sidebar-nav-items";
import type { NavItem } from "@/lib/constants/navigation";
import { useState } from "react";

interface SidebarMobileProps {
  navItems: NavItem[];
}

export function SidebarMobile({ navItems }: SidebarMobileProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0 pt-8">
        <div className="flex h-12 items-center px-6 mb-4">
          <span className="text-lg font-bold text-sidebar-foreground">
            Luna English
          </span>
        </div>
        <div onClick={() => setOpen(false)}>
          <SidebarNavItems items={navItems} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
