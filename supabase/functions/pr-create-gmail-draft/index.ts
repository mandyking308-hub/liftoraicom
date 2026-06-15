// Create a Gmail draft (NOT send) from an approved media_pitch_drafts row.
// Founder/admin only. No external sending. Gmail "drafts.create" only.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN") ?? "";
const PR_GMAIL_ACCOUNT = Deno.env.get("PR_GMAIL_ACCOUNT") ?? "";

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`gmail_token_failed:${res.status}`);
  const j = await res.json();
  return j.access_token as string;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function rfc2822(from: string, to: string, subject: string, body: string): string {
  const safeSubject = subject.replace(/[\r\n]+/g, " ").slice(0, 200);
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${safeSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
  ].join("\r\n");
  return `${headers}\r\n\r\n${body}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;
    const user = auth.user;

    const body = await req.json().catch(() => ({}));
    const draftId: string | undefined = body.pitch_draft_id;
    const dryRun = !!body.dry_run;
    if (!draftId) return json({ ok: false, reason: "pitch_draft_id_required" }, 400);

    const { data: draft, error: dErr } = await admin.from("media_pitch_drafts").select("*").eq("id", draftId).maybeSingle();
    if (dErr) return json({ ok: false, reason: "draft_query_failed", message: dErr.message }, 500);
    if (!draft) return json({ ok: false, reason: "draft_not_found" }, 404);

    if (draft.approval_status !== "founder_approved") {
      return json({ ok: false, reason: "not_approved", approval_status: draft.approval_status }, 422);
    }
    if (draft.send_method !== "gmail_draft") {
      return json({ ok: false, reason: "send_method_not_gmail", send_method: draft.send_method }, 422);
    }

    // Find recipient email
    let recipient: string | null = null;
    if (draft.journalist_relationship_id) {
      const { data: j } = await admin.from("journalist_relationships").select("email,name").eq("id", draft.journalist_relationship_id).maybeSingle();
      if (j?.email && /@/.test(j.email)) recipient = j.email;
    }
    if (!recipient && draft.opportunity_id) {
      const { data: o } = await admin.from("media_opportunities").select("pitch_email").eq("id", draft.opportunity_id).maybeSingle();
      if ((o as any)?.pitch_email && /@/.test((o as any).pitch_email)) recipient = (o as any).pitch_email;
    }
    if (!recipient) return json({ ok: false, reason: "no_recipient_email" }, 422);

    const subject = draft.draft_subject || "";
    const bodyText = draft.draft_body || "";

    if (dryRun) {
      return json({
        ok: true, dry_run: true, would_create_gmail_draft: true,
        recipient_preview: recipient, subject_preview: subject,
        from_account: PR_GMAIL_ACCOUNT || null,
        gmail_configured: !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN),
      });
    }

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
      return json({ ok: false, reason: "gmail_not_configured" }, 503);
    }

    const token = await getAccessToken();
    const from = PR_GMAIL_ACCOUNT || "me";
    const rfc = rfc2822(from, recipient, subject, bodyText);
    const raw = b64urlEncode(new TextEncoder().encode(rfc));

    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw } }),
    });
    if (!res.ok) {
      const t = await res.text();
      return json({ ok: false, reason: "gmail_draft_create_failed", status: res.status, detail: t.slice(0, 400) }, 502);
    }
    const gj = await res.json();
    const gmailDraftId = gj?.id ?? null;
    const gmailThreadId = gj?.message?.threadId ?? null;

    const { data: sub, error: sErr } = await admin.from("media_pitch_submissions").insert({
      pitch_draft_id: draft.id,
      opportunity_id: draft.opportunity_id,
      business_id: draft.business_id,
      submitted_via: "gmail_draft",
      submitted_at: new Date().toISOString(),
      submitted_by: user.id,
      gmail_thread_id: gmailThreadId,
      reply_status: "draft_created",
      outcome_status: "pending",
      notes: "Gmail draft created, not sent.",
    }).select("id").maybeSingle();
    if (sErr) {
      // do not unwind Gmail draft; just report
      return json({ ok: true, gmail_draft_id: gmailDraftId, gmail_thread_id: gmailThreadId, submission_record_error: sErr.message });
    }

    await admin.from("media_pitch_drafts").update({ approval_status: "gmail_draft_created", updated_at: new Date().toISOString() }).eq("id", draft.id);

    await admin.from("pr_audit_events").insert({
      event_type: "pr_gmail_draft_created",
      actor_user_id: user.id,
      summary: `Gmail draft created (not sent) for ${recipient.replace(/^(.{2}).*(@.*)$/, "$1***$2")}`,
      details: { draft_id: draft.id, submission_id: sub?.id ?? null, gmail_thread_id: gmailThreadId },
    });

    return json({ ok: true, gmail_draft_id: gmailDraftId, gmail_thread_id: gmailThreadId, submission_id: sub?.id ?? null, sent: false });
  } catch (e: any) {
    return json({ ok: false, reason: "exception", message: e?.message || String(e) }, 500);
  }
});