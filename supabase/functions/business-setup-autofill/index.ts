// Founder-only: reads a business website and/or manual and suggests values for
// the Add-a-business setup fields. Read-only: writes nothing, sends nothing.
import { founderGuard } from "../_shared/founderGuard.ts";
import { callAIGateway } from "../_shared/aiGateway.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(\d+\.){3}\d+$/.test(h) || h.includes(":")) return null;
    return u;
  } catch { return null; }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
}

async function fetchPage(u: URL): Promise<{ text: string; html: string } | null> {
  try {
    const r = await fetch(u.toString(), { redirect: "follow", signal: AbortSignal.timeout(12000), headers: { "User-Agent": "LiftorSetupReader/1.0" } });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    const html = (await r.text()).slice(0, 600_000);
    return { html, text: htmlToText(html) };
  } catch { return null; }
}

async function readWebsite(raw: string): Promise<{ text: string; pages: string[] }> {
  const start = safeUrl(raw);
  if (!start) return { text: "", pages: [] };
  const home = await fetchPage(start);
  if (!home) return { text: "", pages: [] };
  const pages = [start.toString()];
  let text = `PAGE ${start}\n${home.text.slice(0, 15000)}`;
  const links = new Set<string>();
  for (const m of home.html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const l = new URL(m[1], start);
      if (l.hostname === start.hostname && /about|pricing|price|product|service|feature|faq|contact|team|school|how|plan|terms|privacy|refund/i.test(l.pathname)) links.add(l.origin + l.pathname);
    } catch { /* skip */ }
  }
  for (const l of [...links].slice(0, 8)) {
    const p = await fetchPage(new URL(l));
    if (p?.text) { pages.push(l); text += `\n\nPAGE ${l}\n${p.text.slice(0, 6000)}`; }
  }
  return { text: text.slice(0, 60000), pages };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const denied = await founderGuard(req, cors);
  if (denied) return denied;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const websiteUrl = typeof body?.website_url === "string" ? body.website_url.slice(0, 500) : "";
  const manualText = typeof body?.manual_text === "string" ? body.manual_text.slice(0, 120000) : "";
  const pdf = typeof body?.manual_pdf_base64 === "string" ? body.manual_pdf_base64 : "";
  const filename = typeof body?.manual_filename === "string" ? body.manual_filename.slice(0, 200) : "manual.pdf";
  const fields = body?.fields;
  if (!fields || typeof fields !== "object") return json({ error: "fields_required" }, 400);
  if (!websiteUrl && !manualText && !pdf) return json({ error: "Give a website or a manual." }, 400);
  if (pdf.length > 14_000_000) return json({ error: "Manual is too large (max about 10 MB)." }, 400);

  const site = websiteUrl ? await readWebsite(websiteUrl) : { text: "", pages: [] };
  if (websiteUrl && !site.text && !manualText && !pdf) return json({ error: "Couldn't read that website. Check the address, or upload the manual instead." }, 422);

  const fieldList = Object.entries(fields as Record<string, { key: string; label: string }[]>)
    .map(([step, fs]) => `${step}: ${(Array.isArray(fs) ? fs : []).map((f) => `${f.key} (${f.label})`).join("; ")}`).join("\n");

  const userParts: any[] = [{
    type: "text",
    text: `Fill in the business setup fields below using ONLY facts stated in the sources. If a source doesn't say it, leave the field out. Never invent numbers, prices, targets, emails, people, dates or legal facts. Keep long answers concise but complete (bullet lines are fine). British English.\n\nFIELDS (step: field_key (label))\n${fieldList}\n\nWEBSITE TEXT:\n${site.text || "(none)"}\n\nMANUAL TEXT:\n${manualText || (pdf ? "(see attached PDF)" : "(none)")}`,
  }];
  if (pdf) userParts.push({ type: "file", file: { filename, file_data: `data:application/pdf;base64,${pdf}` } });

  const gw = await callAIGateway({
    action_type: "business_setup_autofill",
    task_category: "business_setup",
    model: "google/gemini-2.5-flash",
    risk_level: "low",
    request_type: "business_setup_autofill",
    business_id: typeof body?.business_id === "string" && /^[0-9a-f-]{36}$/.test(body.business_id) ? body.business_id : null,
    messages: [
      { role: "system", content: "You extract business facts from a company's website and manual into setup fields. Report only what the sources state. Respond by calling the fill function." },
      { role: "user", content: userParts },
    ],
    tools: [{
      type: "function",
      function: {
        name: "fill",
        description: "Suggested values for setup fields, only where sources state them.",
        parameters: {
          type: "object",
          properties: {
            values: {
              type: "array",
              items: {
                type: "object",
                properties: { step: { type: "string" }, field: { type: "string" }, value: { type: "string" } },
                required: ["step", "field", "value"],
              },
            },
          },
          required: ["values"],
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "fill" } },
  });

  if (gw.status === "payment_required") return json({ error: "AI credits have run out. Top up, then try again." }, 402);
  if (gw.status === "rate_limited") return json({ error: "Too many AI requests right now. Try again in a minute." }, 429);
  if (gw.status !== "completed") return json({ error: gw.error ?? "The AI couldn't read the sources." }, gw.http_status >= 400 ? gw.http_status : 502);

  let values: { step: string; field: string; value: string }[] = [];
  try { values = JSON.parse(gw.data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}").values ?? []; } catch { /* */ }
  const allowed = fields as Record<string, { key: string }[]>;
  const out: Record<string, Record<string, string>> = {};
  for (const v of values) {
    if (!v?.value?.trim() || !Array.isArray(allowed[v.step]) || !allowed[v.step].some((f) => f.key === v.field)) continue;
    (out[v.step] ??= {})[v.field] = v.value.trim().slice(0, 8000);
  }
  return json({ ok: true, suggestions: out, pages_read: site.pages, used_manual: Boolean(manualText || pdf) });
});
