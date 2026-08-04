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

export function jobText(job: any): string {
  const p = job.publish_payload ?? {};
  return String(p.text ?? p.caption ?? p.body ?? job.metadata?.text ?? "").trim();
}

export function jobMedia(job: any): string[] {
  const p = job.publish_payload ?? {};
  const raw = p.media_urls ?? p.assets ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map((a: any) => (typeof a === "string" ? a : a?.url ?? a?.source?.url)).filter(Boolean);
}

export function jobApproved(job: any): boolean {
  const okStatus = ["approved", "approved_internal", "ready", "ready_for_provider", "provider_locked", "queued"];
  const notApproved = ["rejected", "draft", "cancelled", "blocked", "needs_review"];
  if (notApproved.includes(String(job.status ?? ""))) return false;
  if (!job.approval_review_id) return false;
  return okStatus.includes(String(job.status ?? ""));
}
