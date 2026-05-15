import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!(roles ?? []).some((r: any) => ['admin','founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(); horizon.setDate(horizon.getDate() + 30);
    const horizonIso = horizon.toISOString().slice(0, 10);
    const since = new Date(); since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();

    const costs = await safe(async () => (await admin.from('operating_cost_register').select('*').limit(1000)).data ?? [], [] as any[]);
    const usage = await safe(async () => (await admin.from('usage_credit_ledger').select('*').gte('used_at', sinceIso).order('used_at', { ascending: false }).limit(2000)).data ?? [], [] as any[]);
    const margins = await safe(async () => (await admin.from('business_margin_snapshots').select('*').order('period_end', { ascending: false }).limit(500)).data ?? [], [] as any[]);
    const businesses = await safe(async () => (await admin.from('businesses').select('id,name').limit(200)).data ?? [], [] as any[]);

    const activeCosts = costs.filter((c: any) => c.status === 'active');

    const monthly = (c: any) => {
      const a = Number(c.amount ?? 0);
      const f = String(c.billing_frequency ?? '').toLowerCase();
      if (f.includes('year') || f.includes('annual')) return a / 12;
      if (f.includes('quarter')) return a / 3;
      if (f.includes('week')) return a * 4.33;
      if (f.includes('day')) return a * 30;
      return a;
    };

    let monthlyRecurringTotal = 0;
    const byCategory: Record<string, number> = {};
    const byVendor: Record<string, number> = {};
    const byBusiness: Record<string, number> = {};
    for (const c of activeCosts) {
      const m = monthly(c);
      monthlyRecurringTotal += m;
      byCategory[c.cost_category] = (byCategory[c.cost_category] ?? 0) + m;
      const v = c.vendor_name ?? 'unknown';
      byVendor[v] = (byVendor[v] ?? 0) + m;
      const b = c.business_id ?? 'group';
      byBusiness[b] = (byBusiness[b] ?? 0) + m;
    }

    const billingDue30d = activeCosts.filter((c: any) => c.next_billing_date && c.next_billing_date >= today && c.next_billing_date <= horizonIso)
      .sort((a: any, b: any) => String(a.next_billing_date).localeCompare(String(b.next_billing_date)));
    const billingOverdue = activeCosts.filter((c: any) => c.next_billing_date && c.next_billing_date < today);
    const highSpend = [...activeCosts].sort((a: any, b: any) => monthly(b) - monthly(a)).slice(0, 10);

    // Usage last 30d
    const usageByProvider: Record<string, { credits: number; cost: number }> = {};
    let totalUsageCost = 0;
    for (const u of usage) {
      const k = u.provider_key ?? 'unknown';
      const e = usageByProvider[k] ?? { credits: 0, cost: 0 };
      e.credits += Number(u.credits_used ?? 0);
      e.cost += Number(u.estimated_cost ?? 0);
      usageByProvider[k] = e;
      totalUsageCost += Number(u.estimated_cost ?? 0);
    }

    const apolloCredits = usageByProvider['apollo']?.credits ?? 0;
    const smartleadCost = usageByProvider['smartlead']?.cost ?? 0;
    const aiCost = (usageByProvider['openai']?.cost ?? 0) + (usageByProvider['lovable_ai']?.cost ?? 0) + (usageByProvider['anthropic']?.cost ?? 0);

    // Margin
    const latestMarginByBiz = new Map<string, any>();
    for (const m of margins) {
      if (!latestMarginByBiz.has(m.business_id)) latestMarginByBiz.set(m.business_id, m);
    }
    const latestMargins = Array.from(latestMarginByBiz.values()).map((m: any) => ({
      ...m,
      business_name: businesses.find((b: any) => b.id === m.business_id)?.name ?? null,
    }));
    const negativeMargins = latestMargins.filter((m: any) => Number(m.estimated_gross_margin ?? 0) < 0);
    const lowMargins = latestMargins.filter((m: any) => {
      const rev = Number(m.revenue ?? 0);
      const gm = Number(m.estimated_gross_margin ?? 0);
      return rev > 0 && gm / rev < 0.3 && gm >= 0;
    });
    const marginRiskFlags = latestMargins.flatMap((m: any) => Array.isArray(m.risk_flags) ? m.risk_flags : []);

    const next_actions: any[] = [];
    for (const c of billingOverdue.slice(0, 5)) next_actions.push({ kind: 'billing_overdue', label: c.cost_name, vendor: c.vendor_name, due: c.next_billing_date });
    for (const c of billingDue30d.slice(0, 5)) next_actions.push({ kind: 'billing_due_30d', label: c.cost_name, vendor: c.vendor_name, due: c.next_billing_date });
    for (const m of negativeMargins.slice(0, 5)) next_actions.push({ kind: 'negative_margin', label: m.business_name ?? m.business_id, gm: m.estimated_gross_margin });
    for (const c of highSpend.slice(0, 3)) next_actions.push({ kind: 'high_monthly_spend', label: c.cost_name, vendor: c.vendor_name, monthly: +monthly(c).toFixed(2) });

    return new Response(JSON.stringify({
      ok: true,
      money_moved: false,
      paid_api_called: false,
      credits_spent: false,
      subscription_changed: false,
      ads_launched: false,
      disclaimer: 'Tracking only. No spending, no paid API calls, no subscription or ad changes performed.',
      summary: {
        active_cost_lines: activeCosts.length,
        monthly_recurring_total: +monthlyRecurringTotal.toFixed(2),
        billing_due_30d: billingDue30d.length,
        billing_overdue: billingOverdue.length,
        usage_lines_30d: usage.length,
        usage_estimated_cost_30d: +totalUsageCost.toFixed(2),
        apollo_credits_30d: apolloCredits,
        smartlead_cost_30d: +smartleadCost.toFixed(2),
        ai_cost_30d: +aiCost.toFixed(2),
        businesses_with_margin: latestMargins.length,
        negative_margins: negativeMargins.length,
        low_margins: lowMargins.length,
        margin_risk_flags: marginRiskFlags.length,
      },
      by_category: Object.entries(byCategory).map(([k, v]) => ({ category: k, monthly: +(v as number).toFixed(2) })).sort((a, b) => b.monthly - a.monthly),
      by_vendor: Object.entries(byVendor).map(([k, v]) => ({ vendor: k, monthly: +(v as number).toFixed(2) })).sort((a, b) => b.monthly - a.monthly).slice(0, 20),
      by_business: Object.entries(byBusiness).map(([k, v]) => ({ business_id: k, business_name: businesses.find((b: any) => b.id === k)?.name ?? (k === 'group' ? 'Group/HQ' : k), monthly: +(v as number).toFixed(2) })).sort((a, b) => b.monthly - a.monthly).slice(0, 20),
      usage_by_provider: Object.entries(usageByProvider).map(([k, v]) => ({ provider: k, credits: (v as any).credits, cost: +(v as any).cost.toFixed(2) })).sort((a, b) => b.cost - a.cost),
      billing_due_30d: billingDue30d.slice(0, 20),
      billing_overdue: billingOverdue.slice(0, 20),
      high_spend: highSpend.map((c: any) => ({ id: c.id, cost_name: c.cost_name, vendor_name: c.vendor_name, category: c.cost_category, monthly: +monthly(c).toFixed(2), currency: c.currency })),
      latest_margins: latestMargins.slice(0, 30),
      negative_margins: negativeMargins,
      low_margins: lowMargins,
      next_actions: next_actions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
