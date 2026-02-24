import { getAdminClient } from "@/lib/supabase/admin";
import { fetchLeadData, mapLeadFieldsToSchema } from "./facebook-client";

interface FacebookLeadgenEntry {
  id: string;
  time: number;
  changes?: Array<{
    field: string;
    value: {
      leadgen_id: string;
      page_id: string;
      form_id?: string;
      created_time?: number;
    };
  }>;
}

/**
 * Handle Facebook leadgen webhook entries.
 * Extract leadgen_id, fetch lead data from Graph API, create lead in CRM.
 */
export async function handleLeadgen(
  entry: FacebookLeadgenEntry
): Promise<void> {
  const supabase = getAdminClient();

  const changes = entry.changes ?? [];
  for (const change of changes) {
    if (change.field !== "leadgen") continue;

    const leadgenId = change.value.leadgen_id;
    if (!leadgenId) continue;

    // Idempotency: skip if this leadgen_id was already processed
    const { data: existingByLeadgenId } = await supabase
      .from("leads")
      .select("id")
      .eq("notes", `Facebook Lead Ads ID: ${leadgenId}`)
      .limit(1)
      .maybeSingle();

    if (existingByLeadgenId) continue;

    // Get Facebook access token
    const { data: tokenRow } = await supabase
      .from("integration_tokens")
      .select("access_token")
      .eq("provider", "facebook")
      .eq("is_active", true)
      .single();

    if (!tokenRow?.access_token) {
      console.error("No active Facebook token found");
      return;
    }

    // Fetch lead data from Facebook
    const leadData = await fetchLeadData(tokenRow.access_token, leadgenId);
    if (!leadData?.field_data) {
      console.error("Failed to fetch lead data for:", leadgenId);
      return;
    }

    // Map fields to CRM schema
    const mapped = mapLeadFieldsToSchema(leadData.field_data);

    // Sanitize mapped fields to prevent stored XSS
    const sanitize = (v: string | null, maxLen = 200) =>
      v ? v.slice(0, maxLen).replace(/[<>]/g, "") : v;
    mapped.parent_name = sanitize(mapped.parent_name);
    mapped.parent_phone = sanitize(mapped.parent_phone);
    mapped.parent_email = sanitize(mapped.parent_email);
    mapped.student_name = sanitize(mapped.student_name);

    // Check for duplicate by phone
    if (mapped.parent_phone) {
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("parent_phone", mapped.parent_phone)
        .limit(1)
        .single();

      if (existing) {
        // Log activity on existing lead instead of creating duplicate
        await supabase.from("lead_activities").insert({
          lead_id: existing.id,
          type: "note",
          content: `Facebook Lead Ads submission (duplicate): ${leadgenId}`,
          metadata: { source: "facebook", leadgen_id: leadgenId },
        });
        return;
      }
    }

    // Create new lead
    await supabase.from("leads").insert({
      parent_name: mapped.parent_name ?? "Facebook Lead",
      parent_phone: mapped.parent_phone ?? "",
      parent_email: mapped.parent_email,
      student_name: mapped.student_name,
      source: "facebook",
      current_stage: "moi_tiep_nhan",
      notes: `Facebook Lead Ads ID: ${leadgenId}`,
    });
  }
}
