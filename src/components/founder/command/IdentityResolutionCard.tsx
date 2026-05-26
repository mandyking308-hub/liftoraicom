import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserSearch, ArrowRight } from "lucide-react";
import { summariseIdentity } from "@/lib/identityResolution";

export default function IdentityResolutionCard() {
  const { data: s } = useQuery({ queryKey: ["id-card"], queryFn: summariseIdentity, refetchInterval: 60000 });
  const tone = (s?.openDuplicates ?? 0) + (s?.mergesAwaiting ?? 0) + (s?.roleConflicts ?? 0) > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserSearch size={14} className="text-primary" /> Identity Resolution
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">No auto-merge</Badge>
          <Link to="/founder/identity-resolution" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Profiles" value={s?.totalProfiles ?? 0} />
          <Stat label="Dupes" value={s?.openDuplicates ?? 0} tone={s?.openDuplicates ? "warn" : undefined} />
          <Stat label="Review" value={s?.duplicateReview ?? 0} tone={s?.duplicateReview ? "warn" : undefined} />
          <Stat label="Merges" value={s?.mergesAwaiting ?? 0} tone={s?.mergesAwaiting ? "warn" : undefined} />
          <Stat label="Conflicts" value={s?.roleConflicts ?? 0} tone={s?.roleConflicts ? "bad" : undefined} />
          <Stat label="DNC" value={s?.doNotContact ?? 0} />
        </div>
        {s && s.watchItems.length > 0 && (
          <div className="text-yellow-300 text-[11px]">
            {s.watchItems.map((w, i) => <div key={i}>• {w}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number|string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40 text-red-300" : tone === "warn" ? "border-yellow-500/40 text-yellow-300" : tone === "ok" ? "border-emerald-500/40 text-emerald-400" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}