import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const RISKY_PATTERNS: Array<{ rx: RegExp; flag: string }> = [
  { rx: /\bguarante\w*|\bpromis\w*\s+(?:results|roi|revenue|growth)/i, flag: 'unsupported_guarantee' },
  { rx: /\b\d+\s*%\s*(?:roi|growth|increase|uplift|revenue|conversion)/i, flag: 'unsupported_metric_claim' },
  { rx: /\b(?:certified|accredited|fda[- ]approved|gdpr[- ]certified|iso[- ]9001)\b/i, flag: 'unverified_credential' },
  { rx: /\b(?:tax|legal|medical|investment)\s+(?:advice|opinion|recommendation)\b/i, flag: 'regulated_advice' },
  { rx: /\b(?:competitor|rival)\b.*?\b(?:bad|worse|fail|inferior|scam)\b/i, flag: 'competitor_disparagement' },
  { rx: /\b(?:password|api[_ ]?key|secret|token|ssn|social\s+security)\b/i, flag: 'sensitive_info_exposure' },
  { rx: /\$\s?\d{3,}(?:[.,]\d+)?(?:\s*(?:per|\/)\s*(?:month|year|user))?/i, flag: 'price_quote_in_draft' },
  { rx: /\b(?:will|shall)\s+(?:absolutely|definitely|certainly)\b/i, flag: 'absolute_assertion' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    const internalKey = req.headers.get('x-liftor-internal') ?? '';
    const trustedInternal = internalKey && internalKey === Deno.env.get('LIFTOR_INTERNAL_KEY');
    let allowed = false;
    if (user) {
      const admin0 = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: roles } = await admin0.from('user_roles').select('role').eq('user_id', user.id);
      allowed = (roles ?? []).some((r: any) => ['admin','founder'].includes(r.role));
    }
    if (!allowed && !trustedInternal) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json().catch(() => ({}));
    const {
      business_id = null, contact_id = null, agent_key = null,
      source_table = null, source_id = null, draft_type = 'unknown',
      draft_text = '', subject = '', context_used = [], knowledge_refs = [],
      crm_context_loaded = false, customer_memory_loaded = false,
      tone_target = 'professional', dry_run = false,
    } = body;

    const text = String(draft_text ?? '');
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: 'draft_text required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Risk pattern detection
    const risk_flags: string[] = [];
    const unsupported_claims: string[] = [];
    for (const { rx, flag } of RISKY_PATTERNS) {
      const m = text.match(rx);
      if (m) {
        risk_flags.push(flag);
        if (['unsupported_guarantee','unsupported_metric_claim','unverified_credential','absolute_assertion'].includes(flag)) {
          unsupported_claims.push(m[0].slice(0, 160));
        }
      }
    }

    // Customer/CRM context check
    const missing_context: string[] = [];
    if (!crm_context_loaded) missing_context.push('crm_context');
    if (!customer_memory_loaded) missing_context.push('customer_memory');
    if (!Array.isArray(knowledge_refs) || knowledge_refs.length === 0) missing_context.push('knowledge_citations');
    if (contact_id && !crm_context_loaded) risk_flags.push('contact_without_crm_lookup');

    // Pull contact memory snapshot if available (read-only)
    if (contact_id) {
      try {
        const { data: c } = await admin.from('contacts').select('id,full_name,company_name,last_engaged_at,custom_fields').eq('id', contact_id).maybeSingle();
        if (!c) missing_context.push('contact_record_not_found');
      } catch { /* tolerate */ }
    }

    // Heuristic scoring (0-100)
    const groundingPenalty = (Array.isArray(knowledge_refs) ? Math.max(0, 30 - knowledge_refs.length * 10) : 30);
    const contextPenalty = (crm_context_loaded ? 0 : 25) + (customer_memory_loaded ? 0 : 20);
    const claimPenalty = unsupported_claims.length * 18;
    const riskPenalty = risk_flags.length * 8;
    const lengthPenalty = text.length < 80 ? 15 : text.length > 4000 ? 10 : 0;

    const grounding_score = Math.max(0, 100 - groundingPenalty - claimPenalty);
    const customer_context_score = Math.max(0, 100 - contextPenalty);
    const compliance_score = Math.max(0, 100 - riskPenalty - claimPenalty);
    const tone_score = /\b(?:hey|yo|lol|wtf|sucks|crap)\b/i.test(text) && tone_target !== 'casual' ? 55 : 85;
    const quality_score = Math.round((grounding_score * 0.3 + customer_context_score * 0.3 + compliance_score * 0.25 + tone_score * 0.15) - lengthPenalty);

    const seriousRisk =
      unsupported_claims.length > 0 ||
      risk_flags.some((f) => ['regulated_advice','sensitive_info_exposure','competitor_disparagement','price_quote_in_draft'].includes(f)) ||
      missing_context.length > 0 ||
      compliance_score < 70 ||
      grounding_score < 60 ||
      quality_score < 70;

    const founder_review_required = true; // always
    const approved_for_customer_view = false; // never auto-approve
    const recommended_fix =
      missing_context.length ? `Load ${missing_context.join(', ')} before sending to founder review.` :
      unsupported_claims.length ? `Remove or evidence claims: ${unsupported_claims.slice(0,2).join(' | ')}.` :
      risk_flags.length ? `Address risk flags: ${risk_flags.slice(0,3).join(', ')}.` :
      quality_score < 80 ? 'Strengthen citations and tighten copy before founder review.' :
      'Draft acceptable; awaits founder approval.';

    let inserted: any = null;
    if (!dry_run) {
      const { data, error } = await admin.from('ai_draft_quality_reviews').insert({
        business_id, contact_id, agent_key, source_table, source_id, draft_type,
        quality_score, grounding_score, tone_score, compliance_score, customer_context_score,
        unsupported_claims, missing_context, risk_flags, recommended_fix,
        founder_review_required, approved_for_customer_view,
      }).select('id').maybeSingle();
      if (error) throw error;
      inserted = data;
    }

    return new Response(JSON.stringify({
      ok: true,
      external_send_performed: false,
      published: false,
      review_id: inserted?.id ?? null,
      block_customer_view: seriousRisk,
      founder_review_required,
      approved_for_customer_view,
      scores: { quality_score, grounding_score, tone_score, compliance_score, customer_context_score },
      unsupported_claims, missing_context, risk_flags, recommended_fix,
      disclaimer: 'Quality check only. Draft is NOT sent or published. Founder approval required for any customer-facing use.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
