// Local, no-send preview of a Kindnesss campaign step: fills placeholders with
// safe fallbacks and converts plain-text paragraphs to HTML while keeping the
// embedded branded footer table intact.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function footerQa(body: string) {
  const count = (re: RegExp) => (body.match(re) ?? []).length;
  return {
    signoffs: count(/Kind regards/g),
    unsubscribeTags: count(/%unsubscribe-text%/g),
    signaturePlaceholders: count(/%signature%/g),
    hasCompanyAttribution: body.includes("A product of Global Solutions Management LLC"),
    hasLogo: body.includes('src="https://joinkindnesss.com/kindnesss-email-logo.png"') && /alt="Kindnesss[^"]*"/.test(body),
    disclaimers: ["Commercial transparency:", "Confidentiality:", "Email security:", "consider the environment before printing"].filter((d) => body.includes(d)).length,
    forbiddenSchoolText: /school hours|police|999|accepts? no liability/i.test(body),
    links: [...body.matchAll(/https?:\/\/[^\s"'<)]+/g)].map((m) => m[0].replace(/[.,]$/, "")),
  };
}

export function renderStepPreview(body: string, opts: { firstName?: string } = {}) {
  const name = opts.firstName?.trim() || "there";
  const filled = body
    .replace(/\{\{\s*first_name\s*\}\}/g, name)
    .replace(/%unsubscribe-text%/g, '<a href="#unsubscribe-preview" style="color:#7A6F76;">Unsubscribe from Kindnesss emails</a>');
  const idx = filled.indexOf("<table");
  const text = idx >= 0 ? filled.slice(0, idx) : filled;
  const html = idx >= 0 ? filled.slice(idx) : "";
  const paras = text.trim().split(/\n{2,}/).map((p) => {
    const lines = p.split("\n").map((l) => esc(l).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#C23A66;">$1</a>'));
    return `<p style="margin:0 0 12px 0;">${lines.join("<br>")}</p>`;
  });
  return `<!doctype html><html><body style="margin:0;padding:16px;background:#ffffff;color:#2B2330;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;">${paras.join("")}${html}</body></html>`;
}
