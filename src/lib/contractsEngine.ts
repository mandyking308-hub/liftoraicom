import { supabase } from "@/integrations/supabase/client";

export interface ContractsSnapshot {
  total: number;
  active: number;
  drafts: number;
  awaiting_approval: number;
  awaiting_signature: number;
  expiring_30d: number;
  renewals_30d: number;
  obligations_open: number;
  obligations_overdue: number;
  high_risk: number;
  recommended_action: string;
}

export async function computeContractsSnapshot(): Promise<ContractsSnapshot> {
  const sb: any = supabase as any;
  const [contractsRes, obligationsRes] = await Promise.all([
    sb.from("contracts").select("id,contract_status,end_date,renewal_date"),
    sb.from("contract_obligations").select("id,obligation_status,due_date,risk_level"),
  ]);
  const contracts = contractsRes.data ?? [];
  const obligations = obligationsRes.data ?? [];

  const now = Date.now();
  const in30 = now + 30 * 24 * 3600 * 1000;

  const drafts = contracts.filter((c: any) => c.contract_status === "draft").length;
  const awaiting_approval = contracts.filter((c: any) =>
    ["review_required", "approval_required"].includes(c.contract_status),
  ).length;
  const awaiting_signature = contracts.filter((c: any) =>
    ["approved", "sent"].includes(c.contract_status),
  ).length;
  const active = contracts.filter((c: any) =>
    ["signed", "active"].includes(c.contract_status),
  ).length;
  const expiring_30d = contracts.filter((c: any) => {
    if (!c.end_date || !["signed", "active"].includes(c.contract_status)) return false;
    const t = new Date(c.end_date).getTime();
    return t >= now && t <= in30;
  }).length;
  const renewals_30d = contracts.filter((c: any) => {
    if (!c.renewal_date) return false;
    const t = new Date(c.renewal_date).getTime();
    return t >= now && t <= in30;
  }).length;

  const openObl = obligations.filter((o: any) =>
    ["pending", "in_progress"].includes(o.obligation_status),
  );
  const obligations_overdue = openObl.filter((o: any) =>
    o.due_date && new Date(o.due_date).getTime() < now,
  ).length + obligations.filter((o: any) => o.obligation_status === "overdue").length;
  const high_risk = obligations.filter((o: any) =>
    ["high", "critical"].includes(o.risk_level),
  ).length;

  let recommended_action = "Contracts are tracked. No urgent action.";
  if (obligations_overdue > 0) recommended_action = `${obligations_overdue} overdue contract obligation(s) — assign owner.`;
  else if (awaiting_approval > 0) recommended_action = `${awaiting_approval} contract(s) need founder/legal approval before send.`;
  else if (awaiting_signature > 0) recommended_action = `${awaiting_signature} contract(s) approved but unsent or awaiting signature.`;
  else if (renewals_30d > 0) recommended_action = `${renewals_30d} renewal(s) within 30 days — prepare terms.`;
  else if (expiring_30d > 0) recommended_action = `${expiring_30d} contract(s) expiring within 30 days.`;
  else if (high_risk > 0) recommended_action = `${high_risk} high-risk obligation(s) flagged for review.`;

  return {
    total: contracts.length,
    active,
    drafts,
    awaiting_approval,
    awaiting_signature,
    expiring_30d,
    renewals_30d,
    obligations_open: openObl.length,
    obligations_overdue,
    high_risk,
    recommended_action,
  };
}