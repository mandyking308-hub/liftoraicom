import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Lightweight regex-based privacy scan over a video's transcript segments.
// Founder/admin gated. Does not call AI. Does not publish anything externally.

const PATTERNS: Array<{ kind: string; re: RegExp }> = [
  { kind: "email", re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { kind: "phone", re: /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}/g },
  { kind: "credit_card", re: /\b(?:\d[ -]*?){13,16}\b/g },
  { kind: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { kind: "iban", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { kind: "api_key", re: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { kind: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { kind: "url_token", re: /(?:token|secret|password|api[_-]?key)\s*[:=]\s*[^\s]{8,}/gi },
];

const KEYWORD_FLAGS: Array<{ kind: string; words: string[] }> = [
  { kind: "health", words: ["diagnosis", "patient", "medical record", "prescription", "phi"] },
  { kind: "financial", words: ["bank account", "sort code", "routing number", "swift code"] },
  { kind: "confidential", words: ["confidential", "nda", "do not share", "internal only"] },
];

function scan(text: string): { kind: string; sample: string }[] {
  const flags: { kind: string; sample: string }[] = [];
  for (const { kind, re } of PATTERNS) {
    const m = text.match(re);
    if (m && m.length) flags.push({ kind, sample: m[0].slice(0, 60) });
  }
  const lower = text.toLowerCase();
  for (const { kind, words } of KEYWORD_FLAGS) {
    for (const w of words) {
      if (lower.includes(w)) { flags.push({ kind, sample: w }); break; }
    }
  }
  return flags;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: any, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const ok = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!ok) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const videoId = body.video_id as string | undefined;
    if (!videoId) return json({ error: "video_id required" }, 400);

    const { data: vid, error: vErr } = await admin
      .from("video_library_items")
      .select("id,business_id,title")
      .eq("id", videoId)
      .maybeSingle();
    if (vErr || !vid) return json({ error: "video_not_found" }, 404);

    const { data: segments, error: sErr } = await admin
      .from("video_transcript_segments")
      .select("id,text")
      .eq("video_id", videoId);
    if (sErr) return json({ error: "segments_failed", detail: sErr.message }, 500);
    if (!segments?.length) return json({ error: "no_transcript" }, 400);

    let totalFlags = 0;
    const kindCounts: Record<string, number> = {};
    for (const s of segments) {
      const flags = scan(s.text ?? "");
      totalFlags += flags.length;
      for (const f of flags) kindCounts[f.kind] = (kindCounts[f.kind] ?? 0) + 1;
      await admin.from("video_transcript_segments")
        .update({ privacy_flags: flags })
        .eq("id", s.id);
    }

    const privacyStatus = totalFlags > 0 ? "flagged" : "approved_internal";
    await admin.from("video_library_items").update({
      privacy_status: privacyStatus,
      contains_sensitive_info: totalFlags > 0,
      redaction_required: totalFlags > 0,
    }).eq("id", videoId);

    await admin.from("video_library_audit_events").insert({
      video_id: videoId,
      business_id: vid.business_id ?? null,
      actor_id: user.id,
      action: "privacy_scan",
      event_summary: `Privacy scan: ${totalFlags} flag(s) across ${segments.length} segment(s)`,
      metadata: { total_flags: totalFlags, kind_counts: kindCounts, segment_count: segments.length, status: privacyStatus },
    });

    return json({
      ok: true,
      video_id: videoId,
      privacy_status: privacyStatus,
      total_flags: totalFlags,
      kind_counts: kindCounts,
      segment_count: segments.length,
    });
  } catch (e: any) {
    return json({ error: "scan_failed", detail: String(e?.message ?? e) }, 500);
  }
});