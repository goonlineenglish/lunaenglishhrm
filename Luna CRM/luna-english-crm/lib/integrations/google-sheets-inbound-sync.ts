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
  warnings: string[]; // non-fatal: skipped rows with invalid/missing student_code
  errors: string[];   // fatal: DB write failures
}

/** Normalize a raw sheet value: treat sentinel "—" as empty string. */
function normalizeVal(raw: unknown): unknown {
  return raw === "—" ? "" : raw;
}

/** Map sheet row fields → students table update payload.
 * Empty string clears the field (Sheet wins, including deletions). */
function toStudentPayload(row: SheetRow): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const col of STUDENT_COLUMN_MAP) {
    if (col.table !== "students") continue;
    const rawVal = row[col.header];
    if (rawVal === null || rawVal === undefined) continue;

    const val = normalizeVal(rawVal);

    if (col.field === "enrollment_date" || col.field === "level_end_date" || col.field === "date_of_birth") {
      payload[col.field] = val === "" ? null : parseSheetDate(val as string);
    } else if (col.field === "tuition_amount") {
      if (val === "") {
        payload[col.field] = null;
      } else {
        const n = Number(val);
        if (!isNaN(n)) payload[col.field] = n;
      }
    } else {
      payload[col.field] = val === "" ? null : val;
    }
  }
  return payload;
}

/** Map sheet row fields → leads table update payload (Sheet-wins for lead fields). */
function toLeadUpdatePayload(row: SheetRow): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const col of STUDENT_COLUMN_MAP) {
    if (col.table !== "leads") continue;
    const rawVal = row[col.header];
    if (rawVal === null || rawVal === undefined) continue;
    const val = normalizeVal(rawVal);
    // Empty string → null to clear the field
    payload[col.field] = val === "" ? null : val;
  }
  return payload;
}

/** Map sheet row fields → leads table insert payload (only non-empty values). */
function toLeadInsertPayload(row: SheetRow): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const col of STUDENT_COLUMN_MAP) {
    if (col.table !== "leads") continue;
    const val = row[col.header];
    if (val !== null && val !== undefined && val !== "" && val !== "—") {
      payload[col.field] = val;
    }
  }
  return payload;
}

/**
 * Find or create a lead for the given sheet row.
 * Returns { id, isNew } — isNew=true only when a new lead was actually inserted.
 * Lookup order:
 *   1. Match by parent_phone (exact)
 *   2. Match by student_name + parent_name (both present)
 *   3. Create new lead with source='google_sheet'
 */
async function resolveLeadId(
  sb: SupabaseClient,
  row: SheetRow
): Promise<{ id: string; isNew: boolean } | null> {
  const phone = row["SĐT PH"] as string | null;
  const studentName = row["Họ tên HS"] as string | null;
  const parentName = row["Tên PH"] as string | null;

  // 1. Phone match
  if (phone && phone !== "—") {
    const { data } = await sb
      .from("leads")
      .select("id")
      .is("deleted_at", null)
      .eq("parent_phone", phone.trim())
      .limit(1)
      .maybeSingle();
    if (data) return { id: data.id as string, isNew: false };
  }

  // 2. Name match
  if (studentName && parentName) {
    const { data } = await sb
      .from("leads")
      .select("id")
      .is("deleted_at", null)
      .eq("student_name", studentName.trim())
      .eq("parent_name", parentName.trim())
      .limit(1)
      .maybeSingle();
    if (data) return { id: data.id as string, isNew: false };
  }

  // 3. Auto-create lead
  const insertPayload = toLeadInsertPayload(row);
  const { data: newLead, error } = await sb
    .from("leads")
    .insert({
      parent_name: parentName ?? "Phụ huynh (Google Sheet)",
      parent_phone: (phone && phone !== "—" ? phone : "").trim(),
      student_name: studentName ?? null,
      source: "google_sheet",
      current_stage: "da_dang_ky",
      ...insertPayload,
    })
    .select("id")
    .single();

  if (error) {
    console.error("resolveLeadId: auto-create lead failed:", error.message);
    return null;
  }
  return { id: newLead.id as string, isNew: true };
}

/**
 * Process inbound sync: upsert only rows that changed since last snapshot.
 * If no previous snapshot, processes all rows.
 */
export async function processInboundSync(
  sb: SupabaseClient,
  currentRows: SheetRow[],
  previousRows: SheetRow[],
  diffs: Map<string, Record<string, { sheet: unknown; prev: unknown }>>
): Promise<InboundSyncResult> {
  const result: InboundSyncResult = { upserted: 0, leadsCreated: 0, skipped: 0, warnings: [], errors: [] };

  // If no previous snapshot, process all rows; otherwise only changed
  const toProcess = previousRows.length === 0
    ? currentRows
    : currentRows.filter((r) => diffs.has(r["Mã HS"] as string));

  for (const row of toProcess) {
    if (!validateStudentCode(row)) {
      result.skipped++;
      // Non-fatal warning: skipped rows are logged but don't fail the sync job
      const rowCode = row["Mã HS"] ?? "(empty)";
      result.warnings.push(`skipped: invalid student_code "${rowCode}"`);
      continue;
    }
    const studentCode = (row["Mã HS"] as string).trim();

    try {
      // Find existing student by code
      const { data: existing } = await sb
        .from("students")
        .select("id, lead_id")
        .eq("student_code", studentCode)
        .is("deleted_at", null)
        .maybeSingle();

      // Resolve lead — track whether a new lead was created
      let leadId = existing?.lead_id as string | null;
      if (!leadId) {
        const resolved = await resolveLeadId(sb, row);
        if (resolved) {
          if (resolved.isNew) result.leadsCreated++;
          leadId = resolved.id;
        }
      }

      const studentPayload = toStudentPayload(row);

      if (existing) {
        // Update existing student — Sheet wins
        const { error: updateErr } = await sb
          .from("students")
          .update({ ...studentPayload, lead_id: leadId ?? existing.lead_id })
          .eq("id", existing.id);
        if (updateErr) throw new Error(updateErr.message);

        // Sheet-wins: also update lead fields (Họ tên HS, Tên PH, SĐT PH, Email PH)
        const effectiveLeadId = leadId ?? existing.lead_id;
        if (effectiveLeadId) {
          const leadPayload = toLeadUpdatePayload(row);
          if (Object.keys(leadPayload).length > 0) {
            const { error: leadErr } = await sb
              .from("leads")
              .update(leadPayload)
              .eq("id", effectiveLeadId);
            if (leadErr) throw new Error(`lead update: ${leadErr.message}`);
          }
        }
      } else {
        // Insert new student
        const { error: insertErr } = await sb.from("students").insert({
          student_code: studentCode,
          lead_id: leadId,
          status: "active",
          renewal_status: "pending",
          ...studentPayload,
        });
        if (insertErr) throw new Error(insertErr.message);
      }
      result.upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      result.errors.push(`${studentCode}: ${msg}`);
    }
  }

  return result;
}
