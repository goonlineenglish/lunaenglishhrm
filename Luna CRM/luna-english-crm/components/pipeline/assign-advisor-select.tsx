"use client";

import { useState } from "react";
import { assignLead } from "@/lib/actions/lead-actions";
import type { Lead } from "@/lib/types/leads";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Advisor {
  id: string;
  full_name: string;
  role: string;
}

interface AssignAdvisorSelectProps {
  leadId: string;
  currentAdvisorId: string | null;
  advisors: Advisor[];
  onAssigned: (lead: Lead) => void;
}

export function AssignAdvisorSelect({
  leadId,
  currentAdvisorId,
  advisors,
  onAssigned,
}: AssignAdvisorSelectProps) {
  const [loading, setLoading] = useState(false);

  async function handleAssign(advisorId: string) {
    setLoading(true);
    const result = await assignLead(
      leadId,
      advisorId === "unassign" ? null : advisorId
    );
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã phân công tư vấn viên");
    if (result.data) onAssigned(result.data);
  }

  return (
    <Select
      value={currentAdvisorId ?? "unassign"}
      onValueChange={handleAssign}
      disabled={loading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Chọn tư vấn viên" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassign">Chưa gán</SelectItem>
        {advisors.map((advisor) => (
          <SelectItem key={advisor.id} value={advisor.id}>
            {advisor.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
