import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function SmartleadScaleNextActionBanner() {
  return (
    <Card className="p-4 border-2 border-primary/40 bg-primary/5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
          Top next action
        </Badge>
        <Badge variant="outline" className="text-[10px]">Smartlead scale engine: in progress</Badge>
        <Badge variant="outline" className="text-[10px]">Manual Send Apply / Pooja: deferred</Badge>
      </div>
      <Link
        to="/founder/integrations#smartlead-scale-setup-checklist"
        className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 p-3 hover:border-primary/60 transition-colors"
      >
        <span className="text-sm">
          Connect one sending mailbox in Smartlead, then rerun the Smartlead readiness test.
        </span>
        <ArrowRight size={14} className="text-muted-foreground" />
      </Link>
      <div className="grid sm:grid-cols-3 gap-1.5 text-[11px]">
        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-emerald-200">
          Smartlead account connected: <span className="font-mono">yes</span>
        </div>
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200">
          Sending mailbox: <span className="font-mono">missing</span>
        </div>
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200">
          Smartlead campaign: <span className="font-mono">missing</span>
        </div>
      </div>
    </Card>
  );
}