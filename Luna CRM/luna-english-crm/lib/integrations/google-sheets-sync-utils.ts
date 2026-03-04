/**
 * google-sheets-sync-utils.ts
 * Shared utilities: Sheets client, column mapping, snapshot helpers,
 * row diffing, concurrency lock, date formatting, data quality validation.
 */
import { google } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SheetRow = Record<string, string | number | null>;
type RawRows = (string | number | null)[][];

/** 16-column mapping: Sheet header → Supabase field */
export const STUDENT_COLUMN_MAP = [
  { header: "Mã HS",         field: "student_code",   table: "students" },
  { header: "Họ tên HS",     field: "student_name",   table: "leads" },
  { header: "Ngày sinh",     field: "date_of_birth",  table: "students" },
  { header: "Giới tính",     field: "gender",         table: "students" },
  { header: "Tên PH",        field: "parent_name",    table: "leads" },
  { header: "SĐT PH",        field: "parent_phone",   table: "leads" },
  { header: "Email PH",      field: "parent_email",   table: "leads" },
  { header: "Địa chỉ",       field: "address",        table: "students" },
  { header: "Chương trình",  field: "program_type",   table: "students" },
  { header: "Level",         field: "current_level",  table: "students" },
  { header: "Lớp",           field: "current_class",  table: "students" },
  { header: "GV phụ trách",  field: "teacher_name",   table: "students" },
  { header: "Ngày đăng ký",  field: "enrollment_date",table: "students" },
  { header: "Ngày hết hạn",  field: "level_end_date", table: "students" },
  { header: "Học phí",       field: "tuition_amount", table: "students" },
  { header: "Trạng thái TT", field: "payment_status", table: "students" },
] as const;

export const SHEET_HEADERS = STUDENT_COLUMN_MAP.map((c) => c.header);

export function sheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

/** Read all rows from a sheet tab, returns array of header-keyed objects */
export async function readSheetTab(
  sheets: ReturnType<typeof sheetsClient>,
  sheetId: string,
  tabName: string
): Promise<SheetRow[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A:P`,
  });
  const values = res.data.values ?? [];
  if (values.length < 2) return [];
  const headers = values[0] as string[];
  return values.slice(1).map((row) => {
    const obj: SheetRow = {};
    headers.forEach((h, i) => { obj[h] = (row[i] as string | number | null) ?? null; });
    return obj;
  });
}

/** Write rows to a sheet tab (clear + update) */
export async function writeSheetTab(
  sheets: ReturnType<typeof sheetsClient>,
  sheetId: string,
  tabName: string,
  data: RawRows
): Promise<void> {
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: `'${tabName}'!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values: data },
  });
}

/** Append rows to a sheet tab */
export async function appendSheetRows(
  sheets: ReturnType<typeof sheetsClient>,
  sheetId: string,
  tabName: string,
  rows: RawRows
): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A:P`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

/** Load latest snapshot from DB */
export async function getLatestSnapshot(sb: SupabaseClient): Promise<SheetRow[]> {
  const { data } = await sb
    .from("sheet_sync_snapshots")
    .select("snapshot_data")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.snapshot_data as SheetRow[]) ?? [];
}

/** Save new snapshot */
export async function saveSnapshot(sb: SupabaseClient, rows: SheetRow[]): Promise<void> {
  await sb.from("sheet_sync_snapshots").insert({
    snapshot_data: rows,
    row_count: rows.length,
  });
}

/**
 * Diff two row snapshots by student_code.
 * Returns map of student_code → { field → { sheet: value, prev: value } } for changed fields.
 */
export function diffRows(
  current: SheetRow[],
  previous: SheetRow[]
): Map<string, Record<string, { sheet: unknown; prev: unknown }>> {
  const prevMap = new Map(previous.map((r) => [r["Mã HS"] as string, r]));
  const result = new Map<string, Record<string, { sheet: unknown; prev: unknown }>>();

  for (const row of current) {
    const code = row["Mã HS"] as string;
    if (!code) continue;
    const prev = prevMap.get(code);
    if (!prev) {
      // New row — all fields "changed" from undefined
      const changes: Record<string, { sheet: unknown; prev: unknown }> = {};
      for (const col of STUDENT_COLUMN_MAP) {
        changes[col.header] = { sheet: row[col.header], prev: undefined };
      }
      result.set(code, changes);
      continue;
    }
    const changes: Record<string, { sheet: unknown; prev: unknown }> = {};
    for (const col of STUDENT_COLUMN_MAP) {
      const sheetVal = row[col.header];
      const prevVal = prev[col.header];
      if (sheetVal !== prevVal) {
        changes[col.header] = { sheet: sheetVal, prev: prevVal };
      }
    }
    if (Object.keys(changes).length > 0) result.set(code, changes);
  }
  return result;
}

export function parseSheetDate(str: string | null): string | null {
  if (!str) return null;
  // Accept dd/MM/yyyy or ISO
  const parts = str.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return str;
}

export function formatSheetDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

/** Data quality: student_code must be non-empty string */
export function validateStudentCode(row: SheetRow): boolean {
  const code = row["Mã HS"];
  return typeof code === "string" && code.trim().length > 0;
}

/**
 * Acquire sync lock — marks stale rows as 'timeout', then inserts a new 'running' row.
 * UNIQUE partial index WHERE status='running' prevents concurrent runs atomically.
 * Returns lockId (UUID) on success, null if another run is active.
 */
export async function acquireSyncLock(sb: SupabaseClient): Promise<string | null> {
  // Timeout stale rows first (>10 min)
  await sb
    .from("sync_runs")
    .update({ status: "timeout", completed_at: new Date().toISOString() })
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  const { data, error } = await sb
    .from("sync_runs")
    .insert({ status: "running" })
    .select("id")
    .single();

  if (error) {
    // Unique constraint violation = another run is active
    if (error.code === "23505") return null;
    throw new Error(`acquireSyncLock failed: ${error.message}`);
  }
  return data.id as string;
}

/** Release sync lock — mark as completed or error */
export async function releaseSyncLock(
  sb: SupabaseClient,
  lockId: string,
  status: "completed" | "error",
  errorMsg?: string
): Promise<void> {
  await sb
    .from("sync_runs")
    .update({ status, completed_at: new Date().toISOString(), error: errorMsg ?? null })
    .eq("id", lockId);
}

/** Delete old sync_runs and snapshots (>48h) */
export async function cleanupOldRecords(sb: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  await Promise.all([
    sb.from("sync_runs").delete().lt("started_at", cutoff).neq("status", "running"),
    sb.from("sheet_sync_snapshots").delete().lt("synced_at", cutoff),
  ]);
}
