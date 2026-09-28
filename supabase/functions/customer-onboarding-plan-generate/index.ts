import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE CUSTOMER ONBOARDING PLAN';

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
    if (!(roles ?? []).some((r: any) => ['admin', 'founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { business_id, contact_id, deal_id, proposal_id, organisation_id, onboarding_type, dry_run = true, confirmation } = body ?? {};
    if (!contact_id) return new Response(JSON.stringify({ error: 'contact_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!business_id) return new Response(JSON.stringify({ error: 'business_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const businessResult = await admin.from('businesses').select('id,name').eq('id', business_id).maybeSingle();
    if (businessResult.error || !businessResult.data) return new Response(JSON.stringify({ error: 'business_context_invalid' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const contactResult = await admin.from('contacts').select('id,name,email,company,status').eq('id', contact_id).maybeSingle();
    if (contactResult.error || !contactResult.data) return new Response(JSON.stringify({ error: 'contact_not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const contact = contactResult.data;
    const relationshipResult = await admin.from('business_contact_relationships')
      .select('id,contact_id,business_id').eq('contact_id', contact_id).eq('business_id', business_id).limit(2);
    if (relationshipResult.error) return new Response(JSON.stringify({ error: 'business_contact_relationship_unavailable' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if ((relationshipResult.data ?? []).length !== 1) return new Response(JSON.stringify({ error: relationshipResult.data?.length ? 'ambiguous_business_contact_relationship' : 'business_contact_relationship_required' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const relationship = relationshipResult.data[0];
    const memory = await safe(async () => (await admin.from('customer_memory_profiles').select('*').eq('contact_id', contact_id).eq('business_id', business_id).maybeSingle()).data, null as any);
    const proposalResult = proposal_id ? await admin.from('proposals').select('*').eq('id', proposal_id).eq('business_id', business_id).maybeSingle() : null;
    if (proposal_id && (proposalResult?.error || !proposalResult?.data)) return new Response(JSON.stringify({ error: 'proposal_business_context_mismatch' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const proposal = proposalResult?.data ?? null;
    const dealResult = deal_id ? await admin.from('deals').select('*').eq('id', deal_id).eq('business_id', business_id).maybeSingle() : null;
    if (deal_id && (dealResult?.error || !dealResult?.data)) return new Response(JSON.stringify({ error: 'deal_business_context_mismatch' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const deal = dealResult?.data ?? null;
    const surveys = await safe(async () => (await admin.from('customer_survey_responses').select('csat_score,nps_score,key_needs').eq('contact_id', contact_id).eq('business_id', business_id).limit(20)).data ?? [], [] as any[]);
    const support = await safe(async () => (await admin.from('support_interaction_reviews').select('severity,theme').eq('contact_id', contact_id).eq('business_id', business_id).limit(20)).data ?? [], [] as any[]);
    const successPlans = await safe(async () => (await admin.from('customer_success_plans').select('next_best_actions,risks').eq('contact_id', contact_id).eq('business_id', business_id).limit(5)).data ?? [], [] as any[]);
    const businessProfile = await safe(async () => (await admin.from('business_knowledge_profiles').select('*').eq('business_id', business_id).maybeSingle()).data, null as any);

    const customerName = contact?.name ?? 'there';
    const customerCompany = contact?.company ?? '';
    const goal = (Array.isArray(memory?.key_needs) && memory.key_needs[0]) || (Array.isArray(surveys?.[0]?.key_needs) && surveys[0].key_needs[0]) || (proposal?.summary ?? deal?.title ?? 'Achieve measurable outcomes from your engagement with us.');

    const customerActions = [
      { title: 'Confirm primary point of contact', due_in_days: 2 },
      { title: 'Share access to required tools/accounts', due_in_days: 5 },
      { title: 'Confirm success criteria for the first 30 days', due_in_days: 7 },
    ];
    const companyActions = [
      { title: 'Send welcome pack', due_in_days: 1 },
      { title: 'Schedule kick-off call', due_in_days: 3 },
      { title: 'Configure customer environment', due_in_days: 7 },
      { title: 'First check-in call', due_in_days: 14 },
    ];
    const milestones = [
      { name: 'Kick-off complete', day: 3 },
      { name: 'Environment configured', day: 7 },
      { name: 'First value delivered', day: 14 },
      { name: 'Bedding-in review', day: 30 },
    ];
    const checkInSchedule = [
      { type: 'kick_off', day: 3 },
      { type: 'first_check_in', day: 14 },
      { type: 'bedding_in_review', day: 30 },
      { type: 'quarterly_review', day: 90 },
    ];
    const timeline = [
      { phase: 'Welcome', start_day: 0, end_day: 3 },
      { phase: 'Setup', start_day: 3, end_day: 14 },
      { phase: 'Bedding-in', start_day: 14, end_day: 30 },
      { phase: 'Steady state', start_day: 30, end_day: 90 },
    ];
    const risks: string[] = [];
    if (Array.isArray(memory?.risk_flags)) for (const r of memory.risk_flags) risks.push(String(r));
    if (support.some((s: any) => (s.severity ?? '').toLowerCase() === 'high')) risks.push('open_high_severity_support');
    if (Array.isArray(successPlans?.[0]?.risks)) for (const r of successPlans[0].risks) risks.push(String(r));

    const supportRoute = `Reply to your welcome email or use the customer portal. Founder oversight: yes. SLA: same business day.`;
    const customerFacingInstructions = `Welcome ${customerCompany ? `${customerName} at ${customerCompany}` : customerName}. Over the next 30 days we will: 1) hold a kick-off, 2) configure your environment, 3) deliver first value, 4) review bedding-in. You will receive guided check-ins, instructions and a portal link. Reply any time — your account manager and our founder are looped in.`;
    const internalNotes = `Internal: ${surveys.length} survey responses, ${support.length} support reviews, ${successPlans.length} success plans on file. Memory key needs: ${(memory?.key_needs ?? []).join(', ') || 'none'}. Business profile present: ${businessProfile ? 'yes' : 'no'}.`;
    const welcomeSummary = `Welcome pack for ${customerName}: goal — ${goal}. First 30 days: kick-off, setup, bedding-in.`;

    const planRow = {
      business_id,
      business_contact_relationship_id: relationship.id,
      contact_id,
      organisation_id: organisation_id ?? null,
      deal_id: deal_id ?? null,
      proposal_id: proposal_id ?? null,
      onboarding_status: 'draft',
      onboarding_type: onboarding_type ?? (deal ? 'deal_onboarding' : proposal ? 'proposal_onboarding' : 'standard'),
      customer_goal: goal,
      success_definition: `Customer reports satisfaction ≥ 4/5 by day 30 and confirms first value delivered.`,
      welcome_summary: welcomeSummary,
      internal_notes: internalNotes,
      customer_facing_instructions: customerFacingInstructions,
      key_contacts: [{ role: 'account_manager', name: 'Liftor Account Team' }, { role: 'founder', name: 'Mandy King' }],
      required_customer_actions: customerActions,
      required_company_actions: companyActions,
      timeline,
      milestones,
      check_in_schedule: checkInSchedule,
      support_route: supportRoute,
      risks,
      owner_agent_key: 'customer_success_agent',
      founder_review_required: true,
      customer_share_allowed: false,
      metadata: { sources: { proposal: !!proposal, deal: !!deal, memory: !!memory, surveys: surveys.length, support: support.length, success_plans: successPlans.length, business_profile: !!businessProfile } },
    };

    const welcomeEmail = {
      draft_type: 'welcome_email',
      draft_subject: `Welcome to Liftor, ${customerName}`,
      draft_body: `Hi ${customerName},\n\nThank you for choosing Liftor. ${customerFacingInstructions}\n\nYou'll hear from us within 1 business day to schedule the kick-off. If you need anything sooner, simply reply to this email.\n\n— Liftor`,
      customer_facing: true,
      approval_status: 'draft',
      send_allowed: false,
      founder_review_required: true,
    };
    const beddingInEmail = {
      draft_type: 'bedding_in_email',
      draft_subject: `Your first 30 days with Liftor`,
      draft_body: `Hi ${customerName},\n\nWe're now into your bedding-in phase. Here's what to expect: weekly check-ins, milestone reviews and a clear support route. Reply with any questions — we're with you.\n\n— Liftor`,
      customer_facing: true,
      approval_status: 'draft',
      send_allowed: false,
      founder_review_required: true,
    };

    if (dry_run !== false) {
      return new Response(JSON.stringify({ dry_run: true, plan_preview: planRow, email_drafts_preview: [welcomeEmail, beddingInEmail], external_send: false, confirmation_required: CONFIRM }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (confirmation !== CONFIRM) {
      return new Response(JSON.stringify({ error: 'confirmation_required', expected: CONFIRM }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Upsert plan (unique business+contact+deal)
    let existingQuery = admin.from('customer_onboarding_plans').select('id').eq('contact_id', contact_id).eq('business_id', business_id);
    existingQuery = deal_id ? existingQuery.eq('deal_id', deal_id) : existingQuery.is('deal_id', null);
    const existing = await existingQuery.maybeSingle();
    let planId: string;
    if (existing.data?.id) {
      const { data, error } = await admin.from('customer_onboarding_plans').update(planRow).eq('id', existing.data.id).select('*').single();
      if (error) throw error; planId = data.id;
    } else {
      const { data, error } = await admin.from('customer_onboarding_plans').insert(planRow).select('*').single();
      if (error) throw error; planId = data.id;
    }

    const taskRows = [
      ...customerActions.map((a, i) => ({ idempotency_key: `onboarding:${planId}:customer:${i}`, onboarding_plan_id: planId, business_id: planRow.business_id, business_contact_relationship_id: relationship.id, contact_id, task_owner: 'customer', task_title: a.title, customer_visible: true, founder_review_required: false })),
      ...companyActions.map((a, i) => ({ idempotency_key: `onboarding:${planId}:company:${i}`, onboarding_plan_id: planId, business_id: planRow.business_id, business_contact_relationship_id: relationship.id, contact_id, task_owner: 'company', owner_agent_key: 'customer_success_agent', task_title: a.title, customer_visible: false, founder_review_required: false })),
    ];
    const taskResult = await admin.from('customer_onboarding_tasks').upsert(taskRows, { onConflict: 'idempotency_key' });
    if (taskResult.error) throw taskResult.error;

    const emailDraftResult = await admin.from('onboarding_email_drafts').upsert([
      { ...welcomeEmail, idempotency_key: `onboarding:${planId}:email:welcome`, business_id: planRow.business_id, business_contact_relationship_id: relationship.id, contact_id, onboarding_plan_id: planId },
      { ...beddingInEmail, idempotency_key: `onboarding:${planId}:email:bedding`, business_id: planRow.business_id, business_contact_relationship_id: relationship.id, contact_id, onboarding_plan_id: planId },
    ], { onConflict: 'idempotency_key' });
    if (emailDraftResult.error) throw emailDraftResult.error;

    // Try founder approval queue if it exists
    try {
      await admin.from('founder_approval_items').insert({
        item_type: 'customer_onboarding_plan',
        target_table: 'customer_onboarding_plans',
        target_id: planId,
        status: 'pending',
        metadata: { contact_id, business_id: planRow.business_id },
      });
    } catch { /* table optional */ }

    return new Response(JSON.stringify({ plan_id: planId, external_send: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
