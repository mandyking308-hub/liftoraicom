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

  // Pull rich Apollo payloads (enrichment + search) for the candidate leads so we can map
  // additional fields into contacts without re-calling Apollo (no credit spend, no reveal).
  const leadIds = (rows ?? []).map((r) => r.apollo_lead_id).filter(Boolean) as string[];
  const payloadMap = new Map<string, { enrichment: any; search: any; run_id: string | null }>();
  if (leadIds.length) {
    const { data: payloadRows } = await admin.from("apollo_leads")
      .select("id,enrichment_payload,search_payload,run_id").in("id", leadIds);
    for (const pr of payloadRows ?? []) {
      payloadMap.set(pr.id as string, {
        enrichment: pr.enrichment_payload ?? null,
        search: pr.search_payload ?? null,
        run_id: (pr.run_id as string | null) ?? null,
      });
    }
  }

  // Helpers: derive clean optional fields from raw Apollo payload without overwriting
  // stronger existing data downstream. All values returned here are nullable and will only
  // be applied during INSERT (new contact); we never overwrite an existing contact.
  const SENIORITY_MAP: Record<string, string> = {
    owner: "c-level", founder: "c-level", c_suite: "c-level", "c-level": "c-level",
    partner: "c-level", vp: "director", head: "director", director: "director",
    manager: "manager", senior: "manager", entry: "junior", intern: "junior", junior: "junior",
  };
  const sizeFromCount = (n: number | null | undefined): "small" | "medium" | "large" | null => {
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    if (n < 50) return "small";
    if (n < 500) return "medium";
    return "large";
  };
  const deriveApolloExtras = (leadId: string) => {
    const pkg = payloadMap.get(leadId);
    if (!pkg) return { extras: {}, raw_present: false, org_present: false, run_id: null as string | null };
    const e = pkg.enrichment ?? {};
    const org = e?.organization ?? null;
    const seniorityRaw = (e?.seniority ?? "").toString().toLowerCase().trim();
    const seniority = SENIORITY_MAP[seniorityRaw] ?? null;
    const company_size = sizeFromCount(org?.estimated_num_employees ?? org?.organization_num_employees ?? null);
    const industry = (org?.industry ?? null) as string | null;
    const timezone = (e?.time_zone ?? null) as string | null;
    const email_verified_status = (e?.email_status ?? null) as string | null;
    const intent_strength_raw = (e?.intent_strength ?? null);
    const intent_score = typeof intent_strength_raw === "number"
      ? Math.max(0, Math.min(100, Math.round(intent_strength_raw)))
      : null;
    const apollo_org_id_from_payload = (e?.organization_id ?? org?.id ?? null) as string | null;
    return {
      extras: {
        seniority, company_size, industry, timezone,
        email_verified_status, intent_score,
        apollo_org_id_from_payload,
        org_domain: (org?.primary_domain ?? org?.website_url ?? null) as string | null,
        photo_url: (e?.photo_url ?? null) as string | null,
      },
      raw_present: !!pkg.enrichment || !!pkg.search,
      org_present: !!org,
      run_id: pkg.run_id,
    };
  };

  // Resolve businesses up-front (one row per distinct business_name)
  const businessNames = Array.from(new Set((rows ?? []).map((r) => r.business_name).filter(Boolean))) as string[];
  const bizMap = new Map<string, string>(); // name → business_id
  if (businessNames.length) {
    const { data: bizRows } = await admin.from("businesses").select("id,name").in("name", businessNames);
    for (const b of bizRows ?? []) bizMap.set(b.name as string, b.id as string);
  }

  type PlanRow = {
    apollo_lead_id: string;
    profile_id?: string;
    name?: string;
    company?: string;
    email?: string;
    business_name?: string;
    business_id?: string;
    contact_action: "create_new" | "match_existing" | "skip";
    bcr_action: "create_new" | "match_existing" | "skip";
    profile_action: "mark_promoted" | "link_existing" | "skip";
    queue_eligibility: "not_yet" | "blocked";
    queue_blocker?: string;
    send_action: "none";
    ok: boolean;
    reason: string;
    existing_contact_id?: string;
    existing_bcr_id?: string;
    apollo_person_id?: string;
    apollo_org_id?: string;
    raw_payload_present?: boolean;
    org_payload_present?: boolean;
    mapped_extras?: Record<string, unknown>;
  };
  const plan: PlanRow[] = [];

  for (const r of rows ?? []) {
    const email = (r.email ?? "").toLowerCase();
    const enrich = deriveApolloExtras(r.apollo_lead_id);
    const base: Partial<PlanRow> = {
      apollo_lead_id: r.apollo_lead_id,
      profile_id: r.quality_profile_id,
      name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.first_name || undefined,
      company: r.company ?? undefined,
      email: email || undefined,
      business_name: r.business_name ?? undefined,
      business_id: r.business_name ? bizMap.get(r.business_name) : undefined,
      send_action: "none",
      apollo_person_id: r.apollo_person_id ?? undefined,
      apollo_org_id: r.apollo_org_id ?? (enrich.extras as any).apollo_org_id_from_payload ?? undefined,
      raw_payload_present: enrich.raw_present,
      org_payload_present: enrich.org_present,
      mapped_extras: enrich.extras,
    };
    if (!email) {
      plan.push({ ...(base as PlanRow), contact_action: "skip", bcr_action: "skip", profile_action: "skip", queue_eligibility: "blocked", queue_blocker: "no email", ok: false, reason: "no email" });
      continue;
    }
    if (!r.business_name) {
      plan.push({ ...(base as PlanRow), contact_action: "skip", bcr_action: "skip", profile_action: "skip", queue_eligibility: "blocked", queue_blocker: "no business_name", ok: false, reason: "no business_name on apollo lead" });
      continue;
    }
    const { data: existingContact } = await admin.from("contacts").select("id").eq("email", email).maybeSingle();
    let bcrAction: PlanRow["bcr_action"] = "create_new";
    let existingBcrId: string | undefined;
    if (existingContact) {
      const { data: existingBcr } = await admin.from("business_contact_relationships")
        .select("id").eq("contact_id", existingContact.id).eq("business_name", r.business_name).maybeSingle();
      if (existingBcr) { bcrAction = "match_existing"; existingBcrId = existingBcr.id; }
    }
    plan.push({
      ...(base as PlanRow),
      contact_action: existingContact ? "match_existing" : "create_new",
      bcr_action: bcrAction,
      profile_action: existingContact ? "link_existing" : "mark_promoted",
      queue_eligibility: "not_yet",
      queue_blocker: "auto-send OFF / queue gates evaluated separately",
      ok: true,
      reason: existingContact ? "match existing contact + reconcile BCR" : "create contact + create BCR",
      existing_contact_id: existingContact?.id,
      existing_bcr_id: existingBcrId,
    });
  }

  let contactsCreated = 0;
  let contactsMatched = 0;
  let bcrsCreated = 0;
  let bcrsMatched = 0;
  let profilesReconciled = 0;
  let failed = 0;

  if (!dryRun) {
    for (const p of plan.filter((x) => x.ok)) {
      const row = (rows ?? []).find((r) => r.apollo_lead_id === p.apollo_lead_id)!;
      const email = (row.email ?? "").toLowerCase();

      // 1. Contact upsert/match (idempotent via UNIQUE email)
      let contactId: string | undefined = p.existing_contact_id;
      const enrich = deriveApolloExtras(row.apollo_lead_id);
      if (!contactId) {
        const ex = enrich.extras as any;
        const insertPayload = {
          email,
          first_name: row.first_name, last_name: row.last_name,
          name: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
          role: row.title ?? null, company: row.company ?? null,
          country: row.country ?? null, linkedin_url: row.linkedin_url ?? null,
          apollo_person_id: row.apollo_person_id ?? null,
          apollo_organization_id: row.apollo_org_id ?? ex.apollo_org_id_from_payload ?? null,
          assigned_business: row.business_name,
          active_campaign_id: body.campaign_id ?? null,
          status: "NEW",
          sendable_status: "sendable",
          source: "autopilot_promotion",
          // Rich mapping derived from already-stored Apollo enrichment payload (no new Apollo calls).
          seniority: ex.seniority ?? null,
          industry: ex.industry ?? null,
          company_size: ex.company_size ?? null,
          timezone: ex.timezone ?? null,
          email_verified_status: ex.email_verified_status ?? "unknown",
          intent_score: ex.intent_score ?? 0,
          apollo_enrichment_status: enrich.raw_present ? "succeeded" : "pending",
          apollo_last_enriched_at: enrich.raw_present ? new Date().toISOString() : null,
          enriched_at: enrich.raw_present ? new Date().toISOString() : null,
        };
        const { data: ins, error: iErr } = await admin.from("contacts")
          .insert(insertPayload).select("id").maybeSingle();
        if (iErr) {
          // Race / UNIQUE collision → look up existing
          const { data: again } = await admin.from("contacts").select("id").eq("email", email).maybeSingle();
          if (!again) {
            const planRow = plan.find((x) => x.apollo_lead_id === p.apollo_lead_id)!;
            planRow.ok = false;
            planRow.reason = `contact insert failed: ${iErr.message}`;
            failed++;
            continue;
          }
          contactId = again.id; contactsMatched++;
        } else {
          contactId = ins!.id; contactsCreated++;
        }
      } else {
        contactsMatched++;
      }

      // 2. BCR upsert/match (idempotent via UNIQUE (contact_id, business_name))
      const businessId = bizMap.get(row.business_name!) ?? null;
      const { data: existingBcr } = await admin.from("business_contact_relationships")
        .select("id").eq("contact_id", contactId!).eq("business_name", row.business_name!).maybeSingle();
      let bcrOk = true;
      if (existingBcr) {
        bcrsMatched++;
        // Backfill business_id if missing
        if (businessId) await admin.from("business_contact_relationships").update({ business_id: businessId }).eq("id", existingBcr.id).is("business_id", null);
      } else {
        const { error: bErr } = await admin.from("business_contact_relationships").insert({
          contact_id: contactId!,
          business_name: row.business_name!,
          business_id: businessId,
          relevance_category: row.campaign_fit ?? "apollo_reveal",
          qualification: "needs_review",
          qualification_reason: "promoted from autopilot apollo reveal",
          campaign_eligible: false,
          current_stage: "ready_to_stage",
          notes: `Created by promote-leads-to-contacts (autopilot_promotion). apollo_lead_id=${row.apollo_lead_id} apollo_person_id=${row.apollo_person_id ?? ""} apollo_org_id=${row.apollo_org_id ?? (enrich.extras as any).apollo_org_id_from_payload ?? ""} reveal_run_id=${enrich.run_id ?? ""} campaign_fit=${row.campaign_fit ?? ""} validation=valid_person_match source=apollo_reveal`,
        });
        if (bErr) {
          const planRow = plan.find((x) => x.apollo_lead_id === p.apollo_lead_id)!;
          planRow.ok = false;
          planRow.reason = `bcr insert failed: ${bErr.message}`;
          bcrOk = false;
          failed++;
        } else {
          bcrsCreated++;
        }
      }

      if (!bcrOk) continue;

      // 3. Reconcile lead quality profile + apollo_leads.contact_id
      const profilePatch = p.contact_action === "match_existing"
        ? {
            quality_status: "already_in_crm",
            lifecycle_stage: "already_in_crm_after_reveal",
            lifecycle_reason: "linked_to_existing_contact_during_promotion",
            promoted_contact_id: contactId,
            promoted_at: new Date().toISOString(),
          }
        : {
            quality_status: "promoted_to_contact",
            lifecycle_stage: "promoted_to_contact",
            lifecycle_reason: "promoted_via_autopilot_promotion",
            promoted_contact_id: contactId,
            promoted_at: new Date().toISOString(),
          };
      await admin.from("lead_quality_profiles").update(profilePatch).eq("id", row.quality_profile_id);
      await admin.from("apollo_leads").update({ contact_id: contactId }).eq("id", row.apollo_lead_id);
      profilesReconciled++;
    }

    await admin.from("system_events").insert({
      event_type: "leads_promoted_to_contacts", severity: "low", business_name: "",
      message: `Founder ${userEmail} promoted ${contactsCreated} new + matched ${contactsMatched} existing contact(s); BCR created ${bcrsCreated}, matched ${bcrsMatched}.`,
      metadata: { actor: userEmail, contactsCreated, contactsMatched, bcrsCreated, bcrsMatched, profilesReconciled },
      resolved: true,
    });
  }

  const summary = {
    candidates: rows?.length ?? 0,
    ready: plan.filter((p) => p.ok).length,
    blocked: plan.filter((p) => !p.ok).length,
    contacts_to_create: plan.filter((p) => p.contact_action === "create_new").length,
    contacts_to_match: plan.filter((p) => p.contact_action === "match_existing").length,
    bcrs_to_create: plan.filter((p) => p.bcr_action === "create_new" && p.ok).length,
    bcrs_to_match: plan.filter((p) => p.bcr_action === "match_existing" && p.ok).length,
    contactsCreated, contactsMatched, bcrsCreated, bcrsMatched, profilesReconciled, failed,
    promoted: contactsCreated + contactsMatched,
  };
  return json({ ok: failed === 0, dry_run: dryRun, summary, plan_sample: plan.slice(0, 25), plan });
});