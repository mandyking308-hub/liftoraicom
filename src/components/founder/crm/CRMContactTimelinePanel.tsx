import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

type Row = {
  timeline_id: string;
  source_table: string;
  source_id: string;
  occurred_at: string | null;
  source_system: string | null;
  source_channel: string | null;
  interaction_type: string | null;
  direction: string | null;
  subject: string | null;
  summary: string | null;
  status: string | null;
  business_id: string | null;
  contact_id: string | null;
  conversation_id: string | null;
  proposal_id: string | null;
  demo_access_id: string | null;
  deal_id: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  compliance_status: string | null;
  founder_review_required: boolean | null;
  ai_relevant: boolean | null;
  risk_flags: any;
  next_step: string | null;
  metadata: any;
};

const directionVariant = (d: string | null) => {
  switch ((d ?? "").toLowerCase()) {
    case "inbound": return "default" as const;
    case "outbound": return "secondary" as const;
    case "internal": return "outline" as const;
    case "system": return "outline" as const;
    default: return "outline" as const;
  }
};

export default function CRMContactTimelinePanel({
  contactId, businessId, limit = 50, title = "Contact timeline",
}: { contactId?: string | null; businessId?: string | null; limit?: number; title?: string }) {
  const [input, setInput] = useState(contactId ?? "");
  const [activeId, setActiveId] = useState(contactId ?? null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (id: string | null) => {
    if (!id) { setRows([]); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_crm_contact_timeline" as any, {
      p_contact_id: id, p_business_id: businessId ?? null, p_limit: limit,
    });
    if (!error) setRows((data as Row[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(activeId); }, [activeId, businessId]);

  const summary = useMemo(() => ({
    total: rows.length,
    review: rows.filter(r => r.founder_review_required).length,
    ai: rows.filter(r => r.ai_relevant).length,
  }), [rows]);

  return (
    <Card className="p-5 space-y-3 border-2 border-border/60 scroll-mt-24">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">{title}</h3>
          <Badge variant="outline" className="text-[10px]">read-only · no send · no action</Badge>
        </div>
        <div className="flex items-center gap-2">
          {!contactId && (
            <>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="contact uuid"
                className="h-7 text-[11px] w-[260px]"
              />
              <Button size="sm" variant="outline" onClick={() => setActiveId(input.trim() || null)}>
                Load
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => load(activeId)} disabled={loading || !activeId}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        {activeId ? `${summary.total} events · ${summary.review} need review · ${summary.ai} AI-relevant` : "Provide a contact to view its full interaction timeline."}
      </div>

      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.timeline_id} className="rounded-md border border-border/60 p-2 text-[11px] space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{r.source_table}</Badge>
                <Badge variant={directionVariant(r.direction)} className="text-[10px]">{r.direction ?? "—"}</Badge>
                <span className="font-medium">{r.interaction_type ?? "—"}</span>
                {r.status && <Badge variant="outline" className="text-[10px]">{r.status}</Badge>}
              </div>
              <div className="text-muted-foreground">{r.occurred_at ? new Date(r.occurred_at).toLocaleString() : "—"}</div>
            </div>
            {(r.subject || r.summary) && (
              <div className="text-foreground/90 truncate">{r.subject || r.summary}</div>
            )}
            <div className="flex items-center gap-1 flex-wrap text-[10px]">
              {r.founder_review_required && (
                <Badge variant="destructive" className="text-[10px]"><ShieldAlert className="h-3 w-3 mr-1" />founder review</Badge>
              )}
              {r.ai_relevant && <Badge variant="outline" className="text-[10px]">AI-relevant</Badge>}
              {r.compliance_status && <Badge variant="outline" className="text-[10px]">compliance: {r.compliance_status}</Badge>}
              {Array.isArray(r.risk_flags) && r.risk_flags.map((f: any, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px]">{String(f)}</Badge>
              ))}
              {r.conversation_id && <Link to={`/founder/conversations/${r.conversation_id}`}><Badge variant="secondary" className="text-[10px]">conversation</Badge></Link>}
              {r.proposal_id && <Link to={`/founder/proposals`}><Badge variant="secondary" className="text-[10px]">proposal</Badge></Link>}
              {r.deal_id && <Link to={`/founder/deals`}><Badge variant="secondary" className="text-[10px]">deal</Badge></Link>}
              {r.invoice_id && <Link to={`/founder/invoices`}><Badge variant="secondary" className="text-[10px]">invoice</Badge></Link>}
              {r.payment_id && <Link to={`/founder/payments`}><Badge variant="secondary" className="text-[10px]">payment</Badge></Link>}
            </div>
          </div>
        ))}
        {activeId && !loading && rows.length === 0 && (
          <div className="text-[11px] text-muted-foreground italic">No interactions yet for this contact.</div>
        )}
      </div>
    </Card>
  );
}