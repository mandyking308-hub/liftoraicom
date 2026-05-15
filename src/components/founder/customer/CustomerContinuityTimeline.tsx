import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CustomerContinuityTimeline({ contactId }: { contactId?: string | null }) {
  const { data } = useQuery({
    enabled: !!contactId,
    queryKey: ['customer-continuity', contactId ?? null],
    queryFn: async () => {
      if (!contactId) return { events: [] as any[] };
      const queries = await Promise.all([
        supabase.from('crm_interaction_ledger').select('id,interaction_type,direction,channel,subject,occurred_at').eq('contact_id', contactId).order('occurred_at', { ascending: false }).limit(50),
        supabase.from('customer_survey_responses').select('id,csat_score,nps_score,sentiment,created_at').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20),
        supabase.from('support_interaction_reviews').select('id,severity,theme,created_at').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20),
        supabase.from('proposals').select('id,status,created_at').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20),
        supabase.from('deals').select('id,status,value,created_at').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20),
        supabase.from('invoices').select('id,status,amount,created_at').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20),
        supabase.from('payments').select('id,amount,received_at').eq('contact_id', contactId).order('received_at', { ascending: false }).limit(20),
        supabase.from('customer_quarterly_reports').select('id,report_quarter,report_year,report_status,created_at').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20),
        supabase.from('customer_account_reviews').select('id,review_type,review_status,recommended_next_action,created_at').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(20),
      ]);
      const tag = (kind: string, rows: any[] | null, getDate: (r: any) => string, label: (r: any) => string) =>
        (rows ?? []).map((r) => ({ kind, date: getDate(r), label: label(r), id: r.id }));
      const events = [
        ...tag('interaction', queries[0].data, (r) => r.occurred_at, (r) => `${r.interaction_type} · ${r.subject ?? r.channel ?? ''}`),
        ...tag('survey', queries[1].data, (r) => r.created_at, (r) => `Survey · CSAT ${r.csat_score ?? '—'} NPS ${r.nps_score ?? '—'} · ${r.sentiment ?? ''}`),
        ...tag('support', queries[2].data, (r) => r.created_at, (r) => `Support · ${r.severity ?? ''} · ${r.theme ?? ''}`),
        ...tag('proposal', queries[3].data, (r) => r.created_at, (r) => `Proposal · ${r.status}`),
        ...tag('deal', queries[4].data, (r) => r.created_at, (r) => `Deal · ${r.status} · ${r.value ?? ''}`),
        ...tag('invoice', queries[5].data, (r) => r.created_at, (r) => `Invoice · ${r.status} · ${r.amount ?? ''}`),
        ...tag('payment', queries[6].data, (r) => r.received_at, (r) => `Payment · ${r.amount ?? ''}`),
        ...tag('quarterly_report', queries[7].data, (r) => r.created_at, (r) => `Report · ${r.report_quarter} ${r.report_year} · ${r.report_status}`),
        ...tag('account_review', queries[8].data, (r) => r.created_at, (r) => `Review · ${r.review_status} · ${r.recommended_next_action ?? ''}`),
      ].filter((e) => e.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 80);
      return { events };
    },
    staleTime: 30_000,
  });

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Customer Continuity Timeline</CardTitle></CardHeader>
      <CardContent>
        {!contactId ? (
          <p className="text-[11px] text-muted-foreground">Select a contact to view timeline.</p>
        ) : (data?.events?.length ?? 0) === 0 ? (
          <p className="text-[11px] text-muted-foreground">No events yet.</p>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-auto pr-1">
            {data!.events.map((e: any, i: number) => (
              <div key={`${e.kind}-${e.id}-${i}`} className="flex items-center justify-between gap-2 border-b border-border/30 py-1 text-[11px]">
                <div className="truncate">
                  <Badge variant="outline" className="mr-1 text-[10px]">{e.kind}</Badge>
                  <span>{e.label}</span>
                </div>
                <span className="text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}