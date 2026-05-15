import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface CheckInput {
  business_id?: string | null;
  contact_id?: string | null;
  action_type: string;
  channel_key?: string | null;
  jurisdiction_code?: string | null;
  contact_type?: string | null;
  language_code?: string | null;
  business_type?: string | null;
}

const DISCLAIMER =
  "Operational compliance guidance only. Not legal advice. Confirm with qualified counsel before any external action.";

function score(p: any, i: CheckInput): number {
  let s = 0;
  if (p.jurisdiction_code === i.jurisdiction_code) s += 8;
  if (p.action_type === i.action_type) s += 4;
  if (p.channel_key && p.channel_key === i.channel_key) s += 2;
  if (p.contact_type && p.contact_type === i.contact_type) s += 2;
  if (p.business_type && p.business_type === i.business_type) s += 1;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    const serviceCall = req.headers.get("x-service-role") === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceCall) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
      if (cErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claims.claims.sub;
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", userId);
      const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
      if (!ok) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const input = (await req.json()) as CheckInput;
    if (!input?.action_type) {
      return new Response(JSON.stringify({ error: "action_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const jcode = input.jurisdiction_code ?? "XX";
    const { data: profiles } = await admin
      .from("jurisdiction_policy_profiles")
      .select("*")
      .in("jurisdiction_code", [jcode, "XX"])
      .eq("action_type", input.action_type);

    const candidates = (profiles ?? []).filter((p: any) =>
      (!p.channel_key || p.channel_key === input.channel_key) &&
      (!p.contact_type || p.contact_type === input.contact_type) &&
      (!p.business_type || p.business_type === input.business_type)
    );
    candidates.sort((a: any, b: any) => score(b, input) - score(a, input));
    const matched = candidates[0] ?? null;
    const fallback = !matched || matched.jurisdiction_code === "XX";

    const blockers: string[] = [];
    let allowed = !!matched?.allowed;
    let founderReview = matched?.founder_review_required ?? true;
    let legalReview = matched?.legal_review_recommended ?? true;
    const riskLevel = matched?.risk_level ?? "critical";

    if (!matched) {
      blockers.push("No jurisdiction policy matched — defaulting to blocked.");
      allowed = false;
      founderReview = true;
      legalReview = true;
    }
    if (fallback) {
      blockers.push("Jurisdiction unknown or fallback policy used — founder review required.");
    }
    if (riskLevel === "high" || riskLevel === "critical") {
      blockers.push(`Risk ${riskLevel} — founder/legal review required.`);
      founderReview = true;
    }

    return new Response(JSON.stringify({
      allowed,
      founder_review_required: founderReview,
      legal_review_recommended: legalReview,
      required_disclosures: matched?.required_disclosures ?? [],
      required_suppression_checks: matched?.required_suppression_checks ?? [],
      risk_level: riskLevel,
      blockers,
      policy_matched: matched,
      fallback_policy_used: fallback,
      notes: DISCLAIMER,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});