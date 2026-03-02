import type { LeadStage } from "./leads";

export interface EmailTemplate {
  id: string;
  name: string;
  template_key: string;
  stage: LeadStage | null;
  subject: string;
  body_html: string;
  params: string[];
  is_active: boolean;
  created_at: string;
}
