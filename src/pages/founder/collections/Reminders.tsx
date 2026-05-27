import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { ColLayout, TagBadge } from "./_shared";
import { listReminders } from "@/lib/collectionsEngine";
import { Card, CardContent } from "@/components/ui/card";

export default function CollectionsReminders() {
  const { data: rows = [] } = useQuery({ queryKey: ["col-reminders"], queryFn: listReminders });
  return (
    <FounderLayout>
      <ColLayout title="Reminder Drafts" subtitle="Polite, firm or final reminder drafts. Liftor never sends a customer message without founder approval.">
        <Card className="tech-card">
          <CardContent className="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No reminder drafts.</p> : (
              <div className="divide-y divide-border/40">
                {rows.map(r => (
                  <div key={r.id} className="p-3 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{r.invoice_reference ?? "—"}</span>
                      <span className="text-muted-foreground">{r.business_name ?? "—"}</span>
                      <TagBadge label={r.channel} tone="info" />
                      <TagBadge label={r.tone} tone={r.tone === "final" ? "bad" : r.tone === "firm" ? "warn" : "ok"} />
                      <TagBadge label={r.approval_status} tone={r.approval_status === "sent" ? "ok" : r.approval_status === "approved" ? "info" : r.approval_status === "rejected" ? "bad" : "warn"} />
                      {r.requires_external_send && r.approval_status !== "sent" && <TagBadge label="external send gated" tone="warn" />}
                      {r.is_test_data && <TagBadge label={`test:${r.trace_id ?? ""}`} tone="info" />}
                    </div>
                    {r.draft_subject && <p className="font-medium">{r.draft_subject}</p>}
                    <pre className="p-2 rounded bg-secondary/40 whitespace-pre-wrap text-[11px] text-muted-foreground">{r.draft_body}</pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </ColLayout>
    </FounderLayout>
  );
}