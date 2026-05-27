import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { PolLayout, TagBadge } from "./_shared";
import { listPublicPages } from "@/lib/policyCoverageEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PoliciesPublicPages() {
  const { data: pages = [] } = useQuery({ queryKey: ["pol-pages"], queryFn: listPublicPages });
  return (
    <FounderLayout>
      <PolLayout title="Public policy pages" subtitle="Tracked URLs per business + policy type. Pages never publish or update automatically.">
        <div className="space-y-2">
          {pages.length === 0 && <p className="text-xs text-muted-foreground">No public pages tracked.</p>}
          {pages.map(p => (
            <Card key={p.id} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                  <span>{p.business_name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{p.policy_type}</span>
                  <TagBadge label={p.publish_status} tone={p.is_published ? "ok" : p.publish_status === "rejected" ? "bad" : "warn"} />
                  {p.requires_external_publish && !p.is_published && <TagBadge label="publish requires approval" tone="warn" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                {p.public_url
                  ? <p className="font-mono text-muted-foreground break-all">{p.public_url}</p>
                  : <p className="text-muted-foreground italic">no URL assigned</p>}
                {p.last_published_version && <p className="text-muted-foreground">last published {p.last_published_version} {p.last_published_at && `@ ${p.last_published_at}`}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </PolLayout>
    </FounderLayout>
  );
}