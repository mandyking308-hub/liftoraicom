/**
 * Draft-to-Buffer policy, bounded reconciliation and unattended maintenance.
 * Every Buffer call is mocked — no real post is ever created.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const env: Record<string, string> = { BUFFER_API_KEY: "test-key" };
(globalThis as any).Deno = { env: { get: (k: string) => env[k] } };

const {
  computeDistributionHealth, resolveEffectiveDispatchMode, selectRetryDueJobs,
  selectReconcileCandidates, shouldAutoDispatch, parsePostsPageInfo, mapProviderStatus,
} = await import("../../../supabase/functions/_shared/socialDistributionLogic");
const { loadContext, submitJob } = await import("../../../supabase/functions/_shared/socialDistributionSubmit");
const { reconcileBusiness } = await import("../../../supabase/functions/_shared/socialDistributionReconcile");

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

function baseDb(policyMode = "draft_to_buffer", over: Record<string, any[]> = {}) {
  return {
    social_distribution_policies: [{ business_id: BIZ, provider: "buffer", policy_mode: policyMode, allow_share_now: true, max_batch_size: 25 }],
    social_provider_connections: [{ business_id: BIZ, provider: "buffer", connection_status: "connected", provider_organization_id: "org-1" }],
    social_distribution_pauses: [],
    social_provider_execution_gates: [{ business_id: BIZ, provider: "buffer", gate_status: "unlocked" }],
    social_business_channel_map: [{
      id: "map-1", business_id: BIZ, provider: "buffer", platform: "instagram", active: true, is_default: true,
      dispatch_mode: "AUTO_SCHEDULE",
      channel: { id: "ch-1", external_channel_id: "ext-ch-1", service: "instagram", display_name: "IG" },
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

function mockBuffer(payload: any) {
  const calls: any[] = [];
  (globalThis as any).fetch = vi.fn(async (_u: any, init: any) => {
    calls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ data: payload }), { status: 200 });
  });
  return calls;
}

beforeEach(() => { env.BUFFER_API_KEY = "test-key"; vi.restoreAllMocks(); });

/* ---------------- draft_to_buffer policy ---------------- */
describe("draft_to_buffer policy mode", () => {
  it("forces the draft path even on AUTO_SCHEDULE channels", () => {
    expect(resolveEffectiveDispatchMode("draft_to_buffer", "AUTO_SCHEDULE")).toBe("DRAFT_TO_BUFFER");
    expect(resolveEffectiveDispatchMode("draft_to_buffer", "OFF")).toBe("OFF");
    expect(resolveEffectiveDispatchMode("approved_batch_autopilot", "AUTO_SCHEDULE")).toBe("AUTO_SCHEDULE");
  });

  it("submits saveToDraft and can never publish or schedule", async () => {
    const admin = makeAdmin(baseDb());
    const calls = mockBuffer({ createPost: { post: { id: "buf-1", status: "draft", dueAt: future } } });
    const ctx = await loadContext(admin, BIZ);
    const res: any = await submitJob(admin, BIZ, job(), ctx, true);
    expect(res.ok).toBe(true);
    expect(res.status).toBe("draft_in_provider");
    const input = calls[0].variables.input;
    expect(input.saveToDraft).toBe(true);
    expect(input.mode).not.toBe("shareNow");
    const stored = (admin as any).from("social_publish_jobs");
    void stored;
  });

  it("is approval-driven and idempotent", async () => {
    const admin = makeAdmin(baseDb());
    mockBuffer({ createPost: { post: { id: "buf-1", status: "draft" } } });
    const ctx = await loadContext(admin, BIZ);
    const first: any = await submitJob(admin, BIZ, job(), ctx);
    const second: any = await submitJob(admin, BIZ, job(), ctx);
    expect(first.ok).toBe(true);
    expect(second.status).toBe("duplicate");
  });

  it("still blocks unapproved content", async () => {
    const admin = makeAdmin(baseDb("draft_to_buffer", { social_approval_reviews: [{ id: "rev-1", business_id: BIZ, review_status: "pending" }] }));
    const calls = mockBuffer({});
    const ctx = await loadContext(admin, BIZ);
    const res: any = await submitJob(admin, BIZ, job(), ctx);
    expect(res.status).toBe("blocked");
    expect(calls).toHaveLength(0);
  });

  it("auto-dispatch gate reports the draft mode", () => {
    expect(shouldAutoDispatch("draft_to_buffer", false)).toEqual({ go: true, mode: "draft" });
    expect(shouldAutoDispatch("draft_to_buffer", true).go).toBe(false);
    expect(shouldAutoDispatch("test", false).go).toBe(false);
  });

  it("health reports ARMED with an explicit draft reason, never LIVE", () => {
    const h = computeDistributionHealth({
      secrets_present: true, organization_id_present: true, connection_ok: true,
      mapped_channels: 1, auto_schedule_channels: 1, gate_unlocked: true,
      policy_mode: "draft_to_buffer", paused: false,
      last_dispatch_run_at: new Date().toISOString(), dispatcher_schedule_registered: true,
      last_maintenance_run_at: new Date().toISOString(), maintenance_schedule_registered: true,
    });
    expect(h.state).toBe("ARMED");
    expect(h.reason).toBe("draft_to_buffer_mode");
  });
});

/* ---------------- maintenance selection ---------------- */
describe("unattended maintenance selection", () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  it("selects only retry-safe jobs whose backoff elapsed", () => {
    const picked = selectRetryDueJobs([
      { id: "a", distribution_status: "retrying", next_retry_at: past },
      { id: "b", distribution_status: "retrying", next_retry_at: future },
      { id: "c", distribution_status: "submission_unknown", next_retry_at: past },
      { id: "d", distribution_status: "dead_letter", next_retry_at: past },
      { id: "e", distribution_status: "retrying", next_retry_at: past, provider_post_id: "buf-9" },
    ]).map((j) => j.id);
    expect(picked).toEqual(["a"]);
  });

  it("bounds the reconcile candidate set to provider-side jobs", () => {
    const picked = selectReconcileCandidates([
      { id: "a", distribution_status: "scheduled", provider_post_id: "b1" },
      { id: "b", distribution_status: "draft_in_provider", provider_post_id: "b2" },
      { id: "c", distribution_status: "blocked", provider_post_id: null },
      { id: "d", distribution_status: "sent", provider_post_id: "b3" },
    ], 10).map((j) => j.id);
    expect(picked).toEqual(["a", "b"]);
  });
});

/* ---------------- reconciliation ---------------- */
describe("bounded status reconciliation", () => {
  const jobs = [
    { id: "job-1", business_id: BIZ, provider_post_id: "buf-1", distribution_status: "scheduled", provider_status: "scheduled" },
    { id: "job-2", business_id: BIZ, provider_post_id: "buf-2", distribution_status: "draft_in_provider", provider_status: "draft" },
  ];

  it("maps only known provider statuses and leaves unknown ones untouched", async () => {
    const admin = makeAdmin(baseDb("approved_batch_autopilot", { social_publish_jobs: JSON.parse(JSON.stringify(jobs)) }));
    mockBuffer({
      posts: {
        pageInfo: { hasNextPage: false, endCursor: null },
        edges: [
          { node: { id: "buf-1", status: "sent", channelId: "ext-ch-1" } },
          { node: { id: "buf-2", status: "mystery_state", channelId: "ext-ch-1" } },
        ],
      },
    });
    const r: any = await reconcileBusiness(admin, BIZ);
    expect(r.ok).toBe(true);
    expect(r.updated).toBe(1);
    expect(r.unknown_provider_status).toBe(1);
    expect(r.pages_read).toBe(1);
  });

  it("never mutates anything while the kill switch is engaged", async () => {
    const admin = makeAdmin(baseDb("approved_batch_autopilot", {
      social_publish_jobs: JSON.parse(JSON.stringify(jobs)),
      social_distribution_pauses: [{ scope: "global", scope_key: "all", paused: true }],
    }));
    const calls = mockBuffer({});
    const r: any = await reconcileBusiness(admin, BIZ);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("emergency_pause_active");
    expect(calls).toHaveLength(0);
  });

  it("stops without a Buffer key", async () => {
    env.BUFFER_API_KEY = "";
    const admin = makeAdmin(baseDb("approved_batch_autopilot", { social_publish_jobs: JSON.parse(JSON.stringify(jobs)) }));
    const r: any = await reconcileBusiness(admin, BIZ);
    expect(r.error).toBe("buffer_api_key_missing");
  });

  it("reads relay page info without inventing results", () => {
    expect(parsePostsPageInfo({ posts: { pageInfo: { hasNextPage: true, endCursor: "c1" } } }))
      .toEqual({ hasNextPage: true, endCursor: "c1" });
    expect(parsePostsPageInfo({})).toEqual({ hasNextPage: false, endCursor: null });
    expect(mapProviderStatus("draft")).toBe("draft_in_provider");
  });
});

/* ---------------- maintenance health ---------------- */
describe("maintenance health", () => {
  const base = {
    secrets_present: true, organization_id_present: true, connection_ok: true,
    mapped_channels: 1, auto_schedule_channels: 1, gate_unlocked: true,
    policy_mode: "approved_batch_autopilot", paused: false,
    last_dispatch_run_at: new Date().toISOString(), dispatcher_schedule_registered: true,
    failed_jobs: 0,
  } as const;

  it("never claims LIVE without a registered maintenance schedule", () => {
    const h = computeDistributionHealth({ ...base });
    expect(h.state).toBe("ARMED");
    expect(h.reason).toBe("maintenance_schedule_missing");
    expect(h.maintenance).toBe("CONFIGURATION_REQUIRED");
  });

  it("degrades on a stale maintenance heartbeat", () => {
    const h = computeDistributionHealth({
      ...base, maintenance_schedule_registered: true,
      last_maintenance_run_at: new Date(Date.now() - 3600_000).toISOString(),
    });
    expect(h.state).toBe("DEGRADED");
    expect(h.reason).toBe("maintenance_heartbeat_stale");
  });

  it("reports LIVE only when both heartbeats are fresh", () => {
    const h = computeDistributionHealth({
      ...base, maintenance_schedule_registered: true,
      last_maintenance_run_at: new Date().toISOString(),
    });
    expect(h.state).toBe("LIVE");
    expect(h.maintenance).toBe("LIVE");
  });
});