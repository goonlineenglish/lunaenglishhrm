/**
 * google-sheets-outbound-sync.ts
 * Outbound: CRM → Sheet. Builds the "Học viên" tab from Supabase students data.
 * Also syncs Leads, Activities, Reminders, Overview tabs (unchanged from existing logic).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";
import { SHEET_HEADERS, formatSheetDate, type SheetRow } from "./google-sheets-sync-utils";

type Rows = (string | number | null)[][];
type LeadJoin = { student_name?: string | null; parent_name?: string | null } | null;

// Use null (empty cell) instead of "—" so inbound sync doesn't write sentinel back to DB
const v = (x: unknown) => (x as string) || null;
const d = (val: string | null) => (val ? formatSheetDate(val.split("T")[0]) : null);

/** Build the "Học viên" tab with all 16 mapped columns */
export async function buildStudentsTab(sb: SupabaseClient): Promise<Rows> {
  const { data, error } = await sb
    .from("students")
    .select(
      "student_code, date_of_birth, gender, address, program_type, current_level, current_class," +
      "teacher_name, enrollment_date, level_end_date, tuition_amount, payment_status," +
      "lead:leads(student_name, parent_name, parent_phone, parent_email)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`buildStudentsTab: ${error.message}`);

  return [
    SHEET_HEADERS,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(data as any[] ?? []).map((s: Record<string, unknown>): (string | number | null)[] => {
      const lead = s.lead as { student_name?: string | null; parent_name?: string | null; parent_phone?: string | null; parent_email?: string | null } | null;
      return [
        v(s.student_code),                // Mã HS
        v(lead?.student_name),            // Họ tên HS
        d(s.date_of_birth as string | null), // Ngày sinh
        v(s.gender),                      // Giới tính
        v(lead?.parent_name),             // Tên PH
        v(lead?.parent_phone),            // SĐT PH
        v(lead?.parent_email),            // Email PH
        v(s.address),                     // Địa chỉ
        v(s.program_type),                // Chương trình
        v(s.current_level),               // Level
        v(s.current_class),               // Lớp
        v(s.teacher_name),                // GV phụ trách
        d(s.enrollment_date as string | null), // Ngày đăng ký
        d(s.level_end_date as string | null),  // Ngày hết hạn
        (s.tuition_amount as number | null) ?? "", // Học phí
        v(s.payment_status),              // Trạng thái TT
      ];
    }),
  ];
}

export async function buildLeadsTab(sb: SupabaseClient): Promise<Rows> {
  const { data, error } = await sb
    .from("leads")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`buildLeadsTab: ${error.message}`);
  return [
    ["Tên học sinh", "Tên phụ huynh", "SĐT", "Email", "Nguồn", "Giai đoạn", "Chương trình", "Ghi chú", "Ngày tạo", "Cập nhật"],
    ...(data ?? []).map((l: Record<string, unknown>) => [
      v(l.student_name), v(l.parent_name), v(l.parent_phone), v(l.parent_email),
      v(l.source),
      PIPELINE_STAGES.find((s) => s.id === l.current_stage)?.label || v(l.current_stage),
      v(l.program_interest), v(l.notes),
      d(l.created_at as string | null), d(l.updated_at as string | null),
    ]),
  ];
}

export async function buildActivitiesTab(sb: SupabaseClient): Promise<Rows> {
  const { data, error } = await sb
    .from("lead_activities")
    .select("*, leads(student_name, parent_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`buildActivitiesTab: ${error.message}`);
  return [
    ["Lead", "Loại", "Tiêu đề", "Nội dung", "Trạng thái", "Ngày tạo"],
    ...(data ?? []).map((a: Record<string, unknown>) => {
      const l = a.leads as LeadJoin;
      return [l?.student_name || l?.parent_name || "—", v(a.type), v(a.title), v(a.content), v(a.status), d(a.created_at as string | null)];
    }),
  ];
}

export async function buildRemindersTab(sb: SupabaseClient): Promise<Rows> {
  const { data, error } = await sb
    .from("follow_up_reminders")
    .select("*, leads(student_name, parent_name)")
    .order("remind_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(`buildRemindersTab: ${error.message}`);
  return [
    ["Lead", "Loại", "Thời gian nhắc", "Trạng thái", "Ghi chú", "Ngày tạo"],
    ...(data ?? []).map((r: Record<string, unknown>) => {
      const l = r.leads as LeadJoin;
      return [l?.student_name || l?.parent_name || "—", v(r.type), d(r.remind_at as string | null), v(r.status), v(r.note), d(r.created_at as string | null)];
    }),
  ];
}

export async function buildOverviewTab(sb: SupabaseClient): Promise<Rows> {
  const [funnel, source, stu, total, conv] = await Promise.all([
    sb.from("lead_funnel").select("*"),
    sb.from("lead_source_breakdown").select("*"),
    sb.from("students").select("*", { count: "exact", head: true }).is("deleted_at", null),
    sb.from("leads").select("*", { count: "exact", head: true }).is("deleted_at", null),
    sb.from("leads").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("current_stage", "da_dang_ky"),
  ]);
  const funnelData = funnel.data ?? [];
  const sourceData = source.data ?? [];
  return [
    ["Tổng quan Luna English CRM", ""],
    ["Cập nhật lúc", new Date().toLocaleString("vi-VN")],
    [],
    ["Chỉ số", "Giá trị"],
    ["Tổng leads", total.count ?? 0],
    ["Tổng học viên", stu.count ?? 0],
    ["Leads đã đăng ký", conv.count ?? 0],
    [],
    ["--- Phễu theo giai đoạn ---", ""],
    ...funnelData.map((f: Record<string, unknown>): (string | number | null)[] => [
      PIPELINE_STAGES.find((s) => s.id === f.current_stage)?.label || v(f.current_stage),
      (f.lead_count as number) ?? 0,
    ]),
    [],
    ["--- Nguồn leads ---", ""],
    ...sourceData.map((s: Record<string, unknown>): (string | number | null)[] => [v(s.source), (s.lead_count as number) ?? 0]),
  ];
}

/** Snapshot-ready representation of students for diff comparison */
export async function buildStudentSnapshot(sb: SupabaseClient): Promise<SheetRow[]> {
  const { data } = await sb
    .from("students")
    .select(
      "student_code, date_of_birth, gender, address, program_type, current_level, current_class," +
      "teacher_name, enrollment_date, level_end_date, tuition_amount, payment_status," +
      "lead:leads(student_name, parent_name, parent_phone, parent_email)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[] ?? []).map((s: Record<string, unknown>): SheetRow => {
    const lead = s.lead as { student_name?: string | null; parent_name?: string | null; parent_phone?: string | null; parent_email?: string | null } | null;
    return {
      "Mã HS": v(s.student_code),
      "Họ tên HS": v(lead?.student_name),
      "Ngày sinh": d(s.date_of_birth as string | null),
      "Giới tính": v(s.gender),
      "Tên PH": v(lead?.parent_name),
      "SĐT PH": v(lead?.parent_phone),
      "Email PH": v(lead?.parent_email),
      "Địa chỉ": v(s.address),
      "Chương trình": v(s.program_type),
      "Level": v(s.current_level),
      "Lớp": v(s.current_class),
      "GV phụ trách": v(s.teacher_name),
      "Ngày đăng ký": d(s.enrollment_date as string | null),
      "Ngày hết hạn": d(s.level_end_date as string | null),
      "Học phí": (s.tuition_amount as number | null) ?? null,
      "Trạng thái TT": v(s.payment_status),
    };
  });
}
