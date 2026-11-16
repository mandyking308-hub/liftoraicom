/* eslint-disable @typescript-eslint/no-explicit-any -- existing PostgREST tables plus an ungenerated candidate handoff table require a loose read-only adapter. */
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type InboxSource = "ledger" | "legacy_imap" | "smartlead" | "multi_channel" | "kindnesss_handoff" | "privacy";
export type InboxHealth = "available" | "not_configured" | "sync_missing" | "unverified" | "error";

export interface BusinessRef {
  id: string;
  name: string;
  portfolio_status: string;
  archived_at: string | null;
}

export interface UnifiedInboxRow {
  id: string;
  source: InboxSource;
  channel: string;
  businessId: string | null;
  receivedAt: string;
  status: string;
  subject: string | null;
  threadReference: string | null;
  mailboxId: string | null;
  mailboxIdentity: string | null;
  replied: boolean;
  optOut: boolean;
  needsReview: boolean;
  failed: boolean;
  quarantine: boolean;
  quarantineReason: string | null;
  reference: string;
  privacy: boolean;
}

export interface SourceDiagnostic {
  key: string;
  label: string;
  health: InboxHealth;
  detail: string;
  lastSync: string | null;
  failed: number | null;
  retry: number | null;
  deadLetter: number | null;
}

export interface SenderMailbox {
  id: string;
  email: string;
  estate_classification: string;
  active: boolean;
  retired: boolean;
  readiness_state: string;
  provider_health: string;
  last_provider_check_at: string | null;
}

export interface SenderAllocation {
  mailbox_id: string;
  business_id: string | null;
  allocation_status: string;
  thread_sticky: boolean;
}

export interface ExistingDraft {
  id: string;
  business_id: string | null;
  subject: string | null;
  communication_status: string;
  approval_item_id: string | null;
  created_at: string;
}

export interface UnifiedInboxSnapshot {
  businesses: BusinessRef[];
  rows: UnifiedInboxRow[];
  diagnostics: SourceDiagnostic[];
  senders: SenderMailbox[];
  allocations: SenderAllocation[];
  drafts: ExistingDraft[];
  estateCounts: { gsm: number | null; ghat: number | null; allocations: number | null };
  errors: string[];
}

interface QueryResult<T> { data: T[]; error: string | null; count: number | null }

async function queryRows<T>(factory: () => PromiseLike<{ data: T[] | null; error: { message: string } | null; count?: number | null }>): Promise<QueryResult<T>> {
  try {
    const result = await factory();
    return {
      data: result.data ?? [],
      error: result.error?.message ?? null,
      count: result.count ?? null,
    };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Query failed", count: null };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function latest(values: Array<string | null | undefined>): string | null {
  const valid = values.filter((value): value is string => Boolean(value && !Number.isNaN(Date.parse(value))));
  return valid.sort().at(-1) ?? null;
}

function diagnostic(key: string, label: string, result: { error: string | null }, configured: boolean, detail: string, rows: Array<{ receivedAt?: string; status?: string }>): SourceDiagnostic {
  const failed = result.error ? null : rows.filter((row) => row.status === "error" || row.status === "failed").length;
  const retry = result.error ? null : rows.filter((row) => row.status === "retry").length;
  const deadLetter = result.error ? null : rows.filter((row) => row.status === "dead_letter").length;
  return {
    key,
    label,
    health: result.error ? "unverified" : configured ? "available" : "not_configured",
    detail: result.error ? `Status unverified: ${result.error}` : detail,
    lastSync: result.error ? null : latest(rows.map((row) => row.receivedAt)),
    failed,
    retry,
    deadLetter,
  };
}

/** Read-only fan-in over existing sources. No raw bodies or sender names are selected. */
export async function loadUnifiedInboxSnapshot(): Promise<UnifiedInboxSnapshot> {
  const [
    businessesResult,
    ledgerResult,
    threadLinksResult,
    threadsResult,
    flagsResult,
    legacyResult,
    inboxesResult,
    providerResult,
    connectionsResult,
    mailboxMappingsResult,
    multiResult,
    channelsResult,
    handoffResult,
    privacyResult,
    draftsResult,
    sendersResult,
    allocationsResult,
    gsmCountResult,
    ghatCountResult,
    allocationCountResult,
  ] = await Promise.all([
    queryRows<BusinessRef>(() => sb.from("businesses").select("id,name,portfolio_status,archived_at", { count: "exact" }).order("name").limit(500)),
    queryRows<any>(() => sb.from("communication_records").select("id,business_id,channel,direction,communication_status,subject,content_reference,external_provider,provider_message_id,received_at,created_at,audit_metadata").eq("direction", "inbound").order("created_at", { ascending: false }).limit(500)),
    queryRows<any>(() => sb.from("communication_thread_messages").select("thread_id,communication_record_id").limit(1000)),
    queryRows<any>(() => sb.from("communication_threads").select("id,business_id,thread_status,last_message_at").limit(500)),
    queryRows<any>(() => sb.from("communication_safety_flags").select("communication_record_id,flag_type,severity").limit(1000)),
    queryRows<any>(() => sb.from("inbound_messages").select("id,inbox_id,message_id,in_reply_to,subject,processing_status,processing_error,received_at,conversation_id,campaign_id,is_bounce").order("received_at", { ascending: false }).limit(500)),
    queryRows<any>(() => sb.from("inboxes").select("id,email_address,business_id,estate_key,inbound_status,inbound_polling_enabled,last_poll_at,last_inbound_message_at,last_inbound_error").limit(500)),
    queryRows<any>(() => sb.from("outbound_provider_events").select("id,business_id,provider_event_type,provider_event_id,provider_connection_id,provider_mailbox_id,processing_status,error,received_at,event_occurred_at").order("received_at", { ascending: false }).limit(500)),
    queryRows<any>(() => sb.from("outbound_provider_connections").select("id,business_id,provider_type,connection_status,is_enabled,inbound_receiver_enabled,webhook_secret_ref").eq("provider_type", "smartlead").limit(500)),
    queryRows<any>(() => sb.from("outbound_provider_mailbox_mappings").select("provider_connection_id,provider_mailbox_id,business_id,inbox_id,estate_key,is_active").limit(1000)),
    queryRows<any>(() => sb.from("multi_channel_inbound_events").select("id,business_id,channel_key,provider_type,external_event_id,external_thread_id,subject,processed_status,founder_review_required,received_at,matched_conversation_id").order("received_at", { ascending: false }).limit(500)),
    queryRows<any>(() => sb.from("communication_channels").select("channel_key,channel_label,provider_type,live_connected,enabled").limit(100)),
    queryRows<any>(() => sb.from("inbound_handoff_events").select("id,business_id,status,route,quarantine_reason,last_error,received_at,processed_at").order("received_at", { ascending: false }).limit(500)),
    queryRows<any>(() => sb.from("data_privacy_requests").select("id,business_id,request_type,request_status,request_source,created_at").order("created_at", { ascending: false }).limit(200)),
    queryRows<ExistingDraft>(() => sb.from("communication_records").select("id,business_id,subject,communication_status,approval_item_id,created_at").eq("direction", "outbound").in("communication_status", ["draft", "approval_required"]).order("created_at", { ascending: false }).limit(200)),
    queryRows<SenderMailbox>(() => sb.from("gsm_mailboxes").select("id,email,estate_classification,active,retired,readiness_state,provider_health,last_provider_check_at").limit(500)),
    queryRows<SenderAllocation>(() => sb.from("gsm_mailbox_allocations").select("mailbox_id,business_id,allocation_status,thread_sticky").limit(1000)),
    queryRows<any>(() => sb.from("gsm_mailboxes").select("id", { count: "exact", head: true }).eq("estate_classification", "gsm")),
    queryRows<any>(() => sb.from("gsm_mailboxes").select("id", { count: "exact", head: true }).eq("estate_classification", "ghat")),
    queryRows<any>(() => sb.from("gsm_mailbox_allocations").select("id", { count: "exact", head: true })),
  ]);

  const businesses = businessesResult.data;
  const businessIds = new Set(businesses.map((business) => business.id));
  const inboxById = new Map(inboxesResult.data.map((inbox) => [inbox.id, inbox]));
  const threadById = new Map(threadsResult.data.map((thread) => [thread.id, thread]));
  const threadByRecord = new Map(threadLinksResult.data.map((link) => [link.communication_record_id, threadById.get(link.thread_id)]));
  const flagsByRecord = new Map<string, any[]>();
  for (const flag of flagsResult.data) {
    flagsByRecord.set(flag.communication_record_id, [...(flagsByRecord.get(flag.communication_record_id) ?? []), flag]);
  }
  const mappingByProviderMailbox = new Map<string, any>();
  for (const mapping of mailboxMappingsResult.data) {
    mappingByProviderMailbox.set(`${mapping.provider_connection_id}:${mapping.provider_mailbox_id}`, mapping);
  }

  const ledgerRows: UnifiedInboxRow[] = ledgerResult.data.map((record) => {
    const metadata = asRecord(record.audit_metadata);
    const flags = flagsByRecord.get(record.id) ?? [];
    const thread = threadByRecord.get(record.id);
    const unknownBusiness = flags.some((flag) => flag.flag_type === "unknown_business") || !record.business_id;
    return {
      id: `ledger:${record.id}`,
      source: "ledger",
      channel: record.channel,
      businessId: record.business_id,
      receivedAt: record.received_at ?? record.created_at,
      status: thread?.thread_status ?? record.communication_status,
      subject: record.subject,
      threadReference: thread?.id ?? text(metadata.thread_id) ?? record.provider_message_id,
      mailboxId: text(metadata.mailbox_id),
      mailboxIdentity: text(metadata.mailbox_identity),
      replied: Boolean(metadata.replied) || thread?.thread_status === "waiting_reply",
      optOut: flags.some((flag) => flag.flag_type === "do_not_contact") || Boolean(metadata.opt_out),
      needsReview: flags.length > 0 || unknownBusiness,
      failed: record.communication_status === "failed",
      quarantine: unknownBusiness,
      quarantineReason: unknownBusiness ? "unknown_business" : null,
      reference: record.content_reference ?? record.id,
      privacy: flags.some((flag) => flag.flag_type === "sensitive" && text(metadata.case_type) === "privacy"),
    };
  });

  const legacyRows: UnifiedInboxRow[] = legacyResult.data.map((message) => {
    const inbox = inboxById.get(message.inbox_id);
    const businessId = inbox?.business_id ?? null;
    return {
      id: `legacy:${message.id}`,
      source: "legacy_imap",
      channel: "email",
      businessId,
      receivedAt: message.received_at,
      status: message.processing_status,
      subject: message.subject,
      threadReference: message.conversation_id ?? message.in_reply_to ?? message.message_id,
      mailboxId: message.inbox_id,
      mailboxIdentity: inbox?.email_address ?? null,
      replied: false,
      optOut: false,
      needsReview: !businessId || message.processing_status === "received",
      failed: Boolean(message.processing_error) || message.processing_status === "failed",
      quarantine: !businessId,
      quarantineReason: !businessId ? "legacy_business_scope_unverified" : null,
      reference: message.id,
      privacy: false,
    };
  });

  const providerRows: UnifiedInboxRow[] = providerResult.data.map((event) => {
    const mapping = mappingByProviderMailbox.get(`${event.provider_connection_id}:${event.provider_mailbox_id}`);
    const mappedInbox = mapping?.inbox_id ? inboxById.get(mapping.inbox_id) : null;
    const ignored = event.processing_status === "ignored";
    return {
      id: `smartlead:${event.id}`,
      source: "smartlead",
      channel: "email",
      businessId: event.business_id,
      receivedAt: event.event_occurred_at ?? event.received_at,
      status: event.processing_status,
      subject: event.provider_event_type.replace(/_/g, " "),
      threadReference: event.provider_event_id ?? event.id,
      mailboxId: mapping?.inbox_id ?? null,
      mailboxIdentity: mappedInbox?.email_address ?? event.provider_mailbox_id,
      replied: event.provider_event_type === "reply_received",
      optOut: event.provider_event_type === "lead_unsubscribed",
      needsReview: ignored || !event.business_id,
      failed: event.processing_status === "error",
      quarantine: ignored || !event.business_id,
      quarantineReason: ignored ? event.error ?? "provider_attribution_unresolved" : !event.business_id ? "business_scope_missing" : null,
      reference: event.id,
      privacy: false,
    };
  });

  const multiRows: UnifiedInboxRow[] = multiResult.data.map((event) => ({
    id: `multi:${event.id}`,
    source: "multi_channel",
    channel: event.channel_key,
    businessId: event.business_id,
    receivedAt: event.received_at,
    status: event.processed_status,
    subject: event.subject,
    threadReference: event.matched_conversation_id ?? event.external_thread_id ?? event.external_event_id,
    mailboxId: null,
    mailboxIdentity: event.provider_type,
    replied: false,
    optOut: false,
    needsReview: event.founder_review_required || !event.business_id,
    failed: event.processed_status === "failed",
    quarantine: !event.business_id,
    quarantineReason: !event.business_id ? "business_scope_missing" : null,
    reference: event.id,
    privacy: false,
  }));

  const handoffRows: UnifiedInboxRow[] = handoffResult.data.map((event) => ({
    id: `handoff:${event.id}`,
    source: "kindnesss_handoff",
    channel: "website_form",
    businessId: event.business_id,
    receivedAt: event.received_at,
    status: event.status,
    subject: "Commercial enquiry",
    threadReference: event.id,
    mailboxId: null,
    mailboxIdentity: "Signed first-party form",
    replied: false,
    optOut: false,
    needsReview: event.route === "quarantine",
    failed: event.status === "failed" || event.status === "dead_letter",
    quarantine: event.route === "quarantine",
    quarantineReason: event.quarantine_reason,
    reference: event.id,
    privacy: false,
  }));

  const privacyRows: UnifiedInboxRow[] = privacyResult.data.map((request) => ({
    id: `privacy:${request.id}`,
    source: "privacy",
    channel: "privacy_case",
    businessId: request.business_id,
    receivedAt: request.created_at,
    status: request.request_status,
    subject: `Privacy request · ${request.request_type}`,
    threadReference: null,
    mailboxId: null,
    mailboxIdentity: request.request_source,
    replied: false,
    optOut: false,
    needsReview: true,
    failed: false,
    quarantine: !request.business_id,
    quarantineReason: !request.business_id ? "business_scope_missing" : null,
    reference: request.id,
    privacy: true,
  }));

  const rows = [...ledgerRows, ...legacyRows, ...providerRows, ...multiRows, ...handoffRows, ...privacyRows]
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));

  const enabledConnections = connectionsResult.data.filter((connection) => connection.is_enabled && connection.inbound_receiver_enabled);
  const smartleadDiagnostic = diagnostic(
    "smartlead",
    "Smartlead signed replies",
    connectionsResult.error ? connectionsResult : providerResult,
    enabledConnections.length > 0,
    enabledConnections.length
      ? "Signed receiver enabled on a business-scoped connection. Secret provisioning and signed delivery remain separately unverified."
      : "Not configured: no inbound-enabled Smartlead connection. Unsigned requests remain rejected.",
    providerResult.data.map((event) => ({ receivedAt: event.received_at, status: event.processing_status })),
  );

  const legacyDiagnostic = diagnostic(
    "legacy_imap",
    "Legacy IMAP inboxes",
    legacyResult.error ? legacyResult : inboxesResult,
    inboxesResult.data.some((inbox) => inbox.inbound_polling_enabled),
    inboxesResult.data.some((inbox) => inbox.inbound_polling_enabled)
      ? "Existing legacy polling is shown separately; it is not replaced by Phase 1."
      : "Not configured: no existing inbox has inbound polling enabled.",
    [
      ...legacyResult.data.map((message) => ({ receivedAt: message.received_at, status: message.processing_status })),
      ...inboxesResult.data.map((inbox) => ({ receivedAt: inbox.last_poll_at, status: inbox.last_inbound_error ? "error" : "received" })),
    ],
  );

  const multiDiagnostic = diagnostic(
    "multi_channel",
    "Existing multi-channel intake",
    channelsResult.error ? channelsResult : multiResult,
    channelsResult.data.some((channel) => channel.enabled),
    channelsResult.data.some((channel) => channel.live_connected)
      ? "At least one existing channel reports connected; per-channel sync proof is not available in this view."
      : "Sync missing or not connected; existing manual and legacy paths remain visible.",
    multiResult.data.map((event) => ({ receivedAt: event.received_at, status: event.processed_status })),
  );

  const handoffDiagnostic = diagnostic(
    "kindnesss_handoff",
    "Kindnesss signed commercial handoff",
    handoffResult,
    handoffResult.data.length > 0,
    handoffResult.error
      ? "Sync missing or schema not deployed; signed handoff remains a disabled candidate."
      : handoffResult.data.length
        ? "Existing handoff receipts are shown; signed delivery health is not inferred from row count."
        : "Not configured: no handoff receipts. The receiver and feature flag remain disabled.",
    handoffResult.data.map((event) => ({ receivedAt: event.received_at, status: event.status })),
  );

  const errors = [
    businessesResult.error && `Business registry: ${businessesResult.error}`,
    ledgerResult.error && `Communications ledger: ${ledgerResult.error}`,
    legacyResult.error && `Legacy inbound: ${legacyResult.error}`,
    providerResult.error && `Provider events: ${providerResult.error}`,
    multiResult.error && `Multi-channel events: ${multiResult.error}`,
    draftsResult.error && `Drafts: ${draftsResult.error}`,
    sendersResult.error && `GSM sender registry: ${sendersResult.error}`,
    allocationsResult.error && `Mailbox allocations: ${allocationsResult.error}`,
  ].filter((error): error is string => Boolean(error));

  return {
    businesses,
    rows,
    diagnostics: [smartleadDiagnostic, legacyDiagnostic, multiDiagnostic, handoffDiagnostic],
    senders: sendersResult.data,
    allocations: allocationsResult.data,
    drafts: draftsResult.data,
    estateCounts: {
      gsm: gsmCountResult.error ? null : gsmCountResult.count,
      ghat: ghatCountResult.error ? null : ghatCountResult.count,
      allocations: allocationCountResult.error ? null : allocationCountResult.count,
    },
    errors,
  };
}

export interface InboxActor {
  founderOrAdmin: boolean;
  businessIds?: readonly string[];
}

/** Founder/admin see all; future scoped teams see only explicitly assigned businesses. */
export function visibleRowsForActor(rows: readonly UnifiedInboxRow[], actor: InboxActor): UnifiedInboxRow[] {
  if (actor.founderOrAdmin) return [...rows];
  const allowed = new Set(actor.businessIds ?? []);
  return rows.filter((row) => row.businessId !== null && allowed.has(row.businessId) && !row.quarantine);
}

export function isVerifiedBusinessScope(row: UnifiedInboxRow, businesses: readonly BusinessRef[]): boolean {
  return row.businessId !== null && businesses.some((business) => business.id === row.businessId) && !row.quarantine;
}

export function newInLast24Hours(rows: readonly UnifiedInboxRow[], now = new Date()): number {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  return rows.filter((row) => {
    const received = Date.parse(row.receivedAt);
    return Number.isFinite(received) && received <= now.getTime() && received >= cutoff;
  }).length;
}

export function filterInboxRows(
  rows: readonly UnifiedInboxRow[],
  filters: { businessId?: string; source?: string; view?: "all" | "unassigned" | "needs_review" | "failed" | "quarantine" },
): UnifiedInboxRow[] {
  return rows.filter((row) => {
    if (filters.businessId && row.businessId !== filters.businessId) return false;
    if (filters.source && row.source !== filters.source) return false;
    if (filters.view === "unassigned" && row.businessId) return false;
    if (filters.view === "needs_review" && !row.needsReview && !row.quarantine) return false;
    if (filters.view === "failed" && !row.failed) return false;
    if (filters.view === "quarantine" && !row.quarantine) return false;
    return true;
  });
}
