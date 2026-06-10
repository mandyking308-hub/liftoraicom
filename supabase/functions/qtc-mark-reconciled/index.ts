// Founder/admin only — marks a qtc_payments row as reconciled and writes an audit entry.
// Does NOT override sale_ready — that's still owned by the qtc_payments_normalise trigger.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const Body = z.object({
  payment_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  reconciled: z.boolean().default(true),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Missing bearer token" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const uid = u.user.id;

  const admin = createClient(url, service);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
  const rs = new Set((roles || []).map((r: any) => r.role));
  if (!rs.has("admin") && !rs.has("founder")) return json({ error: "Forbidden" }, 403);

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch (e) { return json({ error: "Invalid request", details: (e as Error).message }, 400); }

  const { data: existing } = await admin.from("qtc_payments").select("id,audit_metadata,reconciled_at").eq("id", body.payment_id).maybeSingle();
  if (!existing) return json({ error: "Payment not found" }, 404);

  const events = Array.isArray((existing.audit_metadata as any)?.reconciliation_events) ? (existing.audit_metadata as any).reconciliation_events : [];
  events.push({
    at: new Date().toISOString(),
    by: uid,
    action: body.reconciled ? "marked_reconciled" : "unmarked_reconciled",
    notes: body.notes ?? null,
  });

  const { error } = await admin.from("qtc_payments").update({
    reconciled_at: body.reconciled ? new Date().toISOString() : null,
    reconciled_by: body.reconciled ? uid : null,
    reconciliation_notes: body.notes ?? null,
    audit_metadata: { ...(existing.audit_metadata as any || {}), reconciliation_events: events },
  }).eq("id", body.payment_id);

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}