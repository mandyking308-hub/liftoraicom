import type { SmartleadDb } from "./smartleadImportStore.ts";

const EVENT_ALIASES: Record<string, string> = {
  email_sent: "email_sent", first_email_sent: "email_sent", sent: "email_sent",
  email_reply: "reply_received", reply_received: "reply_received", replied: "reply_received", reply: "reply_received",
  email_bounce: "email_bounced", email_bounced: "email_bounced", bounced: "email_bounced", bounce: "email_bounced",
  lead_unsubscribed: "lead_unsubscribed", unsubscribe: "lead_unsubscribed", unsubscribed: "lead_unsubscribed",
  email_open: "email_opened", opened: "email_opened", email_link_click: "link_clicked", clicked: "link_clicked",
};
const value = (x: unknown) => x === undefined || x === null || String(x).trim() === "" ? null : String(x).trim();
function eventTime(p: Record<string, any>, type: string) {
  const times: Record<string, unknown> = { reply_received: p.time_replied, email_sent: p.time_sent,
    email_bounced: p.time_bounced, email_opened: p.time_opened, link_clicked: p.time_clicked };
  const raw = value(times[type] ?? p.event_timestamp ?? p.timestamp ?? p.time_stamp ?? p.sent_time);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
export async function normaliseSmartleadEvent(payload: Record<string, any>) {
  const raw = value(payload.event_type ?? payload.event ?? payload.type ?? payload.action)?.toLowerCase() ?? "unknown";
  const type = EVENT_ALIASES[raw] ?? raw;
  const email = value(payload.lead_email ?? payload.lead?.email ?? payload.email ?? payload.to_email)?.toLowerCase() ?? null;
  const rawBody = type === "reply_received" ? payload.reply_body ?? payload.preview_text : payload.custom_email_message ?? payload.email_body;
  // Store plain text only in the shared communications UI. Keep original HTML in the event audit row.
  const body = value(rawBody)?.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?\s*>|<\/p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").trim() ?? null;
  const event = { event_type: type, normalized_event_type: type, raw_event_type: raw,
    provider_campaign_id: value(payload.campaign_id ?? payload.email_campaign_id ?? payload.campaign?.id),
    provider_lead_id: value(payload.lead_id ?? payload.lead?.id),
    provider_event_id: value(payload.event_id),
    provider_message_id: value(payload.message_id ?? payload.email_id ?? payload.stats_id),
    event_timestamp: eventTime(payload, type), email, subject: value(payload.subject ?? payload.custom_subject),
    body_text: body, sender_email: value(payload.from_email),
    supported: ["email_sent","reply_received","email_bounced","lead_unsubscribed"].includes(type) };
  // Delivery attempt timestamps and volatile transport fields are excluded.
  const identity = event.event_timestamp
    ? [type,event.provider_campaign_id,email,event.event_timestamp,event.subject,event.body_text]
    : event.provider_message_id ? [type,event.provider_campaign_id,email,event.provider_message_id]
    : event.provider_event_id ? [type,event.provider_campaign_id,event.provider_event_id]
    : [type,event.provider_campaign_id,email,event.provider_lead_id,event.subject,event.body_text];
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(identity)));
  return { ...event, dedupe_key: Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("") };
}

/** Durable receipt + atomic application. Duplicate delivery resumes an earlier
 * incomplete application rather than silently discarding the event. */
export async function receiveSmartleadEvent(db: SmartleadDb, payload: Record<string, unknown>, apply: boolean) {
  const event = await normaliseSmartleadEvent(payload);
  const insert = await db.from("outbound_provider_events").insert({ provider_type: "smartlead",
    provider_event_type: event.event_type, provider_event_id: event.provider_event_id,
    provider_campaign_id: event.provider_campaign_id, provider_lead_id: event.provider_lead_id,
    raw_payload: payload, normalized_payload: event, dedupe_key: event.dedupe_key,
    processing_status: "received", operational_mutation_applied: false }).select("id").single();
  let id = insert.data?.id;
  if (insert.error?.code === "23505") {
    const prior = await db.from("outbound_provider_events").select("id")
      .eq("provider_type","smartlead").eq("dedupe_key",event.dedupe_key).single();
    if (prior.error || !prior.data) throw new Error("event_receipt_lookup_failed");
    id = prior.data.id;
  } else if (insert.error) throw new Error("event_receipt_failed");
  if (!id) throw new Error("event_receipt_missing");
  if (!apply) return { ok: true, event_id: id, mode: "log_only", operational_mutation_applied: false };
  const result = await db.rpc("smartlead_apply_provider_event", { p_event: id });
  if (result.error) {
    // The event remains durable and unapplied. Explicit replay will retry it
    // after the campaign/contact mapping is corrected.
    await db.from("outbound_provider_events").update({ processing_status: "error", error: "event_application_failed_check_mapping_and_payload" }).eq("id",id);
    throw new Error("event_application_failed");
  }
  return { ok: true, event_id: id, mode: "processed", ...result.data,
    operational_mutation_applied: result.data?.applied === true || result.data?.duplicate === true };
}
