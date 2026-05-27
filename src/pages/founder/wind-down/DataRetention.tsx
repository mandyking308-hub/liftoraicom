import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { WdLayout, TagBadge } from "./_shared";
import { listDataRetention, listContractTerminations, listLegalReviews, fmtMoney } from "@/lib/windDownEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WindDownDataRetention() {
  const { data: items = [] } = useQuery({ queryKey: ["wd-data"], queryFn: listDataRetention });
  const { data: contracts = [] } = useQuery({ queryKey: ["wd-contracts"], queryFn: listContractTerminations });
  const { data: reviews = [] } = useQuery({ queryKey: ["wd-legal"], queryFn: listLegalReviews });
  return (
    <FounderLayout>
      <WdLayout title="Data retention, contracts & legal" subtitle="Datasets are archived not deleted. Contract terminations require legal review. Decisions feed the Founder Decision Register and Adviser Pack.">
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Data / retention</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {items.length === 0 && <p className="text-muted-foreground">No datasets queued.</p>}
            {items.map(d => (
              <div key={d.id} className="border border-border/40 rounded p-2 flex flex-wrap items-center gap-2">
                <span className="font-medium">{d.dataset}</span>
                <TagBadge label={d.action} tone={d.action === "delete" ? "bad" : "info"} />
                <TagBadge label={d.policy} tone="muted" />
                <TagBadge label={d.status} tone={d.status === "complete" ? "ok" : "warn"} />
                {d.retain_until && <span className="text-muted-foreground">until {d.retain_until}</span>}
                {d.archive_location && <span className="text-muted-foreground">@ {d.archive_location}</span>}
                {d.audit_trail_preserved && <TagBadge label="audit preserved" tone="ok" />}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Contract terminations</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {contracts.length === 0 && <p className="text-muted-foreground">No contracts queued.</p>}
            {contracts.map(c => (
              <div key={c.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.counterparty}</span>
                  <TagBadge label={c.contract_type} tone="info" />
                  <TagBadge label={`${c.notice_period_days}d notice`} tone="muted" />
                  {c.penalty_amount > 0 && <TagBadge label={`penalty ${fmtMoney(c.penalty_amount, c.currency)}`} tone="bad" />}
                  <TagBadge label={c.termination_status} tone={c.termination_status === "terminated" ? "ok" : "warn"} />
                  {c.legal_reviewed ? <TagBadge label="legal reviewed" tone="ok" /> : <TagBadge label="legal review pending" tone="warn" />}
                </div>
                {c.termination_clause_summary && <p className="text-muted-foreground">{c.termination_clause_summary}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="tech-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Legal / tax / adviser reviews</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            {reviews.length === 0 && <p className="text-muted-foreground">No reviews queued.</p>}
            {reviews.map(r => (
              <div key={r.id} className="border border-border/40 rounded p-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TagBadge label={r.review_type} tone="info" />
                  <span className="font-medium">{r.topic}</span>
                  {r.adviser && <span className="text-muted-foreground">→ {r.adviser}</span>}
                  <TagBadge label={r.status} tone={r.status === "complete" ? "ok" : "warn"} />
                  {r.feeds_decision_register && <TagBadge label="decision register" tone="info" />}
                </div>
                {r.question && <p className="text-muted-foreground">Q: {r.question}</p>}
                {r.recommendation && <p>Rec: {r.recommendation}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </WdLayout>
    </FounderLayout>
  );
}