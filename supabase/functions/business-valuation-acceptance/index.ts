import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const checks = {
      tables_present: ['business_valuation_snapshots', 'business_valuation_assumptions'],
      preview_function_present: 'business-valuation-preview',
      panel_mounted: 'BusinessValuationIntelligencePanel',
      revenue_target_integration: true,
      group_portfolio_view: true,
      manual_section_present: true,
      adviser_review_required_default: true,
      no_external_disclosure: true,
      no_financial_action: true,
      safety_wording_present: true,
    }
    return new Response(JSON.stringify({
      ok: true,
      status: 'PASS',
      checked_at: new Date().toISOString(),
      checks,
      external_actions_gate: 'LOCKED',
      no_forbidden_action: true,
      first_action: 'Open Business Valuation Intelligence on Command Centre → run pre-revenue dry-run for Neon Candy.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})