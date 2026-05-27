import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { PolLayout, TagBadge } from "./_shared";
import { listRequirements } from "@/lib/policyCoverageEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PoliciesBusinesses() {
  const { data: reqs = [] } = useQuery({ queryKey: ["pol-reqs"], queryFn: listRequirements });
  const grouped = reqs.reduce<Record<string, typeof reqs>>((a,r) => {
    (a[r.business_name] = a[r.business_name] || []).push(r); return a;
  }, {});
  return (
    <FounderLayout>
      <PolLayout title="Businesses → required policies" subtitle="Each business is linked to its archetype, jurisdiction and legal entity. Required policies are derived from templates.">
        {Object.keys(grouped).length === 0 && <p className="text-xs text-muted-foreground">No businesses tracked yet.</p>}
        {Object.entries(grouped).map(([biz, items]) => {
          const first = items[0];
          return (
            <Card key={biz} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                  <span>{biz}</span>
                  <TagBadge label={first.archetype} tone="info" />
                  <TagBadge label={first.jurisdiction} tone="muted" />
                  {first.legal_entity && <TagBadge label={`entity: ${first.legal_entity}`} tone="muted" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {items.map(i => (
                    <div key={i.id} className="flex flex-wrap items-center gap-2 border border-border/40 rounded p-2">
                      <span className="font-medium">{i.policy_type}</span>
                      <TagBadge label={i.status}
                        tone={i.status === "published" ? "ok"
                          : i.status === "missing" ? "bad"
                          : i.status === "stale" ? "warn" : "warn"} />
                      {i.is_stale && <TagBadge label="stale" tone="warn" />}
                      {i.next_review_due && <span className="text-muted-foreground">due {i.next_review_due}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </PolLayout>
    </FounderLayout>
  );
}