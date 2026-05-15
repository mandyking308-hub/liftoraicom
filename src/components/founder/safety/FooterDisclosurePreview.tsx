import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Lock, Mail, ShieldCheck } from "lucide-react";

const ELIGIBLE_QUEUE_IDS = [
  "2925f001-efb0-4a69-ae35-eec0621b7ee1", // Pooja
  "de234038-5eb6-441f-ac4f-ba3ac4f466cc", // Aaliah
  "693a85df-0fae-4938-bbbe-b0791168d417", // Morgan
] as const;

const UNSUB_BASE = "https://liftorai.com/u/";

const FOOTER_TEXT = (unsubLink: string) =>
  `You are receiving this because we believe your professional role may be relevant to Neon Candy's music/media outreach. You can unsubscribe here: ${unsubLink}.`;

const TRACKING_DISCLOSURE =
  "We may use basic email engagement signals, such as opens or link clicks, to understand whether our outreach is relevant. Opens are treated as an approximate signal, not proof of reading.";

type Row = {
  queue_id: string;
  contact: any;
  queue: any;
  sequence: any;
};

const redactToken = (t?: string | null) => {
  if (!t) return null;
  if (t.length <= 10) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
};

const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
  <Badge
    variant="outline"
    className={
      ok
        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
        : "border-red-500/40 bg-red-500/10 text-red-300"
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

export default function FooterDisclosurePreview() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [includeTrackingDisclosure, setIncludeTrackingDisclosure] = useState(true);

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
          const [contactRes, sequenceRes] = await Promise.all([
            supabase.from("contacts").select("*").eq("id", q.contact_id).maybeSingle(),
            supabase
              .from("outreach_sequences")
              .select("step_number, subject, body")
              .eq("campaign_id", q.campaign_id)
              .eq("step_number", q.sequence_step)
              .maybeSingle(),
          ]);
          out.push({
            queue_id: q.id,
            queue: q,
            contact: contactRes.data,
            sequence: sequenceRes.data,
          });
        }
        if (!cancelled) setRows(out);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const summary = rows.reduce(
    (acc, r) => {
      const tok = r.contact?.unsubscribe_token;
      const hasBody = !!r.sequence?.body;
      if (tok) acc.with_token++; else acc.missing_token++;
      if (tok && hasBody) acc.footer_ready++;
      if (tok && hasBody && includeTrackingDisclosure) acc.disclosure_ready++;
      if (!tok || !hasBody) acc.blocked++;
      return acc;
    },
    { with_token: 0, missing_token: 0, footer_ready: 0, disclosure_ready: 0, blocked: 0 }
  );

  return (
    <Card
      id="footer-disclosure-preview"
      data-testid="footer-disclosure-preview"
      className="p-5 space-y-5 border-2 border-emerald-500/20 scroll-mt-24"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-300" />
            <h3 className="text-base font-semibold">Email Footer / Tracking Disclosure Preview</h3>
            <Badge className="gap-1 text-[10px] bg-yellow-500/15 text-yellow-200 border border-yellow-500/40">
              <Lock size={10} /> READ-ONLY
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl mt-1">
            Preview-only. No pixels injected. No template rewrite. No DB mutation. No SMTP/Apollo.
            Shows how every future controlled email will assemble footer + unsubscribe + optional
            tracking disclosure before any send/apply path is built.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="tracking-disclosure-toggle"
            checked={includeTrackingDisclosure}
            onCheckedChange={setIncludeTrackingDisclosure}
          />
          <Label htmlFor="tracking-disclosure-toggle" className="text-xs">
            Include tracking disclosure (preview only)
          </Label>
        </div>
      </div>

      {/* Readiness summary */}
      <section className="rounded-md border border-border/60 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
          <h4 className="text-sm font-semibold">Readiness summary</h4>
        </div>
        <div className="grid sm:grid-cols-2 gap-1">
          <KV k="rows with unsubscribe token" v={summary.with_token} />
          <KV k="rows missing unsubscribe token" v={summary.missing_token} />
          <KV k="rows with footer preview ready" v={summary.footer_ready} />
          <KV k="rows with tracking disclosure preview ready" v={summary.disclosure_ready} />
          <KV k="rows blocked (footer/token missing)" v={summary.blocked} />
          <KV k="emails_sent" v="0" />
          <KV k="smtp_calls" v="0" />
          <KV k="apollo_calls" v="0" />
          <KV k="open/click pixels injected" v="no" />
          <KV k="tracking currently injected" v="no" />
          <KV k="live_data_changed" v="false" />
        </div>
      </section>

      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {err && <p className="text-xs text-destructive">Error: {err}</p>}

      <div className="grid gap-3">
        {rows.map((r) => {
          const c = r.contact ?? {};
          const tok = c.unsubscribe_token as string | undefined;
          const unsubUrlFull = tok ? `${UNSUB_BASE}${tok}` : null;
          const unsubUrlSafe = tok ? `${UNSUB_BASE}${redactToken(tok)}` : "(missing)";
          const subject = r.sequence?.subject ?? null;
          const body = r.sequence?.body ?? null;
          const footer = FOOTER_TEXT(unsubUrlFull ?? "{{unsubscribe_link}}");
          const blocked = !tok || !body;

          const assembled = [
            body ?? "(template body missing)",
            "",
            "—",
            footer,
            includeTrackingDisclosure ? "" : null,
            includeTrackingDisclosure ? TRACKING_DISCLOSURE : null,
          ].filter((x) => x !== null).join("\n");

          return (
            <div key={r.queue_id} className="rounded-md border p-3 space-y-3 bg-secondary/20">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-medium text-sm">
                  {c.name ?? "—"} <span className="text-muted-foreground">· {c.email ?? "—"}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Pill ok={!!tok} label={`unsub token: ${tok ? "yes" : "no"}`} />
                  <Pill ok={!!body} label={`step 2 body: ${body ? "yes" : "missing"}`} />
                  <Pill ok={!blocked} label={blocked ? "BLOCKED for future send" : "footer ready"} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-1">
                <KV k="queue_id" v={r.queue_id} />
                <KV k="sequence_step" v={r.queue?.sequence_step} />
                <KV k="unsubscribe token (redacted)" v={redactToken(tok)} />
                <KV k="unsubscribe URL preview" v={unsubUrlSafe} />
                <KV k="tracking currently injected" v="no" />
                <KV k="tracking disclosure included" v={includeTrackingDisclosure ? "yes" : "no"} />
                <KV k="open/click pixels injected" v="no" />
              </div>

              <div className="rounded-md border p-3 bg-background/40">
                <div className="text-[11px] text-muted-foreground">Step 2 subject</div>
                <div className="text-sm font-medium">{subject ?? "(missing)"}</div>
              </div>

              <div className="rounded-md border p-3 bg-background/40">
                <div className="text-[11px] text-muted-foreground">Step 2 body (current template, unchanged)</div>
                <pre className="mt-1 text-[11px] whitespace-pre-wrap font-mono text-muted-foreground">
                  {body ?? "(template body missing — blocked)"}
                </pre>
              </div>

              <div className="rounded-md border p-3 bg-background/40">
                <div className="text-[11px] text-muted-foreground">Proposed footer</div>
                <pre className="mt-1 text-[11px] whitespace-pre-wrap font-mono text-foreground/90">
                  {footer}
                </pre>
              </div>

              {includeTrackingDisclosure && (
                <div className="rounded-md border p-3 bg-background/40">
                  <div className="text-[11px] text-muted-foreground">Tracking disclosure (optional)</div>
                  <pre className="mt-1 text-[11px] whitespace-pre-wrap font-mono text-foreground/90">
                    {TRACKING_DISCLOSURE}
                  </pre>
                </div>
              )}

              <div className="rounded-md border border-emerald-500/30 p-3 bg-emerald-500/5">
                <div className="text-[11px] text-emerald-300 font-medium">Final assembled email preview (read-only)</div>
                <div className="mt-2 text-[11px] text-muted-foreground">Subject:</div>
                <div className="text-sm font-medium">{subject ?? "(missing)"}</div>
                <div className="mt-2 text-[11px] text-muted-foreground">Body:</div>
                <pre className="mt-1 text-[11px] whitespace-pre-wrap font-mono text-foreground/90">
                  {assembled}
                </pre>
                <p className="mt-2 text-[10px] text-muted-foreground italic">
                  No tracking pixel injected. No DB write. Footer is rendered for preview only — live
                  templates are unchanged.
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}