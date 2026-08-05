/**
 * Shared data-access + gating helpers for the Social Relationship Engine.
 * Every external action funnels through `gateAction` so no code path can
 * bypass capability, policy, pause, suppression or approval checks.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  capabilityMap,
  evaluateAction,
  limitFor,
  normaliseMode,
  resolvePause,
  type ActionType,
  type EvaluateActionResult,
  type PolicyRow,
} from "./socialRelationshipLogic.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, unipile-signature, x-social-relationship-secret, x-social-relationship-webhook-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

export async function requireFounder(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return { error: json({ ok: false, error: "auth_missing" }, 401) } as const;
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data } = await userClient.auth.getUser(auth.slice(7));
  if (!data?.user) return { error: json({ ok: false, error: "auth_invalid" }, 401) } as const;
  const admin = serviceClient();
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.user.id);
  const allowed = (roles ?? []).some((row: any) => row.role === "founder" || row.role === "admin");
  if (!allowed) return { error: json({ ok: false, error: "forbidden" }, 403) } as const;
  return { admin, user: data.user } as const;
}

export async function audit(admin: SupabaseClient, row: {
  business_id?: string | null; account_id?: string | null; action_id?: string | null;
  conversation_id?: string | null; event: string; event_status?: string; actor?: string;
  actor_user_id?: string | null; provider?: string | null; provider_calls?: number;
  detail?: Record<string, unknown>;
}) {
  await admin.from("social_relationship_audit").insert({
    business_id: row.business_id ?? null,
    account_id: row.account_id ?? null,
    action_id: row.action_id ?? null,
    conversation_id: row.conversation_id ?? null,
    event: row.event,
    event_status: row.event_status ?? "ok",
    actor: row.actor ?? "system",
    actor_user_id: row.actor_user_id ?? null,
    provider: row.provider ?? null,
    provider_calls: row.provider_calls ?? 0,
    detail: row.detail ?? {},
  });
}

export interface RelationshipContext {
  business_id: string;
  connection: Record<string, any> | null;
  policy: PolicyRow & Record<string, any>;
  pauses: any[];
  mode: string;
}

export async function loadContext(admin: SupabaseClient, business_id: string, provider = "unipile", account_id?: string | null): Promise<RelationshipContext> {
  let policyQuery = admin.from("social_relationship_policies").select("*").eq("business_id", business_id);
  policyQuery = account_id ? policyQuery.eq("account_id", account_id) : policyQuery.is("account_id", null);
  const [{ data: exactConnection }, { data: globalConnection }, { data: policy }, { data: pauses }] = await Promise.all([
    admin.from("social_relationship_provider_connections").select("*").eq("provider", provider).eq("business_id", business_id).maybeSingle(),
    admin.from("social_relationship_provider_connections").select("*").eq("provider", provider).is("business_id", null).maybeSingle(),
    policyQuery.maybeSingle(),
    admin.from("social_relationship_pauses").select("*").eq("is_paused", true),
  ]);
  const safePolicy = (policy ?? { mode: "test_only", timezone: "Europe/London" }) as PolicyRow & Record<string, any>;
  return {
    business_id,
    connection: exactConnection ?? globalConnection ?? null,
    policy: safePolicy,
    pauses: pauses ?? [],
    mode: normaliseMode(safePolicy.mode),
  };
}

function datePartsInTimeZone(now: Date, timezone: string): { date: string; weekday: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { date, weekday: weekday < 0 ? now.getUTCDay() : weekday };
}

export function windowStarts(now = new Date(), timezone = "Europe/London") {
  const local = datePartsInTimeZone(now, timezone);
  const localNoonUtc = new Date(`${local.date}T12:00:00Z`);
  const mondayOffset = (local.weekday + 6) % 7;
  localNoonUtc.setUTCDate(localNoonUtc.getUTCDate() - mondayOffset);
  return { day: local.date, week: localNoonUtc.toISOString().slice(0, 10) };
}

export async function usageFor(admin: SupabaseClient, business_id: string, account_id: string, action_type: string, now = new Date(), timezone = "Europe/London") {
  const windows = windowStarts(now, timezone);
  const { data } = await admin.from("social_relationship_rate_limits")
    .select("window_kind,window_start,used_count")
    .eq("business_id", business_id).eq("account_id", account_id).eq("action_type", action_type);
  const rows = data ?? [];
  return {
    day: rows.find((row: any) => row.window_kind === "day" && row.window_start === windows.day)?.used_count ?? 0,
    week: rows.find((row: any) => row.window_kind === "week" && row.window_start === windows.week)?.used_count ?? 0,
  };
}

export async function bumpUsage(admin: SupabaseClient, business_id: string, account_id: string, action_type: string, now = new Date(), timezone = "Europe/London") {
  const windows = windowStarts(now, timezone);
  for (const [kind, start] of [["day", windows.day], ["week", windows.week]] as const) {
    const { data: existing } = await admin.from("social_relationship_rate_limits")
      .select("id,used_count").eq("business_id", business_id).eq("account_id", account_id)
      .eq("action_type", action_type).eq("window_kind", kind).eq("window_start", start).maybeSingle();
    if (existing) {
      await admin.from("social_relationship_rate_limits").update({ used_count: Number(existing.used_count ?? 0) + 1, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await admin.from("social_relationship_rate_limits").insert({ business_id, account_id, action_type, window_kind: kind, window_start: start, used_count: 1 });
    }
  }
}

export async function isSuppressed(admin: SupabaseClient, business_id: string, profile: { network?: string | null; provider_profile_id?: string | null; profile_url?: string | null } | null) {
  if (!profile) return { suppressed: false };
  const { data } = await admin.from("social_relationship_suppressions")
    .select("scope,network,provider_profile_id,profile_url,reason,business_id")
    .or(`business_id.eq.${business_id},business_id.is.null`);
  for (const suppression of data ?? []) {
    if (suppression.business_id && suppression.business_id !== business_id) continue;
    if (suppression.provider_profile_id && profile.provider_profile_id && suppression.provider_profile_id === profile.provider_profile_id) {
      return { suppressed: true, reason: suppression.reason };
    }
    const left = String(suppression.profile_url ?? "").toLowerCase().replace(/\/+$/, "");
    const right = String(profile.profile_url ?? "").toLowerCase().replace(/\/+$/, "");
    if (left && right && left === right) return { suppressed: true, reason: suppression.reason };
  }
  return { suppressed: false };
}

export interface GateInput {
  business_id: string; action_type: ActionType | string; account: Record<string, any> | null;
  profile?: Record<string, any> | null; target?: Record<string, any> | null;
  batch_approved?: boolean; connect_then_dm?: boolean; ignore_working_hours?: boolean; now?: Date;
}

export async function gateAction(admin: SupabaseClient, ctx: RelationshipContext, input: GateInput): Promise<EvaluateActionResult & { usage: { day: number; week: number }; limits: { day: number; week: number } }> {
  const now = input.now ?? new Date();
  const account = input.account;
  const crossBusiness = !!account && account.business_id !== input.business_id;
  const caps = account && !crossBusiness
    ? capabilityMap((await admin.from("social_relationship_capabilities").select("capability,supported")
        .eq("business_id", input.business_id).eq("account_id", account.id)).data ?? [])
    : {};
  const timezone = String(ctx.policy.timezone ?? "Europe/London");
  const usage = account && !crossBusiness
    ? await usageFor(admin, input.business_id, account.id, String(input.action_type), now, timezone)
    : { day: 0, week: 0 };
  const suppression = await isSuppressed(admin, input.business_id, input.profile ?? null);
  const pause = resolvePause(ctx.pauses as any, {
    business_id: input.business_id, provider: ctx.connection?.provider ?? "unipile", account_id: account?.id ?? null,
  });
  const result = evaluateAction({
    now,
    mode: ctx.mode,
    action_type: input.action_type,
    capabilities: caps,
    pause,
    policy: ctx.policy,
    usage,
    account: account && !crossBusiness ? {
      account_status: account.account_status,
      real_account_declared: account.real_account_declared,
      cooldown_until: account.cooldown_until,
    } : null,
    connection_ok: !crossBusiness && Boolean(ctx.connection?.credentials_present && ctx.connection?.last_test_ok),
    target_approved: !!input.target && input.target.business_id === input.business_id && input.target.target_status === "approved",
    batch_approved: input.batch_approved === true,
    suppressed: suppression.suppressed,
    suppression_reason: suppression.reason,
    connect_then_dm: input.connect_then_dm,
    ignore_working_hours: input.ignore_working_hours,
  });
  if (crossBusiness) result.blockers.unshift("cross_business_account");
  if (input.profile && input.profile.business_id !== input.business_id) result.blockers.unshift("cross_business_profile");
  if (input.target && input.target.business_id !== input.business_id) result.blockers.unshift("cross_business_target");
  if (result.blockers.length) result.decision = "blocked";
  return { ...result, usage, limits: limitFor(ctx.policy, String(input.action_type)) };
}
