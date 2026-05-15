import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNAL_TYPES = new Set([
  "email_reply","email_click","unsubscribe","bounce","proposal_view","proposal_accept",
  "demo_view","deal_won","deal_lost","payment_received","supplier_success","supplier_delay",
  "ai_draft_approved","ai_draft_rejected","founder_override","complaint","high_value_opportunity",
]);

const POSITIVE = new Set(["email_reply","email_click","proposal_view","proposal_accept","demo_view","deal_won","payment_received","supplier_success","ai_draft_approved","high_value_opportunity"]);
const NEGATIVE = new Set(["unsubscribe","bounce","deal_lost","supplier_delay","ai_draft_rejected","founder_override","complaint"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const signals: any[] = Array.isArray(body?.signals) ? body.signals : [];
    const dryRun = body?.dry_run !== false;

    const prepared = signals
      .filter((s) => s && SIGNAL_TYPES.has(s.signal_type))
      .map((s) => ({
        business_id: s.business_id ?? null,
        signal_type: s.signal_type,
        source_table: s.source_table ?? null,
        source_id: s.source_id ?? null,
        contact_id: s.contact_id ?? null,
        campaign_id: s.campaign_id ?? null,
        agent_key: s.agent_key ?? null,
        signal_value: s.signal_value ?? null,
        signal_label: s.signal_label ?? null,
        outcome: s.outcome ?? null,
        positive_signal: s.positive_signal ?? POSITIVE.has(s.signal_type),
        negative_signal: s.negative_signal ?? NEGATIVE.has(s.signal_type),
        metadata: s.metadata ?? {},
      }));

    let inserted = 0;
    if (!dryRun && prepared.length > 0) {
      const { data, error } = await admin
        .from("business_learning_signals")
        .upsert(prepared, { onConflict: "signal_type,source_table,source_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      inserted = data?.length || 0;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dry_run: dryRun,
        prepared_count: prepared.length,
        inserted_count: inserted,
        no_external_action: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});