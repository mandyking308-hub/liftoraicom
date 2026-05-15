import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, AlertTriangle, ShieldCheck, FileWarning } from "lucide-react";
import { toast } from "sonner";

export default function ComplaintsDisputesRecoveryPanel({ businessId }: { businessId?: string | null }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [contactId, setContactId] = useState("");
  const [text, setText] = useState("");

  const { data } = useQuery({
    queryKey: ['complaints-disputes-panel', businessId ?? null],
    queryFn: async () => {
      let cQ = supabase.from('customer_complaints').select('id,complaint_reference,complaint_status,complaint_category,severity,response_due_at,founder_review_required,compliance_review_required,legal_review_recommended,risk_flags,contact_id,business_id,invoice_id,payment_id,assignment_id,support_request_id,created_at').order('created_at', { ascending: false }).limit(100);
      let dQ = supabase.from('customer_disputes').select('id,dispute_reference,dispute_status,dispute_type,disputed_amount,currency,founder_approval_required,finance_review_required,compliance_review_required,legal_review_recommended,contact_id,business_id,invoice_id,payment_id,created_at').order('created_at', { ascending: false }).limit(100);
      let pQ = supabase.from('complaint_resolution_plans').select('id,complaint_id,dispute_id,plan_status,retention_risk,recommended_human_touch,founder_review_required,approved_at,response_sent_at,business_id,created_at').order('created_at', { ascending: false }).limit(100);
      const gQ = supabase.from('external_action_gates').select('gate_key,enabled,confirmation_phrase,max_batch_size').in('gate_key', ['complaint_response_send_gate', 'dispute_response_send_gate']);
      if (businessId) { cQ = cQ.eq('business_id', businessId); dQ = dQ.eq('business_id', businessId); pQ = pQ.eq('business_id', businessId); }
      const [c, d, p, g] = await Promise.all([cQ, dQ, pQ, gQ]);
      return { complaints: c.data ?? [], disputes: d.data ?? [], plans: p.data ?? [], gates: g.data ?? [] };
    },
    staleTime: 30_000,
  });

  const complaints = data?.complaints ?? [];
  const disputes = data?.disputes ?? [];
  const plans = data?.plans ?? [];
  const gates = data?.gates ?? [];
  const cGate = gates.find((g: any) => g.gate_key === 'complaint_response_send_gate');
  const dGate = gates.find((g: any) => g.gate_key === 'dispute_response_send_gate');

  const open = complaints.filter((c: any) => c.complaint_status === 'open');
  const openDisputes = disputes.filter((d: any) => d.dispute_status === 'open');
  const high = complaints.filter((c: any) => ['high', 'critical'].includes(c.severity));
  const now = Date.now();
  const dueSoon = complaints.filter((c: any) => c.response_due_at && new Date(c.response_due_at).getTime() - now < 24 * 3600 * 1000 && c.complaint_status !== 'resolved').length;
  const invoiceDisputes = disputes.filter((d: any) => d.invoice_id || d.dispute_type === 'invoice_dispute' || d.dispute_type === 'payment_dispute').length;
  const supplierDelivery = complaints.filter((c: any) => ['supplier_issue', 'delivery_issue'].includes(c.complaint_category)).length;
  const founderReview = complaints.filter((c: any) => c.founder_review_required && c.complaint_status !== 'resolved').length;
  const complianceReview = complaints.filter((c: any) => c.compliance_review_required || c.legal_review_recommended).length;
  const recoveryPlans = plans.filter((p: any) => p.plan_status === 'draft' || p.plan_status === 'approved').length;
  const retentionRisk = plans.filter((p: any) => p.retention_risk === 'high' || p.retention_risk === 'elevated').length;

  const intake = useMutation({
    mutationFn: async () => {
      setBusy(true);
      const { data, error } = await supabase.functions.invoke('customer-complaint-intake', {
        body: { contact_id: contactId || undefined, business_id: businessId ?? undefined, complaint_text: text, dry_run: false, confirmation: 'CREATE CUSTOMER COMPLAINT' },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success('Complaint logged (founder review required)'); setText(""); qc.invalidateQueries({ queryKey: ['complaints-disputes-panel'] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
    onSettled: () => setBusy(false),
  });

  const generatePlan = useMutation({
    mutationFn: async (complaint_id: string) => {
      const { data, error } = await supabase.functions.invoke('customer-complaint-resolution-generate', {
        body: { complaint_id, dry_run: false, confirmation: 'CREATE COMPLAINT RESOLUTION PLAN' },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success('Resolution plan drafted (founder review required)'); qc.invalidateQueries({ queryKey: ['complaints-disputes-panel'] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
  });

  const Tile = ({ label, value, tone }: any) => (
    <div className="rounded-md border border-border/60 bg-background/50 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${tone === 'warn' ? 'text-yellow-400' : tone === 'danger' ? 'text-red-400' : ''}`}>{value}</div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert size={14} /> Complaints, Disputes & Customer Recovery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300">No external send · No refund/payment mutation · No liability admission</Badge>
          <Badge variant="outline" className={cGate?.enabled ? 'border-green-500/40 text-green-400' : 'border-border/60 text-muted-foreground'}>
            <ShieldCheck size={10} className="mr-1" /> Complaint response gate: {cGate?.enabled ? 'enabled' : 'disabled'}
          </Badge>
          <Badge variant="outline" className={dGate?.enabled ? 'border-green-500/40 text-green-400' : 'border-border/60 text-muted-foreground'}>
            <ShieldCheck size={10} className="mr-1" /> Dispute response gate: {dGate?.enabled ? 'enabled' : 'disabled'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Tile label="Open complaints" value={open.length} tone={open.length ? 'warn' : 'default'} />
          <Tile label="Open disputes" value={openDisputes.length} tone={openDisputes.length ? 'warn' : 'default'} />
          <Tile label="High / critical" value={high.length} tone={high.length ? 'danger' : 'default'} />
          <Tile label="Due in 24h" value={dueSoon} tone={dueSoon ? 'danger' : 'default'} />
          <Tile label="Invoice/payment disputes" value={invoiceDisputes} tone={invoiceDisputes ? 'warn' : 'default'} />
          <Tile label="Supplier / delivery" value={supplierDelivery} />
          <Tile label="Founder review" value={founderReview} tone={founderReview ? 'warn' : 'default'} />
          <Tile label="Compliance / legal" value={complianceReview} tone={complianceReview ? 'danger' : 'default'} />
          <Tile label="Recovery plans" value={recoveryPlans} />
          <Tile label="Retention risk" value={retentionRisk} tone={retentionRisk ? 'danger' : 'default'} />
        </div>

        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <div className="text-xs font-medium">Log a complaint (internal)</div>
          <Input placeholder="Contact UUID (optional)" value={contactId} onChange={(e) => setContactId(e.target.value)} className="h-8 text-xs" />
          <Textarea placeholder="What did the customer say? Paste verbatim if possible." value={text} onChange={(e) => setText(e.target.value)} rows={3} className="text-xs" />
          <div className="flex justify-end">
            <Button size="sm" disabled={busy || !text.trim()} onClick={() => intake.mutate()}>Log complaint</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Auto-classifies category/severity, opens dispute if billing/payment, routes agents. No customer is contacted.</p>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium">Open complaints</div>
          {open.length === 0 ? <p className="text-[11px] text-muted-foreground">No open complaints.</p> : open.slice(0, 6).map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-xs border border-border/60 rounded p-2">
              <div className="truncate flex items-center gap-2">
                <FileWarning size={10} className="text-yellow-400" />
                <span className="font-mono">{c.complaint_reference}</span>
                <Badge variant="outline" className="text-[10px]">{c.complaint_category ?? 'other'}</Badge>
                <Badge variant="outline" className={`text-[10px] ${c.severity === 'critical' ? 'border-red-500/40 text-red-400' : c.severity === 'high' ? 'border-yellow-500/40 text-yellow-400' : ''}`}>{c.severity}</Badge>
                {c.response_due_at && <span className="text-muted-foreground">due {new Date(c.response_due_at).toLocaleString()}</span>}
              </div>
              <Button size="sm" variant="outline" className="h-7" onClick={() => generatePlan.mutate(c.id)}>Draft resolution</Button>
            </div>
          ))}
        </div>

        {openDisputes.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Open disputes</div>
            {openDisputes.slice(0, 5).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-2 text-xs border border-border/60 rounded p-2">
                <div className="truncate flex items-center gap-2">
                  <AlertTriangle size={10} className="text-red-400" />
                  <span className="font-mono">{d.dispute_reference}</span>
                  <Badge variant="outline" className="text-[10px]">{d.dispute_type ?? 'dispute'}</Badge>
                  {d.disputed_amount != null && <span className="text-muted-foreground">{d.currency} {Number(d.disputed_amount).toLocaleString()}</span>}
                </div>
                <Badge variant="outline" className="text-[10px]">finance review: {d.finance_review_required ? 'yes' : 'no'}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}