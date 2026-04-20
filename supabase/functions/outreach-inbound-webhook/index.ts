import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  from_email: string;
  to_email?: string;
  subject?: string;
  body?: string;
  is_bounce?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const body: Body = await req.json();
    const fromEmail = (body.from_email ?? "").toLowerCase().trim();
    if (!fromEmail) return json({ error: "from_email required" }, 400);

    const { data: contact } = await supabase
      .from("contacts").select("id, assigned_inbox_id").eq("email", fromEmail).maybeSingle();
    if (!contact) return json({ error: "contact not found", from_email: fromEmail }, 404);

    if (body.is_bounce) {
      await supabase.from("email_events").insert({
        contact_id: contact.id, event_type: "bounced",
      });
      return json({ ok: true, action: "bounced" }, 200);
    }

    // Inbound reply
    await supabase.from("communications").insert({
      contact_id: contact.id,
      channel: "email",
      direction: "inbound",
      message: `${body.subject ? `[${body.subject}] ` : ""}${body.body ?? ""}`.slice(0, 8000),
      inbox_id: contact.assigned_inbox_id ?? null,
      ai_generated: false,
    });
    await supabase.from("email_events").insert({
      contact_id: contact.id, event_type: "replied",
    });

    return json({ ok: true, action: "replied" }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
