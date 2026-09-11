import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  GSM_EVERGREEN_POOL_KEY,
  GSM_LAUNCH_POOL_KEY,
  GSM_QUARANTINE_POOL_KEY,
  selectGsmMailboxes,
  type GsmAllocationRecord,
  type GsmDomainSignals,
  type GsmMailboxSignals,
} from "../_shared/gsmSenderEstate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const APPLY_CONFIRMATION = "ALLOCATE GSM SENDER POOLS";
const ALLOWED_POOLS = new Set([GSM_LAUNCH_POOL_KEY, GSM_EVERGREEN_POOL_KEY, GSM_QUARANTINE_POOL_KEY]);

/**
 * Deterministic sender-pool allocation. It never calls Winnr or Smartlead and
 * never sends email. Apply mode writes only active gsm_mailbox_allocations for
 * campaign-ready GSM mailboxes. Existing sticky/in-flight allocations are
 * preserved by selectGsmMailboxes and the DB uniqueness rule.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const apply = body.apply === true;
  const confirmation = String(body.external_action_confirmation ?? "");
  const requestedPoolKey = String(body.pool_key ?? "all");
  const businessId = body.business_id ? String(body.business_id) : null;
  const liftorCampaignId = body.liftor_campaign_id ? String(body.liftor_campaign_id) : null;

  const { data: pools } = await admin
    .from("gsm_sender_pools")
    .select("id,pool_key,pool_name,pool_type,target_capacity,desired_capacity,state,priority")
    .eq("state", "active")
    .order("priority", { ascending: true });
  const poolRows = (pools ?? []).filter((p) => ALLOWED_POOLS.has(String(p.pool_key)));
  const chosenPools = requestedPoolKey === "all" ? poolRows.filter((p) => p.pool_key !== GSM_QUARANTINE_POOL_KEY) : poolRows.filter((p) => p.pool_key === requestedPoolKey);
  if (chosenPools.length === 0) return json({ ok: false, error: "sender_pool_not_found" }, 404);

  const [{ data: mailboxes }, { data: domains }, { data: allocations }] = await Promise.all([
    admin.from("gsm_mailboxes").select("*").eq("estate_classification", "gsm").eq("active", true).eq("retired", false),
    admin.from("gsm_sending_domains").select("*"),
    admin.from("gsm_mailbox_allocations").select("*").eq("allocation_status", "active"),
  ]);

  const poolById = new Map(poolRows.map((p) => [String(p.id), String(p.pool_key)]));
  const activeAllocations: GsmAllocationRecord[] = (allocations ?? []).map((a) => ({
    ...(a as unknown as GsmAllocationRecord),
    pool_key: a.pool_id ? poolById.get(String(a.pool_id)) ?? null : null,
  }));

  const plans: Array<{
    pool_id: string;
    pool_key: string;
    requested_count: number;
    selected: ReturnType<typeof selectGsmMailboxes>["selected"];
    rejected: ReturnType<typeof selectGsmMailboxes>["rejected"];
    shortfall: number;
    decision: string;
    decision_reason: string | null;
  }> = [];

  // Plan sequentially so the same unallocated mailbox cannot be selected into
  // two pools during one all-pools request.
  const simulated = [...activeAllocations];
  for (const p of chosenPools) {
    const currentInPool = simulated.filter((a) => a.allocation_status === "active" && a.pool_id === p.id).length;
    const target = Math.max(0, Number(p.desired_capacity ?? p.target_capacity ?? 0));
    const needed = Math.max(0, target - currentInPool);
    const selection = selectGsmMailboxes(
      (mailboxes ?? []) as GsmMailboxSignals[],
      (domains ?? []) as GsmDomainSignals[],
      simulated,
      {
        pool_key: String(p.pool_key),
        requested_count: needed,
        business_id: businessId,
        liftor_campaign_id: liftorCampaignId,
      },
    );
    plans.push({
      pool_id: String(p.id),
      pool_key: String(p.pool_key),
      requested_count: needed,
      selected: selection.selected,
      rejected: selection.rejected,
      shortfall: selection.shortfall,
      decision: selection.decision,
      decision_reason: selection.decision_reason,
    });
    for (const s of selection.selected) {
      simulated.push({
        id: `preview:${p.id}:${s.mailbox_id}`,
        mailbox_id: s.mailbox_id,
        pool_id: String(p.id),
        pool_key: String(p.pool_key),
        business_id: businessId,
        liftor_campaign_id: liftorCampaignId,
        allocation_status: "active",
        in_flight: false,
      });
    }
  }

  if (!apply || confirmation !== APPLY_CONFIRMATION) {
    return json({
      ok: true,
      mode: "preview",
      executed: false,
      blocker: apply ? "external_action_confirmation_required" : null,
      expected_confirmation: apply ? APPLY_CONFIRMATION : null,
      plans,
      selected_total: plans.reduce((n, p) => n + p.selected.length, 0),
      message: "Preview only. No sender-pool allocation rows were written.",
    });
  }

  const inserted: Array<{ pool_key: string; mailbox_id: string; allocation_id: string | null }> = [];
  const errors: Array<{ pool_key: string; mailbox_id: string; error: string }> = [];
  for (const p of plans) {
    for (const s of p.selected) {
      const { data, error } = await admin
        .from("gsm_mailbox_allocations")
        .insert({
          mailbox_id: s.mailbox_id,
          pool_id: p.pool_id,
          business_id: businessId,
          liftor_campaign_id: liftorCampaignId,
          allocation_status: "active",
          in_flight: false,
          thread_sticky: true,
          metadata: { source: "gsm-pool-allocate", pool_key: p.pool_key },
        })
        .select("id")
        .maybeSingle();
      if (error) errors.push({ pool_key: p.pool_key, mailbox_id: s.mailbox_id, error: error.message });
      else inserted.push({ pool_key: p.pool_key, mailbox_id: s.mailbox_id, allocation_id: data?.id ?? null });
    }
  }

  return json({
    ok: errors.length === 0,
    mode: "apply",
    executed: true,
    inserted_count: inserted.length,
    inserted,
    errors,
    plans,
    message: "Only campaign-ready GSM mailboxes were allocated. No provider call or email send occurred.",
  }, errors.length ? 207 : 200);
});
