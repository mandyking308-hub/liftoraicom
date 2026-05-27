import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { AttLayout, TagBadge } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listNeverHide } from "@/lib/attentionGuardEngine";

export default function SettingsPage() {
  const { data: items = [] } = useQuery({ queryKey: ["att-nevhide"], queryFn: listNeverHide });
  return (
    <FounderLayout>
      <AttLayout title="Attention Guard Settings" subtitle="Categories that must never be suppressed, hidden or deferred regardless of noise rules.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Never-hide categories</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {items.length === 0 && <p className="text-yellow-300">No never-hide categories defined.</p>}
            {items.map(n => (
              <div key={n.id} className="border border-border/40 rounded p-2 flex items-start gap-2">
                <TagBadge label={n.category} tone="bad" />
                <p className="flex-1 text-muted-foreground">{n.reason}</p>
                <TagBadge label={n.active ? "active" : "off"} tone={n.active ? "ok" : "muted"} />
              </div>
            ))}
          </CardContent>
        </Card>
      </AttLayout>
    </FounderLayout>
  );
}