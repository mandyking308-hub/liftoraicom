import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  return json({
    ok: true, no_records_mutated: true,
    suggested_segments: [
      { segment_type: "cold_interest", platform: body.platform ?? "meta", description: "Interest-based cold audience" },
      { segment_type: "retargeting_later", platform: body.platform ?? "meta", description: "Site visitors after pixel installed manually" },
      { segment_type: "lookalike_later", platform: body.platform ?? "meta", description: "Lookalike of customer list once available" },
    ],
    privacy_warnings: ["Customer lists require consent + lawful basis", "No PII may be uploaded without DPA"],
    platform_caveats: ["Each platform restricts targeting (e.g. employment, housing, credit)"],
    safety: SAFETY_FLAGS,
  });
});
