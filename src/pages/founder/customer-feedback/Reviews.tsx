import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { VocLayout, TagBadge } from "./_shared";
import { listReviewRequests } from "@/lib/voiceOfCustomerEngine";
import { Card, CardContent } from "@/components/ui/card";

export default function VocReviews() {
  const { data: rows = [] } = useQuery({ queryKey: ["voc-reviews"], queryFn: listReviewRequests });
  return (
    <FounderLayout>
      <VocLayout title="Review Requests" subtitle="Drafted asks for public or private reviews. Drafts remain unsent until founder explicitly approves the outbound send.">
        <Card className="tech-card">
          <CardContent className="p-0">
            {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No review request drafts.</p> : (
              <div className="divide-y divide-border/40">
                {rows.map(r => (
                  <div key={r.id} className="p-3 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.customer_label ?? "Unknown"} · {r.business_name ?? "—"}</span>
                      <TagBadge label={r.channel} />
                      {r.platform && <TagBadge label={r.platform} tone="info" />}
                      <TagBadge label={r.approval_status} tone={r.approval_status === "sent" ? "ok" : r.approval_status === "rejected" ? "muted" : "warn"} />
                      {r.requires_external_send && r.approval_status !== "sent" && <TagBadge label="send blocked" tone="info" />}
                      {r.is_test_data && <TagBadge label={`test:${r.trace_id ?? ""}`} tone="info" />}
                    </div>
                    {r.draft_subject && <p className="font-medium">{r.draft_subject}</p>}
                    <p className="text-muted-foreground whitespace-pre-wrap">{r.draft_body}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </VocLayout>
    </FounderLayout>
  );
}