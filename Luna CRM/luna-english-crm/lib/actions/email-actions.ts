"use server";

import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { LeadStage } from "@/lib/types/leads";

// Lazy init – avoid crashing the entire SSR module when the key is absent
let _resend: InstanceType<typeof Resend> | null = null;
function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    _resend = new Resend(key);
  }
  return _resend;
}
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Luna English <noreply@luna.edu.vn>";

export interface EmailTemplate {
  id: string;
  name: string;
  template_key: string;
  stage: LeadStage | null;
  subject: string;
  body_html: string;
  params: string[];
  is_active: boolean;
}

// UUID v4 validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetch active email templates, optionally filtered by stage.
 * Stage-matching templates appear first, then generic (null stage).
 */
export async function getEmailTemplates(
  stage?: LeadStage
): Promise<{ data?: EmailTemplate[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  let query = supabase
    .from("email_templates")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (stage) {
    // Fetch templates matching stage OR generic (null stage)
    query = query.or(`stage.eq.${stage},stage.is.null`);
  }

  const { data, error } = await query;
  if (error) return { error: "Không thể tải mẫu email" };

  // Sort: stage-matching first, then generic
  const templates = (data as EmailTemplate[]).sort((a, b) => {
    if (a.stage === stage && b.stage !== stage) return -1;
    if (a.stage !== stage && b.stage === stage) return 1;
    return 0;
  });

  return { data: templates };
}

/**
 * Send an email to a lead's parent_email, log as activity.
 */
export async function sendLeadEmail(
  leadId: string,
  subject: string,
  bodyHtml: string
): Promise<{ success: boolean; error?: string }> {
  // Validate UUID
  if (!UUID_RE.test(leadId)) {
    return { success: false, error: "ID lead không hợp lệ" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Chưa đăng nhập" };

  // Load lead to get email address
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, parent_name, parent_email")
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();

  if (leadErr || !lead) {
    return { success: false, error: "Không tìm thấy lead" };
  }

  if (!lead.parent_email) {
    return { success: false, error: "Lead chưa có địa chỉ email" };
  }

  // Send via Resend
  try {
    const { error: sendErr } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: [lead.parent_email],
      subject,
      html: bodyHtml,
    });

    if (sendErr) {
      console.error("Resend error:", sendErr);
      return { success: false, error: "Gửi email thất bại" };
    }
  } catch (err) {
    console.error("Email send exception:", err);
    return { success: false, error: "Gửi email thất bại" };
  }

  // Log as activity
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "message",
    content: `Email: ${subject}`,
    created_by: user.id,
    metadata: {
      channel: "email",
      subject,
      to: lead.parent_email,
    },
  });

  revalidatePath("/pipeline");
  return { success: true };
}

/**
 * Build template variables from lead data for preview rendering.
 */
export async function getLeadTemplateVars(
  leadId: string
): Promise<{ data?: Record<string, string>; error?: string }> {
  if (!UUID_RE.test(leadId)) return { error: "ID không hợp lệ" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập" };

  const { data: lead } = await supabase
    .from("leads")
    .select("parent_name, student_name, parent_email, parent_phone")
    .eq("id", leadId)
    .is("deleted_at", null)
    .single();

  if (!lead) return { error: "Không tìm thấy lead" };

  // Get advisor name
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return {
    data: {
      parent_name: lead.parent_name ?? "",
      student_name: lead.student_name ?? "",
      advisor_name: profile?.full_name ?? "",
      date: new Date().toLocaleDateString("vi-VN"),
      trial_date: "",
      location: "Luna English Center",
    },
  };
}
