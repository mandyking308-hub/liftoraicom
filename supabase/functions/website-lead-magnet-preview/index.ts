import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, lead_magnet_type = "guide", target_audience, promised_outcome } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  return json({
    ok: true, dry_run: true, no_records_mutated: true,
    suggested_title: `Free ${lead_magnet_type} for ${target_audience ?? "your audience"}`,
    promise: promised_outcome ?? "[founder-defined outcome — no invented stats]",
    outline: [
      { step: 1, title: "Why this matters" },
      { step: 2, title: "The core method" },
      { step: 3, title: "Action steps" },
      { step: 4, title: "Next steps with the business" },
    ],
    opt_in_copy: "Enter your email to get the free [lead magnet]. We never share your data.",
    thank_you_copy: "Thanks! Check your email shortly — we'll be in touch.",
    delivery_method_suggestion: "manual",
    compliance_warnings: ["Privacy policy must exist before launch","Email opt-in disclosure required"],
    missing_assets: ["cover image","sample preview"],
    ...SAFETY_FLAGS,
  });
});