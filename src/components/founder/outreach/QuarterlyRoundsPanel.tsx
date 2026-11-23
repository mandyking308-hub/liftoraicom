import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Plan = { id: string; campaign_name: string; next_round_at: string; rounds_completed: number; auto_start: boolean; active: boolean; sequence_steps: number };
type Round = { plan_id: string; round_number: number; status: string; eligible_count: number; held_counts: Record<string, number>; critical: string[]; checked_at: string | null };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const HELD: Record<string, string> = { suppressed: "unsubscribed / do not contact", prior_bounce_or_reply: "bounced or replied", not_verified: "not verified", catch_all: "catch-all", catch_all_unassessed: "catch-all unchecked", no_email_or_first_name: "missing email or name" };

export default function QuarterlyRoundsPanel() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        supabase.from("campaign_recurrence_plans").select("id,campaign_name,next_round_at,rounds_completed,auto_start,active,sequence_steps").order("next_round_at"),
        supabase.from("campaign_recurrence_rounds").select("plan_id,round_number,status,eligible_count,held_counts,critical,checked_at").order("round_number", { ascending: false }),
      ]);
      if (p.error || r.error) { setError(true); return; }
      setPlans((p.data ?? []) as Plan[]); setRounds((r.data ?? []) as unknown as Round[]);
    })();
  }, []);
  return (
    <Card className="tech-card">
      <CardHeader><CardTitle className="text-base">Quarterly rounds</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">Each campaign repeats every 3 months with no end date, {plans[0]?.sequence_steps ?? 4} emails per round. A round starts on its own only if every check passes; otherwise it stays paused and you are notified. Unsubscribed, bounced, replied, unverified and catch-all people are always dropped.</p>
        {error && <p className="text-destructive">Couldn't load quarterly rounds.</p>}
        {!error && plans.length === 0 && <p className="text-muted-foreground">No repeating campaigns yet.</p>}
        {plans.map((p) => {
          const last = rounds.find((r) => r.plan_id === p.id);
          return (
            <div key={p.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{p.campaign_name}</span>
                <div className="flex gap-2">
                  <Badge variant="outline">{p.active ? (p.auto_start ? "Auto-start if checks pass" : "Paused") : "Off"}</Badge>
                  <Badge variant="secondary">Rounds done: {p.rounds_completed}</Badge>
                </div>
              </div>
              <p className="mt-1 text-muted-foreground">Next round: <span className="text-foreground">{fmt(p.next_round_at)}</span>, 10:00 UK</p>
              {last ? (
                <div className="mt-1 text-muted-foreground">
                  Last round {last.round_number}: <span className="text-foreground">{last.status}</span>, {last.eligible_count} eligible
                  {Object.keys(last.held_counts ?? {}).length > 0 && <> · dropped: {Object.entries(last.held_counts).map(([k, v]) => `${v} ${HELD[k] ?? k}`).join(", ")}</>}
                  {last.critical?.length > 0 && <div className="text-destructive">Blocked: {last.critical.join(", ")}</div>}
                </div>
              ) : <p className="mt-1 text-muted-foreground">No quarterly round has run yet.</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
