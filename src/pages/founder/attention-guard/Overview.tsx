import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AttLayout, Stat, TagBadge } from "./_shared";
import { summariseAttention } from "@/lib/attentionGuardEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AttentionOverview() {
  const { data: s } = useQuery({ queryKey: ["att-overview"], queryFn: summariseAttention, refetchInterval: 60000 });
  const overload = s?.overloadLevel ?? "normal";
  return (
    <FounderLayout>
      <AttLayout title="Founder Attention Guard" subtitle="Liftor ranks work by urgency, value, risk and founder-only requirement, surfaces only what matters today, and never hides legal, privacy, security, customer or revenue risk.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Overload level" value={overload} tone={overload === "normal" ? "ok" : overload === "high" ? "bad" : "warn"} />
          <Stat label="Top 10 surfaced" value={s?.topTenCount ?? 0} />
          <Stat label="Founder-only" value={s?.founderOnly ?? 0} tone={(s?.founderOnly ?? 0) > 12 ? "warn" : "ok"} hint="target <= 12" />
          <Stat label="Critical risks" value={s?.critical ?? 0} tone={s?.critical ? "bad" : "ok"} />
          <Stat label="Noise items" value={s?.noise ?? 0} tone={s?.noise ? "warn" : "ok"} />
          <Stat label="Delegate candidates" value={s?.delegationCandidates ?? 0} tone={s?.delegationCandidates ? "warn" : "ok"} />
          <Stat label="Defer candidates" value={s?.deferCandidates ?? 0} />
          <Stat label="Fatigue warnings" value={s?.openFatigueWarnings ?? 0} tone={s?.openFatigueWarnings ? "warn" : "ok"} />
          <Stat label="Total open" value={s?.totalOpen ?? 0} />
        </div>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Attention posture</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {s && s.watchItems.length > 0
              ? s.watchItems.map((w,i)=>(<div key={i} className="text-yellow-300">- {w}</div>))
              : <p className="text-muted-foreground">Attention load within healthy bounds.</p>}
            <div className="pt-2 flex flex-wrap gap-2">
              <TagBadge label="Critical risks never hidden" tone="info" />
              <TagBadge label="Top 10 only on cockpit" tone="info" />
              <TagBadge label="Delegation recommended, not auto" tone="info" />
              <TagBadge label="Founder-only target <= 12" tone="info" />
            </div>
          </CardContent>
        </Card>
      </AttLayout>
    </FounderLayout>
  );
}