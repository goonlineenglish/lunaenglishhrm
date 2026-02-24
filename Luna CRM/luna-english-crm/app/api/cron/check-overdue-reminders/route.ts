import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendTextMessage } from "@/lib/integrations/zalo-client";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Find overdue pending reminders
  const { data: overdueReminders, error: fetchError } = await supabase
    .from("follow_up_reminders")
    .select("id, lead_id, type, assigned_to, remind_at, leads(parent_name, student_name)")
    .eq("status", "pending")
    .lt("remind_at", new Date().toISOString());

  if (fetchError) {
    console.error("Failed to fetch overdue reminders:", fetchError.message);
    return NextResponse.json({ error: "Không thể tải nhắc nhở" }, { status: 500 });
  }

  if (!overdueReminders || overdueReminders.length === 0) {
    return NextResponse.json({ message: "No overdue reminders", count: 0 });
  }

  // Batch-fetch existing notifications for all reminder IDs to avoid N+1
  const reminderIds = overdueReminders
    .filter((r) => r.assigned_to)
    .map((r) => r.id);

  const { data: existingNotifications } = reminderIds.length > 0
    ? await supabase
        .from("notifications")
        .select("metadata")
        .in("metadata->>reminder_id", reminderIds)
    : { data: [] };

  const existingReminderIds = new Set(
    (existingNotifications ?? []).map(
      (n) => (n.metadata as Record<string, string>)?.reminder_id
    )
  );

  // Create notifications for each overdue reminder (with dedup)
  const notifications: Array<{
    user_id: string;
    title: string;
    message: string;
    type: "reminder";
    is_read: boolean;
    link: string;
    metadata: { reminder_id: string; lead_id: string };
  }> = [];

  for (const reminder of overdueReminders) {
    if (!reminder.assigned_to) continue;

    // Skip if notification already exists for this reminder
    if (existingReminderIds.has(reminder.id)) continue;

    const lead = reminder.leads as unknown as {
      parent_name: string;
      student_name: string | null;
    };
    const leadName = lead?.student_name || lead?.parent_name || "Lead";

    notifications.push({
      user_id: reminder.assigned_to,
      title: `Nhắc nhở quá hạn: ${leadName}`,
      message: `Bạn có nhắc nhở đã quá hạn cho ${leadName}`,
      type: "reminder" as const,
      is_read: false,
      link: "/reminders",
      metadata: {
        reminder_id: reminder.id,
        lead_id: reminder.lead_id,
      },
    });
  }

  if (notifications.length > 0) {
    // Insert one-by-one to skip duplicates if cron overlaps.
    // Batch pre-check above handles the common case; this handles the race.
    for (const notif of notifications) {
      // Re-check right before insert (atomic window is small)
      const { data: alreadyExists } = await supabase
        .from("notifications")
        .select("id")
        .eq("metadata->>reminder_id", notif.metadata.reminder_id)
        .limit(1)
        .maybeSingle();

      if (alreadyExists) continue;

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notif);

      if (insertError) {
        console.error("Failed to insert notification:", insertError.message);
      }
    }
  }

  // --- Trial class auto-reminder via Zalo (24h before) ---
  let zaloRemindersSent = 0;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStart = new Date(tomorrow);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const { data: trialActivities } = await supabase
    .from("lead_activities")
    .select("id, lead_id, schedule_to, metadata")
    .eq("type", "trial_class")
    .eq("status", "pending")
    .gte("schedule_to", tomorrowStart.toISOString())
    .lte("schedule_to", tomorrowEnd.toISOString());

  if (trialActivities?.length) {
    // Get Zalo access token once
    const { data: tokenRow } = await supabase
      .from("integration_tokens")
      .select("access_token")
      .eq("provider", "zalo")
      .eq("is_active", true)
      .single();

    if (tokenRow?.access_token) {
      // Load reminder template
      const { data: template } = await supabase
        .from("zalo_message_templates")
        .select("body_text")
        .eq("template_key", "zalo_trial_reminder")
        .single();

      for (const activity of trialActivities) {
        // Skip if already sent (metadata.zalo_reminder_sent)
        const meta = (activity.metadata ?? {}) as Record<string, unknown>;
        if (meta.zalo_reminder_sent) continue;

        // Get lead info
        const { data: lead } = await supabase
          .from("leads")
          .select("parent_name, student_name")
          .eq("id", activity.lead_id)
          .single();

        if (!lead) continue;

        // Get Zalo UID
        const { data: follower } = await supabase
          .from("zalo_followers")
          .select("zalo_user_id")
          .eq("lead_id", activity.lead_id)
          .single();

        if (!follower?.zalo_user_id) continue;

        // Build message
        const trialDate = activity.schedule_to
          ? new Date(activity.schedule_to).toLocaleDateString("vi-VN")
          : "";
        const trialTime = activity.schedule_to
          ? new Date(activity.schedule_to).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        const messageBody = template
          ? template.body_text
              .replace(/\{\{parent_name\}\}/g, lead.parent_name ?? "")
              .replace(/\{\{student_name\}\}/g, lead.student_name ?? "")
              .replace(/\{\{trial_date\}\}/g, trialDate)
              .replace(/\{\{trial_time\}\}/g, trialTime)
          : `Nhắc nhở: Ngày mai ${trialDate} lúc ${trialTime} là buổi học thử của bé ${lead.student_name ?? ""} tại Luna English.`;

        try {
          const result = await sendTextMessage(
            tokenRow.access_token,
            follower.zalo_user_id,
            messageBody
          );

          if (result.error === 0) {
            zaloRemindersSent++;
            // Mark as sent in activity metadata
            await supabase
              .from("lead_activities")
              .update({ metadata: { ...meta, zalo_reminder_sent: true } })
              .eq("id", activity.id);

            // Log the reminder as a new activity
            await supabase.from("lead_activities").insert({
              lead_id: activity.lead_id,
              type: "message",
              content: messageBody,
              metadata: { channel: "zalo", auto_reminder: true },
            });
          }
        } catch {
          // Skip failed sends — will retry next cron run
        }
      }
    }
  }

  // --- Activity deadline notifications (24h before schedule_to) ---
  let activityDeadlineCount = 0;
  const in24h = new Date();
  in24h.setHours(in24h.getHours() + 24);

  const { data: upcomingActivities } = await supabase
    .from("lead_activities")
    .select("id, lead_id, title, type, schedule_to, leads!inner(parent_name, student_name, assigned_to)")
    .eq("status", "pending")
    .not("schedule_to", "is", null)
    .lte("schedule_to", in24h.toISOString())
    .gt("schedule_to", new Date().toISOString());

  if (upcomingActivities?.length) {
    // Batch-fetch existing notifications for all activity IDs to avoid N+1
    const activityIds = upcomingActivities.map((a) => a.id);
    const { data: existingActivityNotifs } = await supabase
      .from("notifications")
      .select("metadata")
      .in("metadata->>activity_id", activityIds);

    const existingActivityIds = new Set(
      (existingActivityNotifs ?? []).map(
        (n) => (n.metadata as Record<string, string>)?.activity_id
      )
    );

    const activityNotifications: Array<{
      user_id: string;
      title: string;
      message: string;
      type: "reminder";
      is_read: boolean;
      link: string;
      metadata: { activity_id: string; lead_id: string };
    }> = [];

    for (const activity of upcomingActivities) {
      const lead = activity.leads as unknown as {
        parent_name: string;
        student_name: string | null;
        assigned_to: string | null;
      };
      if (!lead?.assigned_to) continue;

      // Skip if notification already exists for this activity
      if (existingActivityIds.has(activity.id)) continue;

      const leadName = lead.student_name || lead.parent_name || "Lead";
      const activityTitle = activity.title || activity.type;

      activityNotifications.push({
        user_id: lead.assigned_to,
        title: `Hoạt động sắp đến hạn: ${activityTitle}`,
        message: `Hoạt động "${activityTitle}" cho ${leadName} sắp đến hạn`,
        type: "reminder",
        is_read: false,
        link: "/activities",
        metadata: {
          activity_id: activity.id,
          lead_id: activity.lead_id,
        },
      });
    }

    if (activityNotifications.length > 0) {
      for (const notif of activityNotifications) {
        const { data: alreadyExists } = await supabase
          .from("notifications")
          .select("id")
          .eq("metadata->>activity_id", notif.metadata.activity_id)
          .limit(1)
          .maybeSingle();

        if (alreadyExists) continue;

        await supabase.from("notifications").insert(notif);
      }
    }
    activityDeadlineCount = activityNotifications.length;
  }

  // --- Section 3: Stale lead detection ---
  let staleLeadCount = 0;

  const { data: staleLeads } = await supabase.rpc("find_stale_leads", {
    days_threshold: 3,
  });

  if (staleLeads?.length) {
    const staleNotifications = staleLeads
      .filter((s: { assigned_to: string | null }) => s.assigned_to)
      .map((staleLead: { assigned_to: string; student_name: string | null; parent_name: string; days_inactive: number; lead_id: string }) => {
        const leadName = staleLead.student_name || staleLead.parent_name || "Lead";
        return {
          user_id: staleLead.assigned_to,
          title: `Lead không hoạt động: ${leadName}`,
          message: `${leadName} đã ở giai đoạn hiện tại ${staleLead.days_inactive} ngày mà không có hoạt động nào`,
          type: "reminder" as const,
          is_read: false,
          link: "/pipeline",
          metadata: {
            lead_id: staleLead.lead_id,
            stale_detection: true,
            days_inactive: staleLead.days_inactive,
          },
        };
      });

    if (staleNotifications.length > 0) {
      await supabase.from("notifications").insert(staleNotifications);
      staleLeadCount = staleNotifications.length;
    }
  }

  return NextResponse.json({
    message: "Processed overdue reminders",
    count: notifications.length,
    zalo_reminders_sent: zaloRemindersSent,
    activity_deadline_notifications: activityDeadlineCount,
    stale_lead_notifications: staleLeadCount,
  });
}
