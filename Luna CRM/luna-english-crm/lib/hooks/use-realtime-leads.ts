"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types/leads";

export interface LeadWithAssignee extends Lead {
  users: { full_name: string } | null;
}

export function useRealtimeLeads(initialLeads: LeadWithAssignee[]) {
  const [leads, setLeads] = useState<LeadWithAssignee[]>(initialLeads);

  // Sync when initialLeads changes (e.g., server revalidation)
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as LeadWithAssignee;
          // New leads from realtime won't have the join, set null
          if (!newLead.users) {
            newLead.users = null;
          }
          setLeads((prev) => {
            if (prev.some((l) => l.id === newLead.id)) return prev;
            return [...prev, newLead];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const updated = payload.new as LeadWithAssignee;
          setLeads((prev) =>
            prev.map((l) =>
              l.id === updated.id ? { ...l, ...updated } : l
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        (payload) => {
          const deleted = payload.old as { id: string };
          setLeads((prev) => prev.filter((l) => l.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateLeadLocally = useCallback(
    (leadId: string, updates: Partial<LeadWithAssignee>) => {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...updates } : l))
      );
    },
    []
  );

  return { leads, setLeads, updateLeadLocally };
}
