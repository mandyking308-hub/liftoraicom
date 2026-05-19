import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(()=>({}));
  const business_id = body.business_id; if (!business_id) return json({ok:false,error:"business_id_required"},400);
  const { data: r } = await a.admin.from("social_approval_reviews").select("*").eq("id", body.review_id).eq("business_id", business_id).maybeSingle();
  if (!r) return json({ ok:false, error:"review_not_found" }, 404);
  const decision = body.decision;
  const blocked = (r.approval_blockers ?? []).length > 0;
  const compliance_blocked = r.compliance_status === "blocked";
  const rights_blocked = r.rights_status === "blocked" || r.asset_status === "rights_review_required";
  const asset_blocked = r.asset_status === "blocked" || r.asset_status === "missing";
  const critical = r.risk_level === "critical";

  let approval_allowed = true;
  const reasons: string[] = [];
  if (decision === "approve") {
    if (compliance_blocked) { approval_allowed = false; reasons.push("compliance_blocked"); }
    if (rights_blocked) { approval_allowed = false; reasons.push("rights_blocked"); }
    if (asset_blocked) { approval_allowed = false; reasons.push("asset_blocked"); }
    if (critical) { approval_allowed = false; reasons.push("critical_risk_requires_override"); }
  }
  const proposed_status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : decision === "needs_edit" ? "needs_edit" : decision === "park" ? "parked" : decision === "escalate" ? "escalated" : decision === "block" ? "blocked" : r.review_status;
  return json({ ok:true, no_records_mutated:true, no_external_action:true,
    current_status: r.review_status, proposed_status,
    approval_allowed, reasons, blockers: r.approval_blockers ?? [],
    legal_review_required: r.compliance_status === "needs_review",
    becomes_ready_for_queue: decision === "approve" && approval_allowed,
    high_risk_override_required: decision === "approve" && critical,
  });
});
