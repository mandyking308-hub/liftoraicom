import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { SchedLayout } from "./_shared";

const PROVIDERS = [
  { id: "google_calendar", name: "Google Calendar", status: "not_connected" },
  { id: "calendly",        name: "Calendly",        status: "not_connected" },
  { id: "microsoft",       name: "Microsoft Calendar", status: "not_connected" },
  { id: "manual",          name: "Manual scheduling", status: "available" },
];

export default function Settings() {
  return (
    <SchedLayout title="Scheduling Settings" subtitle="Provider connections and approval rules.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Calendar providers</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-2">
          {PROVIDERS.map(p => (
            <div key={p.id} className="flex items-center justify-between border border-border/50 rounded p-2">
              <span>{p.name}</span>
              {p.status === "available"
                ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Available</Badge>
                : <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Not connected</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Approval policy</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Sending booking link to customer — founder approval required</p>
          <p>• Creating external calendar event — founder approval required</p>
          <p>• Committing operator/adviser time externally — founder approval required</p>
          <p>• Customer reschedule/no-show outreach — founder approval required</p>
          <p>• Internal draft creation, conflict detection, slot recommendations — live</p>
          <p>• Pre-approved rules can be configured per booking type per business</p>
        </CardContent>
      </Card>
    </SchedLayout>
  );
}