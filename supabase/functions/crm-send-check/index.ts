import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CheckPayload {
  contact_id?: string;
  email?: string;
  // when log_attempt = true and allowed = true the function will also insert
  // an outbound communication row using the provided message + channel
  log_attempt?: boolean;
  channel?: "email" | "whatsapp" | "linkedin";
  message?: string;
  ai_generated?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const body: CheckPayload = await req.json().catch(() => ({}));

    if (!body.contact_id && !body.email) {
      return json({ error: "contact_id or email required" }, 400);
    }

    // Sweep stale conversations first so the check is accurate.
    await supabase.rpc("expire_inactive_conversations");

    let contactId = body.contact_id;
    if (!contactId && body.email) {
      const { data: c } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", body.email.toLowerCase())
        .maybeSingle();
      if (!c) return json({ allowed: false, reason: "CONTACT_NOT_FOUND" }, 200);
      contactId = c.id;
    }

    const { data: result, error } = await supabase.rpc(
      "check_outreach_allowed",
      { _contact_id: contactId },
    );
    if (error) return json({ error: error.message }, 500);

    const allowed = (result as { allowed?: boolean })?.allowed === true;

    if (allowed && body.log_attempt) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("assigned_inbox_id")
        .eq("id", contactId!)
        .maybeSingle();

      await supabase.from("communications").insert({
        contact_id: contactId,
        channel: body.channel ?? "email",
        direction: "outbound",
        message: body.message ?? "",
        inbox_id: contact?.assigned_inbox_id ?? null,
        ai_generated: body.ai_generated ?? false,
      });
    }

    return json({ contact_id: contactId, ...(result as object) }, 200);
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