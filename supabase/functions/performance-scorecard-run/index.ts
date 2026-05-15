import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function avg(nums: number[]) {
  const xs = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (!xs.length) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return json({ error: 'unauthorized' }, 401);
    const u = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: who } = await u.auth.getUser();
    if (!who?.user) return json({ error: 'unauthorized' }, 401);
    const admin = createClient(url, svc);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', who.user.id);
    if (!(roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'founder')) return json({ error: 'forbidden' }, 403);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const businessId: string | null = body?.business_id ?? null;
    const scorecardType: string = body?.scorecard_type ?? 'weekly';
    const confirm: boolean = !!body?.confirm;

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodEnd.getDate() - (scorecardType === 'monthly' ? 30 : 7));

    const kpiQ = admin.from('business_kpis').select('*');
    const okrQ = admin.from('business_okrs').select('*');
    const { data: kpis } = await (businessId ? kpiQ.eq('business_id', businessId) : kpiQ).limit(500);
    const { data: okrs } = await (businessId ? okrQ.eq('business_id', businessId) : okrQ).limit(500);

    const k = kpis ?? [];
    const o = okrs ?? [];
    const score = (cat: string) => {
      const xs = k.filter((x: any) => x.kpi_category === cat && x.target_value && x.current_value);
      if (!xs.length) return null;
      return avg(xs.map((x: any) => Math.min(100, (Number(x.current_value) / Number(x.target_value)) * 100)));
    };
    const revenue_score = score('revenue');
    const customer_score = avg([score('retention'), score('satisfaction')].filter((x): x is number => x !== null));
    const social_score = avg([score('social'), score('content')].filter((x): x is number => x !== null));
    const operations_score = avg([score('operations'), score('delivery'), score('support')].filter((x): x is number => x !== null));
    const risks = k.filter((x: any) => x.status === 'at_risk' || x.status === 'off_track').length;
    const risk_score = Math.max(0, 100 - risks * 10);
    const overall_score = avg([revenue_score, customer_score, social_score, operations_score, risk_score].filter((x): x is number => x !== null));

    const okrProgress = avg(o.map((x: any) => Number(x.progress_score ?? 0)));
    const underperforming = k.filter((x: any) => x.target_value && x.current_value && Number(x.current_value) / Number(x.target_value) < 0.6).slice(0, 10);
    const next_actions = [
      underperforming.length > 0 && `${underperforming.length} KPI(s) under 60% of target — review owners`,
      o.filter((x: any) => x.founder_review_required && (x.progress_score ?? 0) < 50).length > 0 && `OKR review required — progress below 50%`,
      risks > 0 && `${risks} at-risk KPI(s) — escalate`,
      (okrProgress ?? 0) < 40 && `Quarterly OKR pace low (${okrProgress ?? 0}%) — re-plan key results`,
    ].filter(Boolean);

    const summaryText = `Period ${periodStart.toISOString().slice(0, 10)} → ${periodEnd.toISOString().slice(0, 10)}: overall ${overall_score ?? 'n/a'}, OKR ${okrProgress ?? 'n/a'}%, ${underperforming.length} underperforming KPI(s).`;

    let scorecard_id: string | null = null;
    if (confirm) {
      const { data: ins } = await admin
        .from('performance_scorecards')
        .insert({
          business_id: businessId,
          scorecard_period_start: periodStart.toISOString().slice(0, 10),
          scorecard_period_end: periodEnd.toISOString().slice(0, 10),
          scorecard_type: scorecardType,
          revenue_score,
          customer_score,
          social_score,
          operations_score,
          risk_score,
          overall_score,
          summary: summaryText,
          next_actions,
        })
        .select('id')
        .single();
      scorecard_id = ins?.id ?? null;
    }

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      dry_run: !confirm,
      scorecard_id,
      period: { start: periodStart, end: periodEnd, type: scorecardType },
      scores: { revenue_score, customer_score, social_score, operations_score, risk_score, overall_score, okr_progress: okrProgress },
      counts: { kpis: k.length, okrs: o.length, underperforming: underperforming.length, at_risk: risks },
      underperforming: underperforming.map((x: any) => ({ id: x.id, name: x.kpi_name, category: x.kpi_category, target: x.target_value, current: x.current_value })),
      summary: summaryText,
      next_actions,
      safety: {
        external_send: false,
        public_dashboard: false,
        financial_record_mutated: false,
        founder_approval_required_for_external: true,
      },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});