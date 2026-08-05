/**
 * Buffer live-distribution dispatcher tests.
 * Every Buffer call is mocked — no real post is ever created.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const env: Record<string, string> = { BUFFER_API_KEY: "test-key" };
(globalThis as any).Deno = { env: { get: (k: string) => env[k] } };

const logic = await import("../../../supabase/functions/_shared/socialDistributionLogic");
const { evaluateJob, loadContext, submitJob } = await import("../../../supabase/functions/_shared/socialDistributionSubmit");

const {
  buildCreatePostInput, computeDistributionHealth, normaliseDispatchMode, selectDueJobs, evaluateSubmission,
} = logic;

/* ---------------- minimal supabase mock ---------------- */
function makeAdmin(db: Record<string, any[]>) {
  const claimed = new Set<string>();
  const api: any = {
    from(table: string) {
      const rows = () => (db[table] ??= []);
      const filters: Array<(r: any) => boolean> = [];
      let limit = Infinity;
      let pendingInsert: any = null;
      let pendingUpdate: any = null;
      const b: any = {
        select: () => b,
        eq: (c: string, v: any) => (filters.push((r) => r[c] === v), b),
        in: (c: string, v: any[]) => (filters.push((r) => v.includes(r[c])), b),
        is: (c: string, v: any) => (filters.push((r) => (r[c] ?? null) === v), b),
        not: (c: string) => (filters.push((r) => (r[c] ?? null) !== null), b),
        order: () => b,
        limit: (n: number) => ((limit = n), b),
        insert(row: any) { pendingInsert = { id: `gen-${rows().length + 1}`, ...row }; rows().push(pendingInsert); return b; },
        update(patch: any) { pendingUpdate = patch; return b; },
        maybeSingle() {
          if (pendingInsert) return Promise.resolve({ data: pendingInsert, error: null });
          const m = rows().filter((r) => filters.every((f) => f(r)));
          return Promise.resolve({ data: m[0] ?? null, error: null });
        },
        then(resolve: any) {
          const m = rows().filter((r) => filters.every((f) => f(r)));
          if (pendingUpdate) m.forEach((r) => Object.assign(r, pendingUpdate));
          return Promise.resolve(resolve({ data: m.slice(0, limit), error: null }));
        },
      };
      return b;
    },
    rpc(_n: string, args: any) {
      if (claimed.has(args.p_job_id)) return Promise.resolve({ data: false, error: null });
      claimed.add(args.p_job_id);
      return Promise.resolve({ data: true, error: null });
    },
  };
  return api;
}

const BIZ = "biz-1";
const future = new Date(Date.now() + 7200_000).toISOString();

function baseDb(mapOver: any = {}, over: Record<string, any[]> = {}) {
  return {
    social_distribution_policies: [{ business_id: BIZ, provider: "buffer", policy_mode: "approved_batch_autopilot", allow_share_now: false, max_batch_size: 25 }],
    social_provider_connections: [{ business_id: BIZ, provider: "buffer", connection_status: "connected", provider_organization_id: "org-1" }],
    social_distribution_pauses: [],
    social_provider_execution_gates: [{ business_id: BIZ, provider: "buffer", gate_status: "unlocked" }],
    social_business_channel_map: [{
      id: "map-1", business_id: BIZ, platform: "instagram", active: true, is_default: true,
      dispatch_mode: "AUTO_SCHEDULE",
      channel: { id: "ch-1", external_channel_id: "ext-ch-1", service: "instagram", display_name: "IG" },
      ...mapOver,
    }],
    social_approval_reviews: [{ id: "rev-1", business_id: BIZ, review_status: "approved", decided_at: new Date().toISOString(), approval_blockers: [], risk_level: "low", content_item_id: "content-1" }],
    social_content_items: [{ id: "content-1", business_id: BIZ, caption: "Approved caption", link_url: null, asset_id: "asset-1", publish_readiness: "approved_internal", approval_status: "approved", compliance_status: "clear", platform: "instagram", provider: "buffer", planned_at: future }],
    social_content_variants: [],
    social_calendar_items: [],
    social_assets: [{ id: "asset-1", business_id: BIZ, file_url: "https://cdn.example.com/a.jpg", asset_type: "image", rights_status: "cleared", approved_for_social: true, commercial_use_allowed: true, public_use_allowed: true, title: "A" }],
    social_publish_jobs: [],
    social_publish_queue_audit: [],
    ...over,
  } as Record<string, any[]>;
}

function job(over: any = {}) {
  return {
    id: "job-1", business_id: BIZ, platform: "instagram", provider: "buffer",
    scheduled_for: future, approval_review_id: "rev-1", content_item_id: "content-1",
    provider_post_id: null, attempt_count: 0,
    publish_payload: { source: "content_item", source_id: "content-1" },
    ...over,
  };
}

function mockBuffer(postId = "buf-1", status = "scheduled") {
  const calls: any[] = [];
  (globalThis as any).fetch = vi.fn(async (_u: any, init: any) => {
    calls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ data: { createPost: { post: { id: postId, status, dueAt: future } } } }), { status: 200 });
  });
  return calls;
}

beforeEach(() => { env.BUFFER_API_KEY = "test-key"; vi.restoreAllMocks(); });

/* ---------------- channel modes ---------------- */
describe("per-channel dispatch modes", () => {
  it("normalises unknown values to OFF", () => {
    expect(normaliseDispatchMode(null)).toBe("OFF");
    expect(normaliseDispatchMode("auto_schedule")).toBe("AUTO_SCHEDULE");
    expect(normaliseDispatchMode("whatever")).toBe("OFF");
  });

  it("blocks a job whose mapped channel is OFF", async () => {
    const admin = makeAdmin(baseDb({ dispatch_mode: "OFF" }));
    const ctx = await loadContext(admin, BIZ);
    const ev = await evaluateJob(admin, BIZ, job(), ctx);
    expect(ev.eligible).toBe(false);
    expect(ev.blockers).toContain("channel_mode_off");
  });

  it("DRAFT_TO_BUFFER sends saveToDraft and never counts as scheduled", async () => {
    const admin = makeAdmin(baseDb({ dispatch_mode: "DRAFT_TO_BUFFER" }));
    const calls = mockBuffer();
    const ctx = await loadContext(admin, BIZ);
    const res: any = await submitJob(admin, BIZ, job(), ctx);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("draft_in_provider");
    expect(calls[0].variables.input.saveToDraft).toBe(true);
  });

  it("AUTO_SCHEDULE sends customScheduled with the exact dueAt and no draft flag", async () => {
    const admin = makeAdmin(baseDb());
    const calls = mockBuffer();
    const ctx = await loadContext(admin, BIZ);
    const res: any = await submitJob(admin, BIZ, job(), ctx, false, { require_auto_schedule: true });
    expect(res.ok).toBe(true);
    const input = calls[0].variables.input;
    expect(input.mode).toBe("customScheduled");
    expect(input.dueAt).toBe(future);
    expect(input.saveToDraft).toBeUndefined();
    expect(input.assets).toEqual([{ image: { url: "https://cdn.example.com/a.jpg" } }]);
  });

  it("the dispatcher skips DRAFT_TO_BUFFER channels", async () => {
    const admin = makeAdmin(baseDb({ dispatch_mode: "DRAFT_TO_BUFFER" }));
    const calls = mockBuffer();
    const ctx = await loadContext(admin, BIZ);
    const res: any = await submitJob(admin, BIZ, job(), ctx, false, { require_auto_schedule: true });
    expect(res.status).toBe("skipped");
    expect(calls).toHaveLength(0);
  });
});

/* ---------------- safety ---------------- */
describe("dispatcher safety", () => {
  it("blocks when the Buffer secret is missing", async () => {
    env.BUFFER_API_KEY = "";
    const admin = makeAdmin(baseDb());
    const ctx = await loadContext(admin, BIZ);
    const res: any = await submitJob(admin, BIZ, job(), ctx);
    expect(res.status).toBe("blocked");
  });

  it("blocks disconnected, locked and paused channels", async () => {
    for (const flag of ["is_disconnected", "is_locked", "is_queue_paused"]) {
      const admin = makeAdmin(baseDb({ channel: { id: "ch-1", external_channel_id: "ext-ch-1", service: "instagram", [flag]: true } }));
      const ctx = await loadContext(admin, BIZ);
      const ev = await evaluateJob(admin, BIZ, job(), ctx);
      expect(ev.eligible).toBe(false);
    }
  });

  it("blocks an unmapped business", async () => {
    const admin = makeAdmin(baseDb({}, { social_business_channel_map: [] }));
    const ctx = await loadContext(admin, BIZ);
    const ev = await evaluateJob(admin, BIZ, job(), ctx);
    expect(ev.blockers).toContain("channel_not_mapped");
  });

  it("blocks unapproved content", async () => {
    const admin = makeAdmin(baseDb({}, { social_approval_reviews: [{ id: "rev-1", business_id: BIZ, review_status: "pending" }] }));
    const ctx = await loadContext(admin, BIZ);
    const ev = await evaluateJob(admin, BIZ, job(), ctx);
    expect(ev.eligible).toBe(false);
    expect(ev.blockers).toContain("not_approved");
  });

  it("prevents duplicate dispatch of the same job", async () => {
    const admin = makeAdmin(baseDb());
    mockBuffer();
    const ctx = await loadContext(admin, BIZ);
    const first: any = await submitJob(admin, BIZ, job(), ctx);
    const second: any = await submitJob(admin, BIZ, job(), ctx);
    expect(first.ok).toBe(true);
    expect(second.status).toBe("duplicate");
  });

  it("blocks a private/expiring asset URL instead of falling back to text", async () => {
    const admin = makeAdmin(baseDb({}, {
      social_assets: [{ id: "asset-1", business_id: BIZ, file_url: "https://cdn.example.com/a.jpg?X-Amz-Signature=abc&X-Amz-Expires=60", asset_type: "image", rights_status: "cleared", approved_for_social: true, commercial_use_allowed: true, public_use_allowed: true }],
    }));
    const ctx = await loadContext(admin, BIZ);
    const ev = await evaluateJob(admin, BIZ, job(), ctx);
    expect(ev.eligible).toBe(false);
    expect(ev.blockers.join(",")).toMatch(/expiring|signed|not_durable|media/i);
  });

  it("surfaces a Buffer typed MutationError as a failure, never a success", async () => {
    const admin = makeAdmin(baseDb());
    (globalThis as any).fetch = vi.fn(async () => new Response(
      JSON.stringify({ data: { createPost: { message: "Channel is disconnected" } } }), { status: 200 }));
    const ctx = await loadContext(admin, BIZ);
    const res: any = await submitJob(admin, BIZ, job(), ctx);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Channel is disconnected");
  });

  it("retries a transient rate limit and then succeeds", async () => {
    const db = baseDb();
    const admin = makeAdmin(db);
    (globalThis as any).fetch = vi.fn(async () => new Response(JSON.stringify({ errors: [{ message: "rate limit" }] }), { status: 429 }));
    const ctx = await loadContext(admin, BIZ);
    const first: any = await submitJob(admin, BIZ, job(), ctx);
    expect(first.status).toBe("retrying");
    mockBuffer("buf-retry");
    // Claim is released on a transient failure; a later dispatcher pass retries.
    const retryAdmin = makeAdmin(db);
    const retried: any = await submitJob(retryAdmin, BIZ, job({ attempt_count: 1 }), ctx);
    expect(retried.ok).toBe(true);
    expect(retried.provider_post_id).toBe("buf-retry");
  });

  it("kill switch stops all provider calls without deleting the job", async () => {
    const admin = makeAdmin(baseDb({}, { social_distribution_pauses: [{ scope: "global", scope_key: "all", paused: true }] }));
    const calls = mockBuffer();
    const ctx = await loadContext(admin, BIZ);
    const res: any = await submitJob(admin, BIZ, job(), ctx);
    expect(res.status).toBe("blocked");
    expect(res.blockers).toContain("emergency_pause_active");
    expect(calls).toHaveLength(0);
  });
});

/* ---------------- pure selection + health ---------------- */
describe("due-job selection", () => {
  const now = new Date("2026-08-05T10:00:00Z");
  it("selects only jobs inside the lookahead window and elapsed retries", () => {
    const picked = selectDueJobs([
      { id: "soon", scheduled_for: "2026-08-05T10:30:00Z" },
      { id: "later", scheduled_for: "2026-08-06T10:00:00Z" },
      { id: "done", scheduled_for: "2026-08-05T10:10:00Z", provider_post_id: "p" },
      { id: "unknown", scheduled_for: "2026-08-05T10:10:00Z", distribution_status: "submission_unknown" },
      { id: "retry-ready", distribution_status: "retrying", next_retry_at: "2026-08-05T09:59:00Z" },
      { id: "retry-waiting", distribution_status: "retrying", next_retry_at: "2026-08-05T10:30:00Z" },
    ], now, 10).map((j) => j.id);
    expect(picked).toContain("soon");
    expect(picked).toContain("retry-ready");
    expect(picked).not.toContain("later");
    expect(picked).not.toContain("done");
    expect(picked).not.toContain("unknown");
    expect(picked).not.toContain("retry-waiting");
  });

  it("respects the batch limit", () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({ id: `j${i}`, scheduled_for: "2026-08-05T10:10:00Z" }));
    expect(selectDueJobs(jobs, now, 3)).toHaveLength(3);
  });
});

describe("distribution health state machine", () => {
  const base = {
    secrets_present: true, organization_id_present: true, connection_ok: true,
    mapped_channels: 1, auto_schedule_channels: 1, gate_unlocked: true,
    policy_mode: "approved_batch_autopilot", paused: false,
    last_dispatch_run_at: new Date().toISOString(), last_dispatch_failed: false,
    dispatcher_schedule_registered: true, failed_jobs: 0,
    last_maintenance_run_at: new Date().toISOString(), maintenance_schedule_registered: true,
  } as const;

  it("reports NOT_CONFIGURED without secrets", () => {
    expect(computeDistributionHealth({ ...base, secrets_present: false }).state).toBe("NOT_CONFIGURED");
  });
  it("reports CONNECTED with no mapped channels", () => {
    expect(computeDistributionHealth({ ...base, mapped_channels: 0 }).state).toBe("CONNECTED");
  });
  it("reports MAPPED while the gate is locked", () => {
    expect(computeDistributionHealth({ ...base, gate_unlocked: false }).state).toBe("MAPPED");
  });
  it("reports ARMED with CONFIGURATION REQUIRED when no cron is registered", () => {
    const h = computeDistributionHealth({ ...base, dispatcher_schedule_registered: false });
    expect(h.state).toBe("ARMED");
    expect(h.dispatcher).toBe("CONFIGURATION_REQUIRED");
  });
  it("reports LIVE when everything agrees", () => {
    expect(computeDistributionHealth(base).state).toBe("LIVE");
  });
  it("reports DEGRADED on a stale heartbeat", () => {
    expect(computeDistributionHealth({ ...base, last_dispatch_run_at: new Date(Date.now() - 3600_000).toISOString() }).state).toBe("DEGRADED");
  });
  it("reports BLOCKED while the kill switch is engaged", () => {
    expect(computeDistributionHealth({ ...base, paused: true }).state).toBe("BLOCKED");
  });
});

describe("payload builder draft flag", () => {
  it("adds saveToDraft only in draft mode", () => {
    const draft = buildCreatePostInput({ channelId: "c", text: "t", dueAt: future, saveToDraft: true });
    const auto = buildCreatePostInput({ channelId: "c", text: "t", dueAt: future });
    expect(draft.saveToDraft).toBe(true);
    expect(auto.saveToDraft).toBeUndefined();
  });

  it("evaluateSubmission ignores dispatch_mode when the caller omits it", () => {
    const r = evaluateSubmission({
      job: { id: "j", business_id: BIZ, scheduled_for: future },
      business_id: BIZ,
      channel: { id: "ch", external_channel_id: "ext" },
      mapping_active: true, connection_present: true, connection_organization_id: "org",
      gate_unlocked: true, approved: true, policy_mode: "approved_batch_autopilot",
      paused: false, text: "hello",
    });
    expect(r.blockers).not.toContain("channel_mode_off");
  });
});