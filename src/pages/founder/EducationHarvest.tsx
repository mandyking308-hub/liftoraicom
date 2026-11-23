import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { harvestProgress, type HarvestRun, type StatusCounts } from "@/lib/educationHarvest/harvestStats";

const db = supabase as unknown as { from: (t: string) => any };
const STATUSES = ["queued", "claimed", "institution_screened", "buyer_researched", "held", "error"] as const;

async function count(table: string, filter?: [string, string]) {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="tech-card"><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </CardContent></Card>
  );
}

const runLine = (r: HarvestRun | null) => r ? `${r.run_key} · ${r.status} · claimed ${r.claimed_count}, screened ${r.screened_count}, errors ${r.error_count}` : "No run yet";

export default function EducationHarvest() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["education-harvest"],
    queryFn: async () => {
      const [baseline, ...byStatus] = await Promise.all([
        count("education_harvest_open_schools"),
        ...STATUSES.map((s) => count("education_harvest_queue", ["status", s])),
      ]);
      const counts: StatusCounts = Object.fromEntries(STATUSES.map((s, i) => [s, byStatus[i]]));
      const runs = await db.from("education_harvest_runs").select("*").order("run_date", { ascending: false }).order("slot", { ascending: false }).limit(60);
      const weekly = await db.from("education_harvest_weekly").select("*").order("week_start", { ascending: false }).limit(8);
      const evidence = await count("education_harvest_buyer_evidence");
      if (runs.error) throw runs.error;
      return { baseline, counts, runs: (runs.data ?? []) as HarvestRun[], weekly: weekly.data ?? [], evidence };
    },
  });
  const p = data ? harvestProgress(data.baseline, data.counts, data.runs) : null;
  return (
    <FounderLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Daily Education Harvest</h1>
          <p className="text-sm text-muted-foreground">Private research progress through open schools. Research only: no sending, no CRM promotion, no Smartlead enrolment.</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline">Schedule lives in ChatGPT (AM + PM tasks), not in-app cron</Badge>
            <Badge variant="outline">Buyer evidence is staged and unverified until reviewed</Badge>
          </div>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load: {(error as Error).message}</p>}
        {p && data && (<>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Stat label="Open schools baseline" value={data.baseline.toLocaleString()} />
            <Stat label="Distinct schools screened" value={p.screened.toLocaleString()} hint={`${p.pct}% complete`} />
            <Stat label="Schools with sourced buyer evidence" value={p.buyerResearched} hint={`${data.evidence} staged evidence rows`} />
            <Stat label="Remaining" value={p.remaining.toLocaleString()} hint={p.estimatedDaysLeft === null ? "Timeline: no completed runs yet" : `~${p.estimatedDaysLeft} days at recent pace`} />
            <Stat label="Currently claimed (in progress)" value={p.activeClaims} />
            <Stat label="Held" value={p.held} />
            <Stat label="Errors (retried up to 3×)" value={p.errors} />
            <Stat label="Repeat claim calls (idempotent, no duplicates)" value={p.repeatClaimCalls} />
          </div>
          <Card className="tech-card"><CardHeader><CardTitle className="text-base">Runs</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Last AM: {runLine(p.lastAM)}</div>
              <div>Last PM: {runLine(p.lastPM)}</div>
              <div>Last successful run: {p.lastSuccess ? p.lastSuccess.run_key : "None yet"}</div>
              <div>Backlog never picked up: {(data.baseline - Object.values(data.counts).reduce((a, b) => a + (b ?? 0), 0)).toLocaleString()}</div>
            </CardContent></Card>
          <Card className="tech-card"><CardHeader><CardTitle className="text-base">Weekly (Friday review): completed unique schools only</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {data.weekly.length === 0 ? "0 schools completed so far." : data.weekly.map((w: any) => (
                <div key={w.week_start}>Week of {w.week_start}: {w.schools_screened} screened, {w.schools_buyer_researched} with buyer evidence</div>
              ))}
            </CardContent></Card>
        </>)}
      </div>
    </FounderLayout>
  );
}
