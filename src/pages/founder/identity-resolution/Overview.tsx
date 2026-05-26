import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IdentityLayout, Stat } from "./_shared";
import { summariseIdentity } from "@/lib/identityResolution";

export default function IdentityOverview() {
  const { data: s } = useQuery({ queryKey: ["id-summary"], queryFn: summariseIdentity, refetchInterval: 30000 });
  return (
    <IdentityLayout title="Identity Resolution Engine" subtitle="Detect duplicates and conflicting roles for the same person across 25 businesses. Matching runs live; merges and do-not-contact changes require founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <Stat label="Profiles" value={s?.totalProfiles ?? 0} />
        <Stat label="Open duplicates" value={s?.openDuplicates ?? 0} tone={s?.openDuplicates ? "warn" : undefined} />
        <Stat label="Duplicate review" value={s?.duplicateReview ?? 0} tone={s?.duplicateReview ? "warn" : undefined} />
        <Stat label="Merges awaiting" value={s?.mergesAwaiting ?? 0} tone={s?.mergesAwaiting ? "warn" : undefined} />
        <Stat label="Role conflicts" value={s?.roleConflicts ?? 0} tone={s?.roleConflicts ? "bad" : undefined} />
        <Stat label="Do-not-contact" value={s?.doNotContact ?? 0} tone="ok" />
      </div>
      {s && s.watchItems.length > 0 && (
        <Card className="tech-card border-yellow-500/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Watch items</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {s.watchItems.map((w, i) => <div key={i} className="text-yellow-300">• {w}</div>)}
          </CardContent>
        </Card>
      )}
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Identity Agent</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Matches by email, phone, name+company, website/domain — confidence scored.</p>
          <p>• Surfaces duplicate candidates; <b>never auto-merges</b>.</p>
          <p>• Flags conflicting roles (e.g. same person is both a customer and a vendor).</p>
          <p>• Protects the Global Do-Not-Contact list; outreach/CRM/seller modules must respect it.</p>
          <p>• Links records safely; preserves per-business context.</p>
        </CardContent>
      </Card>
    </IdentityLayout>
  );
}