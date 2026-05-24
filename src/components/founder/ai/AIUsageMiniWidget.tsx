import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, ShieldQuestion, PoundSterling, ArrowUpRight } from "lucide-react";
import { formatGBP } from "@/services/aiUsageLogger";

export default function AIUsageMiniWidget() {
  const { data } = useQuery({
    queryKey: ["ai_usage_widget"],
    queryFn: async () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data, error } = await supabase
        .from("ai_usage_ledger")
        .select("estimated_cost, status, human_approved, created_at")
        .gte("created_at", startOfMonth)
        .limit(5000);
      if (error) throw error;
      const rows = data ?? [];
      let spendToday = 0;
      let spendMonth = 0;
      let actionsToday = 0;
      let failed = 0;
      let humanReview = 0;
      for (const r of rows as any[]) {
        const cost = Number(r.estimated_cost ?? 0);
        spendMonth += cost;
        if (r.created_at >= startOfDay) {
          spendToday += cost;
          actionsToday += 1;
        }
        if (r.status === "failed") failed += 1;
        if (r.status === "human_review_required") humanReview += 1;
      }
      return { spendToday, spendMonth, actionsToday, failed, humanReview };
    },
    staleTime: 30_000,
  });

  const stats = data ?? { spendToday: 0, spendMonth: 0, actionsToday: 0, failed: 0, humanReview: 0 };

  return (
    <Card className="tech-card">
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">AI Cost Governor — today &amp; month</span>
          </div>
          <Link
            to="/founder/ai-cost/ledger"
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
          >
            Open ledger <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Spend today" value={formatGBP(stats.spendToday)} icon={<PoundSterling className="h-3 w-3" />} />
          <Stat label="Spend this month" value={formatGBP(stats.spendMonth)} icon={<PoundSterling className="h-3 w-3" />} />
          <Stat label="Actions today" value={stats.actionsToday.toLocaleString()} icon={<Activity className="h-3 w-3" />} />
          <Stat
            label="Failed"
            value={stats.failed.toLocaleString()}
            tone={stats.failed > 0 ? "danger" : undefined}
            icon={<AlertTriangle className="h-3 w-3" />}
          />
          <Stat
            label="Human review"
            value={stats.humanReview.toLocaleString()}
            tone={stats.humanReview > 0 ? "warn" : undefined}
            icon={<ShieldQuestion className="h-3 w-3" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "danger" | "warn";
}) {
  return (
    <div
      className={
        "p-2 rounded border " +
        (tone === "danger"
          ? "border-destructive/40 bg-destructive/5"
          : tone === "warn"
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border")
      }
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}