import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Smartlead Lead Push Preview — DRY-RUN ONLY.
 *
 * Reads contacts/queue locally, applies the same compliance/exclusion rules
 * Liftor would use before pushing to Smartlead, and returns the would-be
 * Smartlead lead payload shape. NEVER calls Smartlead. NEVER mutates DB.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? null;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100);
  const liftor_campaign_id: string | null = body.liftor_campaign_id ?? null;
  const business_id: string | null = body.business_id ?? null;
  const provider_campaign_id: string | null = body.provider_campaign_id ?? null;

  // Smartlead campaign existence check (read-only, count only)
  let smartleadCampaignCount = 0;
  if (SMARTLEAD_API_KEY && SMARTLEAD_API_KEY.length > 8) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(
        `https://server.smartlead.ai/api/v1/campaigns/?include_tags=true&api_key=${encodeURIComponent(
          SMARTLEAD_API_KEY,
        )}`,
        { signal: ctrl.signal },
      );
      const txt = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(txt);
      } catch {
        /* */
      }
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [];
      smartleadCampaignCount = arr.length;
    } catch {
      /* swallow */
    } finally {
      clearTimeout(t);
    }
  }

  if (smartleadCampaignCount === 0) {
    return json({
      ok: true,
      dry_run: true,
      lead_push_ready: false,
      blocker: "no_smartlead_campaign",
      smartlead_campaign_count: 0,
      eligible_count: 0,
      excluded_count: 0,
      preview: [],
      notes:
        "No leads pushed — dry-run only. Cannot preview lead push until at least one Smartlead campaign exists.",
    });
  }

  // Load candidate contacts (read-only).
  let q = admin
    .from("contacts")
    .select(
      "id, email, first_name, last_name, name, company, linkedin_url, source_platform, lawful_basis, unsubscribe_token, sendable_status, is_globally_suppressed, hard_bounced, unsubscribed_at, archived_at, founder_review_requested_at, assigned_business, active_campaign_id",
    )
    .limit(500);
  if (business_id) q = q.eq("assigned_business", business_id);
  if (liftor_campaign_id) q = q.eq("active_campaign_id", liftor_campaign_id);
  const { data: contacts, error: cErr } = await q;
  if (cErr) return json({ ok: false, error: "contacts_query_failed", detail: cErr.message }, 500);

  const ids = (contacts ?? []).map((c: any) => c.id);
  const { data: queueRows } = ids.length
    ? await admin
        .from("email_queue")
        .select("id, contact_id, campaign_id, sequence_step, status")
        .in("contact_id", ids)
    : { data: [] as any[] };
  const queueByContact = new Map<string, any[]>();
  for (const r of queueRows ?? []) {
    const arr = queueByContact.get(r.contact_id) ?? [];
    arr.push(r);
    queueByContact.set(r.contact_id, arr);
  }

  const eligible: any[] = [];
  const excluded: { id: string; reason: string }[] = [];
  const seenEmails = new Set<string>();

  for (const c of contacts ?? []) {
    const exclude = (reason: string) => excluded.push({ id: c.id, reason });
    if (!c.email) {
      exclude("missing_email");
      continue;
    }
    const emailKey = c.email.toLowerCase().trim();
    if (seenEmails.has(emailKey)) {
      exclude("duplicate_email");
      continue;
    }
    if (c.archived_at) {
      exclude("archived");
      continue;
    }
    if (c.is_globally_suppressed) {
      exclude("globally_suppressed");
      continue;
    }
    if (c.hard_bounced) {
      exclude("hard_bounced");
      continue;
    }
    if (c.unsubscribed_at) {
      exclude("unsubscribed");
      continue;
    }
    if (!c.lawful_basis) {
      exclude("missing_lawful_basis");
      continue;
    }
    if (!c.unsubscribe_token) {
      exclude("missing_unsubscribe_token");
      continue;
    }
    if (c.sendable_status && c.sendable_status !== "sendable") {
      exclude(`sendable_status_${c.sendable_status}`);
      continue;
    }
    if (c.founder_review_requested_at) {
      exclude("review_required");
      continue;
    }
    const queue = queueByContact.get(c.id) ?? [];
    const unsafeQueue = queue.find((q) =>
      ["pending", "sending", "sent", "delayed", "throttled"].includes(q.status),
    );
    if (unsafeQueue) {
      exclude(`already_in_queue_${unsafeQueue.status}_step_${unsafeQueue.sequence_step}`);
      continue;
    }
    seenEmails.add(emailKey);
    eligible.push(c);
    if (eligible.length >= limit) break;
  }

  const preview = eligible.map((c) => {
    const first = c.first_name ?? c.name?.split(" ")?.[0] ?? "";
    const last = c.last_name ?? c.name?.split(" ")?.slice(1).join(" ") ?? "";
    return {
      email: c.email,
      first_name: first,
      last_name: last,
      company_name: c.company ?? "",
      website: null,
      linkedin_profile: c.linkedin_url ?? null,
      company_url: null,
      custom_fields: {
        liftor_contact_id: c.id,
        liftor_queue_id: null,
        business_name: c.assigned_business ?? null,
        source_platform: c.source_platform ?? null,
        lawful_basis: c.lawful_basis,
        campaign_fit: null,
        sequence_step: 1,
      },
    };
  });

  return json({
    ok: true,
    dry_run: true,
    lead_push_ready: true,
    smartlead_campaign_count: smartleadCampaignCount,
    provider_campaign_id,
    liftor_campaign_id,
    business_id,
    eligible_count: eligible.length,
    excluded_count: excluded.length,
    excluded_reasons: excluded.reduce<Record<string, number>>((acc, x) => {
      acc[x.reason] = (acc[x.reason] ?? 0) + 1;
      return acc;
    }, {}),
    preview,
    notes:
      "No leads pushed — dry-run only. No POST to /campaigns/{id}/leads. No DB mutation. Smartlead read-only count call only.",
  });
});