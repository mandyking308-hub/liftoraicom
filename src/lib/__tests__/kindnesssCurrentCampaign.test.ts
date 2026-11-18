import { describe, it, expect } from "vitest";
import { splitKindnesssCampaigns, KINDNESSS_CANONICAL_CAMPAIGN_ID } from "@/lib/kindnesss/currentCampaign";
import { parseEmailDrafts } from "@/lib/businessSetupTunnel";

const SUBJECTS = [
  "A more accountable approach to wellbeing, engagement and social impact",
  "A clearer evidence trail for wellbeing, engagement and governance",
  "One Kindness Passport. A lifetime of positive contribution.",
  "Improving programme delivery, cost control and organisational accountability",
];
const rows: any[] = [
  { id: "c51ed790-98c6-433f-80bb-5834a57aaa28", campaign_name: "Kindnesss — superseded setup import (old school-group copy)", campaign_key: "setup_tunnel_x", status: "archived", external_send_blocked: true, email_sequence: [{ subject: "Email 1", body: "Kindness routines across {{company}} schools" }] },
  { id: KINDNESSS_CANONICAL_CAMPAIGN_ID, campaign_name: "Kindnesss — One Four-Email Campaign (All Audiences)", campaign_key: "kindnesss-global-education-groups-2026", status: "draft", external_send_blocked: true, email_sequence: { steps: SUBJECTS.map((subject, i) => ({ step: i + 1, subject, body: "x" })) } },
  { id: "old-sector", campaign_name: "Kindnesss — Charity (Launch Kit draft)", campaign_key: "k", status: "archived", external_send_blocked: true, email_sequence: { steps: [] } },
];

describe("Kindnesss current campaign", () => {
  it("shows exactly one current campaign: the canonical four-step draft", () => {
    const { current } = splitKindnesssCampaigns(rows);
    expect(current?.id).toBe(KINDNESSS_CANONICAL_CAMPAIGN_ID);
    expect(current?.email_sequence.steps.map((s: any) => s.subject)).toEqual(SUBJECTS);
  });
  it("never treats old school-group or setup drafts as current", () => {
    const { current, superseded } = splitKindnesssCampaigns(rows);
    expect(JSON.stringify(current)).not.toContain("Kindness routines across");
    expect(superseded.map((d) => d.id)).toContain("c51ed790-98c6-433f-80bb-5834a57aaa28");
  });
  it("has no current campaign if the canonical draft is archived", () => {
    expect(splitKindnesssCampaigns(rows.map((r) => ({ ...r, status: "archived" }))).current).toBeNull();
  });
});

describe("setup email importer", () => {
  it("parses three marked emails as three whole emails, not paragraph fragments", () => {
    const raw = "EMAIL 1 (day +0) — Subject: First\nHi,\n\nPara two.\n\nThanks\n\nEMAIL 2 (day +4) — Subject: Second\nBody\n\nMore\n\nEMAIL 3 — Subject: Third\nEnd";
    const out = parseEmailDrafts(raw);
    expect(out.map((e) => e.subject)).toEqual(["First", "Second", "Third"]);
    expect(out[0].body).toBe("Hi,\n\nPara two.\n\nThanks");
  });
});
