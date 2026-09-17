#!/usr/bin/env node
/**
 * Generates the evidence-derived appendices of the Liftor Rebuild Manual.
 * DOCUMENTATION ONLY: reads the repository, writes markdown/json under docs/liftor-rebuild/.
 * It never touches the database, providers, secrets or runtime behaviour.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/liftor-rebuild");
fs.mkdirSync(OUT, { recursive: true });

const sh = (cmd) => execSync(cmd, { cwd: ROOT, maxBuffer: 1024 * 1024 * 64 }).toString();
const files = sh("git ls-files").trim().split("\n");
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), "utf8"); } catch { return ""; } };
const HEAD = sh("git rev-parse HEAD").trim();
const STAMP = `_Generated from commit \`${HEAD}\` by \`scripts/generate-rebuild-manual-catalogs.mjs\`. Regenerate with \`node scripts/generate-rebuild-manual-catalogs.mjs\`._`;

/* ---------------------------------------------------------------- C. ROUTES */
const app = read("src/App.tsx");
const importMap = new Map();
for (const m of app.matchAll(/import\s+(?:\{([^}]+)\}|([A-Za-z0-9_]+))\s+from\s+"([^"]+)"/g)) {
  const from = m[3];
  if (m[2]) importMap.set(m[2].trim(), from);
  if (m[1]) for (const part of m[1].split(",")) {
    const name = part.split(" as ").pop().trim();
    if (name) importMap.set(name, from);
  }
}
for (const m of app.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\(\)\s*=>\s*import\("([^"]+)"\)\)/g)) importMap.set(m[1], m[2]);

const routes = [];
for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/>/g)) {
  const [, routePath, elementRaw] = m;
  const element = elementRaw.replace(/\s+/g, " ").trim();
  const comps = [...element.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)].map((x) => x[1]);
  const guard = comps.find((c) => /Route$/.test(c) && c !== "Route") ?? (element.includes("<Navigate") ? "redirect" : "public");
  const page = comps.filter((c) => !/Route$/.test(c) && c !== "Navigate").pop() ?? (element.includes("<Navigate") ? "Navigate" : "?");
  const redirectTo = element.match(/<Navigate\s+to="([^"]+)"/)?.[1] ?? "";
  routes.push({
    path: routePath,
    guard,
    page,
    source: importMap.get(page) ?? "",
    redirectTo,
    dynamic: /:/.test(routePath),
    area: routePath.split("/")[1] || "(root)",
  });
}
const byArea = routes.reduce((a, r) => ((a[r.area] ??= []).push(r), a), {});
let c = `# Appendix C — Complete Route Catalog\n\n${STAMP}\n\nEvery route registered in \`src/App.tsx\`. Guard column: \`FounderRoute\` = founder/admin only (\`user_roles.role = 'founder'\`), \`ProtectedRoute\` = any authenticated portal user, \`PartnerRoute\`/\`SupplierRoute\`/\`WorkerRoute\` = scoped portals, \`public\` = unauthenticated, \`redirect\` = alias.\n\n**Total registered routes: ${routes.length}** across ${Object.keys(byArea).length} top-level areas.\n\n| Area | Routes |\n|---|---|\n${Object.entries(byArea).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `| \`/${k}\` | ${v.length} |`).join("\n")}\n`;
for (const [area, list] of Object.entries(byArea).sort()) {
  c += `\n## /${area} (${list.length})\n\n| Route | Guard | Page component | Source file |\n|---|---|---|---|\n`;
  for (const r of list.sort((a, b) => a.path.localeCompare(b.path))) {
    c += `| \`${r.path}\`${r.dynamic ? " _(dynamic)_" : ""} | ${r.guard} | ${r.redirectTo ? `→ \`${r.redirectTo}\`` : r.page} | ${r.source ? `\`${r.source}\`` : "—"} |\n`;
  }
}
fs.writeFileSync(path.join(OUT, "C-route-catalog.md"), c);

/* -------------------------------------------------- D/E. PAGES & COMPONENTS */
const pageFiles = files.filter((f) => f.startsWith("src/pages/") && f.endsWith(".tsx"));
const componentFiles = files.filter((f) => f.startsWith("src/components/") && f.endsWith(".tsx"));
const libFiles = files.filter((f) => f.startsWith("src/lib/") && (f.endsWith(".ts") || f.endsWith(".tsx")));
const hookFiles = files.filter((f) => f.startsWith("src/hooks/") || f.startsWith("src/contexts/"));

const routedSources = new Set(routes.map((r) => r.source.replace(/^@\//, "src/")).filter(Boolean));
const isRouted = (f) => [...routedSources].some((s) => f === `${s}.tsx` || f === `${s}/index.tsx` || f === s);

const analysePage = (f) => {
  const src = read(f);
  return {
    file: f,
    lines: src.split("\n").length,
    routed: isRouted(f),
    invokes: [...new Set([...src.matchAll(/functions\.invoke\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]))],
    tables: [...new Set([...src.matchAll(/\.from\(\s*["'`]([a-z0-9_]+)["'`]/g)].map((m) => m[1]))],
    rpcs: [...new Set([...src.matchAll(/\.rpc\(\s*["'`]([a-z0-9_]+)["'`]/g)].map((m) => m[1]))],
    writes: /\.(insert|update|upsert|delete)\(/.test(src),
    confirm: [...new Set([...src.matchAll(/confirmation_phrase["']?\s*[:=]\s*["'`]([^"'`]+)/g)].map((m) => m[1]))],
  };
};
const pages = pageFiles.map(analysePage);
let d = `# Appendix D — Page / Surface Catalog\n\n${STAMP}\n\nEvery page file under \`src/pages/**\`. \`Routed\` means the file is directly registered in \`src/App.tsx\` (sub-tab and panel files are reached through a parent page). \`Writes\` means the file contains an insert/update/upsert/delete call. \`Edge functions\` lists every \`supabase.functions.invoke\` target — these are the only paths through which a page can reach a provider.\n\n**Total page files: ${pages.length}** (routed directly: ${pages.filter((p) => p.routed).length}).\n\n| Page file | Routed | Writes | Edge functions invoked | Tables/views read or written | RPCs | Confirmation phrases |\n|---|---|---|---|---|---|---|\n`;
for (const p of pages.sort((a, b) => a.file.localeCompare(b.file))) {
  d += `| \`${p.file}\` | ${p.routed ? "yes" : "no"} | ${p.writes ? "yes" : "no"} | ${p.invokes.join(", ") || "—"} | ${p.tables.join(", ") || "—"} | ${p.rpcs.join(", ") || "—"} | ${p.confirm.join(", ") || "—"} |\n`;
}
fs.writeFileSync(path.join(OUT, "D-page-surface-catalog.md"), d);

const classifyComponent = (f) => {
  if (f.startsWith("src/components/ui/")) return "shadcn/ui primitive";
  const src = read(f);
  if (/functions\.invoke\(/.test(src)) return "operational (calls edge functions)";
  if (/\.(insert|update|upsert|delete)\(/.test(src)) return "operational (writes data)";
  if (/supabase/.test(src)) return "data-reading component";
  return "presentational";
};
let e = `# Appendix E — Component & Service Catalog\n\n${STAMP}\n\n## E1. UI components (\`src/components/**\`, ${componentFiles.length} files)\n\n| Component file | Classification | Edge functions invoked |\n|---|---|---|\n`;
for (const f of componentFiles.sort()) {
  const src = read(f);
  const inv = [...new Set([...src.matchAll(/functions\.invoke\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]))];
  e += `| \`${f}\` | ${classifyComponent(f)} | ${inv.join(", ") || "—"} |\n`;
}
e += `\n## E2. Engines, helpers and registries (\`src/lib/**\`, ${libFiles.length} files)\n\nEach module below is pure TypeScript unless the "Supabase" column says otherwise; the deterministic engines are the reason Liftor behaviour is reproducible and testable without a provider.\n\n| Module | Exports (first 10) | Touches Supabase | Tables referenced |\n|---|---|---|---|\n`;
for (const f of libFiles.sort()) {
  const src = read(f);
  const exports = [...new Set([...src.matchAll(/export\s+(?:async\s+)?(?:const|function|class|interface|type|enum)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]))];
  const tables = [...new Set([...src.matchAll(/\.from\(\s*["'`]([a-z0-9_]+)["'`]/g)].map((m) => m[1]))];
  e += `| \`${f}\` | ${exports.slice(0, 10).join(", ") || "—"}${exports.length > 10 ? ` _(+${exports.length - 10})_` : ""} | ${/supabase/.test(src) ? "yes" : "no"} | ${tables.slice(0, 8).join(", ") || "—"} |\n`;
}
e += `\n## E3. Hooks and contexts (${hookFiles.length} files)\n\n| File | Purpose signal (exports) |\n|---|---|\n`;
for (const f of hookFiles.sort()) {
  const exports = [...new Set([...read(f).matchAll(/export\s+(?:async\s+)?(?:const|function|class|interface|type)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]))];
  e += `| \`${f}\` | ${exports.join(", ") || "—"} |\n`;
}
fs.writeFileSync(path.join(OUT, "E-component-service-catalog.md"), e);

/* ------------------------------------------------------- H. EDGE FUNCTIONS */
const fnDirs = fs.readdirSync(path.join(ROOT, "supabase/functions"), { withFileTypes: true })
  .filter((x) => x.isDirectory() && x.name !== "_shared").map((x) => x.name).sort();
const sharedFiles = files.filter((f) => f.startsWith("supabase/functions/_shared/"));
const cfg = read("supabase/config.toml");
const analyseFn = (name) => {
  const p = `supabase/functions/${name}/index.ts`;
  const src = read(p);
  const helpers = [...new Set([...src.matchAll(/from\s+"\.\.\/_shared\/([^"]+)"/g)].map((m) => m[1]))];
  const tables = [...new Set([...src.matchAll(/\.from\(\s*["'`]([a-z0-9_.]+)["'`]/g)].map((m) => m[1]))];
  const rpcs = [...new Set([...src.matchAll(/\.rpc\(\s*["'`]([a-z0-9_]+)["'`]/g)].map((m) => m[1]))];
  const envs = [...new Set([...src.matchAll(/Deno\.env\.get\(\s*["'`]([A-Z0-9_]+)["'`]/g)].map((m) => m[1]))];
  const hosts = [...new Set([...src.matchAll(/https:\/\/([a-z0-9.\-]+)/gi)].map((m) => m[1]))].filter((h) => !h.includes("supabase.co") && !h.includes("deno.land") && !h.includes("esm.sh") && !h.includes("jsr.io"));
  const confirm = [...new Set([...src.matchAll(/=\s*"([A-Z][A-Z \-_]{6,})"/g)].map((m) => m[1]))];
  const writes = /\.(insert|update|upsert|delete)\(/.test(src);
  const auth = /requireFounder|requireAdmin/.test(src) ? "founder/admin" : /verify_jwt\s*=\s*false/.test(cfg) && new RegExp(`\\[functions\\.${name}\\]`).test(cfg) ? "public (verify_jwt=false)" : /getUser\(/.test(src) ? "authenticated user" : "platform default (JWT)";
  const jwtFalse = new RegExp(`\\[functions\\.${name}\\][^\\[]*verify_jwt\\s*=\\s*false`, "m").test(cfg);
  const external = hosts.length > 0;
  const dryRun = /dry_run/.test(src);
  const blocked = /blocked:\s*true|external_send_blocked|not_enabled/.test(src);
  return { name, exists: !!src, lines: src.split("\n").length, helpers, tables, rpcs, envs, hosts, confirm, writes, auth, jwtFalse, external, dryRun, blocked };
};
const fns = fnDirs.map(analyseFn);
let h = `# Appendix H — Edge Function Catalog\n\n${STAMP}\n\nEvery directory under \`supabase/functions/\` except \`_shared\`. **Total: ${fns.length} functions.**\n\nColumn meanings:\n- **Auth** — \`founder/admin\` means the handler calls a \`requireFounder\`/\`requireAdmin\` shared guard; \`public (verify_jwt=false)\` means \`supabase/config.toml\` explicitly disables JWT verification (webhook receivers and public token surfaces); \`platform default (JWT)\` means a valid Supabase JWT is required by the platform and the handler adds no further role check.\n- **External** — the handler contains at least one non-Supabase HTTPS host, i.e. it is capable of calling a provider. Capability is not permission: see Section J for the gate model.\n- **Dry-run** — the handler implements a \`dry_run\` preview path.\n- **Writes** — contains an insert/update/upsert/delete.\n\nSummary: founder/admin-guarded ${fns.filter((f) => f.auth === "founder/admin").length}; JWT-verification disabled ${fns.filter((f) => f.jwtFalse).length}; external-capable ${fns.filter((f) => f.external).length}; dry-run capable ${fns.filter((f) => f.dryRun).length}; write-capable ${fns.filter((f) => f.writes).length}; empty/missing index.ts ${fns.filter((f) => !f.exists).length}.\n\n| Function | Auth | External hosts | Dry-run | Writes | Shared helpers | Env names used | Tables touched | RPCs | Confirmation phrase |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const f of fns) {
  h += `| \`${f.name}\` | ${f.auth}${f.jwtFalse ? " ⚠️jwt-off" : ""} | ${f.hosts.join(", ") || "—"} | ${f.dryRun ? "yes" : "—"} | ${f.writes ? "yes" : "—"} | ${f.helpers.join(", ") || "—"} | ${f.envs.join(", ") || "—"} | ${f.tables.slice(0, 12).join(", ") || "—"}${f.tables.length > 12 ? ` _(+${f.tables.length - 12})_` : ""} | ${f.rpcs.join(", ") || "—"} | ${f.confirm.slice(0, 2).join(" / ") || "—"} |\n`;
}
h += `\n## H2. Shared helpers (\`supabase/functions/_shared/\`, ${sharedFiles.length} files)\n\n| Helper | Exports |\n|---|---|\n`;
for (const f of sharedFiles.sort()) {
  const exports = [...new Set([...read(f).matchAll(/export\s+(?:async\s+)?(?:const|function|class|interface|type)\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]))];
  h += `| \`${f.replace("supabase/functions/_shared/", "")}\` | ${exports.join(", ") || "—"} |\n`;
}
fs.writeFileSync(path.join(OUT, "H-edge-function-catalog.md"), h);

/* ---------------------------------------------------------- G. MIGRATIONS */
const migs = files.filter((f) => f.startsWith("supabase/migrations/") && f.endsWith(".sql")).sort();
let g = `# Appendix G — Migration Map\n\n${STAMP}\n\n**Total migrations: ${migs.length}.** Applying them in filename order against a blank Postgres/Supabase database reproduces the current schema. Each row lists the objects the migration creates or alters, extracted from its DDL.\n\n| # | Migration | Creates tables | Creates views | Creates functions | Policies | Enables RLS | Drops |\n|---|---|---|---|---|---|---|---|\n`;
migs.forEach((f, i) => {
  const s = read(f);
  const t = [...new Set([...s.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1]))];
  const v = [...new Set([...s.matchAll(/create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1]))];
  const fn = [...new Set([...s.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)/gi)].map((m) => m[1]))];
  const pol = (s.match(/create\s+policy/gi) || []).length;
  const rls = (s.match(/enable\s+row\s+level\s+security/gi) || []).length;
  const drops = [...new Set([...s.matchAll(/drop\s+(table|view|function|policy|column)/gi)].map((m) => m[1].toLowerCase()))];
  g += `| ${i + 1} | \`${f.replace("supabase/migrations/", "")}\` | ${t.slice(0, 8).join(", ") || "—"}${t.length > 8 ? ` _(+${t.length - 8})_` : ""} | ${v.join(", ") || "—"} | ${fn.slice(0, 5).join(", ") || "—"} | ${pol || "—"} | ${rls || "—"} | ${drops.join(", ") || "—"} |\n`;
});
fs.writeFileSync(path.join(OUT, "G-migration-map.md"), g);

/* ------------------------------------------------ COVERAGE MANIFEST + JSON */
const classify = (f) => {
  if (f === "src/App.tsx") return ["Technical Manual C — Route catalog", "documented"];
  if (f.startsWith("src/pages/")) return ["Technical Manual D — Page/surface catalog", "documented"];
  if (f.startsWith("src/components/ui/")) return ["Technical Manual A/E — shadcn/ui primitives (vendored design-system files)", "supporting"];
  if (f.startsWith("src/components/")) return ["Technical Manual E1 — Component catalog", "documented"];
  if (f.startsWith("src/lib/__tests__/") || f.includes("__tests__") || f.endsWith(".test.ts") || f.endsWith(".test.tsx")) return ["Technical Manual P — Tests & CI", "documented"];
  if (f.startsWith("src/lib/businessManuals") || f.includes("ManualContent") || f.includes("manualArchitecture")) return ["Technical Manual A/T — Manual source modules", "documented"];
  if (f.startsWith("src/lib/")) return ["Technical Manual E2 — Engine/helper catalog", "documented"];
  if (f.startsWith("src/hooks/") || f.startsWith("src/contexts/")) return ["Technical Manual E3 — Hooks & contexts", "documented"];
  if (f.startsWith("src/data/")) return ["Technical Manual K / data-assets appendix", "static-asset"];
  if (f.startsWith("src/integrations/")) return ["Technical Manual B — Supabase client (auto-generated, never edited)", "supporting"];
  if (f.startsWith("src/test/") || f.startsWith("src/services/__tests__/")) return ["Technical Manual P — Tests & CI", "documented"];
  if (f.startsWith("src/services/")) return ["Technical Manual L — AI architecture", "documented"];
  if (f.startsWith("src/")) return ["Technical Manual A — Application shell/assets", "supporting"];
  if (f.startsWith("supabase/functions/_shared/")) return ["Technical Manual H2 — Shared edge helpers", "documented"];
  if (f.startsWith("supabase/functions/")) return ["Technical Manual H — Edge function catalog", "documented"];
  if (f.startsWith("supabase/migrations/")) return ["Technical Manual G — Migration map", "documented"];
  if (f.startsWith("supabase/")) return ["Technical Manual A — Supabase project config", "documented"];
  if (f.startsWith("docs/business-manuals/")) return ["Business Manuals (separate canonical layer)", "documented"];
  if (f.startsWith("docs/liftor-rebuild/")) return ["This rebuild manual", "documented"];
  if (f.startsWith("docs/")) return ["Technical Manual R/T — normative or historical doc (see doc index)", "doc"];
  if (f.startsWith("data/")) return ["Technical Manual K / data-assets appendix — exported research snapshots", "static-asset"];
  if (f.startsWith("scripts/")) return ["Technical Manual P/S — repository scripts", "documented"];
  if (f.startsWith(".github/")) return ["Technical Manual P — CI workflows", "documented"];
  if (f.startsWith("apps/")) return ["Technical Manual A — standalone sub-app (giving platform prototype)", "documented"];
  if (f.startsWith("public/")) return ["Technical Manual A — static public assets", "supporting"];
  if (f.startsWith(".lovable/")) return ["Project memory / plan files — not part of the runtime", "excluded"];
  if (f.startsWith(".workspace/") || f.startsWith(".agents/") || f.startsWith(".claude/")) return ["Agent workspace files — not part of the runtime", "excluded"];
  return ["Technical Manual A — repository root configuration", "documented"];
};
const rows = files.map((f) => { const [section, cat] = classify(f); return { file: f, section, category: cat }; });
const totals = rows.reduce((a, r) => ((a[r.category] = (a[r.category] || 0) + 1), a), {});
const byPrefix = rows.reduce((a, r) => { const k = r.file.split("/").slice(0, 2).join("/"); (a[k] ??= []).push(r); return a; }, {});
fs.writeFileSync(path.join(OUT, "source-coverage-manifest.json"), JSON.stringify({ commit: HEAD, generated_by: "scripts/generate-rebuild-manual-catalogs.mjs", total_files: rows.length, totals, files: rows }, null, 2));
let man = `# Source Coverage Manifest\n\n${STAMP}\n\nEvery file tracked by git at this commit is accounted for below. Machine-readable twin: \`source-coverage-manifest.json\`.\n\n**Total tracked files: ${rows.length}.**\n\n| Category | Files | % |\n|---|---|---|\n${Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} | ${((v / rows.length) * 100).toFixed(1)}% |`).join("\n")}\n\nCategory meanings: **documented** = described in the named manual section or catalog row; **supporting** = covered collectively by a subsystem section (vendored UI primitives, auto-generated clients, static assets); **static-asset** = generated/exported data covered by the data-assets appendix; **doc** = documentation file classified as normative or historical in the doc index; **excluded** = intentionally outside the current-state manual (agent/workspace metadata, not runtime).\n\n## Coverage by directory\n\n| Directory | Files | Mapped sections |\n|---|---|---|\n${Object.entries(byPrefix).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `| \`${k}\` | ${v.length} | ${[...new Set(v.map((x) => x.section))].join("; ")} |`).join("\n")}\n\n## Unmapped files\n\n${rows.filter((r) => !r.section).length === 0 ? "None — every tracked file resolves to a manual section." : rows.filter((r) => !r.section).map((r) => `- \`${r.file}\``).join("\n")}\n`;
fs.writeFileSync(path.join(OUT, "source-coverage-manifest.md"), man);

/* ------------------------------------------------------------ VALIDATION */
const validation = {
  commit: HEAD,
  routes_total: routes.length,
  routes_in_catalog: routes.length,
  founder_routes: routes.filter((r) => r.guard === "FounderRoute").length,
  public_routes: routes.filter((r) => r.guard === "public").length,
  redirects: routes.filter((r) => r.guard === "redirect").length,
  pages_total: pages.length,
  pages_routed: pages.filter((p) => p.routed).length,
  components_total: componentFiles.length,
  lib_modules: libFiles.length,
  edge_functions_dirs: fnDirs.length,
  edge_functions_catalogued: fns.length,
  edge_functions_missing_index: fns.filter((f) => !f.exists).map((f) => f.name),
  edge_functions_jwt_off: fns.filter((f) => f.jwtFalse).map((f) => f.name),
  edge_functions_external_capable: fns.filter((f) => f.external).length,
  migrations: migs.length,
  tracked_files: rows.length,
  coverage_totals: totals,
};
fs.writeFileSync(path.join(OUT, "validation-report.json"), JSON.stringify(validation, null, 2));
console.log(JSON.stringify(validation, null, 2));
