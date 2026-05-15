import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SAFE_PHRASE = "CREATE REVENUE GOAL ACTIONS";

function paceStatus(pct: number, daysElapsedFrac: number): string {
  const delta = pct - daysElapsedFrac * 100;
  if (delta >= 5) return "ahead";
  if (delta >= -2) return "on_track";
  if (delta >= -10) return "slightly_behind";
  if (delta >= -25) return "behind";
  return "critical";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
    if (!ok) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { business_id, confirmation_phrase, dry_run = true } = body ?? {};
    if (!business_id) return new Response(JSON.stringify({ error: "missing business_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: targets } = await supabase
      .from("business_revenue_targets")
      .select("*")
      .eq("business_id", business_id)
      .eq("status", "active");

    const today = new Date();
    const snapshots: any[] = [];
    const recommendations: any[] = [];

    for (const t of (targets ?? [])) {
      // Actual amount = lookup against revenue_records if it has matching business_id; placeholder 0 otherwise
      let actual_amount = 0;
      try {
        const { data: rev } = await supabase
          .from("revenue_records")
          .select("amount")
          .gte("created_at", t.period_start)
          .lte("created_at", t.period_end);
        actual_amount = (rev ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      } catch (_) { /* table may not have business scoping */ }

      const start = new Date(t.period_start).getTime();
      const end = new Date(t.period_end).getTime();
      const total_days = Math.max(1, Math.ceil((end - start) / 86400000));
      const days_elapsed = Math.max(0, Math.min(total_days, Math.ceil((today.getTime() - start) / 86400000)));
      const days_remaining = Math.max(0, total_days - days_elapsed);
      const target_amount = Number(t.target_amount ?? 0);
      const percentage_complete = target_amount > 0 ? (actual_amount / target_amount) * 100 : 0;
      const elapsed_frac = days_elapsed / total_days;
      const status = paceStatus(percentage_complete, elapsed_frac);
      const forecast_amount = elapsed_frac > 0 ? actual_amount / elapsed_frac : 0;
      const shortfall_amount = Math.max(0, target_amount - forecast_amount);

      const recs: string[] = [];
      if (status === "behind" || status === "critical" || status === "slightly_behind") {
        recs.push("Increase prospecting volume (internal lists only)");
        recs.push("Generate more content / social drafts");
        recs.push("Run win-back drafts on lapsed customers");
        recs.push("Follow up open proposals — drafts only");
        recs.push("Create upsell offers for top customers");
        if (status === "critical") {
          recs.push("Review pricing & offer fit with founder");
          recs.push("Reduce low-yield activity and refocus");
        }
      } else if (status === "on_track") {
        recs.push("Maintain pace; chase open renewals");
      } else {
        recs.push("Ahead of plan — protect onboarding & retention");
      }

      const snap = {
        business_id,
        revenue_target_id: t.id,
        snapshot_date: today.toISOString().slice(0, 10),
        target_amount,
        actual_amount,
        target_count: t.target_count,
        actual_count: 0,
        percentage_complete: Math.round(percentage_complete * 100) / 100,
        days_elapsed,
        days_remaining,
        pace_status: status,
        forecast_amount: Math.round(forecast_amount * 100) / 100,
        shortfall_amount: Math.round(shortfall_amount * 100) / 100,
        recommended_adjustment: recs.join(" · "),
        details: { recommendations: recs, external_action_taken: false },
      };
      snapshots.push(snap);
      recommendations.push({ target_id: t.id, target_name: t.target_name, pace_status: status, recommendations: recs });
    }

    if (dry_run || confirmation_phrase !== SAFE_PHRASE) {
      return new Response(JSON.stringify({
        dry_run: true,
        confirmation_phrase_required: SAFE_PHRASE,
        external_action_taken: false,
        snapshots_preview: snapshots,
        recommendations,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (snapshots.length) {
      const { error } = await supabase.from("revenue_goal_progress_snapshots").insert(snapshots);
      if (error) throw error;
    }

    return new Response(JSON.stringify({
      dry_run: false,
      external_action_taken: false,
      snapshots_written: snapshots.length,
      recommendations,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});