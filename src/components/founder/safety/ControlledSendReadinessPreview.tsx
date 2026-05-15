import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Lock, Eye } from "lucide-react";

const ELIGIBLE_QUEUE_IDS = [
  "2925f001-efb0-4a69-ae35-eec0621b7ee1", // Pooja
  "de234038-5eb6-441f-ac4f-ba3ac4f466cc", // Aaliah
  "693a85df-0fae-4938-bbbe-b0791168d417", // Morgan
] as const;

const EXCLUDED_REVIEW_REQUIRED_COUNT = 7;

type Row = {
  queue_id: string;
  contact: any;
  queue: any;
  campaign: any;
  sequence: any;
  prior_step1: any;
};

const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
  <Badge
    variant="outline"
    className={
      ok
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
    }
  >
    {label}
  </Badge>
);

const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between gap-2 text-[11px]">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-mono text-foreground/90 text-right break-all">{v ?? "—"}</span>
  </div>
);

export default function ControlledSendReadinessPreview() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: queueRows, error: qErr } = await supabase
          .from("email_queue")
          .select("*")
          .in("id", ELIGIBLE_QUEUE_IDS as unknown as string[]);
        if (qErr) throw qErr;

        const out: Row[] = [];
        for (const q of queueRows ?? []) {
          const [contactRes, campaignRes, sequenceRes, priorRes] = await Promise.all([
            supabase.from("contacts").select("*").eq("id", q.contact_id).maybeSingle(),
            supabase.from("outreach_campaigns").select("*").eq("id", q.campaign_id).maybeSingle(),
            supabase
              .from("outreach_sequences")
              .select("step_number, subject, body")
              .eq("campaign_id", q.campaign_id)
              .eq("step_number", q.sequence_step)
              .maybeSingle(),
            supabase
              .from("email_queue")
              .select("id, status, sent_at, provider_message_id, smtp_accepted_at, sequence_step")
              .eq("contact_id", q.contact_id)
              .eq("campaign_id", q.campaign_id)
              .eq("sequence_step", 1)
              .order("sent_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);
          out.push({
            queue_id: q.id,
            queue: q,
            contact: contactRes.data,
            campaign: campaignRes.data,
            sequence: sequenceRes.data,
            prior_step1: priorRes.data,
          });
        }
        if (!cancelled) setRows(out);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card
      id="controlled-send-readiness"
      data-testid="controlled-send-readiness"
      className="p-5 space-y-5 border-2 border-yellow-500/30 scroll-mt-24"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-yellow-300" />
            <h3 className="text-base font-semibold">Controlled Send Readiness — Proof Send Preview</h3>
            <Badge className="gap-1 text-[10px] bg-yellow-500/15 text-yellow-200 border border-yellow-500/40">
              <Lock size={10} /> READ-ONLY
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl mt-1">
            Preview-only. No mutations. No SMTP. No Apollo. No queue/contact/compliance/system_settings/cron
            changes. Manual Send Apply is intentionally not built in this turn.
          </p>
        </div>
      </div>

      {/* 1. Safety state */}
      <section className="rounded-md border border-border/60 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-yellow-300" />
          <h4 className="text-sm font-semibold">1 · Safety state</h4>
        </div>
        <div className="grid sm:grid-cols-2 gap-1">
          <KV k="auto_send_enabled" v="false" />
          <KV k="cron_check" v="verified_disabled" />
          <KV k="worker fail-closed" v="yes" />
          <KV k="Manual Send Apply absent" v="yes" />
          <KV k="emails_sent (this task)" v="0" />
          <KV k="smtp_calls (this task)" v="0" />
          <KV k="apollo_calls (this task)" v="0" />
          <KV k="safety_status" v="SAFE_BLOCKED" />
        </div>
      </section>

      {/* 2. Eligible rows */}
      <section className="rounded-md border border-border/60 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">2 · Eligible proof-send rows (3 · valid_future_step_blocked)</h4>
          <Badge variant="outline" className="text-[10px]">{rows.length}/3 loaded</Badge>
        </div>
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {err && <p className="text-xs text-destructive">Error: {err}</p>}
        <div className="grid gap-3">
          {rows.map((r) => {
            const c = r.contact ?? {};
            const prior = r.prior_step1;
            const priorOk = !!(prior && prior.status === "sent" && prior.provider_message_id);
            const complianceOk = c.compliance_status === "outreach_allowed";
            const unsubOk = !!c.unsubscribe_token;
            const lawfulOk = !!c.lawful_basis;
            const noSuppress =
              !c.is_globally_suppressed && !c.hard_bounced && !c.unsubscribed_at && !c.do_not_contact_at;
            return (
              <div key={r.queue_id} className="rounded-md border p-3 space-y-2 bg-secondary/20">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-medium text-sm">
                    {c.name ?? "—"} <span className="text-muted-foreground">· {c.email ?? "—"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Pill ok={priorOk} label={`Step 1 sent: ${priorOk ? "yes" : "no"}`} />
                    <Pill ok={complianceOk} label={`compliance: ${c.compliance_status ?? "—"}`} />
                    <Pill ok={lawfulOk} label={`lawful_basis: ${c.lawful_basis ?? "—"}`} />
                    <Pill ok={unsubOk} label={`unsub token: ${unsubOk ? "yes" : "no"}`} />
                    <Pill ok={noSuppress} label={`suppression/bounce/DNC: ${noSuppress ? "clean" : "blocked"}`} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-1">
                  <KV k="queue_id" v={r.queue_id} />
                  <KV k="sequence_step" v={r.queue?.sequence_step} />
                  <KV k="campaign" v={r.campaign?.campaign_name ?? r.queue?.campaign_id} />
                  <KV k="assigned_business" v={c.assigned_business} />
                  <KV k="status" v={r.queue?.status} />
                  <KV k="scheduled_at" v={r.queue?.scheduled_at} />
                  <KV k="prior step 1 provider_message_id" v={prior?.provider_message_id ?? "—"} />
                  <KV k="prior step 1 sent_at" v={prior?.sent_at ?? "—"} />
                  <KV k="BCR" v="staged · eligible (Step 2 cadence after Step 1 send)" />
                  <KV
                    k="reason eligible for preview"
                    v="valid_future_step_blocked · brake-held only by auto_send_enabled=false"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Excluded */}
      <section className="rounded-md border border-border/60 p-3 space-y-2">
        <h4 className="text-sm font-semibold">3 · Excluded rows ({EXCLUDED_REVIEW_REQUIRED_COUNT} · review_required Step 4)</h4>
        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
          <li>Reason: missing compliance spine (no outreach_allowed / lawful_basis / unsubscribe token chain)</li>
          <li>Not selectable in this preview</li>
          <li>Not sendable</li>
        </ul>
      </section>

      {/* 4. Email content preview */}
      <section className="rounded-md border border-border/60 p-3 space-y-3">
        <h4 className="text-sm font-semibold">4 · Email content preview (Step 2)</h4>
        {rows.map((r) => (
          <div key={`tpl-${r.queue_id}`} className="rounded-md border p-3 bg-background/40">
            <div className="text-[11px] text-muted-foreground">{r.contact?.email}</div>
            {r.sequence?.subject && r.sequence?.body ? (
              <>
                <div className="text-sm font-medium mt-1">{r.sequence.subject}</div>
                <pre className="mt-1 text-[11px] whitespace-pre-wrap font-mono text-muted-foreground line-clamp-6">
                  {r.sequence.body}
                </pre>
              </>
            ) : (
              <p className="text-xs text-yellow-300">
                Template missing — cannot proceed to Manual Send Apply.
              </p>
            )}
          </div>
        ))}
      </section>

      {/* 5. Tracking disclosure readiness */}
      <section className="rounded-md border border-border/60 p-3 space-y-1">
        <h4 className="text-sm font-semibold">5 · Tracking disclosure readiness</h4>
        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
          <li>Tracking currently <span className="font-mono">not injected</span></li>
          <li>Privacy / footer disclosure required before open/click tracking</li>
          <li>Unsubscribe link/token required in body</li>
          <li>No tracking injection performed in this task</li>
        </ul>
      </section>

      {/* 6. Apply status */}
      <section className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs space-y-1">
        <p className="font-medium text-yellow-200">
          Manual Send Apply is not built. This page is preview-only.
        </p>
        <ul className="list-disc list-inside text-yellow-100/80 space-y-0.5">
          <li>No mutation button</li>
          <li>No send button</li>
          <li>No provider call</li>
        </ul>
      </section>
    </Card>
  );
}