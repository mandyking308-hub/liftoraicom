import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { PolLayout, TagBadge } from "./_shared";
import { listRequirements, listTemplates } from "@/lib/policyCoverageEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PoliciesCoverage() {
  const { data: reqs = [] } = useQuery({ queryKey: ["pol-reqs"], queryFn: listRequirements });
  const { data: tpls = [] } = useQuery({ queryKey: ["pol-tpls"], queryFn: listTemplates });
  const missing = reqs.filter(r => r.required && r.status === "missing");
  const stale = reqs.filter(r => r.is_stale);
  return (
    <FounderLayout>
      <PolLayout title="Coverage gaps" subtitle="Missing required policies and stale policies across all businesses. Templates derived from archetype + jurisdiction.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Missing policies</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {missing.length === 0 && <p className="text-muted-foreground">No missing policies.</p>}
            {missing.map(r => (
              <div key={r.id} className="border border-red-500/30 rounded p-2 flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.business_name}</span>
                <span className="text-muted-foreground">·</span>
                <span>{r.policy_type}</span>
                <TagBadge label={r.jurisdiction} tone="muted" />
                <TagBadge label="missing" tone="bad" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stale policies</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {stale.length === 0 && <p className="text-muted-foreground">No stale policies.</p>}
            {stale.map(r => (
              <div key={r.id} className="border border-yellow-500/30 rounded p-2 flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.business_name}</span>
                <span className="text-muted-foreground">·</span>
                <span>{r.policy_type}</span>
                <TagBadge label="stale" tone="warn" />
                {r.next_review_due && <span className="text-muted-foreground">due {r.next_review_due}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Template catalogue</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {tpls.length === 0 && <p className="text-muted-foreground">No templates configured.</p>}
            {tpls.map(t => (
              <div key={t.id} className="flex flex-wrap items-center gap-2 border border-border/40 rounded p-2">
                <TagBadge label={t.archetype} tone="info" />
                <span className="font-medium">{t.policy_type}</span>
                <TagBadge label={t.jurisdiction} tone="muted" />
                <TagBadge label={t.sensitivity} tone={t.sensitivity === "high_risk" ? "bad" : t.sensitivity === "sensitive" ? "warn" : "muted"} />
                <span className="text-muted-foreground">review every {t.default_review_frequency_days}d</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PolLayout>
    </FounderLayout>
  );
}