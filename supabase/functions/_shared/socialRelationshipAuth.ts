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

function parseSignatureHeader(value: string): { timestamp: string; signature: string } | null {
  const parts = Object.fromEntries(value.split(",").map((part) => {
    const index = part.indexOf("=");
    return index > 0 ? [part.slice(0, index).trim(), part.slice(index + 1).trim()] : ["", ""];
  }));
  return parts.t && parts.v0 ? { timestamp: parts.t, signature: parts.v0 } : null;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function authenticateRelationshipWebhook(req: Request, rawBody: string) {
  const secret = env("UNIPILE_WEBHOOK_SECRET") || env("SOCIAL_RELATIONSHIP_WEBHOOK_SECRET");
  if (!secret) return { error: json({ ok: false, error: "webhook_secret_not_configured" }, 503) } as const;

  const signatureHeader = req.headers.get("unipile-signature") ?? "";
  if (signatureHeader) {
    const parsed = parseSignatureHeader(signatureHeader);
    if (!parsed) return { error: json({ ok: false, error: "webhook_signature_invalid" }, 401) } as const;
    const timestamp = Number(parsed.timestamp);
    const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
    if (!Number.isFinite(timestamp) || age > 300) {
      return { error: json({ ok: false, error: "webhook_signature_expired" }, 401) } as const;
    }
    const expected = await hmacSha256Hex(secret, `${parsed.timestamp}.${rawBody}`);
    if (!secureEqual(parsed.signature.toLowerCase(), expected.toLowerCase())) {
      return { error: json({ ok: false, error: "webhook_signature_invalid" }, 401) } as const;
    }
    return { admin: serviceAdmin(), verified_by: "unipile_hmac_sha256" as const };
  }

  const fallback = req.headers.get("x-social-relationship-webhook-secret") ?? "";
  if (!secureEqual(fallback, secret)) return { error: json({ ok: false, error: "webhook_unauthorized" }, 401) } as const;
  return { admin: serviceAdmin(), verified_by: "liftor_shared_secret_fallback" as const };
}

export function relationshipSchedulerConfigured(): boolean {
  return !!env("SOCIAL_RELATIONSHIP_SCHEDULER_SECRET");
}

export function relationshipWebhookConfigured(): boolean {
  return !!(env("UNIPILE_WEBHOOK_SECRET") || env("SOCIAL_RELATIONSHIP_WEBHOOK_SECRET"));
}
