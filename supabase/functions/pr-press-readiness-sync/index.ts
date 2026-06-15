// Press-readiness sync. Non-destructive upsert of business_press_readiness
// rows from the canonical `businesses` table. Founder/admin only.
// No AI, no sending, no scraping. Manual readiness editing is handled in UI.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dry_run;
    const forceUpdate = !!body.force_update;
    const businessId: string | undefined = body.business_id;

    // Canonical source check: project ships a `businesses` table with id+name,
    // but no native press fields. We treat it as a *seed* source only and
    // never set is_active / website_live / press_ready_status automatically.
    let q = admin.from("businesses").select("id,name").order("name");
    if (businessId) q = q.eq("id", businessId);
    const { data: businesses, error: bErr } = await q;
    if (bErr) return json({ ok: false, reason: "businesses_query_failed", message: bErr.message }, 500);

    if (!businesses || businesses.length === 0) {
      return json({ ok: false, reason: "canonical_business_source_not_confirmed", message: "No rows in public.businesses. Use manual press-readiness records." });
    }

    const ids = businesses.map((b: any) => b.id);
    const { data: existing } = await admin.from("business_press_readiness")
      .select("id,business_id,business_name,is_active,website_live,public_offer_live,press_ready_status,compliance_clearance_status").in("business_id", ids);
    const byBiz = new Map<string, any>();
    (existing ?? []).forEach((r: any) => byBiz.set(r.business_id, r));

    const toInsert: any[] = [];
    const toUpdate: { id: string; patch: any }[] = [];
    for (const b of businesses) {
      const cur = byBiz.get(b.id);
      if (!cur) {
        toInsert.push({
          business_id: b.id,
          business_name: b.name,
          is_active: false,
          website_live: false,
          public_offer_live: false,
          press_ready_status: "not_active",
          compliance_clearance_status: "not_checked",
          missing_items: [
            "website_or_public_url","public_offer","one_line_description","50_word_description",
            "150_word_description","logo","product_or_service_images","founder_or_company_quote",
            "approved_claims","case_study_or_proof","press_contact","compliance_clearance","blocked_topic_review",
          ],
        });
      } else if (forceUpdate) {
        // Only refresh business_name if it changed. Never null out approved content.
        if (cur.business_name !== b.name && b.name) toUpdate.push({ id: cur.id, patch: { business_name: b.name } });
      }
    }

    if (dryRun) {
      return json({ ok: true, dry_run: true, businesses_seen: businesses.length, would_insert: toInsert.length, would_update: toUpdate.length });
    }

    let inserted = 0, updated = 0;
    if (toInsert.length) {
      const { error } = await admin.from("business_press_readiness").insert(toInsert);
      if (!error) inserted = toInsert.length;
    }
    for (const u of toUpdate) {
      const { error } = await admin.from("business_press_readiness").update(u.patch).eq("id", u.id);
      if (!error) updated++;
    }

    await admin.from("pr_audit_events").insert({
      event_type: "business_press_readiness_sync",
      related_type: "business_press_readiness",
      event_summary: `Seeded ${inserted}, updated ${updated} (of ${businesses.length} canonical businesses).`,
      metadata: { businesses_seen: businesses.length, inserted, updated, force_update: forceUpdate, business_id: businessId ?? null },
    });

    return json({ ok: true, businesses_seen: businesses.length, inserted, updated });
  } catch (e: any) {
    return json({ ok: false, reason: "exception", message: String(e?.message ?? e) }, 500);
  }
});