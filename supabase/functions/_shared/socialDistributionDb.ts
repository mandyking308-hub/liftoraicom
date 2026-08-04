/** Shared DB helpers for the Social Distribution Fabric. */
import type { PolicyMode } from "./socialDistributionLogic.ts";

export async function audit(admin: any, row: Record<string, unknown>) {
  try {
    await admin.from("social_publish_queue_audit").insert({ action_status: "recorded", provider: "buffer", ...row });
  } catch { /* audit must never break the flow */ }
}

export async function isPaused(admin: any, business_id?: string | null, provider = "buffer") {
  const { data } = await admin.from("social_distribution_pauses").select("scope, scope_key, paused").eq("paused", true);
  const rows = data ?? [];
  return rows.some((r: any) =>
    (r.scope === "global") ||
    (r.scope === "provider" && r.scope_key === provider) ||
    (r.scope === "business" && business_id && r.scope_key === business_id));
}

export async function getPolicy(admin: any, business_id: string, provider = "buffer"): Promise<{ mode: PolicyMode; allow_share_now: boolean; max_batch_size: number }> {
  const { data } = await admin.from("social_distribution_policies").select("*")
    .eq("business_id", business_id).eq("provider", provider).maybeSingle();
  return {
    mode: (data?.policy_mode ?? "test") as PolicyMode,
    allow_share_now: !!data?.allow_share_now,
    max_batch_size: data?.max_batch_size ?? 25,
  };
}

export async function getConnection(admin: any, business_id: string, provider = "buffer") {
  const { data } = await admin.from("social_provider_connections").select("*")
    .eq("business_id", business_id).eq("provider", provider).maybeSingle();
  return data ?? null;
}

export async function gateUnlocked(admin: any, business_id: string, provider = "buffer") {
  const { data } = await admin.from("social_provider_execution_gates").select("gate_status")
    .eq("business_id", business_id).eq("provider", provider);
  const rows = data ?? [];
  if (rows.length === 0) return false;
  return rows.some((r: any) => r.gate_status === "unlocked" || r.gate_status === "enabled");
}

/** Resolve the mapped channel for a job's platform (never crosses businesses). */
export async function resolveChannel(admin: any, business_id: string, platform?: string | null) {
  const { data } = await admin.from("social_business_channel_map")
    .select("*, channel:social_provider_channels(*)")
    .eq("business_id", business_id).eq("active", true);
  const rows = (data ?? []).filter((m: any) => m.channel);
  const svc = (platform ?? "").toLowerCase();
  const match = rows.find((m: any) => (m.platform ?? "").toLowerCase() === svc)
    ?? rows.find((m: any) => (m.channel.service ?? "").toLowerCase() === svc)
    ?? rows.find((m: any) => m.is_default);
  if (!match) return { mapping: null, channel: null };
  return { mapping: match, channel: match.channel };
}

/*
 * jobText / jobMedia / jobApproved were removed deliberately.
 * Text and media now come from the canonical resolver
 * (socialPayloadResolver.resolveJobPayload) and approval is verified against
 * social_approval_reviews (socialPayloadResolver.resolveApproval), so job
 * status alone can never be mistaken for approval.
 */
