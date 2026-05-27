import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { PolLayout, TagBadge } from "./_shared";
import { listDrafts } from "@/lib/policyCoverageEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PoliciesDrafts() {
  const { data: drafts = [] } = useQuery({ queryKey: ["pol-drafts"], queryFn: listDrafts });
  return (
    <FounderLayout>
      <PolLayout title="Policy drafts" subtitle="Drafts are tracked internally. Nothing publishes without founder approval; sensitive drafts also require legal review.">
        <div className="space-y-2">
          {drafts.length === 0 && <p className="text-xs text-muted-foreground">No drafts yet.</p>}
          {drafts.map(d => (
            <Card key={d.id} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                  <span>{d.business_name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{d.policy_type}</span>
                  <TagBadge label={d.version} tone="muted" />
                  <TagBadge label={d.sensitivity} tone={d.sensitivity === "high_risk" ? "bad" : d.sensitivity === "sensitive" ? "warn" : "muted"} />
                  <TagBadge label={d.publish_status} tone={d.publish_status === "published" ? "ok" : d.publish_status === "rejected" ? "bad" : "warn"} />
                  {d.requires_legal_review && (d.legal_reviewed
                    ? <TagBadge label="legal reviewed" tone="ok" />
                    : <TagBadge label="awaiting legal review" tone="warn" />)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <p>{d.draft_summary}</p>
                {d.founder_decision && <TagBadge label={`founder: ${d.founder_decision}`} tone="info" />}
              </CardContent>
            </Card>
          ))}
        </div>
      </PolLayout>
    </FounderLayout>
  );
}