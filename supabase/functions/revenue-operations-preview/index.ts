import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Revenue Operations — PREVIEW ONLY.
// Inspects deals/invoices/payments/suppliers/assignments and surfaces readiness
// items: deals needing invoice, invoices overdue, payments received,
// assignments needing supplier, supplier load issues, delivery blockers.
// NEVER writes. NEVER sends. NEVER calls Apollo or Smartlead.

async function authPriv(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.claims.sub);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin };
}

const safe = async (q: any, fb: any = []) => { try { const { data } = await q; return data ?? fb; } catch { return fb; } };

type Item = {
  review_type: string;
  business_name?: string | null;
  deal_id?: string | null;
  invoice_id?: string | null;
  payment_id?: string | null;
  supplier_id?: string | null;
  assignment_id?: string | null;
  current_state?: string | null;
  recommended_action?: string;
  estimated_value?: number;
  priority_level: "low" | "normal" | "high" | "urgent";
  blockers: string[];
};

function midValue(min?: number | null, max?: number | null) {
  const a = Number(min ?? 0), b = Number(max ?? 0);
  if (!a && !b) return 0;
  if (!a) return b;
  if (!b) return a;
  return Math.round((a + b) / 2);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const today = new Date(); today.setUTCHours(0,0,0,0);
    const todayISO = today.toISOString().slice(0,10);

    const deals = (await safe(admin.from("deals").select("id,business_name,status,estimated_value_min,estimated_value_max,probability,won_at,contact_id,updated_at").limit(500), [])) as any[];
    const invoices = (await safe(admin.from("invoices").select("id,deal_id,business_name,invoice_number,amount_min,amount_max,expected_amount,status,due_date,issued_date,payment_risk_flag,created_at").limit(500), [])) as any[];
    const payments = (await safe(admin.from("payments").select("id,invoice_id,amount_received,received_date,method,reference,business_name,created_at").order("created_at", { ascending: false }).limit(200), [])) as any[];
    const suppliers = (await safe(admin.from("suppliers").select("id,name,business_name,status,active_assignment_count,max_concurrent_assignments,supplier_score,skills,last_activity_at").limit(500), [])) as any[];
    const assignments = (await safe(admin.from("assignments").select("id,supplier_id,deal_id,business_name,status,sla_status,assigned_at,started_at,completed_at,failed_at,expected_completion_date,required_skills,share_contact_details,supplier_note,requires_finance_action").limit(500), [])) as any[];

    const invoicesByDeal = new Map<string, any[]>();
    for (const i of invoices) {
      if (!i.deal_id) continue;
      const arr = invoicesByDeal.get(i.deal_id) ?? [];
      arr.push(i);
      invoicesByDeal.set(i.deal_id, arr);
    }
    const assignmentsByDeal = new Map<string, any[]>();
    for (const a of assignments) {
      if (!a.deal_id) continue;
      const arr = assignmentsByDeal.get(a.deal_id) ?? [];
      arr.push(a);
      assignmentsByDeal.set(a.deal_id, arr);
    }

    const items: Item[] = [];

    // 1. WON deals needing an invoice
    for (const d of deals) {
      const status = String(d.status ?? "").toUpperCase();
      if (status !== "WON") continue;
      const inv = invoicesByDeal.get(d.id) ?? [];
      if (inv.length === 0) {
        items.push({
          review_type: "deal_needs_invoice",
          business_name: d.business_name,
          deal_id: d.id,
          current_state: status,
          recommended_action: "Founder to draft invoice for won deal.",
          estimated_value: midValue(d.estimated_value_min, d.estimated_value_max),
          priority_level: "high",
          blockers: ["no_invoice_yet"],
        });
      }
    }

    // 2. Invoices overdue
    for (const i of invoices) {
      const status = String(i.status ?? "").toUpperCase();
      const due = i.due_date ? String(i.due_date) : null;
      const isOverdueByDate = due && due < todayISO && !["PAID","VOID"].includes(status);
      if (status === "OVERDUE" || isOverdueByDate) {
        items.push({
          review_type: "invoice_overdue",
          business_name: i.business_name,
          invoice_id: i.id,
          deal_id: i.deal_id,
          current_state: status,
          recommended_action: "Founder reviews and chases overdue invoice (no auto-send).",
          estimated_value: i.expected_amount ?? midValue(i.amount_min, i.amount_max),
          priority_level: i.payment_risk_flag ? "urgent" : "high",
          blockers: i.payment_risk_flag ? ["payment_risk_flag"] : [],
        });
      }
    }

    // 3. Recent payments received (informational)
    const recentPayments = payments.slice(0, 25);
    for (const p of recentPayments) {
      items.push({
        review_type: "payment_received",
        business_name: p.business_name,
        payment_id: p.id,
        invoice_id: p.invoice_id,
        current_state: p.method ?? null,
        recommended_action: "Founder confirms payment reconciliation.",
        estimated_value: Number(p.amount_received ?? 0),
        priority_level: "normal",
        blockers: [],
      });
    }

    // 4. Won deals needing supplier assignment
    for (const d of deals) {
      const status = String(d.status ?? "").toUpperCase();
      if (status !== "WON") continue;
      const a = assignmentsByDeal.get(d.id) ?? [];
      if (a.length === 0) {
        items.push({
          review_type: "assignment_needs_supplier",
          business_name: d.business_name,
          deal_id: d.id,
          current_state: status,
          recommended_action: "Founder selects supplier and previews assignment.",
          estimated_value: midValue(d.estimated_value_min, d.estimated_value_max),
          priority_level: "high",
          blockers: ["no_supplier_assigned"],
        });
      }
    }

    // 5. Supplier load issues
    for (const s of suppliers) {
      const max = Number(s.max_concurrent_assignments ?? 0);
      const cur = Number(s.active_assignment_count ?? 0);
      if (max > 0 && cur >= max) {
        items.push({
          review_type: "supplier_load_issue",
          business_name: s.business_name ?? s.name,
          supplier_id: s.id,
          current_state: `${cur}/${max} active`,
          recommended_action: "Founder rebalances workload before new assignments.",
          priority_level: "high",
          blockers: ["supplier_at_capacity"],
        });
      }
    }

    // 6. Delivery blockers — assignments breaching SLA / not completed past expected date
    for (const a of assignments) {
      const sla = String(a.sla_status ?? "").toLowerCase();
      const expected = a.expected_completion_date ? String(a.expected_completion_date) : null;
      const status = String(a.status ?? "").toLowerCase();
      const overdue = expected && expected < todayISO && !["completed","failed"].includes(status);
      const breach = sla.includes("breach") || sla.includes("at_risk") || sla.includes("overdue");
      if (breach || overdue || status === "failed") {
        const blockers: string[] = [];
        if (breach) blockers.push(`sla_${sla}`);
        if (overdue) blockers.push("past_expected_completion");
        if (status === "failed") blockers.push("assignment_failed");
        if (a.requires_finance_action) blockers.push("requires_finance_action");
        items.push({
          review_type: "delivery_blocker",
          business_name: a.business_name,
          assignment_id: a.id,
          deal_id: a.deal_id,
          supplier_id: a.supplier_id,
          current_state: status,
          recommended_action: "Founder resolves delivery blocker (no auto-action).",
          priority_level: status === "failed" ? "urgent" : "high",
          blockers,
        });
      }
    }

    const byType: Record<string, number> = {};
    let pipelineValue = 0;
    let overdueValue = 0;
    let receivedValue = 0;
    for (const it of items) {
      byType[it.review_type] = (byType[it.review_type] ?? 0) + 1;
      if (it.review_type === "invoice_overdue") overdueValue += it.estimated_value ?? 0;
      else if (it.review_type === "payment_received") receivedValue += it.estimated_value ?? 0;
      else pipelineValue += it.estimated_value ?? 0;
    }

    const persisted = (await safe(
      admin.from("revenue_operations_reviews").select("id,review_type,apply_status").limit(500),
      []
    )) as any[];

    return new Response(JSON.stringify({
      ok: true,
      preview_only: true,
      writes: 0,
      emails_sent: 0,
      provider_calls: 0,
      invoices_created: 0,
      payments_created: 0,
      assignments_created: 0,
      apply_enabled: false,
      apply_disabled_reason: "revenue_operations_apply_disabled",
      totals: {
        items: items.length,
        deals_scanned: deals.length,
        invoices_scanned: invoices.length,
        payments_scanned: payments.length,
        suppliers_scanned: suppliers.length,
        assignments_scanned: assignments.length,
      },
      by_type: byType,
      value: {
        pipeline_estimate: pipelineValue,
        overdue_estimate: overdueValue,
        recently_received: receivedValue,
      },
      persisted_reviews: persisted.length,
      items: items.slice(0, 100),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});