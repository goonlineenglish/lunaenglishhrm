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

  return (
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
        value={filters.stage}
        onValueChange={(v) => updateFilter("stage", v as LeadStage | "all")}
      >
        <SelectTrigger className="w-[160px]" size="sm">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả TT</SelectItem>
          {PIPELINE_STAGES.map((stage) => (
            <SelectItem key={stage.id} value={stage.id}>
              {stage.label}
            </SelectItem>
          ))}
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
  );
}
