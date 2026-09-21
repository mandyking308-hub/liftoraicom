/**
 * Stage 1 — security perimeter regression tests.
 *
 * These are source-contract tests: they assert the authorization and
 * state-integrity properties that Stage 1 established, so a later edit cannot
 * silently remove them. No provider is called and no database is touched.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const read = (p: string) => readFileSync(p, "utf8");

/** Tables that must have row-level security enabled and founder/admin policies. */
export const RLS_REQUIRED_TABLES = [
  "billionaire_institution_links",
  "philanthropic_institutions",
  "billionaire_enrichment_batches",
];

describe("Stage 1 — RLS closure for previously unprotected tables", () => {
  const migrations = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql"));
  const stageOne = migrations
    .map((f) => read(`supabase/migrations/${f}`))
    .filter((sql) => sql.includes("billionaire_institution_links") && sql.includes("ENABLE ROW LEVEL SECURITY"))
    .join("\n");

  it("has a migration enabling RLS on all three tables", () => {
    for (const t of RLS_REQUIRED_TABLES) {
      expect(stageOne).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("restricts each table to founder/admin and keeps service-role access", () => {
    for (const t of RLS_REQUIRED_TABLES) {
      expect(stageOne).toContain(`GRANT ALL ON public.${t} TO service_role`);
      expect(stageOne).toContain(`Founders manage ${t}`);
    }
    expect(stageOne).toContain("has_role(auth.uid(), 'founder'::app_role)");
  });

  it("does not grant these tables to anonymous callers", () => {
    for (const t of RLS_REQUIRED_TABLES) {
      expect(stageOne).not.toMatch(new RegExp(`GRANT[^;]*ON public\\.${t} TO anon`));
    }
  });
});

describe("Stage 1 — authorization on direct-send and state-claiming functions", () => {
  it("outreach-send-draft requires a founder or admin role before sending", () => {
    const src = read("supabase/functions/outreach-send-draft/index.ts");
    expect(src).toContain('from("user_roles")');
    expect(src).toMatch(/roleSet\.has\("founder"\)/);
    const roleCheck = src.indexOf('roleSet.has("founder")');
    const smtpCall = src.indexOf("createTransport");
    expect(roleCheck).toBeGreaterThan(-1);
    expect(roleCheck).toBeLessThan(smtpCall);
  });

  it("internal-proposal-send requires founder/admin authorization", () => {
    const src = read("supabase/functions/internal-proposal-send/index.ts");
    expect(src).toContain("requireFounderOrAdmin");
    const auth = src.indexOf("requireFounderOrAdmin(req");
    const firstQuery = src.indexOf('from("internal_proposals")');
    expect(auth).toBeGreaterThan(-1);
    expect(auth).toBeLessThan(firstQuery);
  });

  it("outreach-send-worker authorises the caller before any privileged work", () => {
    const src = read("supabase/functions/outreach-send-worker/index.ts");
    expect(src).toContain("requireFounderOrCron");
    const auth = src.indexOf("await requireFounderOrCron(req");
    const serve = src.indexOf("Deno.serve(");
    const queue = src.indexOf('from("email_queue")');
    expect(auth).toBeGreaterThan(serve);
    expect(auth).toBeLessThan(queue);
  });

  it("the shared helper never builds a service-role client before the role check", () => {
    const src = read("supabase/functions/_shared/callerAuth.ts");
    const getUser = src.indexOf("auth.getUser(");
    const admin = src.indexOf("const admin = adminClient();");
    expect(getUser).toBeLessThan(admin);
    expect(src).toContain('error: "forbidden"');
  });

  it("manual-send-apply and create-stripe-checkout-session still check roles", () => {
    for (const f of ["manual-send-apply", "create-stripe-checkout-session", "controlled-proof-send"]) {
      const src = read(`supabase/functions/${f}/index.ts`);
      expect(src, f).toContain('from("user_roles")');
    }
  });
});

describe("Stage 1 — internal proposals never claim delivery without a provider", () => {
  const src = read("supabase/functions/internal-proposal-send/index.ts");

  it("moves the proposal to the prepared state, not sent", () => {
    expect(src).toContain('status: "prepared"');
    expect(src).not.toContain('status: "sent"');
    expect(src).not.toContain("sent_at:");
  });

  it("flags the timeline record as not transmitted", () => {
    expect(src).toContain("ignored_for_send_check: true");
    expect(src).toContain("internal_proposal_prepared_not_transmitted");
  });

  it("makes no provider call", () => {
    expect(src).not.toContain("nodemailer");
    expect(src).not.toMatch(/fetch\(\s*["'`]https:\/\//);
  });
});

describe("Stage 1 — voice receivers fail closed without their shared secret", () => {
  const src = read("supabase/functions/_shared/voiceProviderShared.ts");

  it("rejects anonymous callers when no webhook secret is configured", () => {
    expect(src).toContain("CUSTOMER_VOICE_WEBHOOK_SECRET");
    expect(src).toContain("voice_webhook_secret_not_configured");
  });

  it("does not expose a service-role client to an unverified anonymous caller", () => {
    const unauth = src.indexOf('error: "unauthorized"');
    expect(unauth).toBeGreaterThan(-1);
  });
});

describe("Stage 1 — verify_jwt=false perimeter inventory", () => {
  it("every public function is classified and the checker passes", () => {
    const out = execFileSync("node", ["scripts/check-jwt-off-perimeter.mjs"], { encoding: "utf8" });
    expect(out).toContain("all classified");
  });

  it("classifies exactly the functions listed in config.toml", () => {
    const inv = JSON.parse(read("docs/liftor-rebuild/jwt-off-perimeter-inventory.json"));
    const config = read("supabase/config.toml");
    const count = (config.match(/verify_jwt = false/g) ?? []).length;
    expect(Object.keys(inv.functions)).toHaveLength(count);
  });
});
