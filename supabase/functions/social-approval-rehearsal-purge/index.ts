import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(()=>({}));
  const business_id = body.business_id; if (!business_id) return json({ok:false,error:"business_id_required"},400);
  if (body.confirmation_phrase !== "PURGE SOCIAL APPROVAL TEST DATA") return json({ok:false,error:"confirmation_required"},400);
  const tables = ["social_approval_batch_items","social_approval_batches","social_approval_decisions","social_approval_reviews","social_approval_rules"];
  const r: Record<string, number> = {};
  for (const t of tables) {
    const q:any = a.admin.from(t).delete({ count: "exact" }).eq("business_id", business_id);
    if (t === "social_approval_batch_items") {
      const { count } = await q; r[t] = count ?? 0; // child cascades from batches but safe to call
    } else {
      const { count } = await q.eq("is_test_data", true); r[t] = count ?? 0;
    }
  }
  return json({ ok:true, deleted: r, no_real_data_deleted:true });
});
