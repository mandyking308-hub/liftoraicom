import { supabase } from "@/integrations/supabase/client";

export interface AdviserPackSnapshot {
  packs_total: number;
  packs_draft: number;
  packs_review_required: number;
  packs_approved: number;
  packs_sent: number;
  current_period_label: string;
  items_total: number;
  items_review: number;
  questions_open: number;
  questions_approved: number;
  entities_active: number;
  ai_spend_30d: number;
  confirmed_revenue_30d: number;
  estimated_revenue_30d: number;
  recommended_action: string;
}

export async function computeAdviserPackSnapshot(): Promise<AdviserPackSnapshot> {
  const sb: any = supabase as any;
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [packsRes, itemsRes, qRes, entRes, aiRes, qtcRes] = await Promise.all([
    sb.from("adviser_handoff_packs").select("id,pack_status,period_start,period_end").order("period_end", { ascending: false }),
    sb.from("adviser_pack_items").select("id,needs_adviser_review"),
    sb.from("adviser_questions").select("id,status"),
    sb.from("entity_structure_records").select("id,active"),
    sb.from("ai_usage_ledger").select("cost_usd,created_at").gte("created_at", since).limit(5000),
    sb.from("quote_to_cash_records").select("amount,status,created_at").gte("created_at", since).limit(2000),
  ]);

  const packs = packsRes.data ?? [];
  const items = itemsRes.data ?? [];
  const questions = qRes.data ?? [];
  const entities = entRes.data ?? [];
  const ai = aiRes.data ?? [];
  const qtc = qtcRes.data ?? [];

  const packs_draft = packs.filter((p: any) => p.pack_status === "draft").length;
  const packs_review_required = packs.filter((p: any) => p.pack_status === "review_required").length;
  const packs_approved = packs.filter((p: any) => p.pack_status === "approved").length;
  const packs_sent = packs.filter((p: any) => ["sent", "exported", "archived"].includes(p.pack_status)).length;

  const current = packs[0];
  const current_period_label = current
    ? `${new Date(current.period_start).toLocaleDateString()} – ${new Date(current.period_end).toLocaleDateString()}`
    : "No pack yet";

  const items_review = items.filter((i: any) => i.needs_adviser_review).length;
  const questions_open = questions.filter((q: any) => ["draft", "approved_to_send"].includes(q.status)).length;
  const questions_approved = questions.filter((q: any) => q.status === "approved_to_send").length;
  const entities_active = entities.filter((e: any) => e.active).length;

  const ai_spend_30d = ai.reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0);
  const confirmed_revenue_30d = qtc
    .filter((r: any) => ["paid", "confirmed", "revenue_confirmed"].includes(String(r.status ?? "").toLowerCase()))
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const estimated_revenue_30d = qtc
    .filter((r: any) => !["paid", "confirmed", "revenue_confirmed"].includes(String(r.status ?? "").toLowerCase()))
    .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  let recommended_action = "Adviser posture clean. No outstanding pack work.";
  if (packs.length === 0) recommended_action = "No adviser pack yet — start the current monthly pack.";
  else if (packs_review_required > 0) recommended_action = `${packs_review_required} pack(s) awaiting founder review before export.`;
  else if (items_review > 0) recommended_action = `${items_review} pack item(s) flagged for adviser review.`;
  else if (questions_approved > 0) recommended_action = `${questions_approved} adviser question(s) approved — awaiting send.`;
  else if (questions_open > 0) recommended_action = `${questions_open} adviser question(s) drafted — review before approving.`;
  else if (packs_draft > 0) recommended_action = `${packs_draft} pack(s) in draft — complete and submit for review.`;

  return {
    packs_total: packs.length,
    packs_draft,
    packs_review_required,
    packs_approved,
    packs_sent,
    current_period_label,
    items_total: items.length,
    items_review,
    questions_open,
    questions_approved,
    entities_active,
    ai_spend_30d,
    confirmed_revenue_30d,
    estimated_revenue_30d,
    recommended_action,
  };
}

export const PACK_STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border/50",
  review_required: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  exported: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  sent: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  archived: "bg-muted text-muted-foreground border-border/50",
};

export const QUESTION_STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border/50",
  approved_to_send: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  answered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border/50",
};

export const ITEM_TYPE_LABEL: Record<string, string> = {
  revenue: "Revenue",
  expense: "Expense",
  ai_spend: "AI spend",
  invoice: "Invoice",
  payment: "Payment",
  contract: "Contract",
  tax_question: "Tax question",
  entity_note: "Entity note",
  risk: "Risk",
  document: "Document",
  other: "Other",
};

export function fmtMoney(n: number, ccy = "GBP") {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n || 0); }
  catch { return `${ccy} ${Math.round(n || 0)}`; }
}