"use client";

import { useEffect, useState } from "react";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface CommandSearchProps {
  leads: LeadWithAssignee[];
  onLeadSelect: (lead: LeadWithAssignee) => void;
}

export function CommandSearch({ leads, onLeadSelect }: CommandSearchProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Tìm kiếm lead"
      description="Gõ tên hoặc số điện thoại để tìm"
    >
      <CommandInput placeholder="Tìm kiếm lead..." />
      <CommandList>
        <CommandEmpty>Không tìm thấy lead nào</CommandEmpty>
        <CommandGroup heading="Leads">
          {leads.map((lead) => (
            <CommandItem
              key={lead.id}
              value={`${lead.parent_name} ${lead.parent_phone} ${lead.student_name ?? ""}`}
              onSelect={() => {
                onLeadSelect(lead);
                setOpen(false);
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium">{lead.parent_name}</span>
                <span className="text-xs text-muted-foreground">
                  {lead.parent_phone}
                  {lead.student_name ? ` - HS: ${lead.student_name}` : ""}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
