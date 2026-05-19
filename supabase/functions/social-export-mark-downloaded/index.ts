import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
const PHRASE = "MARK SOCIAL EXPORT DOWNLOADED";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, export_batch_id, dry_run = true, confirmation_phrase } = body;
  if (!business_id || !export_batch_id) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true });
  }
  await a.admin.from("social_manual_export_batches").update({ export_status: "downloaded" }).eq("id", export_batch_id).eq("business_id", business_id);
  await a.admin.from("social_scheduler_export_audit").insert({
    business_id, export_batch_id, action: "export_marked_downloaded", action_status: "recorded", provider_calls: 0,
  });
  return json({ ok: true, no_external_action: true });
});
