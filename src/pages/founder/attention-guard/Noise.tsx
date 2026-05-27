import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AttLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listNoiseRules } from "@/lib/attentionGuardEngine";

export default function NoisePage() {
  const { data: rules = [] } = useQuery({ queryKey: ["att-noise"], queryFn: listNoiseRules });
  return (
    <FounderLayout>
      <AttLayout title="Noise & Suppression Rules" subtitle="Patterns the Attention Agent uses to merge, defer or suppress low-signal items before they reach the cockpit.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Rules ({rules.length})</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {rules.length === 0 && <p className="text-muted-foreground">No noise rules defined.</p>}
            {rules.map(r => (
              <div key={r.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium flex-1">{r.rule_name}</span>
                  <TagBadge label={r.action} tone={r.action === "suppress" ? "bad" : r.action === "defer" ? "warn" : "info"} />
                  <TagBadge label={r.active ? "active" : "off"} tone={r.active ? "ok" : "muted"} />
                </div>
                <code className="text-[10px] text-primary block">{r.match_pattern}</code>
                {r.reason && <p className="text-[11px] text-muted-foreground">{r.reason}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </AttLayout>
    </FounderLayout>
  );
}