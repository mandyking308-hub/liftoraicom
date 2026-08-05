import { corsHeaders, json, requireFounder } from "../_shared/socialRelationshipAuth.ts";
import { capabilitiesForUnipile } from "../_shared/socialRelationshipProvider.ts";
import { relationshipAudit } from "../_shared/socialRelationshipDb.ts";

const KEYS = [
  "profile_search","company_search","send_invitation","follow","start_chat",
  "send_message","read_chats","read_messages","webhooks","relation_events",
  "comments_mentions","manage_invitations",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider ?? "unipile").toLowerCase();
  if (provider !== "unipile") return json({ ok: false, error: "provider_unsupported" }, 400);

  const { data: accounts } = await auth.admin.from("social_relationship_accounts")
    .select("id,platform").eq("provider", provider);
  const now = new Date().toISOString();
  let rowsWritten = 0;
  for (const account of accounts ?? []) {
    const matrix = capabilitiesForUnipile(account.platform);
    const rows = KEYS.map((key) => ({
      account_id: account.id,
      capability: key,
      supported: !!matrix[key],
      support_level: matrix[key]
        ? (["send_invitation","start_chat","send_message","manage_invitations"].includes(key) ? "approval_required" : "supported")
        : "unsupported",
      constraints_json: key === "send_invitation" ? { conservative_limits_required: true } : {},
      last_verified_at: now,
      updated_at: now,
    }));
    const { error } = await auth.admin.from("social_relationship_capabilities").upsert(rows, { onConflict: "account_id,capability" });
    if (!error) rowsWritten += rows.length;
  }
  await auth.admin.from("social_relationship_provider_connections").update({ last_capability_sync_at: now, updated_at: now }).eq("provider", provider);
  await relationshipAudit(auth.admin, {
    provider, actor_type: "founder", actor_id: auth.user.id,
    action: "capability_sync", action_status: "completed",
    after_json: { accounts: accounts?.length ?? 0, rows_written: rowsWritten },
  });
  return json({ ok: true, provider, accounts: accounts?.length ?? 0, capability_rows: rowsWritten });
});
