import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CSLayout, CSSection, CSEmptyState } from "./_shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, MicOff, PhoneOff, Ban, AlertTriangle, UserCog, Lock, FileWarning } from "lucide-react";

const SEVERITY_TONE: Record<string, string> = {
  info:     "bg-muted text-muted-foreground",
  normal:   "bg-sky-500/15 text-sky-300 border-sky-500/30",
  warn:     "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  high:     "bg-orange-500/15 text-orange-300 border-orange-500/30",
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function SafetyCentre() {
  const { data, isLoading } = useQuery({
    queryKey: ["cs-safety-centre"],
    queryFn: async () => {
      const sb: any = supabase;
      const [events, conversations, closes, contactSafety, claims, triggers] = await Promise.all([
        sb.from("customer_sales_safety_events").select("*").order("created_at", { ascending: false }).limit(100),
        sb.from("customer_sales_conversations").select("id,recording_notice_required,recording_notice_given,customer_consented,transcript_notice_given,jurisdiction,prohibited_claim_warnings,escalation_triggered,conversation_status,created_at").order("created_at", { ascending: false }).limit(200),
        sb.from("customer_sales_close_actions").select("id,close_action_type,approval_status,action_status,risk_flags,missing_info,amount,currency,created_at"),
        sb.from("customer_sales_contact_safety").select("*"),
        sb.from("customer_sales_prohibited_claims").select("*").eq("active", true).order("severity"),
        sb.from("customer_sales_escalation_triggers").select("*").eq("active", true).order("severity"),
      ].map(p => p.catch(() => ({ data: [] }))));
      return {
        events: (events.data ?? []) as any[],
        conversations: (conversations.data ?? []) as any[],
        closes: (closes.data ?? []) as any[],
        contactSafety: (contactSafety.data ?? []) as any[],
        claims: (claims.data ?? []) as any[],
        triggers: (triggers.data ?? []) as any[],
      };
    },
  });

  const stats = useMemo(() => {
    const convos = data?.conversations ?? [];
    const consentIssues = convos.filter(c => c.recording_notice_required && !c.customer_consented).length;
    const claimWarnings = convos.reduce((s, c) => s + (Array.isArray(c.prohibited_claim_warnings) ? c.prohibited_claim_warnings.length : 0), 0);
    const escalations = convos.reduce((s, c) => s + (Array.isArray(c.escalation_triggered) ? c.escalation_triggered.length : 0), 0);
    const closesPending = (data?.closes ?? []).filter(x => (x.approval_status ?? "pending") === "pending").length;
    const cs = data?.contactSafety ?? [];
    const suppressed = cs.filter(c => c.on_suppression_list || c.do_not_call || c.opt_out).length;
    const blockedCalls = (data?.events ?? []).filter(e => e.event_category === "outbound_call" && e.decision === "blocked").length;
    return { consentIssues, claimWarnings, escalations, closesPending, suppressed, blockedCalls };
  }, [data]);

  return (
    <CSLayout
      title="Safety Centre"
      subtitle="Consent, outbound eligibility, prohibited claims, escalation triggers and close-safety. This layer locks unsafe external action — internal preparation continues to run."
    >
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={MicOff}     label="Consent issues"          value={stats.consentIssues}  tone="warn" />
        <Stat icon={PhoneOff}   label="Blocked outbound calls"  value={stats.blockedCalls}   tone="high" />
        <Stat icon={Ban}        label="Suppressed contacts"     value={stats.suppressed}     tone="high" />
        <Stat icon={FileWarning}label="Prohibited-claim warnings" value={stats.claimWarnings} tone="critical" />
        <Stat icon={UserCog}    label="Escalations"             value={stats.escalations}    tone="critical" />
        <Stat icon={Lock}       label="Closes awaiting approval" value={stats.closesPending} tone="warn" />
      </div>

      <CSSection title="Recent safety events" description="Every safety decision is logged with rule, data used, approval requirement and whether any external side effect occurred.">
        {isLoading ? <p className="text-xs text-muted-foreground">Loading…</p>
          : (data?.events ?? []).length === 0 ? (
            <CSEmptyState title="No safety events yet" hint="Events will appear as conversations, calls and close actions are evaluated." />
          ) : (
            <ul className="space-y-1 text-[11px]">
              {(data?.events ?? []).slice(0, 30).map(e => (
                <li key={e.id} className="rounded border border-border/40 bg-background/40 p-2 flex flex-wrap items-start gap-2">
                  <Badge variant="outline" className={`text-[10px] ${SEVERITY_TONE[e.severity] ?? ""}`}>{e.severity}</Badge>
                  <Badge variant="outline" className="text-[10px]">{e.event_category}</Badge>
                  <Badge variant="outline" className="text-[10px]">{e.decision}</Badge>
                  <span className="font-mono">{e.rule_key}</span>
                  {e.approval_required && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval required</Badge>}
                  {e.external_side_effect && <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/30">external side effect</Badge>}
                  <span className="text-muted-foreground ml-auto">{new Date(e.created_at).toLocaleString()}</span>
                  {e.reason && <p className="basis-full text-muted-foreground">{e.reason}</p>}
                </li>
              ))}
            </ul>
          )}
      </CSSection>

      <CSSection title="Consent tracking" description="Conversations where recording notice is required but consent has not been recorded.">
        {(() => {
          const issues = (data?.conversations ?? []).filter(c => c.recording_notice_required && !c.customer_consented).slice(0, 30);
          if (issues.length === 0) return <CSEmptyState title="No consent issues" hint="All conversations recorded so far have captured the required notice." />;
          return (
            <ul className="space-y-1 text-[11px]">
              {issues.map(c => (
                <li key={c.id} className="rounded border border-yellow-500/30 bg-yellow-500/5 p-2 flex flex-wrap gap-2">
                  <span className="font-mono">{String(c.id).slice(0, 8)}</span>
                  <span>jurisdiction: {c.jurisdiction ?? "—"}</span>
                  <span>notice given: {c.recording_notice_given ? "yes" : "no"}</span>
                  <span>transcript notice: {c.transcript_notice_given ? "yes" : "no"}</span>
                  <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">consent missing</Badge>
                </li>
              ))}
            </ul>
          );
        })()}
      </CSSection>

      <div className="grid lg:grid-cols-2 gap-3">
        <CSSection title="Prohibited claim library" description="The sales agent must never produce these statements unless explicitly approved.">
          <ul className="space-y-1 text-[11px]">
            {(data?.claims ?? []).map(c => (
              <li key={c.id} className="rounded border border-border/40 bg-background/40 p-2 flex flex-wrap items-start gap-2">
                <Badge variant="outline" className={`text-[10px] ${SEVERITY_TONE[c.severity] ?? ""}`}>{c.severity}</Badge>
                <span className="font-semibold">{c.claim_label}</span>
                <span className="text-muted-foreground">· {c.category}</span>
                {c.description && <p className="basis-full text-muted-foreground">{c.description}</p>}
              </li>
            ))}
          </ul>
        </CSSection>

        <CSSection title="Escalation triggers" description="When detected, the conversation is handed to Mandy or a human teammate.">
          <ul className="space-y-1 text-[11px]">
            {(data?.triggers ?? []).map(t => (
              <li key={t.id} className="rounded border border-border/40 bg-background/40 p-2 flex flex-wrap items-start gap-2">
                <Badge variant="outline" className={`text-[10px] ${SEVERITY_TONE[t.severity] ?? ""}`}>{t.severity}</Badge>
                <span className="font-semibold">{t.trigger_label}</span>
                {t.description && <p className="basis-full text-muted-foreground">{t.description}</p>}
              </li>
            ))}
          </ul>
        </CSSection>
      </div>

      <CSSection title="Outbound suppression list" description="Contacts blocked from outbound calls by opt-out, DNC or manual suppression.">
        {(() => {
          const list = (data?.contactSafety ?? []).filter(c => c.opt_out || c.do_not_call || c.on_suppression_list);
          if (list.length === 0) return <CSEmptyState title="No suppressed contacts" />;
          return (
            <ul className="space-y-1 text-[11px]">
              {list.map(c => (
                <li key={c.id} className="rounded border border-border/40 bg-background/40 p-2 flex flex-wrap gap-2">
                  <span className="font-mono">contact:{String(c.contact_id ?? "—").slice(0, 8)}</span>
                  {c.opt_out && <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/30">opt-out</Badge>}
                  {c.do_not_call && <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/30">DNC</Badge>}
                  {c.on_suppression_list && <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/30">suppressed</Badge>}
                  {c.vulnerable_flag && <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">vulnerable</Badge>}
                  {c.suppression_reason && <span className="text-muted-foreground">— {c.suppression_reason}</span>}
                </li>
              ))}
            </ul>
          );
        })()}
      </CSSection>

      <Card className="tech-card p-3 text-[11px] text-muted-foreground flex gap-2">
        <ShieldAlert size={14} className="text-yellow-400 shrink-0 mt-0.5" />
        <span>This layer locks unsafe external action only. Internal preparation, analysis, drafting, CRM updates and recommendations continue to run live. External calls, messages, payments and contracts remain approval-gated.</span>
      </Card>
    </CSLayout>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "warn" | "high" | "critical" }) {
  const cls = tone === "warn" ? "text-yellow-300" : tone === "high" ? "text-orange-300" : "text-rose-300";
  return (
    <Card className="tech-card p-3 space-y-1">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon size={12} /> {label}
      </div>
      <p className={`text-xl font-semibold ${cls}`}>{value}</p>
    </Card>
  );
}

function AlertNote() { return <AlertTriangle size={12} className="text-yellow-400" />; }