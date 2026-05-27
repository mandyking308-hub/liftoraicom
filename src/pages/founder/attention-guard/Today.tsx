import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AttLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPriorities, topTen, priorityScore } from "@/lib/attentionGuardEngine";

export default function TodayPage() {
  const { data: items = [] } = useQuery({ queryKey: ["att-pri"], queryFn: listPriorities });
  const top = topTen(items);
  const backlog = items.filter(i => i.status === "open" && !top.includes(i));
  return (
    <FounderLayout>
      <AttLayout title="Top 10 things that matter today" subtitle="Ranked by urgency x risk x value, with critical risks pinned to top. Everything else lives in the backlog.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Today's focus ({top.length})</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {top.length === 0 && <p className="text-muted-foreground">No items in focus.</p>}
            {top.map((p, idx) => {
              const critical = ["legal","privacy","security","customer","revenue"].includes(p.category);
              return (
                <div key={p.id} className={`border rounded p-2 space-y-1 ${critical ? "border-red-500/40" : "border-border/40"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-5">#{idx+1}</span>
                    <span className="font-medium flex-1">{p.title}</span>
                    <TagBadge label={p.category} tone={critical ? "bad" : "info"} />
                    {p.founder_only && <TagBadge label="founder only" tone="warn" />}
                    <span className="text-[10px] text-muted-foreground">score {priorityScore(p)}</span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground pl-7">
                    <span>{p.business_name ?? "—"}</span>
                    <span>U{p.urgency}/V{p.value}/R{p.risk}</span>
                    <span>{p.source_module}{p.source_ref ? ` - ${p.source_ref}` : ""}</span>
                  </div>
                  {p.rationale && <p className="text-[11px] text-muted-foreground pl-7">{p.rationale}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Backlog ({backlog.length})</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            {backlog.map(p => (
              <div key={p.id} className="flex items-center gap-2 border border-border/30 rounded px-2 py-1">
                <span className="flex-1">{p.title}</span>
                <TagBadge label={p.category} />
                <span className="text-[10px] text-muted-foreground">U{p.urgency}/V{p.value}/R{p.risk}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </AttLayout>
    </FounderLayout>
  );
}