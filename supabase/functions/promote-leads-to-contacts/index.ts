import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Promote qualified Apollo leads into contacts. dry_run by default.
 * Final integrity re-check before insert.
 * Does NOT enqueue.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const userEmail = u.user.email ?? u.user.id;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: role } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).eq("role", "founder").maybeSingle();
  if (!role) return json({ error: "Founder role required" }, 403);

  let body: { dry_run?: boolean; lead_ids?: string[]; campaign_id?: string; limit?: number } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const dryRun = body.dry_run !== false;
  const limit = Math.min(Math.max(body.limit ?? 100, 1), 1000);

  let q = admin.from("apollo_raw_leads")
    .select("apollo_lead_id,quality_profile_id,email,first_name,last_name,title,company,country,linkedin_url,apollo_person_id,apollo_org_id,business_name,campaign_fit")
    .eq("quality_status", "qualified")
    .limit(limit);
  if (body.lead_ids?.length) q = q.in("apollo_lead_id", body.lead_ids);
  const { data: rows, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const plan: Array<{ apollo_lead_id: string; ok: boolean; reason: string; existing_contact_id?: string }> = [];
  const toInsert: any[] = [];

  for (const r of rows ?? []) {
    const email = (r.email ?? "").toLowerCase();
    if (!email) { plan.push({ apollo_lead_id: r.apollo_lead_id, ok: false, reason: "no email" }); continue; }
    const { data: existing } = await admin.from("contacts").select("id").eq("email", email).maybeSingle();
    if (existing) {
      plan.push({ apollo_lead_id: r.apollo_lead_id, ok: false, reason: "contact already exists", existing_contact_id: existing.id });
      continue;
    }
    if (!r.business_name) {
      plan.push({ apollo_lead_id: r.apollo_lead_id, ok: false, reason: "no business_name on apollo lead" });
      continue;
    }
    plan.push({ apollo_lead_id: r.apollo_lead_id, ok: true, reason: "ready to promote" });
    toInsert.push({
      email,
      first_name: r.first_name, last_name: r.last_name,
      name: [r.first_name, r.last_name].filter(Boolean).join(" ") || null,
      role: r.title ?? null, company: r.company ?? null,
      country: r.country ?? null, linkedin_url: r.linkedin_url ?? null,
      apollo_person_id: r.apollo_person_id ?? null,
      apollo_organization_id: r.apollo_org_id ?? null,
      assigned_business: r.business_name,
      active_campaign_id: body.campaign_id ?? null,
      status: "ACTIVE",
      sendable_status: "sendable",
      source: "apollo_quality_promotion",
      tags: r.campaign_fit ? [r.campaign_fit] : [],
    });
  }

  let promoted = 0;
  if (!dryRun && toInsert.length > 0) {
    const { data: inserted, error: iErr } = await admin.from("contacts").insert(toInsert).select("id,email,apollo_person_id");
    if (iErr) return json({ error: `insert failed: ${iErr.message}` }, 500);
    promoted = inserted?.length ?? 0;
    // map back to profiles + apollo_leads.contact_id
    const byEmail = new Map<string, string>();
    for (const c of inserted ?? []) byEmail.set((c.email ?? "").toLowerCase(), c.id);
    for (const p of plan.filter((x) => x.ok)) {
      const row = (rows ?? []).find((r) => r.apollo_lead_id === p.apollo_lead_id)!;
      const cid = byEmail.get((row.email ?? "").toLowerCase());
      if (!cid) continue;
      await admin.from("lead_quality_profiles").update({
        quality_status: "promoted_to_contact",
        promoted_contact_id: cid,
        promoted_at: new Date().toISOString(),
      }).eq("id", row.quality_profile_id);
      await admin.from("apollo_leads").update({ contact_id: cid }).eq("id", row.apollo_lead_id);
    }
    await admin.from("system_events").insert({
      event_type: "leads_promoted_to_contacts", severity: "low", business_name: "",
      message: `Founder ${userEmail} promoted ${promoted} qualified lead(s) to contacts.`,
      metadata: { actor: userEmail, count: promoted }, resolved: true,
    });
  }

  const summary = {
    candidates: rows?.length ?? 0,
    ready: plan.filter((p) => p.ok).length,
    blocked: plan.filter((p) => !p.ok).length,
    promoted,
  };
  return json({ ok: true, dry_run: dryRun, summary, plan_sample: plan.slice(0, 25) });
});