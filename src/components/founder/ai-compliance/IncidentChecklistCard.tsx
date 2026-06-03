import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { INCIDENT_ESCALATION_CHECKLIST } from "@/lib/aiComplianceEngine";

export default function IncidentChecklistCard() {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          AI Incident Escalation Checklist
          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> Internal only
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Internal readiness only. No external notifications. No adviser contact. No external reports.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {INCIDENT_ESCALATION_CHECKLIST.map(item => (
            <li key={item.scenario} className="border border-border/40 rounded p-2 bg-background/40">
              <p className="font-medium">{item.label}</p>
              <ol className="list-decimal pl-4 text-[11px] text-muted-foreground space-y-0.5 mt-1">
                {item.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}