import { createClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export const SAFETY = {
  no_external_action: true,
  external_api_calls: 0,
  customer_messages_sent: 0,
  portal_accounts_created: 0,
  portal_invites_sent: 0,
  surveys_sent: 0,
  reports_shared: 0,
  payments_created: 0,
  subscriptions_changed: 0,
  fake_customer_data_created: 0,
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

export async function requireFounder(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { ok: false as const, res: json({ error: 'unauthorized' }, 401) };
  const admin = adminClient();
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  const ok = (roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'founder');
  if (!ok) return { ok: false as const, res: json({ error: 'forbidden' }, 403) };
  return { ok: true as const, user, admin };
}

export async function audit(admin: any, row: Record<string, any>) {
  try {
    await admin.from('customer_success_audit').insert({
      external_api_calls: 0,
      customer_messages_sent: 0,
      portal_accounts_created: 0,
      portal_invites_sent: 0,
      surveys_sent: 0,
      reports_shared: 0,
      payments_created: 0,
      subscriptions_changed: 0,
      fake_customer_data_created: 0,
      ...row,
    });
  } catch (_) { /* audit best-effort */ }
}

export function requireConfirmation(body: any, phrase: string) {
  if (body?.dry_run !== false) return { dry_run: true };
  if ((body?.confirmation ?? '') !== phrase) {
    return { error: json({ error: 'confirmation_required', expected: phrase }, 400) };
  }
  return { confirmed: true };
}

export function detectGaps(profile: any): string[] {
  const gaps: string[] = [];
  if (!profile?.customer_goal) gaps.push('customer_goal_missing');
  if (!profile?.purchased_offer) gaps.push('purchased_offer_missing');
  if (!profile?.start_date) gaps.push('start_date_missing');
  if (!profile?.renewal_date) gaps.push('renewal_date_missing');
  if (!profile?.customer_email && !profile?.customer_name) gaps.push('contact_route_missing');
  return gaps;
}