import { corsHeaders, json, requireFounder, SAFETY_FLAGS, detectUnsupportedClaims } from "../_shared/paidMediaLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const offer = body.offer ?? "your offer";
  const variants = [
    { headline: `Discover ${offer}`, primary_text: `A simple way to learn more about ${offer}.`, cta: "Learn More" },
    { headline: `Try ${offer} today`, primary_text: `See how ${offer} can fit into your routine.`, cta: "Get Started" },
    { headline: `Made for you: ${offer}`, primary_text: `Tap to explore ${offer}.`, cta: "See Details" },
  ];
  const unsupported = variants.flatMap(v => detectUnsupportedClaims(`${v.headline} ${v.primary_text}`));
  return json({
    ok: true, no_records_mutated: true, variants,
    asset_requirements: ["1:1 image 1080x1080", "9:16 video <30s", "Logo PNG"],
    unsupported_claims: unsupported,
    compliance_warnings: ["Avoid medical/financial guarantees", "Disclose paid partnerships"],
    safety: SAFETY_FLAGS,
  });
});
