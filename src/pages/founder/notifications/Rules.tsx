import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { NCLayout, NCSection } from "./_shared";
import { fetchRules, type NotificationRule } from "@/lib/notificationCentreEngine";

export default function NotificationsRules() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  useEffect(() => { fetchRules().then(setRules); }, []);
  return (
    <NCLayout title="Notification Rules" subtitle="View notification rules: severity mapping, duplicate suppression and escalation routing.">
      <NCSection title={`Rules (${rules.length})`}>
        <div className="space-y-2 text-xs">
          {rules.map(r => (
            <div key={r.id} className="border border-border/50 rounded p-2 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${r.active ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                  {r.active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{r.source_module}</Badge>
                <Badge variant="outline" className="text-[10px]">sev: {r.severity}</Badge>
                <Badge variant="outline" className="text-[10px]">pri: {r.priority}</Badge>
                {r.create_escalation && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">escalate → {r.escalation_type}</Badge>}
                <span className="ml-auto text-[10px] text-muted-foreground">dedup {r.suppress_duplicates_window_minutes}m</span>
              </div>
              <p className="font-medium">{r.rule_name}</p>
            </div>
          ))}
          {rules.length === 0 && <p className="text-muted-foreground">No rules configured.</p>}
        </div>
      </NCSection>
    </NCLayout>
  );
}