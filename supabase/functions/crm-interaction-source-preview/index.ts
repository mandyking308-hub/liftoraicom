import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Adapter = {
  adapter_key: string;
  source_system: string;
  source_channel: string;
  source_table: string | null;
  enabled_for_preview: boolean;
  enabled_for_capture: boolean;
  feature_flag_name: string | null;
  supported_interaction_types: string[];
};

function norm(v?: string | null) { return (v ?? "").toString().trim().toLowerCase(); }
function minuteBucket(d?: string | null) { if (!d) return ""; const x = new Date(d); return Number.isNaN(x.getTime()) ? "" : x.toISOString().slice(0,16); }
function fnv1a(s: string) { let h = 0x811c9dc5; for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h+((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)))>>>0;} return h.toString(36); }
function dedupeKey(input: { provider_type?: string|null; external_event_id?: string|null; provider_message_id?: string|null; interaction_type?: string|null; contact_email?: string|null; source_system?: string|null; source_channel?: string|null; subject?: string|null; occurred_at?: string|null; }) {
  const p = norm(input.provider_type), ext = norm(input.external_event_id), msg = norm(input.provider_message_id), t = norm(input.interaction_type), e = norm(input.contact_email);
  if (p && ext) return `${p}:${ext}`;
  if (p && msg && t) return `${p}:${msg}:${t}`;
  if (e && t) { const b = minuteBucket(input.occurred_at); return b ? `email:${e}:${t}:${b}` : `email:${e}:${t}`; }
  return `hash:${fnv1a([norm(input.source_system),norm(input.source_channel),e,norm(input.subject),minuteBucket(input.occurred_at)].join("|"))}`;
}

async function rowsForAdapter(supabase: any, adapter: Adapter, limit: number, businessId: string|null, contactId: string|null) {
  const k = adapter.adapter_key;
  const previews: any[] = [];
  const safeSelect = async (table: string, cols: string, applyFilters?: (q:any)=>any) => {
    try {
      let q = supabase.from(table).select(cols).limit(limit);
      if (applyFilters) q = applyFilters(q);
      const { data, error } = await q;
      if (error) return [];
      return data ?? [];
    } catch { return []; }
  };

  const filterContact = (q:any) => contactId ? q.eq("contact_id", contactId) : q;
  const filterBusiness = (q:any) => businessId ? q.eq("business_id", businessId) : q;

  switch (k) {
    case "smartlead_provider_events": {
      const rows = await safeSelect("outbound_provider_events","id, provider_type, provider_campaign_id, provider_message_id, external_event_id, contact_email, event_type, occurred_at",(q)=>q.order("occurred_at",{ascending:false}));
      for (const r of rows) {
        const it = `smartlead_${(r.event_type||"event").toString().toLowerCase()}`;
        previews.push({ source_id: r.id, contact_email: r.contact_email, occurred_at: r.occurred_at, proposed_interaction_type: it, dedupe_key: dedupeKey({ provider_type: r.provider_type ?? "smartlead", external_event_id: r.external_event_id, provider_message_id: r.provider_message_id, interaction_type: it, contact_email: r.contact_email, source_system:"smartlead", source_channel:"provider_event", occurred_at: r.occurred_at }) });
      }
      break;
    }
    case "native_email_events": {
      const rows = await safeSelect("email_events","id, event_type, contact_email, occurred_at, provider_message_id",(q)=>q.order("occurred_at",{ascending:false}));
      for (const r of rows) {
        const it = `native_email_${(r.event_type||"event").toString().toLowerCase()}`;
        previews.push({ source_id: r.id, contact_email: r.contact_email, occurred_at: r.occurred_at, proposed_interaction_type: it, dedupe_key: dedupeKey({ provider_type:"native", provider_message_id: r.provider_message_id, interaction_type: it, contact_email: r.contact_email, source_system:"native", source_channel:"email_event", occurred_at: r.occurred_at }) });
      }
      break;
    }
    case "communications": {
      const rows = await safeSelect("communications","id, contact_id, direction, ai_generated, timestamp, message",(q)=>filterContact(q).order("timestamp",{ascending:false}));
      for (const r of rows) {
        const it = r.direction === "inbound" ? "native_email_reply_received" : (r.ai_generated ? "ai_reply_sent" : "native_email_sent");
        previews.push({ source_id: r.id, contact_id: r.contact_id, occurred_at: r.timestamp, proposed_interaction_type: it, dedupe_key: dedupeKey({ source_system:"native", source_channel:"communication", interaction_type: it, occurred_at: r.timestamp, subject: (r.message||"").slice(0,80) }) });
      }
      break;
    }
    case "inbound_messages": {
      const rows = await safeSelect("inbound_messages","id, from_email, subject, received_at",(q)=>q.order("received_at",{ascending:false}));
      for (const r of rows) {
        const it = "native_email_reply_received";
        previews.push({ source_id: r.id, contact_email: r.from_email, occurred_at: r.received_at, proposed_interaction_type: it, dedupe_key: dedupeKey({ contact_email: r.from_email, interaction_type: it, source_system:"native", source_channel:"inbound", subject: r.subject, occurred_at: r.received_at }) });
      }
      break;
    }
    case "ai_actions": {
      const rows = await safeSelect("ai_actions","id, status, created_at, contact_id",(q)=>filterContact(q).order("created_at",{ascending:false}));
      for (const r of rows) {
        const it = (r.status === "sent") ? "ai_reply_sent" : (r.status === "draft" ? "ai_reply_draft_created" : "ai_action_recorded");
        previews.push({ source_id: r.id, contact_id: r.contact_id, occurred_at: r.created_at, proposed_interaction_type: it, dedupe_key: dedupeKey({ source_system:"liftor_ai", source_channel:"ai_action", interaction_type: it, occurred_at: r.created_at }) });
      }
      break;
    }
    case "ai_drafts": {
      const rows = await safeSelect("ai_drafts","id, created_at, contact_id",(q)=>filterContact(q).order("created_at",{ascending:false}));
      for (const r of rows) previews.push({ source_id: r.id, contact_id: r.contact_id, occurred_at: r.created_at, proposed_interaction_type: "ai_reply_draft_created", dedupe_key: dedupeKey({ source_system:"liftor_ai", source_channel:"ai_draft", interaction_type:"ai_reply_draft_created", occurred_at: r.created_at }) });
      break;
    }
    case "internal_proposals": {
      const rows = await safeSelect("internal_proposals","id, status, created_at, sent_at, business_id, contact_id",(q)=>filterBusiness(q).order("created_at",{ascending:false}));
      for (const r of rows) {
        const it = r.sent_at ? "proposal_sent" : "proposal_created";
        previews.push({ source_id: r.id, contact_id: r.contact_id, business_id: r.business_id, occurred_at: r.sent_at || r.created_at, proposed_interaction_type: it, dedupe_key: dedupeKey({ source_system:"liftor", source_channel:"proposal", interaction_type: it, occurred_at: r.sent_at || r.created_at }) });
      }
      break;
    }
    case "demo_access": {
      const rows = await safeSelect("demo_access","id, contact_id, created_at",(q)=>filterContact(q).order("created_at",{ascending:false}));
      for (const r of rows) previews.push({ source_id: r.id, contact_id: r.contact_id, occurred_at: r.created_at, proposed_interaction_type:"demo_access_created", dedupe_key: dedupeKey({ source_system:"liftor", source_channel:"demo", interaction_type:"demo_access_created", occurred_at: r.created_at }) });
      break;
    }
    case "demo_events": {
      const rows = await safeSelect("demo_events","id, event_type, occurred_at",(q)=>q.order("occurred_at",{ascending:false}));
      for (const r of rows) {
        const it = (r.event_type === "completed") ? "demo_completed" : "demo_viewed";
        previews.push({ source_id: r.id, occurred_at: r.occurred_at, proposed_interaction_type: it, dedupe_key: dedupeKey({ source_system:"liftor", source_channel:"demo", interaction_type: it, occurred_at: r.occurred_at }) });
      }
      break;
    }
    case "deals": {
      const rows = await safeSelect("deals","id, status, stage, business_id, contact_id, updated_at, created_at",(q)=>filterBusiness(q).order("updated_at",{ascending:false}));
      for (const r of rows) {
        const it = r.status === "won" ? "deal_won" : (r.status === "lost" ? "deal_lost" : (r.created_at === r.updated_at ? "deal_created" : "deal_stage_changed"));
        previews.push({ source_id: r.id, contact_id: r.contact_id, business_id: r.business_id, occurred_at: r.updated_at, proposed_interaction_type: it, dedupe_key: dedupeKey({ source_system:"liftor", source_channel:"deal", interaction_type: it, occurred_at: r.updated_at }) });
      }
      break;
    }
    case "invoices": {
      const rows = await safeSelect("invoices","id, status, sent_at, created_at, business_id",(q)=>filterBusiness(q).order("created_at",{ascending:false}));
      for (const r of rows) {
        const it = r.sent_at ? "invoice_sent" : "invoice_created";
        previews.push({ source_id: r.id, business_id: r.business_id, occurred_at: r.sent_at || r.created_at, proposed_interaction_type: it, dedupe_key: dedupeKey({ source_system:"liftor", source_channel:"finance", interaction_type: it, occurred_at: r.sent_at || r.created_at }) });
      }
      break;
    }
    case "payments": {
      const rows = await safeSelect("payments","id, business_id, created_at",(q)=>filterBusiness(q).order("created_at",{ascending:false}));
      for (const r of rows) previews.push({ source_id: r.id, business_id: r.business_id, occurred_at: r.created_at, proposed_interaction_type:"payment_received", dedupe_key: dedupeKey({ source_system:"liftor", source_channel:"finance", interaction_type:"payment_received", occurred_at: r.created_at }) });
      break;
    }
    case "assignments":
    case "supplier_updates": {
      const rows = await safeSelect("assignments","id, business_id, created_at, updated_at",(q)=>filterBusiness(q).order("updated_at",{ascending:false}));
      const it = k === "supplier_updates" ? "supplier_status_change" : "supplier_assignment_created";
      for (const r of rows) previews.push({ source_id: r.id, business_id: r.business_id, occurred_at: r.updated_at || r.created_at, proposed_interaction_type: it, dedupe_key: dedupeKey({ source_system:"liftor", source_channel: k === "supplier_updates" ? "supplier" : "assignment", interaction_type: it, occurred_at: r.updated_at || r.created_at }) });
      break;
    }
    case "compliance_events": {
      const rows = await safeSelect("compliance_events","id, created_at, business_id, contact_id",(q)=>filterBusiness(q).order("created_at",{ascending:false}));
      for (const r of rows) previews.push({ source_id: r.id, business_id: r.business_id, contact_id: r.contact_id, occurred_at: r.created_at, proposed_interaction_type:"compliance_event_created", dedupe_key: dedupeKey({ source_system:"liftor", source_channel:"compliance", interaction_type:"compliance_event_created", occurred_at: r.created_at }) });
      break;
    }
    case "system_events": {
      const rows = await safeSelect("activity_log","id, created_at",(q)=>q.order("created_at",{ascending:false}));
      for (const r of rows) previews.push({ source_id: r.id, occurred_at: r.created_at, proposed_interaction_type:"system_event_created", dedupe_key: dedupeKey({ source_system:"liftor", source_channel:"system", interaction_type:"system_event_created", occurred_at: r.created_at }) });
      break;
    }
    case "founder_manual_notes": {
      // No source table; nothing to preview.
      break;
    }
  }

  return previews;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claimsData.claims.sub;
    const [{ data: isFounder }, { data: isAdmin }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "founder" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);
    if (!isFounder && !isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let body: any = {};
    if (req.method !== "GET") { try { body = await req.json(); } catch {} }
    const adapterKey: string | null = body?.adapter_key ?? null;
    const businessId: string | null = body?.business_id ?? null;
    const contactId: string | null = body?.contact_id ?? null;
    const limit: number = Math.min(Math.max(parseInt(body?.limit ?? "10", 10) || 10, 1), 50);

    const { data: adapters, error: adErr } = await supabase
      .from("crm_interaction_source_adapters")
      .select("adapter_key, source_system, source_channel, source_table, enabled_for_preview, enabled_for_capture, feature_flag_name, supported_interaction_types")
      .order("adapter_key");
    if (adErr) return new Response(JSON.stringify({ error: adErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const targets: Adapter[] = (adapters as any[]).filter((a) => !adapterKey || a.adapter_key === adapterKey);
    const featureFlag = (Deno.env.get("CRM_INTERACTION_CAPTURE_ENABLED") ?? "false").toLowerCase() === "true";

    const results: any[] = [];
    for (const a of targets) {
      if (!a.enabled_for_preview) {
        results.push({ adapter_key: a.adapter_key, preview_disabled: true, sample: [], sample_count: 0, captured_count: 0, uncaptured_count: 0 });
        continue;
      }
      const sample = await rowsForAdapter(supabase, a, limit, businessId, contactId);
      const dedupeKeys = sample.map((s: any) => s.dedupe_key).filter(Boolean);
      let capturedKeys = new Set<string>();
      if (dedupeKeys.length) {
        const { data: existing } = await supabase
          .from("crm_interaction_ledger")
          .select("dedupe_key")
          .in("dedupe_key", dedupeKeys);
        capturedKeys = new Set(((existing as any[]) ?? []).map((r) => r.dedupe_key));
      }
      const enriched = sample.map((s: any) => ({ ...s, already_captured: capturedKeys.has(s.dedupe_key) }));
      const capturedCount = enriched.filter((e) => e.already_captured).length;
      results.push({
        adapter_key: a.adapter_key,
        source_system: a.source_system,
        source_channel: a.source_channel,
        source_table: a.source_table,
        capture_enabled: a.enabled_for_capture && featureFlag,
        capture_blocked_reason: a.enabled_for_capture ? (featureFlag ? null : "feature_flag_disabled") : "adapter_capture_disabled",
        feature_flag_name: a.feature_flag_name,
        feature_flag_present: featureFlag,
        sample_count: enriched.length,
        captured_count: capturedCount,
        uncaptured_count: enriched.length - capturedCount,
        sample: enriched.slice(0, limit),
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      preview_only: true,
      capture_apply_disabled: !featureFlag,
      feature_flag_name: "CRM_INTERACTION_CAPTURE_ENABLED",
      feature_flag_present: featureFlag,
      adapters: results,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});