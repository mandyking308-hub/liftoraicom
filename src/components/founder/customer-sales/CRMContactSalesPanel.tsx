import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, ArrowRight, Lock } from "lucide-react";

export default function CRMContactSalesPanel({ contactId }: { contactId: string }) {
  const { data } = useQuery({
    queryKey: ["crm-contact-sales", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const sb: any = supabase;
      const [convos, calls, closes, follow, handoff] = await Promise.all([
        sb.from("customer_sales_conversations").select("id,call_outcome,close_probability,conversation_status,recommended_offer_id,started_at").eq("contact_id", contactId).order("started_at", { ascending: false }).limit(10),
        sb.from("customer_sales_call_logs").select("id,started_at,duration_seconds,consent_recorded,transcript_text").eq("contact_id", contactId).order("started_at", { ascending: false }).limit(5),
        sb.from("customer_sales_close_actions").select("id,action_type,action_status,approval_status,estimated_pipeline_value").eq("contact_id", contactId).order("created_at", { ascending: false }).limit(10),
        sb.from("customer_sales_follow_up_tasks").select("id,task_type,task_status,approval_status,due_at").eq("contact_id", contactId).order("created_at", { ascending: false }).limit(10),
        sb.from("customer_sales_human_handoff_tasks").select("id,task_status,risk_flags").eq("contact_id", contactId).order("created_at", { ascending: false }).limit(5),
      ].map((p: any) => p.catch(() => ({ data: [] }))));
      return {
        convos: convos.data ?? [],
        calls: calls.data ?? [],
        closes: closes.data ?? [],
        follow: follow.data ?? [],
        handoff: handoff.data ?? [],
      };
    },
  });

  const d = data;
  const hot = (d?.convos ?? []).find((c: any) => (c.close_probability ?? 0) >= 0.7);
  const pendingClose = (d?.closes ?? []).filter((c: any) => c.action_status === "approval_required").length;
  const openFollow = (d?.follow ?? []).filter((f: any) => f.task_status === "open").length;
  const openHandoff = (d?.handoff ?? []).filter((h: any) => h.task_status === "open").length;

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone size={14} className="text-primary" />
          Customer Sales activity
          <Badge variant="outline" className="text-[10px]"><Lock size={9} className="mr-1" /> External actions gated</Badge>
          <Link to="/founder/customer-sales/conversations" className="ml-auto text-[11px] text-primary inline-flex items-center gap-1">
            Open <ArrowRight size={11} />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Conversations" value={d?.convos?.length ?? 0} />
          <Stat label="Calls (recent)" value={d?.calls?.length ?? 0} />
          <Stat label="Close awaiting approval" value={pendingClose} tone={pendingClose > 0 ? "warn" : undefined} />
          <Stat label="Follow-ups open" value={openFollow} tone={openFollow > 0 ? "warn" : undefined} />
        </div>
        {hot && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 text-emerald-300 p-2">
            Hot buying signal · close probability {(Number(hot.close_probability) * 100).toFixed(0)}% · outcome: {hot.call_outcome ?? "—"}
          </div>
        )}
        {openHandoff > 0 && (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/5 text-yellow-300 p-2">
            {openHandoff} human handoff task(s) waiting on this contact
          </div>
        )}
        {(d?.convos?.length ?? 0) === 0 && (d?.calls?.length ?? 0) === 0 && (
          <p className="text-muted-foreground">No sales conversations yet for this contact. Liftor will populate this panel after the next call or playbook run.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  const cls = tone === "warn" ? "border-yellow-500/40 bg-yellow-500/5 text-yellow-300" : "border-border/60 bg-background/40";
  return (
    <div className={`rounded-md border ${cls} p-2`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}