import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  return json({
    ok: false, blocked: true,
    reason: "competitor_external_research_not_enabled",
    provider_calls: 0, scraped_pages: 0, observations_created: 0,
    no_external_action: true, ...SAFETY_FLAGS,
  }, 403);
});