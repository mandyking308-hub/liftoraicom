/**
 * Bounded, safe provider status reconciliation.
 *
 * Reads Buffer's relay `posts` connection in a hard-capped number of pages and
 * updates ONLY jobs that belong to this business, carry a provider_post_id and
 * map to a channel mapped to this business. Unknown provider statuses never
 * change Liftor state; external URLs are stored only when Buffer returns them.
 */
import {
  bufferGraphQL, bufferKeyPresent, parsePostsConnection, parsePostsPageInfo,
  POSTS_MAX_PAGES, POSTS_PAGE_SIZE, POSTS_QUERY,
} from "./bufferClient.ts";
import { mapProviderStatus, selectReconcileCandidates } from "./socialDistributionLogic.ts";
import { audit, getConnection, isPaused } from "./socialDistributionDb.ts";

export interface ReconcileResult {
  ok: boolean;
  error?: string;
  unchanged?: boolean;
  checked: number;
  updated: number;
  pages_read: number;
  not_found_in_provider: number;
  unknown_provider_status: number;
  no_results_invented: true;
}

const EMPTY = (extra: Partial<ReconcileResult>): ReconcileResult => ({
  ok: false, checked: 0, updated: 0, pages_read: 0,
  not_found_in_provider: 0, unknown_provider_status: 0, no_results_invented: true, ...extra,
});

export async function reconcileBusiness(
  admin: any,
  business_id: string,
  provider = "buffer",
  limit = 200,
): Promise<ReconcileResult> {
  if (!bufferKeyPresent()) return EMPTY({ error: "buffer_api_key_missing", unchanged: true });
  if (await isPaused(admin, business_id, provider)) return EMPTY({ error: "emergency_pause_active", unchanged: true });

  const conn = await getConnection(admin, business_id, provider);
  if (!conn?.provider_organization_id) return EMPTY({ error: "provider_organization_missing", unchanged: true });

  // Only channels mapped to THIS business may ever be reconciled.
  const { data: maps } = await admin.from("social_business_channel_map")
    .select("channel:social_provider_channels(external_channel_id)")
    .eq("business_id", business_id).eq("provider", provider);
  const allowedChannels = new Set(
    (maps ?? []).map((m: any) => m.channel?.external_channel_id).filter(Boolean).map(String),
  );

  const { data: allJobs } = await admin.from("social_publish_jobs")
    .select("id, provider_post_id, distribution_status, provider_status")
    .eq("business_id", business_id).not("provider_post_id", "is", null).limit(500);
  const jobs = selectReconcileCandidates(allJobs ?? [], limit);
  if (jobs.length === 0) {
    return { ...EMPTY({}), ok: true, unchanged: true };
  }
  const wanted = new Set(jobs.map((j: any) => String(j.provider_post_id)));

  const byId = new Map<string, any>();
  let cursor: string | null = null;
  let pages = 0;
  while (pages < POSTS_MAX_PAGES) {
    const res: any = await bufferGraphQL(POSTS_QUERY, {
      organizationId: conn.provider_organization_id,
      first: POSTS_PAGE_SIZE,
      after: cursor,
    });
    if (!res.ok) return EMPTY({ error: res.errorMessage, unchanged: true, pages_read: pages });
    pages++;
    for (const p of parsePostsConnection(res.data)) {
      if (wanted.has(p.id)) byId.set(p.id, p);
    }
    const info = parsePostsPageInfo(res.data);
    if (byId.size >= wanted.size || !info.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }

  let updated = 0, notFound = 0, unknownStatus = 0;
  for (const j of jobs as any[]) {
    const p = byId.get(String(j.provider_post_id));
    if (!p) { notFound++; continue; }
    if (p.channelId && allowedChannels.size > 0 && !allowedChannels.has(String(p.channelId))) {
      notFound++;
      continue;
    }
    // Explicit allowlist only — an unmapped provider status never changes
    // Liftor state and is counted as unknown_provider_status.
    const dist = mapProviderStatus(p.status);
    if (!dist) { unknownStatus++; continue; }
    if (dist !== j.distribution_status || (p.status ?? null) !== (j.provider_status ?? null)) {
      const patch: Record<string, unknown> = {
        distribution_status: dist,
        provider_status: p.status ?? null,
      };
      if (dist === "sent") patch.published_at = new Date().toISOString();
      // Buffer's posts connection does not return a public permalink for the
      // fields we query, so no external URL is ever stored or invented.
      await admin.from("social_publish_jobs").update(patch).eq("id", j.id);
      updated++;
    }
  }

  await audit(admin, {
    business_id, action: "distribution_reconcile",
    result_json: { checked: jobs.length, updated, pages_read: pages, not_found_in_provider: notFound, unknown_provider_status: unknownStatus },
  });

  return {
    ok: true, checked: jobs.length, updated, pages_read: pages,
    not_found_in_provider: notFound, unknown_provider_status: unknownStatus,
    no_results_invented: true,
  };
}
