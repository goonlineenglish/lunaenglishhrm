/**
 * google-sheets-inbound-sync.ts
 * Inbound: Sheet → CRM. Reads changed rows (via snapshot diff), upserts students,
 * auto-creates leads for new students without a matching CRM lead.
 * Sheet wins on all fields (conflict resolution per spec).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STUDENT_COLUMN_MAP,
  type SheetRow,
  parseSheetDate,
  validateStudentCode,
} from "./google-sheets-sync-utils";

export interface InboundSyncResult {
  upserted: number;
  leadsCreated: number;
  skipped: number;
  errors: string[];
}

/** Map sheet row fields → students table update payload */
function toStudentPayload(row: SheetRow): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const col of STUDENT_COLUMN_MAP) {
    if (col.table !== "students") continue;
    const val = row[col.header];
    if (val === null || val === undefined || val === "") continue;

    if (col.field === "enrollment_date" || col.field === "level_end_date" || col.field === "date_of_birth") {
      payload[col.field] = parseSheetDate(val as string);
    } else if (col.field === "tuition_amount") {
      const n = Number(val);
      if (!isNaN(n)) payload[col.field] = n;
    } else {
      payload[col.field] = val;
    }
  }
  return payload;
}

/** Map sheet row fields → leads table insert payload */
function toLeadPayload(row: SheetRow): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const col of STUDENT_COLUMN_MAP) {
    if (col.table !== "leads") continue;
    const val = row[col.header];
    if (val !== null && val !== undefined && val !== "") {
      payload[col.field] = val;
    }
  }
  return payload;
}

/**
 * Find or create a lead for the given sheet row.
 * Lookup order:
 *   1. Match by parent_phone (exact)
 *   2. Match by student_name + parent_name (both present)
 *   3. Create new lead with source='google_sheet'
 * Returns lead_id or null on error.
 */
async function resolveLeadId(sb: SupabaseClient, row: SheetRow): Promise<string | null> {
  const phone = row["SĐT PH"] as string | null;
  const studentName = row["Họ tên HS"] as string | null;
  const parentName = row["Tên PH"] as string | null;

  // 1. Phone match
  if (phone) {
    const { data } = await sb
      .from("leads")
      .select("id")
      .eq("parent_phone", phone.trim())
      .limit(1)
      .maybeSingle();
    if (data) return data.id as string;
  }

  // 2. Name match
  if (studentName && parentName) {
    const { data } = await sb
      .from("leads")
      .select("id")
      .eq("student_name", studentName.trim())
      .eq("parent_name", parentName.trim())
      .limit(1)
      .maybeSingle();
    if (data) return data.id as string;
  }

  // 3. Auto-create lead
  const leadPayload = toLeadPayload(row);
  const { data: newLead, error } = await sb
    .from("leads")
    .insert({
      parent_name: parentName ?? "Phụ huynh (Google Sheet)",
      parent_phone: (phone ?? "").trim(),
      student_name: studentName ?? null,
      source: "google_sheet",
      current_stage: "da_dang_ky",
      ...leadPayload,
    })
    .select("id")
    .single();

  if (error) {
    console.error("resolveLeadId: auto-create lead failed:", error.message);
    return null;
  }
  return newLead.id as string;
}

/**
 * Process inbound sync: upsert only rows that changed since last snapshot.
 * If changedRows is empty (first run or no diff), processes all rows.
 */
export async function processInboundSync(
  sb: SupabaseClient,
  currentRows: SheetRow[],
  previousRows: SheetRow[],
  diffs: Map<string, Record<string, { sheet: unknown; prev: unknown }>>
): Promise<InboundSyncResult> {
  const result: InboundSyncResult = { upserted: 0, leadsCreated: 0, skipped: 0, errors: [] };

  // If no previous snapshot, process all rows; otherwise only changed
  const toProcess = previousRows.length === 0
    ? currentRows
    : currentRows.filter((r) => diffs.has(r["Mã HS"] as string));

  for (const row of toProcess) {
    if (!validateStudentCode(row)) {
      result.skipped++;
      continue;
    }
    const studentCode = (row["Mã HS"] as string).trim();

    try {
      // Find existing student by code
      const { data: existing } = await sb
        .from("students")
        .select("id, lead_id")
        .eq("student_code", studentCode)
        .maybeSingle();

      let leadId = existing?.lead_id as string | null;
      if (!leadId) {
        const resolved = await resolveLeadId(sb, row);
        if (resolved) {
          // Check if this is a newly created lead (not in existing student)
          if (!existing) result.leadsCreated++;
          leadId = resolved;
        }
      }

      const studentPayload = toStudentPayload(row);

      if (existing) {
        // Update existing student — Sheet wins
        await sb
          .from("students")
          .update({ ...studentPayload, lead_id: leadId ?? existing.lead_id })
          .eq("id", existing.id);
      } else {
        // Insert new student
        await sb.from("students").insert({
          student_code: studentCode,
          lead_id: leadId,
          status: "active",
          renewal_status: "pending",
          ...studentPayload,
        });
      }
      result.upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`${studentCode}: ${msg}`);
    }
  }

  return result;
}
