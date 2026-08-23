import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const normEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();

/**
 * Controlled Relationship Intelligence -> CRM promotion bridge.
 *
 * Safety/operating rules:
 * - dry_run defaults to true
 * - never creates queue rows
 * - never sends email
 * - deduplicates by email before creating contacts
 * - creates/keeps one business_contact_relationship per contact + business
 * - campaign_eligible is always false on newly created relationships
 * - global suppression is never altered
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
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: userResp } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  const user = userResp?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
  const allowed = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
  if (!allowed) return json({ error: "Founder/admin role required" }, 403);

  let body: {
    dry_run?: boolean;
    relationship_intelligence_ids?: string[];
    tag?: string;
    source_pack_contains?: string;
    business_names?: string[];
    relevance_category?: string;
    limit?: number;
  } = {};
  try { body = await req.json(); } catch { /* allow empty body */ }

  const dryRun = body.dry_run !== false;
  const limit = Math.min(Math.max(body.limit ?? 250, 1), 1000);
  const businessNames = Array.from(new Set((body.business_names ?? []).map((v) => v.trim()).filter(Boolean)));
  if (!businessNames.length) return json({ error: "business_names is required" }, 400);

  let query = admin
    .from("relationship_intelligence_contacts")
    .select("id,contact_name,organisation_name,email,phone,jurisdiction,city_country,relationship_status,opportunity_role,trust_level,tags,source_notes,source_evidence,ai_summary,founder_notes")
    .not("email", "is", null)
    .limit(limit);

  if (body.relationship_intelligence_ids?.length) query = query.in("id", body.relationship_intelligence_ids);
  if (body.tag?.trim()) query = query.contains("tags", [body.tag.trim().toLowerCase()]);
  if (body.source_pack_contains?.trim()) query = query.ilike("source_notes", `%${body.source_pack_contains.trim()}%`);

  const { data: riRows, error: riError } = await query;
  if (riError) return json({ error: riError.message }, 500);

  const businesses = new Map<string, string | null>();
  if (businessNames.length) {
    const { data: businessRows } = await admin.from("businesses").select("id,name").in("name", businessNames);
    for (const name of businessNames) businesses.set(name, null);
    for (const b of businessRows ?? []) businesses.set(b.name as string, b.id as string);
  }

  type PlanRow = {
    ri_id: string;
    email: string;
    name: string;
    organisation: string | null;
    contact_action: "create" | "match" | "hold";
    existing_contact_id?: string;
    business_actions: Array<{ business_name: string; business_id: string | null; action: "create" | "match" | "blocked"; existing_bcr_id?: string; reason?: string }>;
    ok: boolean;
    reason: string;
  };

  const plan: PlanRow[] = [];

  for (const row of riRows ?? []) {
    const email = normEmail(row.email);
    if (!email) {
      plan.push({ ri_id: row.id, email: "", name: row.contact_name ?? "Unknown", organisation: row.organisation_name ?? null, contact_action: "hold", business_actions: [], ok: false, reason: "missing_email" });
      continue;
    }

    const { data: existingContact } = await admin.from("contacts")
      .select("id,is_globally_suppressed,hard_bounced")
      .eq("email", email)
      .maybeSingle();

    const businessActions: PlanRow["business_actions"] = [];
    for (const businessName of businessNames) {
      if (existingContact?.is_globally_suppressed || existingContact?.hard_bounced) {
        businessActions.push({ business_name: businessName, business_id: businesses.get(businessName) ?? null, action: "blocked", reason: existingContact.is_globally_suppressed ? "globally_suppressed" : "hard_bounced" });
        continue;
      }

      let existingBcr: any = null;
      if (existingContact?.id) {
        const res = await admin.from("business_contact_relationships")
          .select("id")
          .eq("contact_id", existingContact.id)
          .eq("business_name", businessName)
          .maybeSingle();
        existingBcr = res.data;
      }
      businessActions.push({
        business_name: businessName,
        business_id: businesses.get(businessName) ?? null,
        action: existingBcr ? "match" : "create",
        existing_bcr_id: existingBcr?.id,
      });
    }

    plan.push({
      ri_id: row.id,
      email,
      name: row.contact_name ?? email,
      organisation: row.organisation_name ?? null,
      contact_action: existingContact ? "match" : "create",
      existing_contact_id: existingContact?.id,
      business_actions: businessActions,
      ok: true,
      reason: existingContact ? "reuse_existing_master_contact" : "create_master_contact",
    });
  }

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      summary: {
        relationship_intelligence_rows: plan.length,
        contacts_to_create: plan.filter((p) => p.contact_action === "create").length,
        contacts_to_match: plan.filter((p) => p.contact_action === "match").length,
        held: plan.filter((p) => !p.ok).length,
        business_relationships_to_create: plan.flatMap((p) => p.business_actions).filter((a) => a.action === "create").length,
        business_relationships_to_match: plan.flatMap((p) => p.business_actions).filter((a) => a.action === "match").length,
        blocked_relationships: plan.flatMap((p) => p.business_actions).filter((a) => a.action === "blocked").length,
        business_names: businessNames,
      },
      plan,
      note: "Dry-run only. No contacts, business relationships, queue rows or outbound messages were created.",
    });
  }

  let contactsCreated = 0;
  let contactsMatched = 0;
  let relationshipsCreated = 0;
  let relationshipsMatched = 0;
  let blocked = 0;
  let failed = 0;

  for (const p of plan.filter((x) => x.ok)) {
    const row = (riRows ?? []).find((r: any) => r.id === p.ri_id)!;
    let contactId = p.existing_contact_id;

    if (!contactId) {
      const insertPayload = {
        email: p.email,
        name: row.contact_name ?? null,
        company: row.organisation_name ?? null,
        role: row.opportunity_role ?? null,
        phone: row.phone ?? null,
        country: row.jurisdiction ?? null,
        status: "NEW",
        sendable_status: "needs_review",
        source: "relationship_intelligence_promotion",
        tags: Array.isArray(row.tags) ? row.tags : [],
        notes: [row.ai_summary, row.founder_notes, row.source_evidence].filter(Boolean).join("\n\n"),
        assigned_business: businessNames[0] ?? null,
      };
      const { data: inserted, error: insertError } = await admin.from("contacts").insert(insertPayload).select("id").maybeSingle();
      if (insertError) {
        const { data: raced } = await admin.from("contacts").select("id").eq("email", p.email).maybeSingle();
        if (!raced) {
          p.ok = false;
          p.reason = `contact_insert_failed:${insertError.message}`;
          failed++;
          continue;
        }
        contactId = raced.id;
        contactsMatched++;
      } else {
        contactId = inserted!.id;
        contactsCreated++;
      }
    } else {
      contactsMatched++;
    }

    for (const action of p.business_actions) {
      if (action.action === "blocked") { blocked++; continue; }
      if (action.action === "match") { relationshipsMatched++; continue; }

      const { error: bcrError } = await admin.from("business_contact_relationships").insert({
        contact_id: contactId,
        business_name: action.business_name,
        business_id: action.business_id,
        relevance_category: body.relevance_category ?? "relationship_intelligence_shared_data",
        qualification: "needs_review",
        qualification_reason: `Promoted from Relationship Intelligence (${p.ri_id}); portfolio shared-data review required`,
        campaign_eligible: false,
        current_stage: "ready_to_stage",
        notes: `source=relationship_intelligence ri_id=${p.ri_id}; no_auto_send=true`,
      });
      if (bcrError) {
        if (bcrError.message.toLowerCase().includes("duplicate")) relationshipsMatched++;
        else { failed++; }
      } else relationshipsCreated++;
    }

    await admin.from("relationship_intelligence_events").insert({
      contact_id: p.ri_id,
      event_type: "promoted_to_portfolio_crm",
      summary: `Promoted/matched to master CRM; businesses: ${businessNames.join(", ")}. No outreach queued.`,
      metadata: { crm_contact_id: contactId, business_names: businessNames, dry_run: false },
    });
  }

  return json({
    ok: failed === 0,
    dry_run: false,
    summary: {
      contacts_created: contactsCreated,
      contacts_matched: contactsMatched,
      business_relationships_created: relationshipsCreated,
      business_relationships_matched: relationshipsMatched,
      blocked_relationships: blocked,
      failed,
      queued: 0,
      sent: 0,
    },
    plan,
    note: "Promotion completed. Campaign eligibility remains false. Nothing was queued or sent.",
  });
});
