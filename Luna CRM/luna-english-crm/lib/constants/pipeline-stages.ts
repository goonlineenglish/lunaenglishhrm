import type { LeadStage } from "@/lib/types/leads";

export interface PipelineStageConfig {
  id: LeadStage;
  label: string;
  color: string;
  bgColor: string;
  slaHours: number | null;
  order: number;
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    id: "moi_tiep_nhan",
    label: "Mới tiếp nhận",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    slaHours: 2,
    order: 1,
  },
  {
    id: "da_tu_van",
    label: "Đã tư vấn",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-200",
    slaHours: null,
    order: 2,
  },
  {
    id: "dang_nurture",
    label: "Đang nurture",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
    slaHours: 168, // 7 days
    order: 3,
  },
  {
    id: "dat_lich_hoc_thu",
    label: "Đặt lịch học thử",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    slaHours: null,
    order: 4,
  },
  {
    id: "dang_hoc_thu",
    label: "Đang học thử",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
    slaHours: null,
    order: 5,
  },
  {
    id: "cho_chot",
    label: "Chờ chốt",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50 border-cyan-200",
    slaHours: 72, // 3 days
    order: 6,
  },
  {
    id: "da_dang_ky",
    label: "Đã đăng ký ✅",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    slaHours: null,
    order: 7,
  },
  {
    id: "mat_lead",
    label: "Mất lead ❌",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    slaHours: null,
    order: 8,
  },
];

export function getStageConfig(
  stageId: LeadStage
): PipelineStageConfig | undefined {
  return PIPELINE_STAGES.find((s) => s.id === stageId);
}
