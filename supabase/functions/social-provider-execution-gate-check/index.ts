import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, provider, action_type } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  let q = a.admin.from("social_provider_execution_gates").select("*").eq("business_id", business_id);
  if (provider) q = q.eq("provider", provider);
  if (action_type) q = q.eq("action_type", action_type);
  const { data } = await q;
  return json({ ok: true, no_external_action: true, gates: data ?? [], provider_execution_allowed: false, sprint_policy: "all_provider_execution_locked" });
});