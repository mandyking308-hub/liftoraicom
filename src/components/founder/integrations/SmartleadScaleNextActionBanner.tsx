import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function SmartleadScaleNextActionBanner() {
  return (
    <Card className="p-4 border-2 border-primary/40 bg-primary/5 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
          Top next action
        </Badge>
        <Badge variant="outline" className="text-[10px]">Smartlead scale lane</Badge>
        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
          IONOS / Pooja / Manual Send Apply: deferred
        </Badge>
      </div>

      <Link
        to="/founder/integrations#smartlead-scale-setup-checklist"
        className="flex items-center justify-between gap-3 rounded-md border border-primary/40 bg-background/40 p-3 hover:border-primary/70 transition-colors"
      >
        <span className="text-sm">
          Create one DRAFT Smartlead campaign named{" "}
          <span className="font-mono">“NeonCandy - Early Access Collaboration Test”</span>,
          then re-run Smartlead readiness and the campaign mapping preview.
        </span>
        <ArrowRight size={14} className="text-muted-foreground" />
      </Link>

      <Link
        to="/founder/integrations#smartlead-scale-setup-checklist"
        className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/30 p-2.5 hover:border-primary/40 transition-colors"
      >
        <span className="text-[12px]">
          Secondary: enable warmup for{" "}
          <span className="font-mono">hello@neoncandy.online</span> inside Smartlead.
        </span>
        <ArrowRight size={12} className="text-muted-foreground" />
      </Link>

      <div className="grid sm:grid-cols-3 gap-1.5 text-[11px]">
        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-emerald-200">
          Smartlead API: <span className="font-mono">connected</span>
        </div>
        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-emerald-200">
          Sending mailbox: <span className="font-mono">connected</span>
        </div>
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-amber-200">
          Smartlead campaign: <span className="font-mono">missing</span>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Deferred / parked: IONOS proof-send, Pooja Manual Send Apply, and the 7
        review_required Step 4 rows remain SAFE_BLOCKED on the native Liftor / IONOS
        queue lane and are not on the Smartlead scale path.
      </p>
    </Card>
  );
}
