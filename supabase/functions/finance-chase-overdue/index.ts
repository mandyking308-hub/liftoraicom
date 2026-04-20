import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Flip SENT → OVERDUE for invoices past due_date
    const { data: marked } = await supabase.rpc("finance_mark_overdue_invoices");

    // 2. Pull SENT/OVERDUE invoices that are past due
    const today = new Date().toISOString().slice(0, 10);
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, due_date, status")
      .in("status", ["SENT", "OVERDUE"])
      .lt("due_date", today);

    if (error) {
      return json({ error: error.message }, 500);
    }

    const summary = {
      checked: invoices?.length ?? 0,
      reminders: 0,
      escalations: 0,
      critical: 0,
      marked_overdue: marked ?? 0,
    };

    for (const inv of invoices ?? []) {
      const due = new Date(inv.due_date as string);
      const daysOverdue = Math.floor(
        (Date.now() - due.getTime()) / (1000 * 60 * 60 * 24),
      );

      let event_type: string | null = null;
      let details = "";

      if (daysOverdue >= 14) {
        event_type = "critical_flagged";
        details = `Invoice ${inv.invoice_number} is ${daysOverdue} days overdue — flagged critical`;
        summary.critical++;
      } else if (daysOverdue >= 7) {
        event_type = "escalation_sent";
        details = `Escalation triggered for ${inv.invoice_number} (${daysOverdue} days overdue)`;
        summary.escalations++;
      } else if (daysOverdue >= 3) {
        event_type = "reminder_sent";
        details = `Reminder triggered for ${inv.invoice_number} (${daysOverdue} days overdue)`;
        summary.reminders++;
      }

      if (!event_type) continue;

      // De-dupe: only log this event_type once per day per invoice
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: already } = await supabase
        .from("payment_events")
        .select("id", { count: "exact", head: true })
        .eq("invoice_id", inv.id)
        .eq("event_type", event_type)
        .gte("timestamp", startOfDay.toISOString());

      if ((already ?? 0) > 0) continue;

      await supabase.from("payment_events").insert({
        invoice_id: inv.id,
        event_type,
        details,
      });
    }

    return json({ ok: true, summary }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
