/** Read every recorded row without silently stopping at the database page limit. */
export async function readRecordedPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, pageSize = 100): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await read(from, from + pageSize - 1);
    if (result.error) throw new Error(result.error.message);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export function recordedCampaignName(row: { business_id: string; provider_campaign_id: string }, campaigns: { business_id: string; provider_campaign_id: string; campaign_name: string | null }[]) {
  return campaigns.find((c) => c.business_id === row.business_id && c.provider_campaign_id === row.provider_campaign_id)?.campaign_name ?? `Campaign ${row.provider_campaign_id}`;
}