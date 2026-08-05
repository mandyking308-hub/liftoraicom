import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { reconcileBusiness } from "../_shared/socialDistributionReconcile.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch { /* */ }
  const { business_id } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const result = await reconcileBusiness(a.admin, business_id, body.provider ?? "buffer");
  return json(result, result.ok ? 200 : 200);
});
