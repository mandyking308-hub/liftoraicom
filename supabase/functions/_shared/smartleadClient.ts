/** Fixed provider origin. Never log/return request URLs or exception messages containing API keys. */
export async function smartleadRequest(apiKey: string, path: string, method: "GET" | "POST" = "GET", body?: unknown) {
  if (!apiKey) throw new Error("smartlead_api_key_missing");
  const url = new URL(`https://server.smartlead.ai/api/v1${path}`);
  url.searchParams.set("api_key", apiKey);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const response = await fetch(url, { method, signal: ctrl.signal, redirect: "error",
      headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    let result: any = null;
    try { result = await response.json(); } catch { /* Return malformed evidence, never raw HTML. */ }
    return { status: response.status, body: result };
  } catch { return { status: 0, body: null }; }
  finally { clearTimeout(timer); }
}
