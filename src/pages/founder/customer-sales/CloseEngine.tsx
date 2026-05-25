import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CSLayout, CSSection, CSEmptyState } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Lock, CreditCard, FileText, Calendar, PenSquare, Mail, Users,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw, UserPlus, ShieldAlert,
} from "lucide-react";

type CloseType =
  | "payment_link"
  | "invoice"
  | "proposal"
  | "contract"
  | "booking"
  | "subscription_checkout"
  | "human_callback"
  | "follow_up_email"
  | "no_action";

const TYPE_META: Record<CloseType, { label: string; icon: any; tone: string; provider?: string }> = {
  payment_link:          { label: "Payment link",          icon: CreditCard, tone: "text-emerald-300", provider: "stripe" },
  subscription_checkout: { label: "Subscription checkout", icon: CreditCard, tone: "text-emerald-300", provider: "stripe" },
  invoice:               { label: "Invoice",               icon: FileText,   tone: "text-sky-300",     provider: "invoice_provider" },
  proposal:              { label: "Proposal / quote",      icon: FileText,   tone: "text-violet-300" },
  contract:              { label: "Contract / legal",      icon: PenSquare,  tone: "text-rose-300",    provider: "docusign" },
  booking:               { label: "Booking link",          icon: Calendar,   tone: "text-amber-300",   provider: "calendar" },
  human_callback:        { label: "Human callback",        icon: Users,      tone: "text-yellow-300" },
  follow_up_email:       { label: "Follow-up email",       icon: Mail,       tone: "text-muted-foreground", provider: "email_followup" },
  no_action:             { label: "No action",             icon: XCircle,    tone: "text-muted-foreground" },
};

const APPROVAL_TONES: Record<string, string> = {
  pending:           "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved:          "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected:          "bg-rose-500/15 text-rose-300 border-rose-500/30",
  changes_requested: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  assigned_human:    "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export default function CloseEngine() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "changes_requested" | "assigned_human">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["cs-close-engine"],
    queryFn: async () => {
      const sb: any = supabase;
      const [actions, providers, products, offers] = await Promise.all([
        sb.from("customer_sales_close_actions").select("*").order("created_at", { ascending: false }).limit(200),
        sb.from("customer_sales_close_provider_settings").select("*").order("provider_label"),
        sb.from("customer_sales_products").select("id,name,price,currency"),
        sb.from("customer_sales_offers").select("id,name,price,currency"),
      ].map(p => p.catch(() => ({ data: [] }))));
      return {
        actions: (actions.data ?? []) as any[],
        providers: (providers.data ?? []) as any[],
        products: (products.data ?? []) as any[],
        offers: (offers.data ?? []) as any[],
      };
    },
  });

  const providersByKey = useMemo(() => {
    const m: Record<string, any> = {};
    (data?.providers ?? []).forEach(p => { m[p.provider_key] = p; });
    return m;
  }, [data?.providers]);

  const filtered = useMemo(() => {
    const rows = data?.actions ?? [];
    if (filter === "all") return rows;
    return rows.filter(r => (r.approval_status ?? "pending") === filter);
  }, [data?.actions, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, pending: 0, approved: 0, rejected: 0, changes_requested: 0, assigned_human: 0 };
    (data?.actions ?? []).forEach(r => {
      c.all += 1;
      c[r.approval_status ?? "pending"] = (c[r.approval_status ?? "pending"] ?? 0) + 1;
    });
    return c;
  }, [data?.actions]);

  const pipeline = useMemo(() => {
    let estimated = 0;
    let confirmed = 0;
    (data?.actions ?? []).forEach(r => {
      estimated += Number(r.estimated_pipeline_value ?? 0);
      if (r.action_status === "completed" && r.verified_event_at) {
        confirmed += Number(r.confirmed_revenue_value ?? r.amount ?? 0);
      }
    });
    return { estimated, confirmed };
  }, [data?.actions]);

  const decide = useMutation({
    mutationFn: async (vars: { id: string; decision: "approved" | "rejected" | "changes_requested" | "assigned_human"; reason?: string }) => {
      const sb: any = supabase;
      const patch: any = {
        approval_status: vars.decision,
        last_decision_reason: vars.reason ?? null,
      };
      if (vars.decision === "approved") {
        patch.founder_approved_at = new Date().toISOString();
        patch.action_status = "approved_draft";
      } else if (vars.decision === "rejected") {
        patch.action_status = "rejected";
      } else if (vars.decision === "changes_requested") {
        patch.requested_changes = vars.reason ?? null;
      }
      const { error } = await sb.from("customer_sales_close_actions").update(patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision recorded — nothing sent externally");
      qc.invalidateQueries({ queryKey: ["cs-close-engine"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to record decision"),
  });

  const createDraft = useMutation({
    mutationFn: async (vars: { close_action_type: CloseType; productId?: string; amount?: number; currency?: string }) => {
      const sb: any = supabase;
      const meta = TYPE_META[vars.close_action_type];
      const product = (data?.products ?? []).find(p => p.id === vars.productId);
      const { error } = await sb.from("customer_sales_close_actions").insert({
        close_action_type: vars.close_action_type,
        action_status: "draft",
        approval_status: "pending",
        founder_approval_required: true,
        product_id: vars.productId ?? null,
        amount: vars.amount ?? product?.price ?? null,
        currency: vars.currency ?? product?.currency ?? "USD",
        payment_provider: meta.provider ?? null,
        recommended_reason: "Founder-created internal draft",
        confidence: 0.5,
        missing_info: [],
        risk_flags: [],
        estimated_pipeline_value: vars.amount ?? product?.price ?? null,
        test_label: "LIVE_INTERNAL_TEST",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Draft created — approval-gated, nothing sent");
      qc.invalidateQueries({ queryKey: ["cs-close-engine"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create draft"),
  });

  return (
    <CSLayout
      title="Close Engine"
      subtitle="Liftor prepares the right close path for each ready customer — payment link, invoice, proposal, contract, booking, callback or follow-up. Nothing is sent without founder approval."
    >
      <div className="grid md:grid-cols-4 gap-3">
        <PipelineStat label="Drafts in flight" value={counts.all} />
        <PipelineStat label="Awaiting your decision" value={counts.pending} tone="warning" />
        <PipelineStat label="Estimated pipeline" value={`$${pipeline.estimated.toLocaleString()}`} hint="from close probability — not revenue" />
        <PipelineStat label="Confirmed revenue" value={`$${pipeline.confirmed.toLocaleString()}`} hint="only after verified event" tone="success" />
      </div>

      <CSSection title="Close-path providers" description="Placeholders only. No secrets stored yet. Liftor will use these once configured, still gated by your approval unless a pre-approved rule is set.">
        <ProviderGrid providers={data?.providers ?? []} />
      </CSSection>

      <CSSection title="Create internal draft" description="Use for live internal testing. Drafts never send — they enter the approval queue.">
        <DraftForm products={data?.products ?? []} onSubmit={(v) => createDraft.mutate(v)} disabled={createDraft.isPending} />
      </CSSection>

      <CSSection title="Close actions" description="Each row is a prepared close path. Approve, reject, request changes or assign a human callback. Sending stays approval-gated.">
        <div className="flex flex-wrap gap-1 mb-3 text-xs">
          {(["all","pending","approved","changes_requested","assigned_human","rejected"] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-2 py-1 rounded border ${filter === k ? "border-primary/60 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"}`}
            >{k.replace(/_/g, " ")} · {counts[k] ?? 0}</button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <CSEmptyState title="No close actions yet" hint="Liftor drafts close actions from qualified conversations. Nothing is sent until you approve." />
        ) : (
          <div className="space-y-2">
            {filtered.map((row) => (
              <CloseActionCard
                key={row.id}
                row={row}
                provider={row.payment_provider ? providersByKey[row.payment_provider] : null}
                onDecision={(decision, reason) => decide.mutate({ id: row.id, decision, reason })}
                pending={decide.isPending}
              />
            ))}
          </div>
        )}
      </CSSection>

      <Card className="tech-card p-3 text-[11px] text-muted-foreground flex gap-2">
        <Lock size={14} className="text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-yellow-200">External send remains gated</p>
          <p>No payment link is sent, no invoice issued, no contract or booking link delivered, no customer email or SMS dispatched. Approving a close action records a founder decision in the queue — actual transmission requires provider activation and an explicit pre-approved rule or per-action confirmation.</p>
        </div>
      </Card>
    </CSLayout>
  );
}

function PipelineStat({ label, value, hint, tone }: { label: string; value: any; hint?: string; tone?: "warning" | "success" }) {
  const toneCls = tone === "warning" ? "text-yellow-300" : tone === "success" ? "text-emerald-300" : "text-foreground";
  return (
    <Card className="tech-card p-3 space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${toneCls}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function ProviderGrid({ providers }: { providers: any[] }) {
  if (providers.length === 0) return <p className="text-xs text-muted-foreground">No providers seeded.</p>;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {providers.map(p => (
        <div key={p.id} className="rounded border border-border/40 bg-background/40 p-3 space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{p.provider_label}</p>
            <Badge variant="outline" className={`text-[10px] ${p.configured ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
              {p.configured ? "configured" : "not configured"}
            </Badge>
          </div>
          <p className="text-muted-foreground">{p.provider_category}</p>
          <p className="text-muted-foreground">Pre-approved rule: {p.pre_approved_rule_allowed ? "allowed" : "no"}</p>
          {p.next_setup_action && (
            <p className="text-primary/80"><span className="font-semibold">Next:</span> {p.next_setup_action}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function DraftForm({ products, onSubmit, disabled }: { products: any[]; onSubmit: (v: { close_action_type: CloseType; productId?: string; amount?: number; currency?: string }) => void; disabled: boolean }) {
  const [type, setType] = useState<CloseType>("payment_link");
  const [productId, setProductId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  return (
    <div className="grid md:grid-cols-5 gap-2 items-end">
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Close type</label>
        <Select value={type} onValueChange={(v) => setType(v as CloseType)}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_META).map(([k, m]) => (
              <SelectItem key={k} value={k} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Product</label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="(none)" /></SelectTrigger>
          <SelectContent>
            {products.length === 0 && <SelectItem value="__none__" disabled className="text-xs">No products yet</SelectItem>}
            {products.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Amount</label>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9 text-xs" />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Currency</label>
        <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="h-9 text-xs" />
      </div>
      <Button
        size="sm"
        disabled={disabled}
        onClick={() => onSubmit({
          close_action_type: type,
          productId: productId && productId !== "__none__" ? productId : undefined,
          amount: amount ? Number(amount) : undefined,
          currency,
        })}
      >Create draft</Button>
    </div>
  );
}

function CloseActionCard({ row, provider, onDecision, pending }: {
  row: any;
  provider: any;
  onDecision: (decision: "approved" | "rejected" | "changes_requested" | "assigned_human", reason?: string) => void;
  pending: boolean;
}) {
  const meta = TYPE_META[row.close_action_type as CloseType] ?? TYPE_META.no_action;
  const Icon = meta.icon;
  const status = row.approval_status ?? "pending";
  const missing = Array.isArray(row.missing_info) ? row.missing_info : [];
  const risks = Array.isArray(row.risk_flags) ? row.risk_flags : [];
  const [reason, setReason] = useState("");
  const providerNotConfigured = meta.provider && (!provider || !provider.configured);

  return (
    <Card className="tech-card p-3 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon size={16} className={`mt-0.5 ${meta.tone}`} />
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              {meta.label}
              {row.test_label && <Badge variant="outline" className="text-[10px]">{row.test_label}</Badge>}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Customer: {row.contact_id ?? "—"} · Business: {row.business_id ?? "—"} · Product: {row.product_id ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={`text-[10px] ${APPROVAL_TONES[status] ?? ""}`}>{status.replace(/_/g, " ")}</Badge>
          <Badge variant="outline" className="text-[10px]">{row.action_status}</Badge>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-2 text-[11px]">
        <Stat label="Amount" value={row.amount ? `${row.amount} ${row.currency ?? ""}` : "—"} />
        <Stat label="Confidence" value={row.confidence != null ? `${Math.round(Number(row.confidence) * 100)}%` : "—"} />
        <Stat label="Pipeline est." value={row.estimated_pipeline_value ? `${row.estimated_pipeline_value} ${row.currency ?? ""}` : "—"} />
        <Stat label="Confirmed revenue" value={row.verified_event_at ? `${row.confirmed_revenue_value ?? row.amount ?? 0} ${row.currency ?? ""}` : "—"} />
      </div>

      {row.recommended_reason && (
        <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Why recommended: </span>{row.recommended_reason}</p>
      )}

      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">Missing info:</span>
          {missing.map((m: any, i: number) => (
            <Badge key={i} variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">{String(m)}</Badge>
          ))}
        </div>
      )}

      {risks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground mr-1 inline-flex items-center gap-1"><ShieldAlert size={10} /> Risk flags:</span>
          {risks.map((r: any, i: number) => (
            <Badge key={i} variant="outline" className="text-[10px] bg-rose-500/10 text-rose-300 border-rose-500/30">{String(r)}</Badge>
          ))}
        </div>
      )}

      {providerNotConfigured && (
        <div className="rounded border border-yellow-500/30 bg-yellow-500/5 p-2 text-[11px] flex gap-2">
          <AlertTriangle size={12} className="text-yellow-400 shrink-0 mt-0.5" />
          <span>Provider <span className="font-mono">{meta.provider}</span> is not configured yet. You can still approve internally — sending stays blocked until activation.</span>
        </div>
      )}

      {row.requested_changes && (
        <div className="rounded border border-sky-500/30 bg-sky-500/5 p-2 text-[11px]">
          <span className="font-semibold text-sky-300">Requested changes: </span>{row.requested_changes}
        </div>
      )}
      {row.last_decision_reason && status !== "pending" && (
        <p className="text-[11px] text-muted-foreground">Last decision: {row.last_decision_reason}</p>
      )}

      <div className="space-y-2 pt-1 border-t border-border/40">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Decision note or requested change (optional)…"
          className="text-xs min-h-[52px]"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="default" disabled={pending} onClick={() => onDecision("approved", reason || undefined)}>
            <CheckCircle2 size={12} className="mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onDecision("rejected", reason || undefined)}>
            <XCircle size={12} className="mr-1" /> Reject
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onDecision("changes_requested", reason || undefined)}>
            <RefreshCw size={12} className="mr-1" /> Request changes
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onDecision("assigned_human", reason || "Assigned for human callback")}>
            <UserPlus size={12} className="mr-1" /> Assign human callback
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded border border-border/40 bg-background/40 p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-medium">{value}</p>
    </div>
  );
}