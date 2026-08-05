import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json, requireFounder } from "./socialAuth.ts";

export { corsHeaders, json, requireFounder };

function env(name: string): string {
  try { return (Deno.env.get(name) ?? "").trim(); } catch { return ""; }
}

function secureEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function serviceAdmin() {
  const url = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("supabase_service_not_configured");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function requireRelationshipScheduler(req: Request) {
  const expected = env("SOCIAL_RELATIONSHIP_SCHEDULER_SECRET");
  const supplied = req.headers.get("x-social-relationship-secret") ?? "";
  if (!expected) return { error: json({ ok: false, error: "scheduler_secret_not_configured" }, 503) } as const;
  if (!secureEqual(supplied, expected)) return { error: json({ ok: false, error: "scheduler_unauthorized" }, 401) } as const;
  return { admin: serviceAdmin(), trigger_source: "scheduler" as const };
}

export function requireRelationshipWebhook(req: Request) {
  const expected = env("SOCIAL_RELATIONSHIP_WEBHOOK_SECRET");
  const supplied = req.headers.get("x-social-relationship-webhook-secret") ?? "";
  if (!expected) return { error: json({ ok: false, error: "webhook_secret_not_configured" }, 503) } as const;
  if (!secureEqual(supplied, expected)) return { error: json({ ok: false, error: "webhook_unauthorized" }, 401) } as const;
  return { admin: serviceAdmin(), verified_by: "liftor_shared_secret" as const };
}

export function relationshipSchedulerConfigured(): boolean {
  return !!env("SOCIAL_RELATIONSHIP_SCHEDULER_SECRET");
}

export function relationshipWebhookConfigured(): boolean {
  return !!env("SOCIAL_RELATIONSHIP_WEBHOOK_SECRET");
}
