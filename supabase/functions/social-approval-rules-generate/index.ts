import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
const SENSITIVE = ["health","finance","legal","crypto","gambling","alcohol","cbd","supplement","children"];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(()=>({}));
  const business_id = body.business_id; if (!business_id) return json({ok:false,error:"business_id_required"},400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== "CREATE SOCIAL APPROVAL RULES") return json({ok:false,error:"confirmation_required"},400);

  const { data: biz } = await a.admin.from("businesses").select("name, business_type, sector").eq("id", business_id).maybeSingle();
  const sector = `${biz?.business_type ?? ""} ${biz?.sector ?? ""}`.toLowerCase();
  const isSensitive = SENSITIVE.some((s)=>sector.includes(s));

  const proposed = [
    { business_id, rule_name:"Default content approval", rule_type:"content", applies_to:["content_item","content_variant","content_pack"], risk_threshold:"medium", founder_approval_required:true, legal_review_required:isSensitive, is_test_data:!!body.is_test_data },
    { business_id, rule_name:"Calendar item approval", rule_type:"calendar", applies_to:["calendar_item"], risk_threshold:"medium", founder_approval_required:true, is_test_data:!!body.is_test_data },
    { business_id, rule_name:"Asset rights gate", rule_type:"asset", applies_to:["asset","content_item","calendar_item"], risk_threshold:"high", auto_block_if_rights_unknown:true, auto_block_if_asset_blocked:true, is_test_data:!!body.is_test_data },
    { business_id, rule_name:"Compliance gate", rule_type:"compliance", applies_to:["content_item","calendar_item","reply_job"], risk_threshold:"high", auto_block_if_compliance_blocked:true, auto_block_if_claim_unverified:true, is_test_data:!!body.is_test_data },
    { business_id, rule_name:"Reply/DM approval", rule_type:"reply", applies_to:["reply_job","dm"], risk_threshold:"medium", founder_approval_required:true, is_test_data:!!body.is_test_data },
  ];
  if (isSensitive) proposed.push({ business_id, rule_name:`Regulated sector strict rules (${sector.trim()})`, rule_type:"regulated_sector", applies_to:["content_item","content_variant","calendar_item","reply_job","campaign"], risk_threshold:"low", founder_approval_required:true, legal_review_required:true, auto_block_if_claim_unverified:true, auto_block_if_compliance_blocked:true, is_test_data:!!body.is_test_data } as any);

  if (dry_run) return json({ ok:true, dry_run:true, no_records_mutated:true, proposed, is_sensitive_sector:isSensitive });
  const { data, error } = await a.admin.from("social_approval_rules").insert(proposed).select("id");
  if (error) return json({ok:false,error:error.message},500);
  return json({ ok:true, created: data?.length ?? 0, no_external_action:true });
});
