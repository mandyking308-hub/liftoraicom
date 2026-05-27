import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { WdLayout, TagBadge } from "./_shared";
import { listChecklist } from "@/lib/windDownEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WindDownClosureChecklist() {
  const { data: items = [] } = useQuery({ queryKey: ["wd-checklist"], queryFn: listChecklist });
  const cats = Array.from(new Set(items.map(i => i.category)));
  return (
    <FounderLayout>
      <WdLayout title="Closure checklist" subtitle="Every obligation Liftor must satisfy before a business can be paused, closed, sold or archived.">
        {cats.length === 0 && <p className="text-xs text-muted-foreground">No checklist items yet.</p>}
        {cats.map(cat => (
          <Card key={cat} className="tech-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm capitalize">{cat.replace(/_/g," ")}</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-2">
              {items.filter(i => i.category === cat).map(i => (
                <div key={i.id} className="border border-border/40 rounded p-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{i.task}</span>
                  <TagBadge label={i.status} tone={i.status === "complete" ? "ok" : i.status === "blocked" ? "bad" : "warn"} />
                  <TagBadge label={`risk ${i.risk_level}`} tone={i.risk_level === "high" ? "bad" : i.risk_level === "med" ? "warn" : "muted"} />
                  {i.requires_approval && <TagBadge label="needs approval" tone="warn" />}
                  {i.owner && <span className="text-muted-foreground">@ {i.owner}</span>}
                  {i.detail && <span className="text-muted-foreground w-full text-[11px]">{i.detail}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </WdLayout>
    </FounderLayout>
  );
}