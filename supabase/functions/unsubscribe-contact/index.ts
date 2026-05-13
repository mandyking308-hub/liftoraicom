import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const html = (title: string, body: string, ok = true) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><meta name="robots" content="noindex"><style>body{font-family:system-ui,sans-serif;background:#0b1020;color:#e5ecff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}main{max-width:480px;padding:32px;border:1px solid #1e2a4a;border-radius:12px;background:#111733}h1{font-size:20px;margin:0 0 8px;color:${ok ? "#7ee0a8" : "#ff8b8b"}}p{margin:8px 0;color:#9fb0d8;font-size:14px}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token =
    url.searchParams.get("token") ||
    (req.method === "POST" ? (await req.json().catch(() => ({}))).token : null);

  if (!token || typeof token !== "string" || token.length < 16) {
    return new Response(html("Invalid link", "<p>This unsubscribe link is invalid.</p>", false), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: contact, error: findErr } = await supabase
    .from("contacts")
    .select("id, email, unsubscribed_at, compliance_status")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (findErr || !contact) {
    return new Response(html("Link not recognised", "<p>We couldn't find this contact. The link may have expired.</p>", false), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!contact.unsubscribed_at) {
    const now = new Date().toISOString();
    await supabase
      .from("contacts")
      .update({
        unsubscribed_at: now,
        unsubscribe_source: "unsubscribe_link",
        is_globally_suppressed: true,
        global_suppression_reason: "unsubscribe_link",
        global_suppression_at: now,
        status: "DO_NOT_CONTACT",
        compliance_status: "unsubscribed",
        do_not_contact_at: now,
        do_not_contact_reason: "unsubscribe_link",
      })
      .eq("id", contact.id);

    await supabase.from("contact_compliance_events").insert({
      contact_id: contact.id,
      event_type: "unsubscribe_clicked",
      event_source: "unsubscribe_link",
      event_notes: "Contact clicked unsubscribe link",
      new_value: { unsubscribed_at: now },
      actor: "contact",
    });
  }

  return new Response(
    html(
      "You've been unsubscribed",
      `<p>The address <strong>${contact.email}</strong> has been removed from all Liftor outreach.</p><p>You won't receive further emails from us. If this was a mistake, just reply to any prior email and we'll restore it.</p>`
    ),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
  );
});