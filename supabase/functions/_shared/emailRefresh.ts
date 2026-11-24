// Light AI rewording of a campaign's approved emails for each new quarterly round.
// Founder decision: AI may slightly reword. Safety: every merge tag ({{...}}), link, the
// postal address and opt-out must survive and length stays close; otherwise the original is used.
export type Step = { seq_number: number; subject: string; body: string; delay: number };

const tags = (s: string) => (s.match(/\{\{[^}]+\}\}|%[a-z_]+%/gi) ?? []).map((t) => t.toLowerCase()).sort();
const links = (s: string) => (s.match(/https?:\/\/[^\s"'<>)]+/gi) ?? []).sort();
const visible = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function refreshIsSafe(orig: Step, next: { subject: string; body: string }, postal: RegExp | null): boolean {
  if (!next.subject?.trim() || !next.body?.trim()) return false;
  if (JSON.stringify(tags(orig.subject + orig.body)) !== JSON.stringify(tags(next.subject + next.body))) return false;
  if (JSON.stringify(links(orig.body)) !== JSON.stringify(links(next.body))) return false;
  if (postal && postal.test(orig.body) && !postal.test(next.body)) return false;
  if (/unsubscribe|opt[ -]?out/i.test(orig.body) && !/unsubscribe|opt[ -]?out/i.test(next.body)) return false;
  const a = visible(orig.body).length, b = visible(next.body).length;
  if (b < a * 0.7 || b > a * 1.3) return false;
  if (next.subject.length > Math.max(90, orig.subject.length * 1.5)) return false;
  return true;
}

async function rewordOne(key: string, s: Step, round: number): Promise<{ subject: string; body: string } | null> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true, store: false, reasoning: { effort: "low" },
      input: [
        { role: "system", content: "You lightly reword an approved B2B email for a repeat send. Keep the same meaning, offer, facts, tone, structure and length. Change only some phrasing. Do not add claims, numbers, names or promises. Keep every {{merge_tag}}, %tag%, link, HTML tag structure, signature, postal address and unsubscribe line exactly. Return json with subject and body." },
        { role: "user", content: JSON.stringify({ round, subject: s.subject, body: s.body }) },
      ],
      text: { format: { type: "json_schema", name: "email", strict: true, schema: { type: "object", additionalProperties: false, required: ["subject", "body"], properties: { subject: { type: "string" }, body: { type: "string" } } } } },
    }),
  });
  if (!r.ok || !r.body) return null;
  let text = "", buf = "";
  const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim(); if (!d || d === "[DONE]") continue;
      try { const ev = JSON.parse(d); if (ev.type === "response.output_text.delta") text += ev.delta ?? ""; } catch { /* partial */ }
    }
  }
  const p = JSON.parse(text || "{}");
  return { subject: String(p.subject ?? ""), body: String(p.body ?? "") };
}

export async function lightRefresh(steps: Step[], postal: RegExp | null, round: number): Promise<{ steps: Step[]; refreshed: number }> {
  const key = (globalThis as unknown as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get("LOVABLE_API_KEY");
  if (!key || steps.length === 0) return { steps, refreshed: 0 };
  let refreshed = 0;
  const out: Step[] = [];
  for (const s of steps) {
    let next = s;
    try {
      const cand = await rewordOne(key, s, round);
      if (cand && refreshIsSafe(s, cand, postal)) { next = { ...s, ...cand }; refreshed++; }
    } catch { /* keep approved wording */ }
    out.push(next);
  }
  return { steps: out, refreshed };
}
