import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Stethoscope, Target, Radar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Counts = { healthcare: number; exit: number; funding: number };

/**
 * Three founder-attention counters surfaced on the Command Centre.
 * Read-only. No external actions. Founder/admin-gated via RLS.
 * - Healthcare Overlay blockers (records still go_live_blocked).
 * - Portfolio Exit alerts awaiting founder acknowledgement.
 * - Funding Radar shortlist items needing a founder decision.
 */
export default function LifecycleAttentionPanel() {
  const [c, setC] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [hc, exit, shortlist] = await Promise.all([
          (supabase as any).from("healthcare_readiness").select("id", { count: "exact", head: true }).eq("go_live_blocked", true),
          (supabase as any).from("portfolio_exit_target_alerts").select("id", { count: "exact", head: true }).is("acknowledged_at", null),
          (supabase as any).from("funding_shortlist").select("id", { count: "exact", head: true }).in("status", ["pending_review", "needs_decision", "shortlisted"]),
        ]);
        setC({
          healthcare: hc?.count ?? 0,
          exit: exit?.count ?? 0,
          funding: shortlist?.count ?? 0,
        });
      } catch {
        /* founder/admin gated; silently skip if unauthorised */
      }
    })();
  }, []);

  const Item = ({ to, label, count, icon: Icon }: { to: string; label: string; count: number; icon: any }) => (
    <Link to={to} className="flex items-center justify-between border border-border/40 rounded p-3 hover:bg-secondary/40">
      <span className="flex items-center gap-2 text-xs">
        <Icon size={14} className="text-primary" />
        {label}
      </span>
      <Badge
        variant="outline"
        className={`text-[10px] ${count > 0 ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" : "text-muted-foreground"}`}
      >{count}</Badge>
    </Link>
  );

  return (
    <Card className="tech-card" id="sec-lifecycle-attention">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target size={14} className="text-primary" />
          Lifecycle attention — founder review
          <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">Tracking only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Item to="/founder/healthcare-overlay" label="Healthcare overlay blockers" count={c?.healthcare ?? 0} icon={Stethoscope} />
        <Item to="/founder/portfolio-exit" label="Portfolio exit alerts" count={c?.exit ?? 0} icon={Target} />
        <Item to="/founder/funding-radar/shortlist" label="Funding radar decisions due" count={c?.funding ?? 0} icon={Radar} />
      </CardContent>
    </Card>
  );
}