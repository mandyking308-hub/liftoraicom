import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Action = "CREATE_NEW" | "UPDATE_EXISTING" | "REVIEW_HOLD_NO_UNIQUE_EMAIL";

interface InRow {
  liftor_upsert_action?: string;
  contact_name?: string;
  organisation?: string;
  preferred_email?: string;
  email_type?: string;
  phone?: string;
  phone_source?: string;
  website?: string;
  website_source?: string;
  jurisdiction?: string;
  city_country?: string;
  relationship_type?: string;
  status?: string;
  opportunity_role?: string;
  trust_level?: string;
  disclosure_level?: string;
  commercial_score?: number | string;
  strategic_score?: number | string;
  urgency_score?: number | string;
  priority?: string;
  source_pack?: string;
  source_evidence?: string;
  ai_summary?: string;
  founder_notes?: string;
  next_action?: string;
  tags?: string;
  data_confidence?: string;
  primary_contact_route?: string;
  enrichment_evidence?: string;
  operational_warning?: string;
}

const norm = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const normLower = (v: unknown) => norm(v).toLowerCase();
const normKey = (v: unknown) => normLower(v).replace(/\s+/g, " ");
const isBlank = (v: unknown) => norm(v).length === 0;
const clampScore = (v: unknown) => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n)) return 1;
  return Math.max(1, Math.min(5, n));
};
const toTags = (v: unknown): string[] => {
  const s = norm(v);
  if (!s) return [];
  return s.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
};

const ALLOWED_REL = new Set([
  "tax_adviser","legal_adviser","accountant","banker","investor","partner",
  "supplier","customer","journalist","mentor","operator","government","other",
]);
const ALLOWED_STATUS = new Set(["new","active","paused","closed","archived"]);
const ALLOWED_ROLE = new Set([
  "unknown","buyer","seller","intermediary","advisor","funder","operator","press","regulator","other",
]);
const ALLOWED_TRUST = new Set(["unknown","low","medium","high","verified"]);
const ALLOWED_DISC = new Set(["public_only","nda_before_detail","under_nda","full_disclosure"]);
const safeEnum = (v: unknown, set: Set<string>, fallback: string) => {
  const s = normLower(v).replace(/\s+/g, "_");
  return set.has(s) ? s : fallback;
};

function buildPatch(row: InRow, existing: any | null) {
  const patch: Record<string, unknown> = {};
  const setIfMissingOrNew = (col: string, value: unknown) => {
    const v = norm(value);
    if (!v) return;
    if (!existing) { patch[col] = v; return; }
    const cur = norm(existing[col]);
    if (!cur) patch[col] = v;
  };
  const setIfProvided = (col: string, value: unknown) => {
    const v = norm(value);
    if (v) patch[col] = v;
  };

  patch.contact_name = norm(row.contact_name) || existing?.contact_name || "Unknown";
  setIfProvided("organisation_name", row.organisation);

  // Never overwrite email/phone/website/trust/disclosure/founder_notes with blank
  setIfMissingOrNew("email", row.preferred_email);
  setIfMissingOrNew("phone", row.phone);
  setIfMissingOrNew("website", row.website);

  setIfProvided("jurisdiction", row.jurisdiction);
  setIfProvided("city_country", row.city_country);

  if (!existing || !existing.trust_level || existing.trust_level === "unknown") {
    patch.trust_level = safeEnum(row.trust_level, ALLOWED_TRUST, "unknown");
  }
  if (!existing || !existing.disclosure_level || existing.disclosure_level === "public_only") {
    patch.disclosure_level = safeEnum(row.disclosure_level, ALLOWED_DISC, "public_only");
  }
  if (!existing) {
    patch.relationship_type = safeEnum(row.relationship_type, ALLOWED_REL, "other");
    patch.relationship_status = safeEnum(row.status, ALLOWED_STATUS, "new");
    patch.opportunity_role = safeEnum(row.opportunity_role, ALLOWED_ROLE, "unknown");
  }

  if (row.commercial_score != null && !isBlank(row.commercial_score))
    patch.commercial_value_score = clampScore(row.commercial_score);
  if (row.strategic_score != null && !isBlank(row.strategic_score))
    patch.strategic_value_score = clampScore(row.strategic_score);
  if (row.urgency_score != null && !isBlank(row.urgency_score))
    patch.urgency_score = clampScore(row.urgency_score);

  // AI summary, next action, founder notes — append, never blank-overwrite
  const appendField = (col: string, incoming: unknown, header: string) => {
    const v = norm(incoming);
    if (!v) return;
    const cur = norm(existing?.[col]);
    if (!cur) { patch[col] = v; return; }
    if (cur.includes(v)) return;
    patch[col] = `${cur}\n\n[${header} ${new Date().toISOString().slice(0,10)}] ${v}`;
  };
  appendField("ai_summary", row.ai_summary, "AI");
  appendField("founder_notes", row.founder_notes, "Notes");
  appendField("next_action_summary", row.next_action, "Next");
  appendField("source_evidence", row.source_evidence, "Evidence");
  setIfProvided("source_notes", row.source_pack);
  setIfProvided("source_platform", row.primary_contact_route);

  // Tags — merge, dedupe
  const incomingTags = toTags(row.tags);
  if (incomingTags.length) {
    const cur: string[] = Array.isArray(existing?.tags) ? existing.tags : [];
    const merged = Array.from(new Set([...cur.map((t) => t.toLowerCase()), ...incomingTags.map((t) => t.toLowerCase())]));
    patch.tags = merged;
  }

  // Disclosure warning for website needing verify
  if (normLower(row.website_source).includes("derived_from_email_domain")) {
    const warn = `Website ${row.website} derived from email domain — verify before external use.`;
    const cur = norm(existing?.disclosure_warning);
    if (!cur) patch.disclosure_warning = warn;
    else if (!cur.includes(warn)) patch.disclosure_warning = `${cur}\n${warn}`;
  }

  return patch;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResp } = await userClient.auth.getUser(token);
    const user = userResp?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const ok = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder");
    if (!ok) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const mode: "preview" | "commit" = body.mode === "commit" ? "commit" : "preview";
    const workbookName: string = body.workbook_name ?? "Liftor_RI_UPSERT.xlsx";
    const sourcePack: string = body.source_pack ?? "gmail_weekly_sweep_2026_06_15_to_2026_06_22";
    const expectedTotals = body.expected_totals ?? {};
    const rows: InRow[] = Array.isArray(body.rows) ? body.rows : [];

    // Load all existing contacts for matching (small enough for now)
    const { data: existing } = await admin
      .from("relationship_intelligence_contacts")
      .select("id, contact_name, organisation_name, email, phone, website, tags, trust_level, disclosure_level, ai_summary, founder_notes, next_action_summary, source_evidence, disclosure_warning");

    const byEmail = new Map<string, any>();
    const byNameOrg = new Map<string, any>();
    for (const c of existing ?? []) {
      if (c.email) byEmail.set(normLower(c.email), c);
      const k = `${normKey(c.contact_name)}|${normKey(c.organisation_name)}`;
      if (!byNameOrg.has(k)) byNameOrg.set(k, c);
    }

    const plan: any[] = [];
    const seenEmailsThisBatch = new Set<string>();
    let createCount = 0, updateCount = 0, heldCount = 0, skippedCount = 0, blockedDup = 0;
    let missingEmail = 0, missingPhone = 0, missingWebsite = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const action = (r.liftor_upsert_action ?? "").toUpperCase().trim() as Action;
      const emailKey = normLower(r.preferred_email);
      const nameOrgKey = `${normKey(r.contact_name)}|${normKey(r.organisation)}`;
      let match = emailKey ? byEmail.get(emailKey) : undefined;
      let matchBasis: string | null = match ? "email" : null;
      if (!match) { match = byNameOrg.get(nameOrgKey); if (match) matchBasis = "name_org"; }

      if (isBlank(r.preferred_email)) missingEmail++;
      if (isBlank(r.phone)) missingPhone++;
      if (isBlank(r.website)) missingWebsite++;

      let resolved: "create" | "update" | "hold" | "skip" = "skip";
      let warning: string | null = null;

      if (action === "REVIEW_HOLD_NO_UNIQUE_EMAIL") {
        resolved = "hold"; heldCount++;
      } else if (match) {
        resolved = "update"; updateCount++;
        if (action === "CREATE_NEW") warning = "Row marked CREATE_NEW but matched existing record — will UPDATE instead.";
      } else if (action === "CREATE_NEW") {
        if (emailKey && seenEmailsThisBatch.has(emailKey)) {
          resolved = "skip"; skippedCount++; blockedDup++;
          warning = "Duplicate email within this batch — blocked.";
        } else {
          resolved = "create"; createCount++;
          if (emailKey) seenEmailsThisBatch.add(emailKey);
        }
      } else if (action === "UPDATE_EXISTING") {
        resolved = "skip"; skippedCount++;
        warning = "Action UPDATE_EXISTING but no existing record matched — skipped (no auto-create).";
      } else {
        resolved = "skip"; skippedCount++;
      }

      plan.push({
        row_index: i,
        action,
        resolved,
        match_basis: matchBasis,
        match_id: match?.id ?? null,
        contact_name: r.contact_name,
        organisation: r.organisation,
        preferred_email: r.preferred_email,
        phone: r.phone,
        website: r.website,
        warning,
      });
    }

    const actual = {
      total_rows: rows.length,
      create_count: createCount,
      update_count: updateCount,
      held_count: heldCount,
      skipped_count: skippedCount,
      blocked_duplicates: blockedDup,
      missing_email: missingEmail,
      missing_phone: missingPhone,
      missing_website: missingWebsite,
    };

    const totalsMatch =
      !expectedTotals ||
      (expectedTotals.total_rows == null || expectedTotals.total_rows === rows.length) &&
      (expectedTotals.create_new == null || expectedTotals.create_new === rows.filter((r) => (r.liftor_upsert_action ?? "").toUpperCase() === "CREATE_NEW").length) &&
      (expectedTotals.update_existing == null || expectedTotals.update_existing === rows.filter((r) => (r.liftor_upsert_action ?? "").toUpperCase() === "UPDATE_EXISTING").length) &&
      (expectedTotals.review_hold == null || expectedTotals.review_hold === rows.filter((r) => (r.liftor_upsert_action ?? "").toUpperCase() === "REVIEW_HOLD_NO_UNIQUE_EMAIL").length);

    if (mode === "preview") {
      return new Response(JSON.stringify({ mode, plan, actual, control_totals_match: totalsMatch, expected: expectedTotals }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!totalsMatch && body.force !== true) {
      return new Response(JSON.stringify({ error: "control_totals_mismatch", actual, expected: expectedTotals }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // COMMIT
    let createdIds: string[] = [];
    let updatedIds: string[] = [];
    let heldIds: string[] = [];
    const eventInserts: any[] = [];

    for (const p of plan) {
      const r = rows[p.row_index];
      if (p.resolved === "create") {
        const patch = buildPatch(r, null);
        patch.source = "manual";
        const { data, error } = await admin
          .from("relationship_intelligence_contacts")
          .insert(patch)
          .select("id")
          .single();
        if (error) { p.commit_error = error.message; continue; }
        createdIds.push(data.id);
        p.committed_id = data.id;
        eventInserts.push({
          contact_id: data.id, event_type: "import_create",
          summary: `Created from ${sourcePack}`,
          metadata: { workbook: workbookName, source_pack: sourcePack, evidence: r.source_evidence ?? null },
          actor_id: user.id,
        });
      } else if (p.resolved === "update") {
        const existingRow = (existing ?? []).find((c: any) => c.id === p.match_id);
        const patch = buildPatch(r, existingRow);
        const { error } = await admin
          .from("relationship_intelligence_contacts")
          .update(patch)
          .eq("id", p.match_id);
        if (error) { p.commit_error = error.message; continue; }
        updatedIds.push(p.match_id);
        p.committed_id = p.match_id;
        eventInserts.push({
          contact_id: p.match_id, event_type: "import_update",
          summary: `Updated from ${sourcePack}`,
          metadata: { workbook: workbookName, source_pack: sourcePack, evidence: r.source_evidence ?? null, match_basis: p.match_basis },
          actor_id: user.id,
        });
      } else if (p.resolved === "hold") {
        const { data, error } = await admin
          .from("relationship_intelligence_import_holds")
          .insert({
            workbook_name: workbookName,
            source_pack: sourcePack,
            contact_name: r.contact_name ?? null,
            organisation: r.organisation ?? null,
            preferred_email: r.preferred_email ?? null,
            phone: r.phone ?? null,
            website: r.website ?? null,
            reason: "REVIEW_HOLD_NO_UNIQUE_EMAIL",
            raw_row: r as any,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) { p.commit_error = error.message; continue; }
        heldIds.push(data.id);
        p.committed_id = data.id;
      }
    }

    if (eventInserts.length) {
      await admin.from("relationship_intelligence_events").insert(eventInserts);
    }

    const auditPayload = {
      workbook_name: workbookName,
      source_pack: sourcePack,
      total_rows: rows.length,
      created_count: createdIds.length,
      updated_count: updatedIds.length,
      held_count: heldIds.length,
      skipped_count: actual.skipped_count,
      blocked_duplicates: actual.blocked_duplicates,
      missing_email: actual.missing_email,
      missing_phone: actual.missing_phone,
      missing_website: actual.missing_website,
      control_totals_match: totalsMatch,
      expected_totals: expectedTotals,
      actual_totals: actual,
      details: { plan },
      committed_by: user.id,
    };
    const { data: auditRow } = await admin
      .from("relationship_intelligence_import_audit")
      .insert(auditPayload)
      .select("id")
      .single();

    return new Response(JSON.stringify({
      mode: "commit",
      audit_id: auditRow?.id ?? null,
      created: createdIds.length,
      updated: updatedIds.length,
      held: heldIds.length,
      skipped: actual.skipped_count,
      blocked_duplicates: actual.blocked_duplicates,
      missing_email: actual.missing_email,
      missing_phone: actual.missing_phone,
      missing_website: actual.missing_website,
      plan,
      control_totals_match: totalsMatch,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});