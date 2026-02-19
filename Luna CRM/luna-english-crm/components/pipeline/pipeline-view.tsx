"use client";

import { useState, useMemo } from "react";
import { useRealtimeLeads } from "@/lib/hooks/use-realtime-leads";
import type { LeadWithAssignee } from "@/lib/hooks/use-realtime-leads";
import type { UserRole } from "@/lib/types/users";
import type { Lead, LeadSource, LeadStage, ProgramType } from "@/lib/types/leads";
import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { LeadListView } from "@/components/pipeline/lead-list-view";
import { FilterBar } from "@/components/pipeline/filter-bar";
import { QuickAddLeadSheet } from "@/components/pipeline/quick-add-lead-sheet";
import { LeadDetailSheet } from "@/components/pipeline/lead-detail-sheet";
import { CommandSearch } from "@/components/pipeline/command-search";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus } from "lucide-react";

interface Advisor {
  id: string;
  full_name: string;
  role: string;
}

export interface Filters {
  source: LeadSource | "all";
  program: ProgramType | "all";
  stage: LeadStage | "all";
  assignee: string | "all";
}

interface PipelineViewProps {
  initialLeads: LeadWithAssignee[];
  advisors: Advisor[];
  userRole: UserRole;
  userId: string;
}

export function PipelineView({
  initialLeads,
  advisors,
  userRole,
  userId,
}: PipelineViewProps) {
  const { leads, setLeads } = useRealtimeLeads(initialLeads);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<Filters>({
    source: "all",
    program: "all",
    stage: "all",
    assignee: "all",
  });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithAssignee | null>(
    null
  );

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filters.source !== "all" && lead.source !== filters.source)
        return false;
      if (
        filters.program !== "all" &&
        lead.program_interest !== filters.program
      )
        return false;
      if (filters.stage !== "all" && lead.current_stage !== filters.stage)
        return false;
      if (filters.assignee !== "all" && lead.assigned_to !== filters.assignee)
        return false;
      return true;
    });
  }, [leads, filters]);

  const leadsByStage = useMemo(() => {
    const grouped: Record<LeadStage, LeadWithAssignee[]> = {} as Record<
      LeadStage,
      LeadWithAssignee[]
    >;
    for (const stage of PIPELINE_STAGES) {
      grouped[stage.id] = [];
    }
    for (const lead of filteredLeads) {
      if (grouped[lead.current_stage]) {
        grouped[lead.current_stage].push(lead);
      }
    }
    return grouped;
  }, [filteredLeads]);

  const handleLeadSelect = (lead: LeadWithAssignee) => {
    setSelectedLead(lead);
  };

  const handleLeadUpdated = (updated: Lead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
    );
    if (selectedLead?.id === updated.id) {
      setSelectedLead((prev) => (prev ? { ...prev, ...updated } : null));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} leads tổng cộng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="rounded-r-none"
            >
              <LayoutGrid className="mr-1 size-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="mr-1 size-4" />
              Danh sách
            </Button>
          </div>
          <Button size="sm" onClick={() => setQuickAddOpen(true)}>
            <Plus className="mr-1 size-4" />
            Thêm lead
          </Button>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        advisors={advisors}
      />

      {viewMode === "kanban" ? (
        <KanbanBoard
          leadsByStage={leadsByStage}
          leads={filteredLeads}
          setLeads={setLeads}
          onLeadSelect={handleLeadSelect}
          userRole={userRole}
        />
      ) : (
        <LeadListView
          leads={filteredLeads}
          onLeadSelect={handleLeadSelect}
        />
      )}

      <QuickAddLeadSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
      />

      <LeadDetailSheet
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null);
        }}
        advisors={advisors}
        userRole={userRole}
        onLeadUpdated={handleLeadUpdated}
      />

      <CommandSearch
        leads={leads}
        onLeadSelect={handleLeadSelect}
      />
    </div>
  );
}
