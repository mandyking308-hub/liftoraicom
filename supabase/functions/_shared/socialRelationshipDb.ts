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
  localWindowStarts,
  type ActionType,
  type EvaluateActionResult,
  type PolicyRow,
} from "./socialRelationshipLogic.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-unipile-signature, x-social-relationship-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/** Founder/admin gate. Never trust a client-supplied role. */
export async function requireFounder(req: Request) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return { error: json({ ok: false, error: "auth_missing" }, 401) } as const;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return { error: json({ ok: false, error: "auth_invalid" }, 401) } as const;
  const admin = serviceClient();
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const set = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!set.has("founder") && !set.has("admin")) return { error: json({ ok: false, error: "forbidden" }, 403) } as const;
  return { admin, user: u.user } as const;
}

export async function audit(
  admin: SupabaseClient,
  row: {
    business_id?: string | null;
    account_id?: string | null;
    action_id?: string | null;
    conversation_id?: string | null;
    event: string;
    event_status?: string;
    actor?: string;
    actor_user_id?: string | null;
    provider?: string | null;
    provider_calls?: number;
    detail?: Record<string, unknown>;
  },
) {
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

export async function loadContext(
  admin: SupabaseClient,
  business_id: string,
  provider = "unipile",
): Promise<RelationshipContext> {
  const [{ data: conn }, { data: pol }, { data: pauses }] = await Promise.all([
    admin
      .from("social_relationship_provider_connections")
      .select("*")
      .eq("provider", provider)
      .or(`business_id.eq.${business_id},business_id.is.null`)
      .order("business_id", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("social_relationship_policies")
      .select("*")
      .eq("business_id", business_id)
      .is("account_id", null)
      .maybeSingle(),
    admin.from("social_relationship_pauses").select("*").eq("is_paused", true),
  ]);
  const policy = (pol ?? { mode: "test_only" }) as PolicyRow;
  return {
    business_id,
    connection: conn ?? null,
    policy,
    pauses: pauses ?? [],
    mode: normaliseMode(policy.mode),
  };
}

/** Usage windows follow the POLICY timezone, not UTC. */
export function windowStarts(now = new Date(), timezone?: string | null) {
  return localWindowStarts(now, timezone);
}

export async function usageFor(
  admin: SupabaseClient,
  business_id: string,
  account_id: string,
  action_type: string,
  now = new Date(),
  timezone?: string | null,
) {
  const w = windowStarts(now, timezone);
  const { data } = await admin
    .from("social_relationship_rate_limits")
    .select("window_kind, window_start, used_count")
    .eq("business_id", business_id)
    .eq("account_id", account_id)
    .eq("action_type", action_type);
  const rows = data ?? [];
  const day = rows.find((r: any) => r.window_kind === "day" && r.window_start === w.day)?.used_count ?? 0;
  const week = rows.find((r: any) => r.window_kind === "week" && r.window_start === w.week)?.used_count ?? 0;
  return { day, week };
}

export async function bumpUsage(
  admin: SupabaseClient,
  business_id: string,
  account_id: string,
  action_type: string,
  now = new Date(),
  timezone?: string | null,
) {
  const w = windowStarts(now, timezone);
  for (const [kind, start] of [["day", w.day], ["week", w.week]] as const) {
    const { data: existing } = await admin
      .from("social_relationship_rate_limits")
      .select("id, used_count")
      .eq("business_id", business_id)
      .eq("account_id", account_id)
      .eq("action_type", action_type)
      .eq("window_kind", kind)
      .eq("window_start", start)
      .maybeSingle();
    if (existing) {
      await admin
        .from("social_relationship_rate_limits")
        .update({ used_count: (existing.used_count ?? 0) + 1 })
        .eq("id", existing.id);
    } else {
      await admin.from("social_relationship_rate_limits").insert({
        business_id,
        account_id,
        action_type,
        window_kind: kind,
        window_start: start,
        used_count: 1,
      });
    }
  }
}

export async function isSuppressed(
  admin: SupabaseClient,
  business_id: string,
  profile: { network?: string | null; provider_profile_id?: string | null; profile_url?: string | null } | null,
): Promise<{ suppressed: boolean; reason?: string }> {
  if (!profile) return { suppressed: false };
  // Business isolation: only this business's rows plus explicit global rows.
  const { data } = await admin
    .from("social_relationship_suppressions")
    .select("scope, network, provider_profile_id, profile_url, reason, business_id")
    .or(`business_id.eq.${business_id},business_id.is.null`);
  for (const s of data ?? []) {
    if (s.business_id && s.business_id !== business_id) continue;
    if (!s.business_id && s.scope !== "global") continue;
    if (s.provider_profile_id && profile.provider_profile_id && s.provider_profile_id === profile.provider_profile_id) {
      return { suppressed: true, reason: s.reason };
    }
    if (
      s.profile_url &&
      profile.profile_url &&
      String(s.profile_url).toLowerCase().replace(/\/+$/, "") ===
        String(profile.profile_url).toLowerCase().replace(/\/+$/, "")
    ) {
      return { suppressed: true, reason: s.reason };
    }
    if (s.scope === "network" && s.network && s.network === profile.network) {
      return { suppressed: true, reason: s.reason };
    }
  }
  return { suppressed: false };
}

export interface GateInput {
  business_id: string;
  action_type: ActionType | string;
  account: Record<string, any> | null;
  profile?: Record<string, any> | null;
  target?: Record<string, any> | null;
  batch_approved?: boolean;
  connect_then_dm?: boolean;
  ignore_working_hours?: boolean;
  now?: Date;
}

/** The single authoritative gate. Everything external must pass through here. */
export async function gateAction(
  admin: SupabaseClient,
  ctx: RelationshipContext,
  input: GateInput,
): Promise<EvaluateActionResult & { usage: { day: number; week: number }; limits: { day: number; week: number } }> {
  const now = input.now ?? new Date();
  const account = input.account;
  const caps = account
    ? capabilityMap(
        (
          await admin
            .from("social_relationship_capabilities")
            .select("capability, supported")
            .eq("business_id", input.business_id)
            .eq("account_id", account.id)
        ).data ?? [],
      )
    : {};
  const usage = account ? await usageFor(admin, input.business_id, account.id, String(input.action_type), now, ctx.policy.timezone) : { day: 0, week: 0 };
  const sup = await isSuppressed(admin, input.business_id, input.profile ?? null);
  const pause = resolvePause(ctx.pauses as any, {
    business_id: input.business_id,
    provider: ctx.connection?.provider ?? "unipile",
    account_id: account?.id ?? null,
  });
  const result = evaluateAction({
    now,
    mode: ctx.mode,
    action_type: input.action_type,
    capabilities: caps,
    pause,
    policy: ctx.policy,
    usage,
    account: account
      ? {
          account_status: account.account_status,
          real_account_declared: account.real_account_declared,
          cooldown_until: account.cooldown_until,
        }
      : null,
    connection_ok: Boolean(ctx.connection?.credentials_present && ctx.connection?.last_test_ok),
    target_approved: input.target ? input.target.target_status === "approved" : false,
    batch_approved: input.batch_approved === true,
    suppressed: sup.suppressed,
    suppression_reason: sup.reason,
    connect_then_dm: input.connect_then_dm,
    ignore_working_hours: input.ignore_working_hours,
  });
  return { ...result, usage, limits: limitFor(ctx.policy, String(input.action_type)) };
}
