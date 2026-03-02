"use client";

import type { LeadSource, LeadStage, ProgramType } from "@/lib/types/leads";
import type { Filters } from "@/components/pipeline/pipeline-view";
import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Advisor {
  id: string;
  full_name: string;
  role: string;
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  advisors: Advisor[];
}

export function FilterBar({
  filters,
  onFiltersChange,
  advisors,
}: FilterBarProps) {
  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function toggleStage(stageId: LeadStage) {
    const current = filters.stages;
    const next = current.includes(stageId)
      ? current.filter((s) => s !== stageId)
      : [...current, stageId];
    updateFilter("stages", next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.source}
          onValueChange={(v) => updateFilter("source", v as LeadSource | "all")}
        >
          <SelectTrigger className="w-[140px]" size="sm">
            <SelectValue placeholder="Nguồn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả nguồn</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="zalo">Zalo</SelectItem>
            <SelectItem value="walk_in">Walk-in</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="phone">Điện thoại</SelectItem>
            <SelectItem value="referral">Giới thiệu</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.program}
          onValueChange={(v) =>
            updateFilter("program", v as ProgramType | "all")
          }
        >
          <SelectTrigger className="w-[160px]" size="sm">
            <SelectValue placeholder="Chương trình" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả CT</SelectItem>
            <SelectItem value="buttercup">Buttercup</SelectItem>
            <SelectItem value="primary_success">Primary Success</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="ielts">IELTS</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.assignee}
          onValueChange={(v) => updateFilter("assignee", v)}
        >
          <SelectTrigger className="w-[160px]" size="sm">
            <SelectValue placeholder="Tư vấn viên" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả TV</SelectItem>
            {advisors.map((advisor) => (
              <SelectItem key={advisor.id} value={advisor.id}>
                {advisor.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => updateFilter("stages", [])}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            filters.stages.length === 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
          )}
        >
          Tất cả
        </button>
        {PIPELINE_STAGES.map((stage) => {
          const active = filters.stages.includes(stage.id);
          return (
            <button
              key={stage.id}
              onClick={() => toggleStage(stage.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {stage.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
