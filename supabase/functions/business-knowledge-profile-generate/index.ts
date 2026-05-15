import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM = "CREATE BUSINESS KNOWLEDGE PROFILE";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const business_id = body?.business_id as string | undefined;
    const dry_run = body?.dry_run !== false;
    const confirmation = (body?.confirmation ?? "") as string;
    const source_text = (body?.source_text ?? "") as string;
    const manual: Record<string, any> = body?.manual ?? {};
    const assets_in: any[] = Array.isArray(body?.assets) ? body.assets : [];

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: biz } = await admin.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    if (!biz) {
      return new Response(JSON.stringify({ error: "Business not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build a structured profile from manual + source_text. No external AI calls — deterministic synthesis.
    const baseSummary = manual.business_summary || (source_text ? source_text.slice(0, 600) : `${biz.name} — knowledge profile draft.`);
    const profile = {
      business_id,
      profile_status: dry_run ? "preview" : "ready",
      business_summary: baseSummary,
      offer_summary: manual.offer_summary ?? null,
      target_customer: manual.target_customer ?? null,
      ideal_customer_profile: manual.ideal_customer_profile ?? null,
      pain_points: manual.pain_points ?? [],
      value_propositions: manual.value_propositions ?? [],
      proof_points: manual.proof_points ?? [],
      common_objections: manual.common_objections ?? [],
      approved_tone: manual.approved_tone ?? null,
      forbidden_claims: manual.forbidden_claims ?? [],
      required_disclaimers: manual.required_disclaimers ?? [],
      escalation_rules: manual.escalation_rules ?? [],
      proposal_rules: manual.proposal_rules ?? {},
      outreach_rules: manual.outreach_rules ?? {},
      compliance_notes: manual.compliance_notes ?? null,
      metadata: { ...(manual.metadata ?? {}), generated_by: userId, source_text_length: source_text.length },
    };

    const missing: string[] = [];
    if (!profile.offer_summary) missing.push("offer_summary");
    if (!profile.target_customer) missing.push("target_customer");
    if (!profile.approved_tone) missing.push("approved_tone");
    if ((profile.value_propositions as any[]).length === 0) missing.push("value_propositions");
    if ((profile.common_objections as any[]).length === 0) missing.push("common_objections");

    if (dry_run) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, preview: profile, assets_preview: assets_in, missing_fields: missing, external_actions: { emails_sent: 0, apollo_calls: 0, smartlead_posts: 0 } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (confirmation !== CONFIRM) {
      return new Response(JSON.stringify({ error: `Confirmation phrase required: "${CONFIRM}"` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert profile
    const { data: existing } = await admin.from("business_knowledge_profiles").select("id").eq("business_id", business_id).maybeSingle();
    let profile_id: string;
    if (existing) {
      const { data: upd, error: ue } = await admin.from("business_knowledge_profiles").update(profile).eq("id", existing.id).select("id").maybeSingle();
      if (ue) throw ue;
      profile_id = upd!.id;
    } else {
      const { data: ins, error: ie } = await admin.from("business_knowledge_profiles").insert(profile).select("id").maybeSingle();
      if (ie) throw ie;
      profile_id = ins!.id;
    }

    // Insert assets
    const allowedTypes = new Set(["manual","offer","faq","case_study","pricing","tone","compliance","proposal","campaign","founder_note","product","service","objection_handling"]);
    const assets_to_insert = assets_in
      .filter((a) => a && allowedTypes.has(a.asset_type) && a.asset_title)
      .map((a) => ({
        business_id,
        asset_type: a.asset_type,
        asset_title: String(a.asset_title).slice(0, 300),
        asset_content: a.asset_content ?? null,
        source_url: a.source_url ?? null,
        source_file_id: a.source_file_id ?? null,
        status: a.status ?? "active",
        agent_visible: a.agent_visible !== false,
        metadata: a.metadata ?? {},
      }));
    let assets_inserted = 0;
    if (assets_to_insert.length) {
      const { error: ae, data: ad } = await admin.from("business_knowledge_assets").insert(assets_to_insert).select("id");
      if (ae) throw ae;
      assets_inserted = ad?.length ?? 0;
    }

    await admin.from("agent_action_audit_log").insert({
      actor_user_id: userId,
      action_key: "business_knowledge_profile_generate",
      payload: { business_id, profile_id, assets_inserted, missing_fields: missing },
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({ ok: true, dry_run: false, profile_id, assets_inserted, missing_fields: missing, external_actions: { emails_sent: 0, apollo_calls: 0, smartlead_posts: 0 } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});