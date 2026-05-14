import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

export type DecisionOption =
  | "leave_under_review"
  | "recommend_park_followup"
  | "recommend_compliance_remediation_review"
  | "recommend_do_not_contact";

const OPTIONS: { id: DecisionOption; label: string; help: string }[] = [
  { id: "leave_under_review", label: "Leave under review", help: "Leave under review — no data changes." },
  { id: "recommend_park_followup", label: "Recommend park followup", help: "Recommended if founder does not want to remediate old outreach records." },
  { id: "recommend_compliance_remediation_review", label: "Recommend compliance remediation review", help: "Requires founder confirmation of lawful basis before any update." },
  { id: "recommend_do_not_contact", label: "Recommend do-not-contact", help: "Use only if founder decides no further outreach should ever be sent." },
];

const fmt = (s: string | null | undefined) => (s ? new Date(s).toISOString().slice(0, 16).replace("T", " ") : "—");
const yn = (b: boolean | null | undefined) => (b === true ? "yes" : b === false ? "no" : "—");

function defaultRecommendation(it: any): DecisionOption {
  // Conservative: prior steps sent but missing lawful_basis & unsubscribe_token → park followup.
  const priorSent = (it.prior_sent_steps?.length ?? 0) > 0;
  const missingBasis = !it.lawful_basis;
  const missingUnsub = !it.unsubscribe_token_present;
  if (priorSent && missingBasis && missingUnsub) return "recommend_park_followup";
  return "leave_under_review";
}

export const ReviewRequiredDecisionGate = ({ items }: { items: any[] }) => {
  const reviewItems = useMemo(
    () => (items ?? []).filter((i) => i.classification === "review_required"),
    [items],
  );
  const [decisions, setDecisions] = useState<Record<string, DecisionOption>>(() => {
    const init: Record<string, DecisionOption> = {};
    for (const it of reviewItems) init[it.queue_id] = defaultRecommendation(it);
    return init;
  });

  const counts = useMemo(() => {
    const c = {
      total: reviewItems.length,
      park: 0,
      remediation: 0,
      do_not_contact: 0,
      under_review: 0,
      with_prior_proof: 0,
      missing_lawful_basis: 0,
      missing_unsubscribe_token: 0,
      bcr_valid: 0,
      suppression_blockers: 0,
      prior_reply: 0,
    };
    for (const it of reviewItems) {
      const d = decisions[it.queue_id] ?? defaultRecommendation(it);
      if (d === "recommend_park_followup") c.park += 1;
      if (d === "recommend_compliance_remediation_review") c.remediation += 1;
      if (d === "recommend_do_not_contact") c.do_not_contact += 1;
      if (d === "leave_under_review") c.under_review += 1;
      if ((it.prior_sent_steps?.length ?? 0) > 0) c.with_prior_proof += 1;
      if (!it.lawful_basis) c.missing_lawful_basis += 1;
      if (!it.unsubscribe_token_present) c.missing_unsubscribe_token += 1;
      if (it.bcr_business_match && it.bcr_campaign_eligible !== false && it.bcr_do_not_contact !== true) c.bcr_valid += 1;
      if ((it.blockers ?? []).some((b: string) => ["globally_suppressed", "hard_bounced", "unsubscribed", "do_not_contact"].includes(b))) c.suppression_blockers += 1;
      if (it.prior_reply) c.prior_reply += 1;
    }
    return c;
  }, [reviewItems, decisions]);

  const setDecision = (id: string, d: DecisionOption) =>
    setDecisions((prev) => ({ ...prev, [id]: d }));

  return (
    <Card id="review-required-decision-gate" data-testid="review-required-decision-gate">
      <CardHeader>
        <CardTitle>Review Required Queue Rows — Decision Gate</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Read-only founder decision gate for pending rows where the compliance spine is incomplete.
          No apply path. No emails sent. No SMTP / Apollo / queue / contact / BCR / compliance / system_settings / cron mutations.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Alert>
          <ShieldAlert />
          <AlertTitle>Preview only — no mutation path in this view</AlertTitle>
          <AlertDescription>
            These rows must not be auto-approved, remediated, sent, parked or cancelled without a founder decision gate
            with an explicit apply path (built in a later task).
          </AlertDescription>
        </Alert>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          <Stat label="review_required total" value={counts.total} />
          <Stat label="default → park" value={counts.park} />
          <Stat label="eligible → remediation review" value={counts.remediation} />
          <Stat label="recommended do-not-contact" value={counts.do_not_contact} />
          <Stat label="left under review" value={counts.under_review} />
          <Stat label="with prior Step 1/2/3 proof" value={counts.with_prior_proof} />
          <Stat label="missing lawful_basis" value={counts.missing_lawful_basis} />
          <Stat label="missing unsubscribe_token" value={counts.missing_unsubscribe_token} />
          <Stat label="BCR valid" value={counts.bcr_valid} />
          <Stat label="suppression blockers" value={counts.suppression_blockers} />
          <Stat label="prior reply risk" value={counts.prior_reply} />
        </div>

        {/* Mutation counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          {[
            ["dry_run", "true"],
            ["rows_changed", 0],
            ["contacts_changed", 0],
            ["bcrs_changed", 0],
            ["compliance_records_changed", 0],
            ["queue_rows_changed", 0],
            ["emails_sent", 0],
            ["smtp_calls", 0],
            ["apollo_calls", 0],
            ["system_settings_changed", 0],
            ["cron_changed", 0],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded border bg-muted/30 px-2 py-1.5">
              <div className="text-muted-foreground">{String(k)}</div>
              <div className="font-mono">{String(v)}</div>
            </div>
          ))}
        </div>

        {reviewItems.length === 0 ? (
          <div className="text-xs text-muted-foreground">No review_required rows.</div>
        ) : (
          <div className="space-y-3">
            {reviewItems.map((it) => {
              const d = decisions[it.queue_id] ?? defaultRecommendation(it);
              return (
                <div key={it.queue_id} className="rounded-md border p-3 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium">
                        {it.contact_name ?? "—"}{" "}
                        <span className="text-muted-foreground text-xs">{it.contact_email}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        queue: <span className="font-mono">{it.queue_id}</span> · contact: <span className="font-mono">{it.contact_id}</span>
                        {it.bcr_business_match && <> · bcr: matched</>}
                      </div>
                    </div>
                    <Badge variant="outline">Step {it.sequence_step}</Badge>
                  </div>

                  <div className="grid md:grid-cols-3 gap-2 text-[11px]">
                    <Field k="scheduled_at" v={fmt(it.scheduled_at)} />
                    <Field k="last sent step" v={`${it.last_sent_step ?? "—"} @ ${fmt(it.last_sent_at)}`} />
                    <Field k="step 4 follows last" v={yn(it.follows_last_sent_step)} />
                    <Field k="prior sent steps" v={`[${(it.prior_sent_steps ?? []).join(",")}]`} />
                    <Field k="prior sent_at" v={(it.prior_sent_at ?? []).map(fmt).join(", ") || "—"} />
                    <Field k="prior msg-ids" v={(it.prior_provider_message_ids ?? []).join(", ") || "—"} />
                    <Field k="compliance_status" v={it.compliance_status ?? "—"} />
                    <Field k="lawful_basis" v={it.lawful_basis ?? "—"} />
                    <Field k="lawful_basis_recorded_at" v={fmt(it.lawful_basis_recorded_at)} />
                    <Field k="unsubscribe_token" v={yn(it.unsubscribe_token_present)} />
                    <Field k="retention_until" v={fmt(it.retention_until)} />
                    <Field k="contact_status" v={it.contact_status ?? "—"} />
                    <Field k="suppression / DNC" v={[
                      it.is_globally_suppressed && "globally_suppressed",
                      it.hard_bounced && "hard_bounced",
                      it.unsubscribed_at && "unsubscribed",
                      it.do_not_contact && "do_not_contact",
                    ].filter(Boolean).join(", ") || "none"} />
                    <Field k="bcr.current_stage" v={it.bcr_current_stage ?? "—"} />
                    <Field k="bcr.qualification" v={it.bcr_qualification ?? "—"} />
                    <Field k="bcr.campaign_eligible" v={yn(it.bcr_campaign_eligible)} />
                    <Field k="bcr.do_not_contact" v={yn(it.bcr_do_not_contact)} />
                  </div>

                  <div className="text-[11px]">
                    <span className="text-muted-foreground">blockers:</span>{" "}
                    {(it.blockers ?? []).length === 0
                      ? "none"
                      : (it.blockers ?? []).map((b: string) => (
                          <Badge key={b} variant="outline" className="ml-1 text-[10px]">{b}</Badge>
                        ))}
                  </div>
                  <div className="text-[11px]">
                    <span className="text-muted-foreground">current recommendation:</span>{" "}
                    <span className="font-mono">{it.recommended_action}</span>
                  </div>

                  <div className="rounded border bg-muted/30 p-2 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      Safest decision options (preview only — no apply in this view):
                    </div>
                    <div className="flex flex-col gap-1">
                      {OPTIONS.map((opt) => (
                        <label key={opt.id} className="flex items-start gap-2 text-[11px]">
                          <input
                            type="radio"
                            name={`decision-${it.queue_id}`}
                            value={opt.id}
                            checked={d === opt.id}
                            onChange={() => setDecision(it.queue_id, opt.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">{opt.label}</span>{" "}
                            <span className="text-muted-foreground">— {opt.help}</span>
                            {defaultRecommendation(it) === opt.id && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">default</Badge>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded border bg-muted/30 px-2 py-1.5">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="font-mono text-sm">{String(value)}</div>
  </div>
);

const Field = ({ k, v }: { k: string; v: string }) => (
  <div className="rounded border bg-muted/20 px-2 py-1">
    <div className="text-muted-foreground">{k}</div>
    <div className="font-mono break-all">{v}</div>
  </div>
);

export default ReviewRequiredDecisionGate;