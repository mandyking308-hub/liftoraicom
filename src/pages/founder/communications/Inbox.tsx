import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Inbox as InboxIcon, LockKeyhole, MailWarning, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CommsLayout, Stat, StatusBadge } from "./_shared";
import {
  filterInboxRows,
  isVerifiedBusinessScope,
  loadUnifiedInboxSnapshot,
  newInLast24Hours,
  type UnifiedInboxRow,
} from "@/lib/unifiedInbox";
import {
  reviewExternalReply,
  selectOriginalReplySender,
  type EscalationKind,
} from "../../../../supabase/functions/_shared/unifiedInboundSafety";

const SOURCE_LABELS: Record<string, string> = {
  ledger: "Communications ledger",
  legacy_imap: "Legacy IMAP",
  smartlead: "Smartlead event",
  multi_channel: "Multi-channel",
  kindnesss_handoff: "Kindnesss handoff",
  privacy: "Privacy case",
};

const HEALTH_LABELS: Record<string, string> = {
  available: "Existing data available",
  not_configured: "Not configured",
  sync_missing: "Sync missing",
  unverified: "Unverified",
  error: "Error",
};

function age(value: string): string {
  return Number.isNaN(Date.parse(value)) ? "Time unverified" : formatDistanceToNow(new Date(value), { addSuffix: true });
}

function rowFlags(row: UnifiedInboxRow): string[] {
  return [
    row.replied ? "replied" : null,
    row.optOut ? "opt-out" : null,
    !row.businessId ? "unassigned" : null,
    row.needsReview ? "needs review" : null,
    row.failed ? "failed" : null,
    row.quarantine ? "quarantine" : null,
  ].filter((flag): flag is string => Boolean(flag));
}

export default function CommsInbox() {
  const snapshotQuery = useQuery({
    queryKey: ["founder-unified-inbox-phase1"],
    queryFn: loadUnifiedInboxSnapshot,
    refetchInterval: 60_000,
  });
  const snapshot = snapshotQuery.data;
  const [businessId, setBusinessId] = useState("");
  const [source, setSource] = useState("");
  const [view, setView] = useState<"all" | "unassigned" | "needs_review" | "failed" | "quarantine">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [escalation, setEscalation] = useState<EscalationKind>("none");

  const rows = useMemo(() => filterInboxRows(snapshot?.rows ?? [], {
    businessId: businessId || undefined,
    source: source || undefined,
    view,
  }), [snapshot?.rows, businessId, source, view]);
  const businessName = useMemo(() => new Map((snapshot?.businesses ?? []).map((business) => [business.id, business.name])), [snapshot?.businesses]);
  const selected = snapshot?.rows.find((row) => row.id === selectedId) ?? null;
  const selectedScopeVerified = selected && snapshot ? isVerifiedBusinessScope(selected, snapshot.businesses) : false;
  const selectedBusiness = selected?.businessId ? businessName.get(selected.businessId) : null;

  const senderDecision = useMemo(() => {
    if (!selected?.businessId || !snapshot) return { ok: false as const, reason: "verified_business_scope_required" };
    return selectOriginalReplySender({
      businessId: selected.businessId,
      originalMailboxId: selected.mailboxId,
      allocations: snapshot.allocations.map((allocation) => ({
        mailboxId: allocation.mailbox_id,
        businessId: allocation.business_id ?? "",
        active: allocation.allocation_status === "active",
        threadSticky: allocation.thread_sticky,
      })),
      mailboxes: snapshot.senders.map((mailbox) => ({
        id: mailbox.id,
        address: mailbox.email,
        estate: mailbox.estate_classification === "ghat" ? "ghat" : "gsm",
        active: mailbox.active,
        retired: mailbox.retired,
        readiness: mailbox.readiness_state,
        providerHealth: mailbox.provider_health,
        lastProviderCheckAt: mailbox.last_provider_check_at,
      })),
    });
  }, [selected, snapshot]);

  const replyDecision = selected?.businessId ? reviewExternalReply({
    businessId: selected.businessId,
    draftBusinessId: selected.businessId,
    sender: senderDecision,
    humanApproved: false,
    separatelyApprovedPriorPolicy: false,
    existingSendGatesPassed: false,
    escalation,
  }) : null;

  return (
    <CommsLayout
      title="Unified Inbox"
      subtitle="Founder/admin view across existing commercial communications. Privacy work is kept in a separate metadata-only queue. No ingestion, provider mutation or external reply is activated."
    >
      <Card className="tech-card p-4 flex items-start gap-3" data-testid="phase1-read-only">
        <LockKeyhole className="h-5 w-5 shrink-0 text-primary" />
        <div className="text-xs space-y-1">
          <p className="font-semibold">Source-only Phase 1 · durable fan-in disabled</p>
          <p className="text-muted-foreground">Existing records remain in their original paths. New signed fan-in requires the pending schema, deployed adapter and explicit feature flag. No auto-reply, campaign, queue or provider setting is changed here.</p>
        </div>
      </Card>

      <Card className="tech-card p-4 flex items-center justify-between gap-3 flex-wrap" data-testid="privacy-separation">
        <div className="text-xs">
          <p className="font-semibold">Privacy is not a sales conversation</p>
          <p className="text-muted-foreground">Kindnesss privacy references, ownership and due alerts are excluded from these commercial rows.</p>
        </div>
        <Link to="/founder/communications/privacy" className="text-xs text-primary hover:underline">Open separate privacy operations</Link>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Visible records" value={snapshotQuery.isLoading ? "…" : rows.length} hint="After current filters" />
        <Stat label="New · 24h" value={snapshot ? newInLast24Hours(rows) : "…"} hint="Based on received time" />
        <Stat label="Unread" value="Not tracked" hint="Pending read-state schema" tone="warn" />
        <Stat label="Needs review" value={snapshot ? rows.filter((row) => row.needsReview).length : "…"} tone="warn" />
        <Stat label="Failed" value={snapshot ? rows.filter((row) => row.failed).length : "…"} tone={rows.some((row) => row.failed) ? "bad" : undefined} />
        <Stat label="Quarantine" value={snapshot ? rows.filter((row) => row.quarantine).length : "…"} tone={rows.some((row) => row.quarantine) ? "warn" : undefined} />
      </div>

      <Card className="tech-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold">Portfolio estate and separation</h2>
            <p className="text-xs text-muted-foreground">Actual registry counts when readable. GHAT charitable communications are excluded from commercial routing and sender selection.</p>
          </div>
          <Badge variant="outline">GHAT excluded</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded border border-border/50 p-3"><span className="text-muted-foreground">GSM mailboxes</span><p className="text-lg font-semibold">{snapshot?.estateCounts.gsm ?? "Unverified"}</p></div>
          <div className="rounded border border-border/50 p-3"><span className="text-muted-foreground">GHAT · separate</span><p className="text-lg font-semibold">{snapshot?.estateCounts.ghat ?? "Unverified"}</p></div>
          <div className="rounded border border-border/50 p-3"><span className="text-muted-foreground">GSM allocations</span><p className="text-lg font-semibold">{snapshot?.estateCounts.allocations ?? "Unverified"}</p></div>
        </div>
      </Card>

      <section aria-labelledby="source-health" className="space-y-2">
        <h2 id="source-health" className="text-sm font-semibold">Source health and delivery diagnostics</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {(snapshot?.diagnostics ?? []).map((item) => (
            <Card key={item.key} className="tech-card p-3 space-y-2" data-testid={`diagnostic-${item.key}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold">{item.label}</h3>
                <Badge variant={item.health === "available" ? "secondary" : "outline"}>{HEALTH_LABELS[item.health]}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{item.detail}</p>
              <dl className="grid grid-cols-2 gap-1 text-[10px]">
                <div><dt className="text-muted-foreground">Last sync/event</dt><dd>{item.lastSync ? new Date(item.lastSync).toLocaleString() : "Unverified / none recorded"}</dd></div>
                <div><dt className="text-muted-foreground">Failed</dt><dd>{item.failed ?? "Unverified"}</dd></div>
                <div><dt className="text-muted-foreground">Retry</dt><dd>{item.retry ?? "Unverified"}</dd></div>
                <div><dt className="text-muted-foreground">Dead letter</dt><dd>{item.deadLetter ?? "Unverified"}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      </section>

      {(snapshot?.errors.length ?? 0) > 0 && (
        <Card className="tech-card p-4 border-destructive/50" role="alert">
          <div className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4" /> Some sources could not be read</div>
          <ul className="mt-2 text-xs text-muted-foreground space-y-1">{snapshot?.errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </Card>
      )}

      <Card className="tech-card p-3">
        <div className="grid md:grid-cols-3 gap-2 text-xs">
          <div>
            <Label htmlFor="inbox-business" className="text-xs">Business</Label>
            <select id="inbox-business" aria-label="Filter inbox by business" className="mt-1 h-9 w-full bg-background border border-border/50 rounded px-2" value={businessId} onChange={(event) => { setBusinessId(event.target.value); setSelectedId(null); }}>
              <option value="">All registered businesses</option>
              {(snapshot?.businesses ?? []).map((business) => <option key={business.id} value={business.id}>{business.name}{business.archived_at ? " · archived" : ""}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="inbox-source" className="text-xs">Channel / source</Label>
            <select id="inbox-source" aria-label="Filter inbox by source" className="mt-1 h-9 w-full bg-background border border-border/50 rounded px-2" value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">All existing sources</option>
              {Object.entries(SOURCE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="inbox-view" className="text-xs">Work view</Label>
            <select id="inbox-view" aria-label="Filter inbox by work status" className="mt-1 h-9 w-full bg-background border border-border/50 rounded px-2" value={view} onChange={(event) => setView(event.target.value as typeof view)}>
              <option value="all">All visible records</option>
              <option value="unassigned">Unassigned</option>
              <option value="needs_review">Needs review</option>
              <option value="failed">Failed / retry diagnostics</option>
              <option value="quarantine">Founder quarantine</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="tech-card p-0 overflow-x-auto">
        <table className="w-full min-w-[1040px] text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr><th className="text-left p-2">Business</th><th className="text-left p-2">Source / channel</th><th className="text-left p-2">Mailbox identity</th><th className="text-left p-2">Thread / reference</th><th className="text-left p-2">Status</th><th className="text-left p-2">Flags</th><th className="text-left p-2">Age</th><th className="text-left p-2">Action</th></tr>
          </thead>
          <tbody>
            {snapshotQuery.isLoading && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Reading existing communications sources…</td></tr>}
            {snapshotQuery.isError && <tr><td colSpan={8} className="p-6 text-center">Inbox status unverified: {snapshotQuery.error instanceof Error ? snapshotQuery.error.message : "read failed"}</td></tr>}
            {!snapshotQuery.isLoading && !snapshotQuery.isError && rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No existing records match these filters. This does not prove that every source is connected or synchronised.</td></tr>}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border/30 align-top">
                <td className="p-2 max-w-[170px]"><span className="font-medium">{row.businessId ? businessName.get(row.businessId) ?? "Business scope unverified" : "Unassigned"}</span>{row.businessId && <span className="block text-[9px] text-muted-foreground break-all">{row.businessId}</span>}</td>
                <td className="p-2"><span>{SOURCE_LABELS[row.source]}</span><span className="block text-muted-foreground">{row.channel.replace(/_/g, " ")}</span></td>
                <td className="p-2 max-w-[180px] break-words">{row.mailboxIdentity ?? "Not recorded"}</td>
                <td className="p-2 max-w-[210px]"><span className="block truncate" title={row.privacy ? "Privacy case reference only" : row.subject ?? undefined}>{row.privacy ? `Privacy case ${row.reference}` : row.subject ?? "No subject"}</span><span className="block text-[9px] text-muted-foreground break-all">{row.threadReference ?? row.reference}</span></td>
                <td className="p-2"><StatusBadge status={row.status} /></td>
                <td className="p-2 max-w-[150px]"><div className="flex flex-wrap gap-1">{rowFlags(row).length ? rowFlags(row).map((flag) => <Badge key={flag} variant={flag === "failed" ? "destructive" : "outline"} className="text-[9px]">{flag}</Badge>) : <span className="text-muted-foreground">—</span>}</div></td>
                <td className="p-2 whitespace-nowrap">{age(row.receivedAt)}</td>
                <td className="p-2"><Button size="sm" variant="outline" onClick={() => { setSelectedId(row.id); setDraftBody(""); setEscalation("none"); }}>{row.quarantine ? "Inspect" : "Review"}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selected && (
        <Card className="tech-card p-4 space-y-4" data-testid="inbox-drilldown">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">{selected.privacy ? <ShieldQuestion className="h-4 w-4" /> : <InboxIcon className="h-4 w-4" />} {selected.privacy ? "Privacy case reference" : "Communication review"}</h2>
              <p className="text-xs text-muted-foreground">Reference {selected.reference} · {SOURCE_LABELS[selected.source]}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
          </div>

          {!selectedScopeVerified ? (
            <div className="rounded border border-border/50 p-3 text-xs space-y-1">
              <p className="font-semibold">Founder quarantine — business scope not verified</p>
              <p className="text-muted-foreground">Reason: {selected.quarantineReason ?? "registry scope unavailable"}. No drill-down content, reply draft or business reassignment is available.</p>
            </div>
          ) : (
            <>
              <dl className="grid md:grid-cols-4 gap-3 text-xs">
                <div><dt className="text-muted-foreground">Verified business</dt><dd className="font-medium">{selectedBusiness}</dd><dd className="text-[9px] break-all">{selected.businessId}</dd></div>
                <div><dt className="text-muted-foreground">Original mailbox</dt><dd>{selected.mailboxIdentity ?? "Not recorded"}</dd></div>
                <div><dt className="text-muted-foreground">Thread</dt><dd className="break-all">{selected.threadReference ?? "Not recorded"}</dd></div>
                <div><dt className="text-muted-foreground">Received</dt><dd>{new Date(selected.receivedAt).toLocaleString()}</dd></div>
              </dl>

              {selected.privacy ? (
                <div className="rounded border border-border/50 p-3 text-xs">
                  <p className="font-semibold">Metadata-only privacy handling</p>
                  <p className="text-muted-foreground mt-1">Only request ID, type, source, business and submitted time are shown. No requester identity, message text, child/guardian data or commercial CRM reply is available from this view.</p>
                </div>
              ) : (
                <div className="rounded border border-border/50 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div><h3 className="text-xs font-semibold">Draft reply / human review</h3><p className="text-[11px] text-muted-foreground">Local preview only. Persistence and approval-item creation await the reviewed migration and adapter.</p></div>
                    <Badge variant="outline">No auto-send</Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Selected business identity</span><p className="font-medium">{selectedBusiness}</p></div>
                    <div><span className="text-muted-foreground">Approved original sender</span><p className="font-medium">{"address" in senderDecision ? senderDecision.address : `Unavailable · ${senderDecision.reason}`}</p></div>
                  </div>
                  <div>
                    <Label htmlFor="reply-escalation">Review classification</Label>
                    <select id="reply-escalation" className="mt-1 h-9 w-full bg-background border border-border/50 rounded px-2 text-xs" value={escalation} onChange={(event) => setEscalation(event.target.value as EscalationKind)}>
                      <option value="none">Commercial reply review</option>
                      <option value="unknown">Unknown — escalate to human</option>
                      <option value="complaint">Complaint — escalate to human</option>
                      <option value="privacy">Privacy — metadata-only transfer, no sales CRM content</option>
                      <option value="safeguarding">Safeguarding — immediate human escalation</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="reply-draft">Draft body (not saved)</Label>
                    <Textarea id="reply-draft" value={draftBody} onChange={(event) => setDraftBody(event.target.value)} rows={5} disabled={escalation !== "none"} placeholder={escalation === "none" ? "Write a review-only reply preview. Nothing is saved or sent." : "Human escalation required; commercial drafting disabled."} />
                  </div>
                  <div className="rounded bg-secondary/30 p-3 text-[11px] text-muted-foreground">
                    External response decision: {replyDecision?.reason ?? "unavailable"}. Existing send gates remain closed. A genuine reply or opt-out must block internal pending follow-ups; provider-side stop is not claimed without exact read-back.
                  </div>
                  <Button disabled title="Pending schema and founder-reviewed persistence adapter"><MailWarning className="h-4 w-4 mr-2" /> Save for approval · pending migration</Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      <Card className="tech-card p-4">
        <h2 className="text-sm font-semibold">Existing communication drafts and approval records</h2>
        <p className="text-xs text-muted-foreground mt-1">Read from the existing communications ledger. No new approval is created by this screen.</p>
        {(snapshot?.drafts.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground mt-3">No existing draft or approval-required communication records were returned. Draft-source read errors are shown above.</p> : (
          <ul className="mt-3 space-y-2 text-xs">{snapshot?.drafts.map((draft) => (
            <li key={draft.id} className="flex items-center gap-2 border-t border-border/30 pt-2">
              <StatusBadge status={draft.communication_status} />
              <span className="flex-1 truncate">{draft.subject ?? "Untitled draft"}</span>
              <span>{draft.business_id ? businessName.get(draft.business_id) ?? "Scope unverified" : "Unassigned"}</span>
              <span className="text-muted-foreground">{draft.approval_item_id ? `Approval ${draft.approval_item_id}` : "No approval item"}</span>
            </li>
          ))}</ul>
        )}
      </Card>
    </CommsLayout>
  );
}
