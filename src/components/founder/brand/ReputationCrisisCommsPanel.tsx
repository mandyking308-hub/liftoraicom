import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReputationCrisisCommsPanel() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reputation-status", { body: {} });
      if (error) throw error;
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const { data: plans } = useQuery({
    queryKey: ["crisis-response-plans-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("crisis_response_plans").select("*").order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  const s = status?.summary ?? {};
  const p = status?.plan_summary ?? {};

  return (
    <Card className="tech-card" id="sec-reputation-crisis">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Reputation · Reviews · Crisis Comms</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Tracks reviews, press, social mentions, public complaints, crisis signals and testimonial opportunities. Drafts only — no public posting.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">No auto-publish</Badge>
            <Badge variant="outline" className="text-xs">No public reply</Badge>
            <Badge variant="outline" className="text-xs">No press release send</Badge>
            <Badge variant="outline" className="text-xs">Founder approval required</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Events" value={s.total_events ?? 0} />
          <Stat label="Open" value={s.open ?? 0} />
          <Stat label="Public complaints" value={s.public_complaints ?? 0} />
          <Stat label="Crisis signals" value={s.crisis_signals ?? 0} />
          <Stat label="Reviews" value={s.reviews ?? 0} />
          <Stat label="Testimonials" value={s.testimonials ?? 0} />
          <Stat label="Press mentions" value={s.press_mentions ?? 0} />
          <Stat label="Social mentions" value={s.social_mentions ?? 0} />
          <Stat label="Negative sentiment" value={s.negative ?? 0} />
          <Stat label="High severity" value={s.high_severity ?? 0} />
          <Stat label="Response needed" value={s.response_needed ?? 0} />
          <Stat label="Plans awaiting founder" value={p.awaiting_founder ?? 0} />
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
        </div>

        {!!status?.next_actions?.length && (
          <div className="rounded-md border border-border/40 p-3 text-xs">
            <div className="font-medium mb-1">Next actions</div>
            <ul className="list-disc pl-5 space-y-0.5">{status.next_actions.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Recent reputation events</div>
          <div className="space-y-2">
            {(status?.events ?? []).slice(0, 8).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between rounded-md border border-border/40 p-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline">{e.event_type}</Badge>
                  <span className="truncate">{e.event_title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {e.sentiment && <Badge variant="secondary">{e.sentiment}</Badge>}
                  <Badge variant={e.severity === 'high' || e.severity === 'critical' ? 'destructive' : 'outline'}>{e.severity}</Badge>
                </div>
              </div>
            ))}
            {!(status?.events ?? []).length && <div className="text-xs text-muted-foreground">No reputation events captured yet.</div>}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Crisis response plans</div>
          <div className="space-y-2">
            {(plans ?? []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border/40 p-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{c.plan_status}</Badge>
                  {c.escalation_required && <Badge variant="destructive">escalate</Badge>}
                  {c.legal_review_recommended && <Badge variant="secondary">legal review</Badge>}
                </div>
                <span className="text-muted-foreground">{c.approved_at ? "approved" : "awaiting approval"}</span>
              </div>
            ))}
            {!(plans ?? []).length && <div className="text-xs text-muted-foreground">No crisis plans drafted.</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border/40 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}