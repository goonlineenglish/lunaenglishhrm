import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Find overdue pending reminders
  const { data: overdueReminders, error: fetchError } = await supabase
    .from("follow_up_reminders")
    .select("id, lead_id, type, assigned_to, remind_at, leads(parent_name, student_name)")
    .eq("status", "pending")
    .lt("remind_at", new Date().toISOString());

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!overdueReminders || overdueReminders.length === 0) {
    return NextResponse.json({ message: "No overdue reminders", count: 0 });
  }

  // Create notifications for each overdue reminder
  const notifications = overdueReminders
    .filter((r) => r.assigned_to)
    .map((reminder) => {
      const lead = reminder.leads as unknown as {
        parent_name: string;
        student_name: string | null;
      };
      const leadName = lead?.student_name || lead?.parent_name || "Lead";

      return {
        user_id: reminder.assigned_to,
        title: `Nhac nho qua han: ${leadName}`,
        message: `Ban co nhac nho da qua han cho ${leadName}`,
        type: "reminder" as const,
        is_read: false,
        link: "/reminders",
        metadata: {
          reminder_id: reminder.id,
          lead_id: reminder.lead_id,
        },
      };
    });

  if (notifications.length > 0) {
    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: "Processed overdue reminders",
    count: notifications.length,
  });
}
