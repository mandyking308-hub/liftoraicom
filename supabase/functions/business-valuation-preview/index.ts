import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SAFETY_NOTE = 'Indicative internal estimate only. Not financial advice. Adviser review required before relying on this for investment, sale, tax, lending or legal decisions.'

type Stage = 'pre_revenue' | 'post_revenue' | 'profit_based' | 'recurring_revenue' | 'asset_based' | 'strategic_buyer' | 'exit_readiness' | 'group_portfolio'

function range(low: number, base: number, high: number) {
  return { low: Math.max(0, Math.round(low)), base: Math.max(0, Math.round(base)), high: Math.max(0, Math.round(high)) }
}

function preRevenue(input: any) {
  // Cost-to-recreate + IP + audience + automation + strategic value, with risk discount
  const costToRecreate = Number(input.cost_to_recreate ?? 25000)
  const ipScore = Number(input.ip_strength_score ?? 0.4) // 0..1
  const audienceScore = Number(input.audience_score ?? 0.2)
  const automationScore = Number(input.automation_score ?? 0.5)
  const strategicScore = Number(input.strategic_score ?? 0.3)
  const riskDiscount = Number(input.risk_discount ?? 0.4) // 0..1 reduces value
  const raw = costToRecreate + 80000 * ipScore + 120000 * audienceScore + 60000 * automationScore + 100000 * strategicScore
  const adjusted = raw * (1 - riskDiscount)
  return {
    method: 'pre_revenue_potential_and_assets',
    multiples: { low: null, base: null, high: null },
    ...range(adjusted * 0.4, adjusted, adjusted * 1.6),
  }
}

function postRevenue(input: any) {
  const revenue = Number(input.revenue_amount ?? 0)
  const growth = Number(input.growth_rate ?? 0) // e.g. 0.5 = 50% YoY
  const recurringPct = Number(input.recurring_revenue_pct ?? 0)
  // Revenue multiple: SaaS-ish 2x–8x; service 0.5x–2x. Bias on recurring + growth.
  const baseMult = 1 + 3 * recurringPct + 2 * Math.min(growth, 1)
  const lowMult = baseMult * 0.6
  const highMult = baseMult * 1.6
  return {
    method: 'post_revenue_multiple',
    multiples: { low: lowMult, base: baseMult, high: highMult },
    ...range(revenue * lowMult, revenue * baseMult, revenue * highMult),
  }
}

function profitBased(input: any) {
  const ebitda = Number(input.ebitda ?? input.net_profit ?? 0)
  const ownerDep = Number(input.founder_dependency_score ?? 0.7) // 1 = fully dependent
  const sustainability = Number(input.sustainability_score ?? 0.5)
  // SDE/EBITDA multiple 2x–6x; reduce when owner-dependent
  const baseMult = (3 + 2 * sustainability) * (1 - 0.4 * ownerDep)
  const lowMult = baseMult * 0.7
  const highMult = baseMult * 1.4
  return {
    method: 'profit_ebitda_multiple',
    multiples: { low: lowMult, base: baseMult, high: highMult },
    ...range(ebitda * lowMult, ebitda * baseMult, ebitda * highMult),
  }
}

function recurringRevenue(input: any) {
  const arr = Number(input.annual_recurring_revenue ?? (Number(input.monthly_recurring_revenue ?? 0) * 12))
  const churn = Number(input.churn_rate ?? 0.1) // monthly
  const grossMargin = Number(input.gross_margin ?? 0.6)
  // ARR multiple bands by churn quality and margin
  const churnPenalty = Math.max(0, churn - 0.02) * 10 // each pt above 2% reduces multiple
  const baseMult = Math.max(1, 4 + 4 * grossMargin - churnPenalty)
  return {
    method: 'arr_multiple',
    multiples: { low: baseMult * 0.6, base: baseMult, high: baseMult * 1.5 },
    ...range(arr * baseMult * 0.6, arr * baseMult, arr * baseMult * 1.5),
  }
}

function assetBased(input: any) {
  const tangible = Number(input.tangible_assets ?? 0)
  const ip = Number(input.ip_value ?? 0)
  const inventory = Number(input.inventory_value ?? 0)
  const liabilities = Number(input.liabilities ?? 0)
  const base = tangible + ip + inventory - liabilities
  return { method: 'asset_book_value', multiples: { low: null, base: null, high: null }, ...range(base * 0.7, base, base * 1.2) }
}

function strategicBuyer(input: any) {
  const post = postRevenue(input)
  // Strategic premium 30–80%
  return {
    method: 'strategic_buyer_premium',
    multiples: post.multiples,
    ...range(post.low * 1.3, post.base * 1.5, post.high * 1.8),
  }
}

function exitReadiness(input: any) {
  const checklist = [
    'revenue_proof','profit_proof','recurring_revenue','clean_crm','customer_contracts',
    'low_churn','transferable_operations','low_founder_dependency','clean_ip_ownership',
    'supplier_delivery_system','documented_sops','legal_compliance_clean','financial_reporting_clean',
    'growth_pipeline','buyer_investor_narrative',
  ]
  const state = input.exit_checklist ?? {}
  const items = checklist.map(k => ({ key: k, ready: !!state[k] }))
  const score = items.filter(i => i.ready).length / checklist.length
  return { method: 'exit_readiness_checklist', items, score, ready_pct: Math.round(score * 100) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'founder').maybeSingle()
    if (!roleRow) return new Response(JSON.stringify({ error: 'founder role required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const stage: Stage = (body.stage ?? 'pre_revenue') as Stage
    const input = body.input ?? {}
    const persist: boolean = body.persist === true
    const business_id: string | undefined = body.business_id
    const target = body.target ?? null // optional revenue target context

    let result: any
    switch (stage) {
      case 'pre_revenue': result = preRevenue(input); break
      case 'post_revenue': result = postRevenue(input); break
      case 'profit_based': result = profitBased(input); break
      case 'recurring_revenue': result = recurringRevenue(input); break
      case 'asset_based': result = assetBased(input); break
      case 'strategic_buyer': result = strategicBuyer(input); break
      case 'exit_readiness': result = exitReadiness(input); break
      case 'group_portfolio': {
        const list: any[] = Array.isArray(body.businesses) ? body.businesses : []
        const summed = list.reduce((acc, b) => {
          const r = b.range ?? { low: 0, base: 0, high: 0 }
          acc.low += Number(r.low ?? 0); acc.base += Number(r.base ?? 0); acc.high += Number(r.high ?? 0)
          return acc
        }, { low: 0, base: 0, high: 0 })
        const groupDiscount = 0.15
        const sharedInfraPremium = 0.1
        const adj = (1 - groupDiscount + sharedInfraPremium)
        result = {
          method: 'group_portfolio_aggregate',
          per_business: list,
          group_discount: groupDiscount,
          shared_infra_premium: sharedInfraPremium,
          ...range(summed.low * adj, summed.base * adj, summed.high * adj),
        }
        break
      }
      default:
        return new Response(JSON.stringify({ error: `unknown stage: ${stage}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Revenue target projection
    let target_projection: any = null
    if (target?.monthly_revenue_target) {
      const monthly = Number(target.monthly_revenue_target)
      const annual = monthly * 12
      const projected = postRevenue({ revenue_amount: annual, growth_rate: 0.3, recurring_revenue_pct: target.recurring_revenue_pct ?? 0.5 })
      target_projection = {
        monthly_revenue_target: monthly,
        annualised_revenue_target: annual,
        projected_post_revenue_value: projected,
        note: 'Projection assumes target is sustained for 12 months. Indicative only.',
      }
    }

    const confidence_level = stage === 'pre_revenue' ? 'low' : stage === 'asset_based' ? 'medium' : 'medium'
    const blockers: string[] = []
    if (stage === 'post_revenue' && !input.revenue_amount) blockers.push('no_revenue_data')
    if (stage === 'profit_based' && !input.ebitda && !input.net_profit) blockers.push('no_profit_data')
    if (stage === 'recurring_revenue' && !input.monthly_recurring_revenue && !input.annual_recurring_revenue) blockers.push('no_subscription_data')

    let saved_id: string | null = null
    if (persist && business_id) {
      const { data: ins, error } = await supabase.from('business_valuation_snapshots').insert({
        business_id,
        valuation_stage: stage,
        valuation_method: result.method,
        low_estimate: result.low ?? null,
        base_estimate: result.base ?? null,
        high_estimate: result.high ?? null,
        currency: input.currency ?? 'GBP',
        revenue_amount: input.revenue_amount ?? null,
        gross_profit: input.gross_profit ?? null,
        net_profit: input.net_profit ?? null,
        ebitda: input.ebitda ?? null,
        monthly_recurring_revenue: input.monthly_recurring_revenue ?? null,
        annual_recurring_revenue: input.annual_recurring_revenue ?? null,
        customer_count: input.customer_count ?? null,
        active_subscriptions: input.active_subscriptions ?? null,
        churn_rate: input.churn_rate ?? null,
        gross_margin: input.gross_margin ?? null,
        growth_rate: input.growth_rate ?? null,
        valuation_multiple_low: result.multiples?.low ?? null,
        valuation_multiple_base: result.multiples?.base ?? null,
        valuation_multiple_high: result.multiples?.high ?? null,
        confidence_level,
        assumptions: input,
        blockers,
        adviser_review_required: true,
        founder_notes: body.founder_notes ?? null,
      }).select('id').maybeSingle()
      if (error) throw error
      saved_id = ins?.id ?? null
    }

    return new Response(JSON.stringify({
      ok: true,
      stage,
      result,
      target_projection,
      confidence_level,
      blockers,
      adviser_review_required: true,
      currency: input.currency ?? 'GBP',
      safety_note: SAFETY_NOTE,
      external_disclosure: false,
      saved_id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})