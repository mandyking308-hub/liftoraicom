import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE CUSTOMER SURVEY REQUEST';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    const isFounder = (roles ?? []).some((r: any) => ['admin','founder'].includes(r.role));
    if (!isFounder) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { business_id, contact_id, conversation_id, proposal_id, demo_access_id, deal_id, invoice_id, assignment_id, support_review_id,
            trigger_event, survey_type, dry_run = true, confirmation } = body ?? {};

    // Pick template: business-scoped match first, then global
    const { data: tmplBiz } = await admin.from('customer_survey_templates').select('*').eq('active', true)
      .eq('business_id', business_id ?? null).eq('survey_type', survey_type ?? '').limit(1);
    let template = tmplBiz?.[0];
    if (!template) {
      const { data: tmplGlobal } = await admin.from('customer_survey_templates').select('*').eq('active', true)
        .is('business_id', null).eq('survey_type', survey_type ?? 'post_interaction_csat').limit(1);
      template = tmplGlobal?.[0];
    }
    if (!template) return new Response(JSON.stringify({ error: 'no template found for survey_type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const previewQuestions = template.questions ?? [];

    if (dry_run || confirmation !== CONFIRM) {
      return new Response(JSON.stringify({
        dry_run: true,
        template: { id: template.id, name: template.template_name, survey_type: template.survey_type },
        proposed_questions: previewQuestions,
        send_allowed: false,
        note: `Provide confirmation: "${CONFIRM}" with dry_run=false to create the request. No external send will occur.`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: created, error } = await admin.from('customer_survey_requests').insert({
      business_id, contact_id, conversation_id, proposal_id, demo_access_id, deal_id, invoice_id, assignment_id, support_review_id,
      template_id: template.id,
      request_status: 'pending_approval',
      send_allowed: false,
      founder_approval_required: true,
      metadata: { trigger_event, survey_type: template.survey_type },
    }).select('*').single();
    if (error) throw error;

    // Best-effort approval item
    try {
      await admin.from('founder_approvals').insert({
        approval_type: 'survey_send',
        target_table: 'customer_survey_requests',
        target_id: created.id,
        business_id,
        status: 'pending',
        metadata: { template_id: template.id, survey_type: template.survey_type },
      });
    } catch { /* table may not exist */ }

    return new Response(JSON.stringify({
      created: true,
      request: created,
      proposed_questions: previewQuestions,
      survey_link_preview: `/survey/${created.survey_token}`,
      send_allowed: false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});