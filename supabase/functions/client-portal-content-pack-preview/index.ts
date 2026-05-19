import { corsHeaders, json, requireFounder, audit, requireConfirmation, SAFETY, detectGaps } from '../_shared/customerSuccessLogic.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const auth = await requireFounder(req);
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => ({}));
  const proposed = { kind: 'portal_content_pack', business_id: body?.business_id ?? null, ...body };
  const gaps = detectGaps(body);
  return json({ ok: true, dry_run: true, no_records_mutated: true, proposed, gaps, missing_information: gaps, risk_warnings: [], ...SAFETY });
});
