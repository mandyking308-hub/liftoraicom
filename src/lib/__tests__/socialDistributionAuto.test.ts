/**
 * Mocked integration tests for the Social Distribution Fabric last mile:
 * approval -> review-linked jobs -> canonical payload hydration -> shared
 * safety checks -> atomic claim -> (mocked) Buffer -> provider ID stored.
 *
 * No real Buffer calls: global fetch is stubbed.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Deno shim must exist before the edge modules are imported.
const env: Record<string, string> = { BUFFER_API_KEY: "test-key" };
(globalThis as any).Deno = { env: { get: (k: string) => env[k] } };

const { autoDispatchApprovedBatch } = await import("../../../supabase/functions/_shared/socialDistributionAuto");
const { evaluateJob, loadContext, submitJob, handleFailure } = await import("../../../supabase/functions/_shared/socialDistributionSubmit");
const { resolveJobPayload, composePostText, evaluateAssetRights, evaluateApprovalReview } =
  await import("../../../supabase/functions/_shared/socialPayloadResolver");
const { materialiseJobsForReviews } = await import("../../../supabase/functions/_shared/socialJobMaterialise");

/* ------------------------------------------------------------------ */
/* Minimal in-memory supabase mock                                     */
/* ------------------------------------------------------------------ */

type DB = Record<string, any[]>;

function makeAdmin(db: DB, opts: { claim?: (args: any) => boolean } = {}) {
  const claimed = new Set<string>();
  const api = {
    rpcCalls: [] as any[],
    from(table: string) {
      const rows = () => (db[table] ??= []);
      const filters: Array<(r: any) => boolean> = [];
      let limit = Infinity;
      let pendingInsert: any = null;
      let pendingUpdate: any = null;
      const builder: any = {
        select: () => builder,
        eq: (c: string, v: any) => (filters.push((r) => r[c] === v), builder),
        in: (c: string, v: any[]) => (filters.push((r) => v.includes(r[c])), builder),
        is: (c: string, v: any) => (filters.push((r) => (r[c] ?? null) === v), builder),
        not: (c: string, _op: string, _v: any) => (filters.push((r) => (r[c] ?? null) !== null), builder),
        limit: (n: number) => ((limit = n), builder),
        insert(row: any) {
          pendingInsert = { id: `gen-${table}-${rows().length + 1}`, ...row };
          rows().push(pendingInsert);
          return builder;
        },
        update(patch: any) { pendingUpdate = patch; return builder; },
        maybeSingle() {
          if (pendingInsert) return Promise.resolve({ data: pendingInsert, error: null });
          const m = rows().filter((r) => filters.every((f) => f(r)));
          return Promise.resolve({ data: m[0] ?? null, error: null });
        },
        then(resolve: any) {
          const m = rows().filter((r) => filters.every((f) => f(r)));
          if (pendingUpdate) { m.forEach((r) => Object.assign(r, pendingUpdate)); }
          return Promise.resolve(resolve({ data: m.slice(0, limit), error: null }));
        },
      };
      return builder;
    },
    rpc(name: string, args: any) {
      api.rpcCalls.push({ name, args });
      if (opts.claim) return Promise.resolve({ data: opts.claim(args), error: null });
      if (claimed.has(args.p_job_id)) return Promise.resolve({ data: false, error: null });
      claimed.add(args.p_job_id);
      return Promise.resolve({ data: true, error: null });
    },
  };
  return api;
}

const BIZ = "biz-1";
const future = new Date(Date.now() + 7200_000).toISOString();

function baseDb(over: Partial<DB> = {}): DB {
  return {
    social_distribution_policies: [{ business_id: BIZ, provider: "buffer", policy_mode: "approved_batch_autopilot", allow_share_now: false, max_batch_size: 25 }],
    social_provider_connections: [{ business_id: BIZ, provider: "buffer", connection_status: "connected", provider_organization_id: "org-1" }],
    social_distribution_pauses: [],
    social_provider_execution_gates: [{ business_id: BIZ, provider: "buffer", gate_status: "unlocked" }],
    social_business_channel_map: [{ id: "map-1", business_id: BIZ, platform: "instagram", active: true, is_default: true, channel: { id: "ch-1", external_channel_id: "ext-ch-1", service: "instagram", display_name: "IG" } }],
    social_approval_reviews: [{ id: "rev-1", business_id: BIZ, review_status: "approved", decided_at: new Date().toISOString(), approval_blockers: [], risk_level: "low", content_item_id: "content-1" }],
    social_content_items: [{ id: "content-1", business_id: BIZ, caption: "Real approved caption", cta: "Book a call", hashtags: "#liftor", link_url: null, asset_id: "asset-1", publish_readiness: "approved_internal", approval_status: "approved", compliance_status: "clear", platform: "instagram", provider: "buffer", planned_at: future }],
    social_content_variants: [],
    social_calendar_items: [],
    social_assets: [{ id: "asset-1", business_id: BIZ, file_url: "https://cdn.example.com/a.jpg", asset_type: "image", rights_status: "cleared", approved_for_social: true, commercial_use_allowed: true, public_use_allowed: true, title: "A" }],
    social_publish_jobs: [],
    social_publish_queue_audit: [],
    ...over,
  } as DB;
}

/** A legacy job whose payload only holds pointers. */
function legacyJob(over: any = {}) {
  return {
    id: "job-1", business_id: BIZ, platform: "instagram", provider: "buffer",
    status: "provider_locked", scheduled_for: future, approval_review_id: "rev-1",
    content_item_id: "content-1", calendar_item_id: null, content_variant_id: null,
    queue_batch_id: null, provider_post_id: null, attempt_count: 0,
    publish_payload: { source: "content_item", source_id: "content-1" },
    ...over,
  };
}

function mockBufferOk(postId = "buf-post-1") {
  (globalThis as any).fetch = vi.fn(async () => new Response(
    JSON.stringify({ data: { createPost: { post: { id: postId, status: "scheduled", dueAt: future } } } }),
    { status: 200, headers: { "content-type": "application/json" } },
  ));
}

beforeEach(() => { env.BUFFER_API_KEY = "test-key"; vi.restoreAllMocks(); });

/* ------------------------------------------------------------------ */

describe("canonical payload resolution", () => {
  it("composes text from approved fields only", () => {
    expect(composePostText({ caption: "Hi", cta: "Book", hashtags: "#a" })).toBe("Hi\n\nBook\n\n#a");
    expect(composePostText({ caption: "", hook: "Hooked" })).toBe("Hooked");
  });

  it("hydrates a legacy pointer-only job into real caption and media", async () => {
    const admin = makeAdmin(baseDb());
    const p = await resolveJobPayload(admin, BIZ, legacyJob());
    expect(p.text).toBe("Real approved caption\n\nBook a call\n\n#liftor");
    expect(p.media).toHaveLength(1);
    expect(p.media[0].url).toBe("https://cdn.example.com/a.jpg");
    expect(p.blockers).toEqual([]);
    expect(p.sources.hydrated_from).toBe("content_item");
  });

  it("prefers the approved variant over the content item", async () => {
    const db = baseDb({
      social_content_variants: [{ id: "var-1", business_id: BIZ, content_item_id: "content-1", caption: "Variant caption", approval_status: "approved", asset_id: "asset-1", approval_blockers: [] }],
    });
    const p = await resolveJobPayload(makeAdmin(db), BIZ, legacyJob({ content_variant_id: "var-1" }));
    expect(p.text.startsWith("Variant caption")).toBe(true);
    expect(p.sources.hydrated_from).toBe("variant");
  });

  it("blocks revoked or expired asset rights", async () => {
    const db = baseDb();
    db.social_assets[0].rights_status = "revoked";
    const p = await resolveJobPayload(makeAdmin(db), BIZ, legacyJob());
    expect(p.blockers).toContain("asset_rights_revoked");
    expect(p.media).toHaveLength(0);
    expect(evaluateAssetRights({ business_id: BIZ, file_url: "https://x/y.jpg", rights_expiry_date: "2020-01-01" }, BIZ))
      .toContain("asset_rights_expired");
  });

  it("blocks a cross-business content source", async () => {
    const db = baseDb();
    db.social_content_items[0].business_id = "biz-other";
    const p = await resolveJobPayload(makeAdmin(db), BIZ, legacyJob());
    expect(p.blockers).toContain("cross_business_content_item");
  });

  it("never treats job status alone as approval", () => {
    expect(evaluateApprovalReview({ id: "r", business_id: BIZ, review_status: "pending" }, BIZ)).toContain("approval_not_approved");
    expect(evaluateApprovalReview({ id: "r", business_id: BIZ, review_status: "approved", decided_at: null, approval_blockers: [] }, BIZ))
      .toContain("approval_not_decided");
    expect(evaluateApprovalReview({ id: "r", business_id: BIZ, review_status: "approved", decided_at: "now", approval_blockers: [], risk_level: "high" }, BIZ))
      .toContain("approval_risk_too_high");
  });

  it("hydrates a true legacy pointer-only job with no FK columns", async () => {
    const p = await resolveJobPayload(makeAdmin(baseDb()), BIZ, legacyJob({ content_item_id: null }));
    expect(p.text).toBe("Real approved caption\n\nBook a call\n\n#liftor");
    expect(p.media).toHaveLength(1);
    expect(p.sources.content_item_id).toBe("content-1");
    expect(p.blockers).toEqual([]);
  });

  it("blocks an unrecognised legacy pointer source", async () => {
    const p = await resolveJobPayload(makeAdmin(baseDb()), BIZ, legacyJob({
      content_item_id: null, publish_payload: { source: "social_secrets", source_id: "x" },
    }));
    expect(p.blockers).toContain("unsupported_legacy_source");
  });

  it("blocks a cross-business legacy pointer", async () => {
    const db = baseDb();
    db.social_content_items[0].business_id = "biz-other";
    const p = await resolveJobPayload(makeAdmin(db), BIZ, legacyJob({ content_item_id: null }));
    expect(p.blockers).toContain("cross_business_content_item");
  });

  it("blocks mixed link + media instead of silently dropping the link", async () => {
    const db = baseDb();
    db.social_content_items[0].link_url = "https://liftorai.com/offer";
    const p = await resolveJobPayload(makeAdmin(db), BIZ, legacyJob());
    expect(p.blockers).toContain("mixed_link_and_media_unsupported");
    expect(p.link_url).toBe("https://liftorai.com/offer");
  });

  it("blocks an invalid link URL", async () => {
    const db = baseDb();
    db.social_content_items[0].link_url = "http://localhost/offer";
    db.social_content_items[0].asset_id = null;
    const p = await resolveJobPayload(makeAdmin(db), BIZ, legacyJob());
    expect(p.blockers).toContain("invalid_link_url");
  });

  it("blocks a snapshot whose media has no resolvable asset reference", async () => {
    const db = baseDb();
    db.social_content_items[0].asset_id = null;
    const p = await resolveJobPayload(makeAdmin(db), BIZ, legacyJob({
      publish_payload: {
        snapshot_version: 1, text: "Snapshot caption", asset_id: null,
        media: [{ url: "https://cdn.example.com/a.jpg" }],
      },
    }));
    expect(p.blockers).toContain("snapshot_asset_reference_missing");
  });
});

describe("materialisation business scoping", () => {
  const review = { id: "rev-1", business_id: BIZ };

  it("cannot reuse or mutate a job with the same idempotency key in another business", async () => {
    const db = baseDb();
    const foreign: any = {
      id: "job-foreign", business_id: "biz-other", approval_review_id: null,
      idempotency_key: "shared", provider_post_id: null,
    };
    db.social_publish_jobs.push(foreign);
    const admin = makeAdmin(db);
    const mat = await materialiseJobsForReviews(admin, BIZ, [review]);
    expect(mat.jobs.every((j: any) => j.business_id === BIZ)).toBe(true);
    expect(foreign.approval_review_id).toBeNull();
    expect(foreign.business_id).toBe("biz-other");
  });

  it("blocks materialisation when the authoritative review is not approved", async () => {
    const db = baseDb();
    db.social_approval_reviews[0].review_status = "pending";
    const mat = await materialiseJobsForReviews(makeAdmin(db), BIZ, [review]);
    expect(mat.created).toBe(0);
    expect(mat.blocked).toBe(1);
    expect(mat.blockers[0].blockers).toContain("approval_not_approved");
  });
});

describe("preview / submit parity", () => {
  it("submits exactly the provider input the preview showed", async () => {
    const db = baseDb();
    const job = legacyJob();
    db.social_publish_jobs.push(job);
    const admin = makeAdmin(db);
    mockBufferOk();
    const ctx = await loadContext(admin, BIZ);
    const preview = await evaluateJob(admin, BIZ, job, ctx);
    expect(preview.eligible).toBe(true);
    expect(preview.provider_input).toMatchObject({ channelId: "ext-ch-1", text: preview.text, mode: "customScheduled" });

    await submitJob(admin, BIZ, job, ctx);
    const sent = JSON.parse(((globalThis as any).fetch as any).mock.calls[0][1].body);
    expect(sent.variables.input).toEqual(preview.provider_input);
    expect(job.provider_post_id).toBe("buf-post-1");
    expect(job.distribution_status).toBe("scheduled");
  });

  it("blocks when the mapped channel has no external Buffer channel ID", async () => {
    const db = baseDb();
    db.social_business_channel_map[0].channel.external_channel_id = "";
    const job = legacyJob();
    db.social_publish_jobs.push(job);
    const admin = makeAdmin(db);
    const ctx = await loadContext(admin, BIZ);
    const ev = await evaluateJob(admin, BIZ, job, ctx);
    expect(ev.eligible).toBe(false);
    expect(ev.blockers).toContain("provider_channel_id_missing");
  });
});

describe("approval-driven auto-dispatch", () => {
  const reviews = [{ id: "rev-1", business_id: BIZ, review_status: "approved", decided_at: new Date().toISOString(), approval_blockers: [], risk_level: "low", content_item_id: "content-1" }];

  it("dispatches review-linked jobs even though the approval batch ID is not a publish queue batch ID", async () => {
    const db = baseDb();
    db.social_publish_jobs.push(legacyJob({ queue_batch_id: "queue-batch-999" }));
    const admin = makeAdmin(db);
    mockBufferOk();
    const out = await autoDispatchApprovedBatch(admin, {
      business_id: BIZ, approval_batch_id: "approval-batch-abc", approved_reviews: reviews,
    });
    expect(out.attempted).toBe(true);
    expect(out.jobs_existing).toBe(1);
    expect(out.submitted).toBe(1);
    expect(out.job_ids).toEqual(["job-1"]);
    expect(out.approval_batch_id).toBe("approval-batch-abc");
    expect(out.publish_queue_batch_id).toBeNull();
  });

  it("creates the missing publish job for an approved review, then dispatches it", async () => {
    const db = baseDb();
    const admin = makeAdmin(db);
    mockBufferOk("buf-post-2");
    const out = await autoDispatchApprovedBatch(admin, {
      business_id: BIZ, approval_batch_id: "approval-batch-abc", approved_reviews: reviews,
    });
    expect(out.jobs_created).toBe(1);
    expect(out.submitted).toBe(1);
    expect(db.social_publish_jobs[0].publish_payload.snapshot_version).toBe(1);
    expect(db.social_publish_jobs[0].provider_post_id).toBe("buf-post-2");
  });

  it("reports no_publish_jobs_for_approved_items instead of a hollow success", async () => {
    const db = baseDb({ social_content_items: [], social_approval_reviews: [] });
    const out = await autoDispatchApprovedBatch(makeAdmin(db), {
      business_id: BIZ, approval_batch_id: "b", approved_reviews: [{ id: "rev-x", business_id: BIZ }],
    });
    expect(out.error).toBe("no_publish_jobs_for_approved_items");
    expect(out.submitted).toBe(0);
  });

  it("does not auto-submit in test mode or approval_required mode", async () => {
    for (const mode of ["test", "approval_required", "paused"]) {
      const db = baseDb();
      db.social_distribution_policies[0].policy_mode = mode;
      db.social_publish_jobs.push(legacyJob());
      const fetchSpy = vi.fn();
      (globalThis as any).fetch = fetchSpy;
      const out = await autoDispatchApprovedBatch(makeAdmin(db), { business_id: BIZ, approved_reviews: reviews });
      expect(out.attempted).toBe(false);
      expect(out.reason).toBe(`policy_${mode}`);
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  });

  it("stays blocked when paused, gate locked or channel unmapped", async () => {
    const paused = baseDb({ social_distribution_pauses: [{ scope: "business", scope_key: BIZ, paused: true }] });
    paused.social_publish_jobs.push(legacyJob());
    expect((await autoDispatchApprovedBatch(makeAdmin(paused), { business_id: BIZ, approved_reviews: reviews })).reason)
      .toBe("emergency_pause_active");

    const locked = baseDb();
    locked.social_provider_execution_gates[0].gate_status = "locked";
    locked.social_publish_jobs.push(legacyJob());
    const lockedOut = await autoDispatchApprovedBatch(makeAdmin(locked), { business_id: BIZ, approved_reviews: reviews });
    expect(lockedOut.blocked).toBe(1);
    expect(lockedOut.submitted).toBe(0);

    const unmapped = baseDb({ social_business_channel_map: [] });
    unmapped.social_publish_jobs.push(legacyJob());
    const unmappedOut = await autoDispatchApprovedBatch(makeAdmin(unmapped), { business_id: BIZ, approved_reviews: reviews });
    expect(unmappedOut.blocked).toBe(1);
  });

  it("is idempotent across repeated approval events", async () => {
    const db = baseDb();
    db.social_publish_jobs.push(legacyJob());
    const admin = makeAdmin(db);
    mockBufferOk();
    const first = await autoDispatchApprovedBatch(admin, { business_id: BIZ, approved_reviews: reviews });
    const second = await autoDispatchApprovedBatch(admin, { business_id: BIZ, approved_reviews: reviews });
    expect(first.submitted).toBe(1);
    expect(second.submitted).toBe(0);
    expect(((globalThis as any).fetch as any).mock.calls.length).toBe(1);
  });
});

describe("retry safety", () => {
  const failArgs = (over: any) => ({ message: "boom", attempt: 1, ...over });

  it("releases the claim for a preflight failure (safe to retry)", async () => {
    const db = baseDb(); const job = legacyJob(); db.social_publish_jobs.push(job);
    const admin = makeAdmin(db);
    await handleFailure(admin, BIZ, job.id, failArgs({ phase: "preflight", message: "buffer_api_key_missing" }));
    expect(job.distribution_idempotency_key).toBeNull();
  });

  it("schedules a backoff retry for an explicit 429", async () => {
    const db = baseDb(); const job = legacyJob(); db.social_publish_jobs.push(job);
    const r = await handleFailure(makeAdmin(db), BIZ, job.id, failArgs({ phase: "response", httpStatus: 429, message: "rate limit" }));
    expect(r.status).toBe("retrying");
    expect(job.next_retry_at).toBeTruthy();
    expect(job.distribution_idempotency_key).toBeNull();
  });

  it("marks a timeout after send as submission_unknown and keeps the claim", async () => {
    const db = baseDb(); const job = legacyJob({ distribution_idempotency_key: "dist_key" }); db.social_publish_jobs.push(job);
    const r = await handleFailure(makeAdmin(db), BIZ, job.id, failArgs({ phase: "transport", message: "network_error: timeout" }));
    expect(r.status).toBe("submission_unknown");
    expect(job.distribution_status).toBe("submission_unknown");
    expect(job.distribution_idempotency_key).toBe("dist_key");
    expect(job.next_retry_at).toBeNull();
  });

  it("treats a provider 4xx validation error as a hard dead letter", async () => {
    const db = baseDb(); const job = legacyJob(); db.social_publish_jobs.push(job);
    const r = await handleFailure(makeAdmin(db), BIZ, job.id, failArgs({ phase: "response", httpStatus: 400, message: "invalid channel" }));
    expect(r.status).toBe("dead_letter");
  });
});
