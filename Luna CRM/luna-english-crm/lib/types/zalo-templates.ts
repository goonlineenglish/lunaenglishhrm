import type { LeadStage } from "./leads";

export interface ZaloMessageTemplate {
  id: string;
  name: string;
  template_key: string;
  stage: LeadStage | null;
  zalo_template_id: string | null;
  body_text: string;
  params: string[];
  is_active: boolean;
  created_at: string;
}
