import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("docs/candidates/unified-inbound-phase1-2026-11-16.sql", "utf8");
const smartleadReceiver = readFileSync("supabase/functions/smartlead-webhook/index.ts", "utf8");
const smartleadNormalizer = readFileSync("supabase/functions/_shared/smartleadEventNormalizer.ts", "utf8");

describe("unified inbound pending schema and unchanged provider boundary", () => {
  it("keeps the candidate outside auto-applied migrations and grants every public table explicitly", () => {
    expect(sql).toContain("REVIEW-ONLY CANDIDATE — NOT APPLIED TO LIVE OR QA");
    for (const table of ["unified_inbound_team_members", "unified_inbound_receipts", "unified_inbound_provider_acks"]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toMatch(new RegExp(`grant .* on public\\.${table} to authenticated`));
      expect(sql).toContain(`grant all on public.${table} to service_role`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("fails closed for cross-business teams and founder-only quarantine", () => {
    expect(sql).toContain("public.unified_inbound_has_business_access(business_id)");
    expect(sql).toContain("status <> 'quarantine' or business_id is null");
    expect(sql).toContain("m.business_id = _business_id and m.user_id = auth.uid()");
    expect(sql).not.toMatch(/grant .* on public\.unified_inbound_.* to anon/i);
  });

  it("uses atomic idempotent leased claims and immutable receipt evidence", () => {
    expect(sql).toContain("unique (source, idempotency_key)");
    expect(sql).toContain("on conflict on constraint unified_inbound_receipts_idem do update");
    expect(sql).toContain("r.lease_until <= now()");
    expect(sql).toContain("r.id = _receipt_id and r.lease_token = _lease_token");
    expect(sql).toContain("immutable inbound receipt evidence");
  });

  it("blocks pending follow-ups internally without claiming a provider stop", () => {
    expect(sql).toContain("internal_followup_blocked_at");
    expect(sql).toContain("readback_verified = false or pending_followups = 0");
    expect(sql).not.toMatch(/http|net\.http_post|pg_net/i);
  });

  it("reuses existing approval records with all external execution switches false", () => {
    expect(sql).toContain("insert into public.founder_approval_items");
    expect(sql).toContain("insert into public.communication_records");
    expect(sql).toContain("'pending', false, false, false");
    expect(sql).toContain("original fresh healthy campaign-ready GSM sender required");
    expect(sql).toContain("privacy or safeguarding content must use independent human handling");
  });

  it("leaves the signed Smartlead receiver gates and no-provider-call boundary unchanged", () => {
    expect(smartleadReceiver).toContain("SMARTLEAD_WEBHOOK_RECEIVER_ENABLED");
    expect(smartleadReceiver).toContain("verifySmartleadWebhookSignature(rawBody, signature, secret)");
    expect(smartleadReceiver).toContain("deriveContactMutation(event, payload)");
    expect(smartleadNormalizer).toContain("reply_opens_conversation_and_stops_automation");
    expect(smartleadReceiver).not.toMatch(/fetch\s*\(/);
  });

  it("locks the claim-NULL to verified-sender finalisation regression contract to one scoped write", () => {
    // Static candidate contract only: no SQL is executed outside an isolated PostgreSQL migration test.
    expect(sql).toContain("original_sender_mailbox text,");
    expect(sql).toContain("old.original_sender_mailbox is null\n      and new.original_sender_mailbox is not null");
    expect(sql).toContain("old.original_sender_mailbox is not null\n      and old.original_sender_mailbox is distinct from new.original_sender_mailbox");
    for (const setting of ["finalise_receipt_id", "finalise_lease_token", "finalise_source"]) {
      expect(sql).toContain(`unified_inbound.${setting}`);
    }
    expect(sql).toContain("new.business_id is distinct from old.authenticated_business_id");
    expect(sql).toContain("select * into v_receipt from public.unified_inbound_receipts");
    expect(sql).toContain("r.id = _receipt_id and r.lease_token = _lease_token and r.lease_until > now()");
    expect(sql).toContain("when r.original_sender_mailbox is null then _original_sender_mailbox");
    expect(sql).toContain("else r.original_sender_mailbox end");
    expect(sql).toContain("lease_until = null");
    expect(sql).toContain("authenticated business scope mismatch");
    expect(sql).not.toContain("original_sender_mailbox = coalesce(_original_sender_mailbox, r.original_sender_mailbox)");
  });
});
