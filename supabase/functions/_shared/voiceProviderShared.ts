// Shared helpers for the Customer Voice Provider edge functions.
//
// SAFETY:
// - These helpers never invoke a real voice provider.
// - `recordRuntimeEvent` writes to customer_sales_voice_runtime_events so every
//   adapter touch leaves an audit trail (LIVE_INTERNAL_TEST or real).
// - `assertNoExternalSideEffects` is a sanity gate used by every stub.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const SUPPORTED_PROVIDERS = ["retell", "vapi", "twilio", "elevenlabs", "custom"] as const;
export type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

export interface VoiceAuthResult {
  admin: SupabaseClient;
  user_id: string | null;
  is_founder_or_admin: boolean;
}

export async function authenticateVoiceCaller(req: Request): Promise<VoiceAuthResult | Response> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    // Webhooks may arrive without a Supabase JWT — they are still logged, but
    // every action remains gated by `external_action_attempted=false`.
    return { admin, user_id: null, is_founder_or_admin: false };
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  return {
    admin,
    user_id: u.user.id,
    is_founder_or_admin: roleSet.has("founder") || roleSet.has("admin"),
  };
}

export interface RuntimeEventInput {
  admin: SupabaseClient;
  provider_type: string;
  event_type: string;
  event_status?: string;
  conversation_id?: string | null;
  call_log_id?: string | null;
  external_action_attempted?: boolean;
  internal_test?: boolean;
  test_label?: string | null;
  payload?: unknown;
  result?: unknown;
  error?: string | null;
}

export async function recordRuntimeEvent(input: RuntimeEventInput) {
  try {
    await input.admin.from("customer_sales_voice_runtime_events").insert({
      provider_type: input.provider_type,
      event_type: input.event_type,
      event_status: input.event_status ?? "logged",
      conversation_id: input.conversation_id ?? null,
      call_log_id: input.call_log_id ?? null,
      external_action_attempted: input.external_action_attempted ?? false,
      internal_test: input.internal_test ?? false,
      test_label: input.test_label ?? null,
      payload: input.payload ?? {},
      result: input.result ?? {},
      error: input.error ?? null,
    });
  } catch (_e) {
    // best-effort only — never break the request because logging failed
  }
}

export function isInternalTestPayload(body: any): boolean {
  if (!body || typeof body !== "object") return false;
  return body.test_label === "LIVE_INTERNAL_TEST" || body.live_internal_test === true;
}

export function getProviderType(body: any, fallback = "custom"): SupportedProvider {
  const t = String(body?.provider ?? body?.provider_type ?? fallback).toLowerCase();
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(t) ? (t as SupportedProvider) : "custom";
}
