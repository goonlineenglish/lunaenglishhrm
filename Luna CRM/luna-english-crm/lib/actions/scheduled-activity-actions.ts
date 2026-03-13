"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  LeadActivity,
  LeadActivityType,
  ActivityStatus,
  RecurrencePattern,
} from "@/lib/types/leads";
import { addWeeks, setDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

interface CreateScheduledActivityInput {
  title: string;
  description?: string;
  type: LeadActivityType;
  scheduleFrom: string; // Vietnam local ISO string
  scheduleTo: string; // Vietnam local ISO string
  location?: string;
  participantIds?: string[];
  recurrencePattern?: RecurrencePattern;
  recurrenceDayOfWeek?: number; // 0=Sun, 1=Mon, ..., 6=Sat
}

const VN_TZ = "Asia/Ho_Chi_Minh";

export async function createScheduledActivity(
  leadId: string,
  data: CreateScheduledActivityInput
): Promise<{ success: boolean; data?: LeadActivity; error?: string }> {
  if (!isValidUUID(leadId)) {
    return { success: false, error: "ID không hợp lệ" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  if (data.participantIds?.length) {
    for (const pid of data.participantIds) {
      if (!isValidUUID(pid)) {
        return { success: false, error: "ID người tham gia không hợp lệ" };
      }
    }
  }

  // Convert Vietnam local time to UTC for storage
  const parsedFrom = new Date(data.scheduleFrom);
  const parsedTo = new Date(data.scheduleTo);

  if (isNaN(parsedFrom.getTime()) || isNaN(parsedTo.getTime())) {
    return { success: false, error: "Ngày giờ không hợp lệ" };
  }
  if (parsedFrom >= parsedTo) {
    return { success: false, error: "Thời gian bắt đầu phải trước thời gian kết thúc" };
  }

  const scheduleFromUtc = fromZonedTime(parsedFrom, VN_TZ).toISOString();
  const scheduleToUtc = fromZonedTime(parsedTo, VN_TZ).toISOString();

  const recurrence = data.recurrencePattern ?? "once";

  const { data: parent, error: parentError } = await supabase
    .from("lead_activities")
    .insert({
      lead_id: leadId,
      type: data.type,
      title: data.title.trim(),
      content: data.description?.trim() || null,
      schedule_from: scheduleFromUtc,
      schedule_to: scheduleToUtc,
      location: data.location?.trim() || null,
      participant_ids: data.participantIds ?? [],
      status: "pending",
      recurrence_pattern: recurrence,
      recurrence_day_of_week:
        recurrence === "weekly" ? (data.recurrenceDayOfWeek ?? null) : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (parentError) {
    return { success: false, error: "Không thể tạo hoạt động" };
  }

  // Weekly recurrence: generate next 4 child instances
  if (recurrence === "weekly" && data.recurrenceDayOfWeek != null) {
    const baseFrom = new Date(data.scheduleFrom);
    const baseTo = new Date(data.scheduleTo);
    const children = Array.from({ length: 4 }, (_, i) => {
      const week = i + 1;
      const childFrom = addWeeks(setDay(baseFrom, data.recurrenceDayOfWeek!), week);
      const childTo = addWeeks(setDay(baseTo, data.recurrenceDayOfWeek!), week);
      return {
        lead_id: leadId,
        type: data.type,
        title: data.title.trim(),
        content: data.description?.trim() || null,
        schedule_from: fromZonedTime(childFrom, VN_TZ).toISOString(),
        schedule_to: fromZonedTime(childTo, VN_TZ).toISOString(),
        location: data.location?.trim() || null,
        participant_ids: data.participantIds ?? [],
        status: "pending" as ActivityStatus,
        recurrence_pattern: "weekly" as RecurrencePattern,
        recurrence_day_of_week: data.recurrenceDayOfWeek!,
        parent_activity_id: parent.id,
        created_by: user.id,
      };
    });
    await supabase.from("lead_activities").insert(children);
  }

  revalidatePath("/pipeline");
  revalidatePath("/activities");
  return { success: true, data: parent as LeadActivity };
}

export async function updateActivityStatus(
  activityId: string,
  status: "completed" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  if (!isValidUUID(activityId)) {
    return { success: false, error: "ID không hợp lệ" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  const { error } = await supabase
    .from("lead_activities")
    .update({ status })
    .eq("id", activityId);

  if (error) {
    return { success: false, error: "Không thể cập nhật trạng thái" };
  }

  revalidatePath("/pipeline");
  revalidatePath("/activities");
  return { success: true };
}

export async function getUpcomingActivities(filters?: {
  advisorId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}): Promise<{ data?: (LeadActivity & { lead_name?: string })[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Chưa đăng nhập" };
  }

  let query = supabase
    .from("lead_activities")
    .select("*, leads!inner(parent_name, student_name, assigned_to)")
    .is("deleted_at", null)
    .not("schedule_from", "is", null)
    .order("schedule_from", { ascending: true });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    query = query.in("status", ["pending", "completed"]);
  }
  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.advisorId) query = query.eq("leads.assigned_to", filters.advisorId);
  if (filters?.dateFrom) query = query.gte("schedule_from", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("schedule_from", filters.dateTo);

  const { data, error } = await query.limit(100);

  if (error) {
    return { error: "Không thể tải danh sách hoạt động" };
  }

  const mapped = (data ?? []).map((row) => {
    const lead = row.leads as unknown as {
      parent_name: string;
      student_name: string | null;
    };
    return {
      ...row,
      leads: undefined,
      lead_name: lead?.student_name || lead?.parent_name || "—",
    } as LeadActivity & { lead_name?: string };
  });

  return { data: mapped };
}
