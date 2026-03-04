/**
 * google-sheets-sync.ts — 2-way sync orchestrator.
 *
 * Flow per run:
 *   1. Acquire concurrency lock (sync_runs UNIQUE partial index)
 *   2. Read current Sheet "Học viên" tab
 *   3. Load previous snapshot from DB, compute diff
 *   4. Inbound: apply Sheet→CRM changes
 *   5. Outbound: write all 5 CRM tabs to Sheet
 *   6. Save new snapshot
 *   7. Cleanup old records (>48h)
 *   8. Release lock
 */
import { getAdminClient } from "@/lib/supabase/admin";
import {
  sheetsClient,
  readSheetTab,
  writeSheetTab,
  getLatestSnapshot,
  saveSnapshot,
  diffRows,
  acquireSyncLock,
  releaseSyncLock,
  cleanupOldRecords,
} from "./google-sheets-sync-utils";
import { processInboundSync } from "./google-sheets-inbound-sync";
import {
  buildStudentsTab,
  buildLeadsTab,
  buildActivitiesTab,
  buildRemindersTab,
  buildOverviewTab,
  buildStudentSnapshot,
} from "./google-sheets-outbound-sync";

export interface SyncResult {
  success: boolean;
  error?: string;
  tabs_synced?: number;
  total_rows?: number;
  inbound?: { upserted: number; leadsCreated: number; skipped: number; errors: string[] };
  details?: { tab: string; rows: number; status: string; error?: string }[];
  synced_at?: string;
  skipped_reason?: string;
}

export async function syncAllToSheets(): Promise<SyncResult> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
    return { success: false, error: "Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SHEET_ID" };
  }

  const sb = getAdminClient();
  const sheetId = process.env.GOOGLE_SHEET_ID!;

  // --- Step 1: Acquire lock ---
  const lockId = await acquireSyncLock(sb);
  if (!lockId) {
    return { success: true, skipped_reason: "Another sync is already running", synced_at: new Date().toISOString() };
  }

  let sheets: ReturnType<typeof sheetsClient>;
  try {
    sheets = sheetsClient();
  } catch (err) {
    await releaseSyncLock(sb, lockId, "error", `Invalid GOOGLE_SERVICE_ACCOUNT_KEY: ${err instanceof Error ? err.message : "parse error"}`);
    return { success: false, error: `Invalid GOOGLE_SERVICE_ACCOUNT_KEY: ${err instanceof Error ? err.message : "parse error"}` };
  }

  try {
    // --- Step 2: Read current Sheet "Học viên" tab ---
    const currentSheetRows = await readSheetTab(sheets, sheetId, "Học viên");

    // --- Step 3: Load snapshot + diff ---
    const previousRows = await getLatestSnapshot(sb);
    const diffs = diffRows(currentSheetRows, previousRows);

    // --- Step 4: Inbound sync (Sheet → CRM) ---
    const inboundResult = await processInboundSync(sb, currentSheetRows, previousRows, diffs);

    // --- Step 5: Outbound — write all 5 tabs ---
    const tabFetchers: { name: string; fetch: () => Promise<(string | number | null)[][]> }[] = [
      { name: "Học viên", fetch: () => buildStudentsTab(sb) },
      { name: "Leads", fetch: () => buildLeadsTab(sb) },
      { name: "Hoạt động", fetch: () => buildActivitiesTab(sb) },
      { name: "Nhắc nhở", fetch: () => buildRemindersTab(sb) },
      { name: "Tổng quan", fetch: () => buildOverviewTab(sb) },
    ];

    const details: NonNullable<SyncResult["details"]> = [];
    for (const tab of tabFetchers) {
      try {
        const data = await tab.fetch();
        await writeSheetTab(sheets, sheetId, tab.name, data);
        details.push({ tab: tab.name, rows: data.length, status: "ok" });
      } catch (err: unknown) {
        details.push({ tab: tab.name, rows: 0, status: "error", error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    // --- Step 6: Save new snapshot (CRM state after inbound) ---
    const newSnapshot = await buildStudentSnapshot(sb);
    await saveSnapshot(sb, newSnapshot);

    // --- Step 7: Cleanup old records ---
    await cleanupOldRecords(sb);

    // --- Step 8: Release lock ---
    const hasErrors = details.some((d) => d.status === "error") || inboundResult.errors.length > 0;
    await releaseSyncLock(sb, lockId, hasErrors ? "error" : "completed");

    return {
      success: details.every((d) => d.status === "ok"),
      tabs_synced: details.filter((d) => d.status === "ok").length,
      total_rows: details.reduce((sum, d) => sum + d.rows, 0),
      inbound: inboundResult,
      details,
      synced_at: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await releaseSyncLock(sb, lockId, "error", msg);
    return { success: false, error: msg };
  }
}
