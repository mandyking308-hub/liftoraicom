// Google OAuth callback (verify_jwt=false, browser redirect from Google).
// Validates HMAC-signed state, exchanges authorisation code for tokens,
// and renders a one-time HTML page showing the refresh token so the founder
// can paste it into Lovable Cloud secrets. Tokens are NOT logged or stored.

const PROJECT_REF = (Deno.env.get("SUPABASE_URL") ?? "").replace("https://", "").split(".")[0];
const REDIRECT_URI = `https://${PROJECT_REF}.functions.supabase.co/pr-gmail-oauth-callback`;
const STATE_MAX_AGE_MS = 15 * 60 * 1000;

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function page(title: string, bodyHtml: string, status = 200): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(title)}</title>
<meta name="robots" content="noindex,nofollow">
<style>
body{font:14px -apple-system,system-ui,sans-serif;background:#0b1220;color:#e6edf3;margin:0;padding:32px;max-width:780px;margin:auto}
h1{font-size:18px;margin:0 0 12px}
pre{background:#0f172a;border:1px solid #1f2a44;border-radius:8px;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-all}
.note{color:#9aa6b2;font-size:12px;margin-top:8px}
.ok{color:#34d399}.err{color:#f87171}.warn{color:#fbbf24}
ol li{margin:6px 0}code{background:#0f172a;padding:1px 6px;border-radius:4px}
</style></head><body>${bodyHtml}</body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const err = url.searchParams.get("error");
  if (err) {
    return page("Gmail OAuth — error", `<h1 class="err">Google returned an error</h1>
<pre>${htmlEscape(err)}</pre><p class="note">Close this tab and retry from Global PR Radar → Settings.</p>`, 400);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  if (!code || !state) {
    return page("Gmail OAuth — invalid request", `<h1 class="err">Missing code or state</h1>`, 400);
  }

  // Validate state
  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) return page("Gmail OAuth — invalid state", `<h1 class="err">Invalid state</h1>`, 400);
  let payload = "";
  try { payload = atob(payloadB64 + "=".repeat((4 - payloadB64.length % 4) % 4)); } catch {
    return page("Gmail OAuth — invalid state", `<h1 class="err">Invalid state encoding</h1>`, 400);
  }
  const expectedSig = await hmac(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, payload);
  if (expectedSig !== sig) return page("Gmail OAuth — invalid state", `<h1 class="err">State signature mismatch</h1>`, 400);
  const [, mode, issuedStr] = payload.split(".");
  const issued = Number(issuedStr);
  if (!issued || Date.now() - issued > STATE_MAX_AGE_MS) {
    return page("Gmail OAuth — expired", `<h1 class="err">State expired — restart from Settings.</h1>`, 400);
  }

  const clientId = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";
  if (!clientId || !clientSecret) {
    return page("Gmail OAuth — missing client secrets",
      `<h1 class="err">GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET not configured</h1>
<p>Add them in Lovable Cloud secrets, then restart OAuth.</p>`, 500);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: REDIRECT_URI, grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    return page("Gmail OAuth — token exchange failed",
      `<h1 class="err">Token exchange failed (${tokenRes.status})</h1>
<pre>${htmlEscape(text.slice(0, 400))}</pre>`, 502);
  }
  const tok = await tokenRes.json();
  const refreshToken: string | undefined = tok.refresh_token;
  const grantedScopes: string = tok.scope || "";

  if (!refreshToken) {
    return page("Gmail OAuth — no refresh token",
      `<h1 class="err">Google did not return a refresh token</h1>
<p>This usually means the account previously granted access. In Google Account → Security → Third-party access, remove the app, then retry.</p>`, 400);
  }

  // Get account email (uses access_token only — never logged)
  let accountEmail = "";
  try {
    const ui = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (ui.ok) accountEmail = (await ui.json()).emailAddress ?? "";
  } catch { /* ignore */ }

  // Render one-time copy page. No DB write, no log of the refresh token.
  const body = `
<h1 class="ok">Gmail OAuth successful (${htmlEscape(mode || "intake")} mode)</h1>
<p>Account: <b>${htmlEscape(accountEmail || "unknown")}</b></p>
<p>Granted scopes:</p>
<pre>${htmlEscape(grantedScopes)}</pre>
<h2 style="font-size:14px;margin-top:24px">Refresh token (copy now — shown once)</h2>
<pre id="rt">${htmlEscape(refreshToken)}</pre>
<button onclick="navigator.clipboard.writeText(document.getElementById('rt').innerText)"
  style="margin-top:8px;padding:8px 14px;background:#2563eb;color:#fff;border:0;border-radius:6px;cursor:pointer">Copy refresh token</button>
<h2 style="font-size:14px;margin-top:24px">Next steps</h2>
<ol>
  <li>In Lovable Cloud → Secrets, add or update <code>GMAIL_REFRESH_TOKEN</code> with the value above.</li>
  <li>Confirm <code>GMAIL_CLIENT_ID</code>, <code>GMAIL_CLIENT_SECRET</code> and <code>PR_GMAIL_ACCOUNT</code> are also set.</li>
  <li>Close this tab. Back in Global PR Radar → Settings, click <b>Check Gmail connection</b>.</li>
  <li>Cron stays off. PR intake remains manual until separately approved.</li>
</ol>
<p class="warn">For security, this token is shown only on this page and is not stored anywhere by Liftor.</p>`;
  return page("Gmail OAuth — success", body);
});