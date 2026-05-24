import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { summariseReuseStats } from "@/services/aiPromptReuse";
import { formatGBP } from "@/services/aiUsageLogger";

export default function AIPromptReuseWidget() {
  const { data } = useQuery({
    queryKey: ["ai-reuse-stats"],
    queryFn: () => summariseReuseStats(),
    refetchInterval: 60_000,
  });

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Prompt reuse & cache
        </CardTitle>
        <CardDescription>Saving AI spend with approved templates and cached context.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-muted-foreground">Templates available</span>
        <span className="text-right">{data?.templates_available ?? "—"}</span>
        <span className="text-muted-foreground">Cached context blocks</span>
        <span className="text-right">{data?.context_blocks ?? "—"}</span>
        <span className="text-muted-foreground">Estimated saving</span>
        <span className="text-right text-emerald-400">{data ? formatGBP(data.estimated_saving_gbp) : "—"}</span>
        <span className="text-muted-foreground">Stale context blocks</span>
        <span className="text-right">
          {data && data.stale_context_blocks > 0
            ? <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30"><AlertTriangle className="h-3 w-3 mr-1" />{data.stale_context_blocks}</Badge>
            : (data?.stale_context_blocks ?? "—")}
        </span>
        <span className="text-muted-foreground">Duplicate research warnings</span>
        <span className="text-right">{data?.duplicate_warnings ?? "—"}</span>
        <div className="col-span-2 pt-2 flex gap-3 text-xs">
          <Link to="/founder/ai-cost/templates" className="text-primary hover:underline">Templates →</Link>
          <Link to="/founder/ai-cost/context" className="text-primary hover:underline">Cached context →</Link>
        </div>
      </CardContent>
    </Card>
  );
}