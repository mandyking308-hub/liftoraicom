import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Founder approval PREVIEW. Reads a draft (if persisted) or returns synthetic
// approval-state preview with risk/compliance flags. NEVER writes. NEVER sends.

async function authPriv(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.claims.sub);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;
    const body = await req.json().catch(() => ({}));
    const draft_id = body?.draft_id;

    let draft: any = null;
    let contact: any = null;
    if (draft_id) {
      const { data } = await admin.from("ai_conversation_draft_reviews").select("*").eq("id", draft_id).maybeSingle();
      draft = data;
      if (draft?.contact_id) {
        const { data: c } = await admin.from("contacts").select("id,name,email,company").eq("id", draft.contact_id).maybeSingle();
        contact = c;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      preview_only: true,
      writes: 0,
      emails_sent: 0,
      provider_calls: 0,
      send_enabled: false,
      send_disabled_reason: "ai_send_disabled (preview-only operating mode)",
      apply_enabled: false,
      apply_disabled_reason: "ai_draft_save_disabled",
      draft,
      contact,
      what_would_happen_if_approved: [
        "Draft would move to approval_status='approved'.",
        "Send is still gated — no email is sent.",
        "An interaction ledger entry would be queued for human send.",
        "Compliance + tone checks would be re-evaluated.",
      ],
      risk_flags: draft?.risk_flags ?? [],
      compliance_flags: draft?.compliance_flags ?? [],
      approval_status: draft?.approval_status ?? "draft",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});