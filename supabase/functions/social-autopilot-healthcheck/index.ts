import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");

  const count = async (table: string, filters: Record<string, any> = {}) => {
    let q: any = auth.admin.from(table).select("id", { count: "exact", head: true });
    if (business_id && table !== "social_provider_adapters") q = q.eq("business_id", business_id);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { count: c } = await q;
    return c ?? 0;
  };

  const settings_row = business_id
    ? (await auth.admin.from("social_automation_settings").select("*").eq("business_id", business_id).maybeSingle()).data
    : null;

  const [
    accounts_count, connected_accounts_count, assets_count, content_count,
    pending_content_approvals, publish_jobs_count, publish_jobs_blocked,
    inbox_messages_count, reply_jobs_count, reply_jobs_pending_approval,
    performance_logs_count,
    test_assets, test_content, test_publish, test_inbox, test_reply, test_perf,
  ] = await Promise.all([
    count("social_accounts"),
    business_id
      ? (async () => {
          const { count: c } = await auth.admin.from("social_accounts").select("id", { count: "exact", head: true })
            .eq("business_id", business_id).in("connection_status", ["connected", "connected_read_only", "connected_publish_locked"]);
          return c ?? 0;
        })()
      : 0,
    count("social_assets"),
    count("social_content_items"),
    count("social_content_items", { approval_status: "needs_review" }),
    count("social_publish_jobs"),
    count("social_publish_jobs", { status: "blocked" }),
    count("social_inbox_messages"),
    count("social_reply_jobs"),
    count("social_reply_jobs", { approval_status: "needs_review" }),
    count("social_performance_logs"),
    count("social_assets", { is_test_data: true }),
    count("social_content_items", { is_test_data: true }),
    count("social_publish_jobs", { is_test_data: true }),
    count("social_inbox_messages", { is_test_data: true }),
    count("social_reply_jobs", { is_test_data: true }),
    count("social_performance_logs", { is_test_data: true }),
  ]);

  return json({
    ok: true,
    business_id,
    settings_exist: !!settings_row,
    automation_mode: settings_row?.social_automation_mode ?? "approval_required",
    accounts_count, connected_accounts_count, assets_count, content_count,
    pending_content_approvals, publish_jobs_count, publish_jobs_blocked,
    inbox_messages_count, reply_jobs_count, reply_jobs_pending_approval,
    performance_logs_count,
    test_data_count: test_assets + test_content + test_publish + test_inbox + test_reply + test_perf,
    external_publish_enabled: false,
    external_dm_enabled: false,
    provider_execution_enabled: false,
    no_external_action: true,
  });
});