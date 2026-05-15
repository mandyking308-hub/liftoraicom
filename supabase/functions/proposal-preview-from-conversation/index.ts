import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Proposal preview wrapper from conversation context — PREVIEW ONLY.
// Returns a structured proposal brief built from CRM/contact 360/conversation
// context. Does NOT insert proposals. Does NOT send. Does NOT call providers.

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

const safeOne = async (q: any) => { try { const { data } = await q; return data; } catch { return null; } };
const safeMany = async (q: any) => { try { const { data } = await q; return data ?? []; } catch { return []; } };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;
    const body = await req.json().catch(() => ({}));
    const { conversation_id, contact_id } = body ?? {};

    let conversation: any = null;
    let contact: any = null;
    let business: any = null;

    if (conversation_id) {
      conversation = await safeOne(admin.from("conversations").select("*").eq("id", conversation_id).maybeSingle());
    }
    const cid = contact_id || conversation?.contact_id;
    if (cid) {
      contact = await safeOne(admin.from("contacts").select("id,name,email,company,assigned_business,status,notes").eq("id", cid).maybeSingle());
      if (contact?.assigned_business) {
        business = await safeOne(admin.from("businesses").select("id,name,industry").eq("id", contact.assigned_business).maybeSingle());
      }
    }

    const timeline = cid
      ? await safeMany(admin.from("crm_interaction_ledger").select("interaction_type,direction,channel,subject,body_preview,occurred_at").eq("contact_id", cid).order("occurred_at", { ascending: false }).limit(15))
      : [];

    const lastInbound = (timeline as any[]).find((t) => t.direction === "inbound") ?? null;
    const detected_need = lastInbound?.body_preview?.slice(0, 240) ?? conversation?.last_message_preview?.slice(0, 240) ?? "Not enough signal yet.";

    const brief = {
      title: `Liftor proposal for ${business?.name ?? contact?.company ?? contact?.name ?? "prospect"}`,
      client: {
        name: contact?.name,
        email: contact?.email,
        company: contact?.company,
        business_id: business?.id,
        business_name: business?.name,
        industry: business?.industry,
      },
      detected_need,
      proposed_systems: [
        "AI Conversation + Drafting layer",
        "CRM customer-memory backbone",
        "Founder Approval Console workflow",
      ],
      proposed_phases: [
        { phase: 1, label: "Discovery & system map", duration_weeks: 1 },
        { phase: 2, label: "Architecture + integration build", duration_weeks: 3 },
        { phase: 3, label: "Founder controls + monitoring", duration_weeks: 1 },
      ],
      pricing_band: { min: 7500, max: 25000, currency: "USD" },
      timeline_sample: (timeline as any[]).slice(0, 5),
      disclaimers: [
        "Brief only. No proposal record was created.",
        "No emails sent. Founder approval required to generate a live proposal.",
      ],
    };

    return new Response(JSON.stringify({
      ok: true,
      preview_only: true,
      writes: 0,
      emails_sent: 0,
      provider_calls: 0,
      proposals_created: 0,
      apply_enabled: false,
      apply_disabled_reason: "proposal_apply_from_conversation_disabled",
      input: { conversation_id, contact_id },
      brief,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});