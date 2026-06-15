// Founder-only. Generates a Google OAuth consent URL for Gmail PR intake.
// Returns { url } — frontend opens it. No tokens handled here.
import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const PROJECT_REF = (Deno.env.get("SUPABASE_URL") ?? "").replace("https://", "").split(".")[0];
const REDIRECT_URI = `https://${PROJECT_REF}.functions.supabase.co/pr-gmail-oauth-callback`;

const SCOPES = {
  intake: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.labels",
  ],
  // Draft is optional and explicit. Never enabled by default.
  draft: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.compose",
  ],
};

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const gate = await requireFounder(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const clientId = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
  if (!clientId) {
    return json({
      ok: false,
      reason: "missing_client_id",
      message: "Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in Lovable Cloud secrets before starting OAuth.",
      redirect_uri: REDIRECT_URI,
    }, 400);
  }

  let body: any = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { body = {}; }
  const mode: "intake" | "draft" = body.mode === "draft" ? "draft" : "intake";
  const scopes = SCOPES[mode];

  const issued = Date.now();
  const nonce = crypto.randomUUID();
  const payload = `${user.id}.${mode}.${issued}.${nonce}`;
  const sig = await hmac(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, payload);
  const state = `${btoa(payload).replace(/=+$/, "")}.${sig}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    scope: scopes.join(" "),
    state,
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return json({
    ok: true,
    url,
    mode,
    scopes,
    redirect_uri: REDIRECT_URI,
    notes: [
      "Sign in as mandyking308@gmail.com and approve.",
      "On the callback page, copy the refresh token into Lovable Cloud secrets as GMAIL_REFRESH_TOKEN.",
      "No sending. Draft scope is only requested if mode=draft.",
    ],
  });
});