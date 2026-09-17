#!/usr/bin/env node
/**
 * Independent consistency check for the Liftor Rebuild Manual.
 * DOCUMENTATION ONLY: reads the repository and the generated docs, writes nothing.
 * It re-derives every count from source rather than trusting the generator's own output.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/liftor-rebuild");
const sh = (c) => execSync(c, { cwd: ROOT, maxBuffer: 1024 * 1024 * 64 }).toString();
const read = (p) => { try { return fs.readFileSync(path.join(ROOT, p), "utf8"); } catch { return ""; } };
const report = [];
const fail = (name, detail) => report.push({ name, ok: false, detail });
const pass = (name, detail) => report.push({ name, ok: true, detail });

const validation = JSON.parse(read("docs/liftor-rebuild/validation-report.json"));
const FREEZE = validation.source_freeze_sha;

/* 1. generated-file freeze-stamp consistency */
const generated = fs.readdirSync(OUT).filter((f) => /^[CDEGHVW]-|^source-coverage-manifest|^validation-report/.test(f));
const bad = generated.filter((f) => !read(`docs/liftor-rebuild/${f}`).includes(FREEZE));
bad.length ? fail("generated-file SHA consistency", `missing freeze SHA in: ${bad.join(", ")}`)
  : pass("generated-file SHA consistency", `${generated.length} generated files all stamped ${FREEZE}`);

/* 2. source tree identical to the freeze SHA */
const drift = sh(`git diff --name-only ${FREEZE} -- src supabase apps .github`).trim();
drift ? fail("runtime source unchanged since freeze", drift.split("\n").join(", "))
  : pass("runtime source unchanged since freeze", "git diff against freeze SHA is empty for src/supabase/apps/.github");

/* 3. routes: registration count + FounderRoute uniqueness and coverage */
const app = read("src/App.tsx");
const routeMatches = [...app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/>/g)];
const founder = routeMatches.filter((m) => /<FounderRoute/.test(m[2])).map((m) => m[1]);
const distinctFounder = [...new Set(founder)];
const catalogC = read("docs/liftor-rebuild/C-route-catalog.md");
const missingFromC = [...new Set(routeMatches.map((m) => m[1]))].filter((p) => !catalogC.includes(`\`${p}\``));
routeMatches.length === validation.routes_total && missingFromC.length === 0
  ? pass("route registration coverage", `${routeMatches.length} routes registered, all present in Appendix C`)
  : fail("route registration coverage", `registered ${routeMatches.length}, report ${validation.routes_total}, missing from C: ${missingFromC.length}`);

const dupes = founder.filter((p, i) => founder.indexOf(p) !== i);
pass("FounderRoute uniqueness", dupes.length ? `${distinctFounder.length} distinct of ${founder.length}; duplicate registrations (later wins, earlier unreachable): ${[...new Set(dupes)].join(", ")} — recorded in Section R, not repaired` : `${distinctFounder.length} distinct, no duplicates`);

const catalogV = read("docs/liftor-rebuild/V-user-manual-coverage.md");
const uncoveredRoutes = distinctFounder.filter((p) => !catalogV.includes(`| \`${p}\` |`));
const cov = validation.founder_route_coverage || {};
const covSum = (cov.direct || 0) + (cov.inherited || 0) + (cov.classified || 0);
uncoveredRoutes.length === 0 && covSum === distinctFounder.length
  ? pass("founder route operator coverage", `${distinctFounder.length} routes = ${cov.direct || 0} direct + ${cov.inherited || 0} inherited + ${cov.classified || 0} classified, 0 uncovered`)
  : fail("founder route operator coverage", `uncovered ${uncoveredRoutes.length}; coverage sum ${covSum} vs ${distinctFounder.length}`);

/* 4. page surface */
const files = sh("git ls-files").trim().split("\n");
const pageFiles = files.filter((f) => f.startsWith("src/pages/") && f.endsWith(".tsx"));
const catalogD = read("docs/liftor-rebuild/D-page-surface-catalog.md");
const missingPages = pageFiles.filter((f) => !catalogD.includes(`\`${f}\``));
missingPages.length === 0 && pageFiles.length === validation.pages_total
  ? pass("page surface coverage", `${pageFiles.length} page files all catalogued`)
  : fail("page surface coverage", `missing ${missingPages.length}; report says ${validation.pages_total}`);

/* 5. edge functions */
const fnDirs = fs.readdirSync(path.join(ROOT, "supabase/functions"), { withFileTypes: true })
  .filter((x) => x.isDirectory() && x.name !== "_shared").map((x) => x.name);
const catalogH = read("docs/liftor-rebuild/H-edge-function-catalog.md");
const missingFns = fnDirs.filter((n) => !catalogH.includes(`\`${n}\``));
missingFns.length === 0 && fnDirs.length === validation.edge_functions_catalogued
  ? pass("edge function inventory", `${fnDirs.length} function directories all catalogued`)
  : fail("edge function inventory", `missing ${missingFns.join(", ")}`);

/* 6. migrations */
const migs = files.filter((f) => f.startsWith("supabase/migrations/") && f.endsWith(".sql"));
const catalogG = read("docs/liftor-rebuild/G-migration-map.md");
const missingMigs = migs.filter((f) => !catalogG.includes(f.replace("supabase/migrations/", "")));
missingMigs.length === 0 && migs.length === validation.migrations
  ? pass("migration inventory", `${migs.length} migrations all catalogued`)
  : fail("migration inventory", `missing ${missingMigs.length}`);

/* 7. source manifest path coverage */
const manifest = JSON.parse(read("docs/liftor-rebuild/source-coverage-manifest.json"));
const mapped = new Set(manifest.files.map((r) => r.file));
const unmapped = files.filter((f) => !mapped.has(f));
const unexplained = manifest.files.filter((r) => !r.section || !r.category);
unmapped.length === 0 && unexplained.length === 0
  ? pass("source manifest path coverage", `${files.length}/${files.length} tracked files mapped, 0 unexplained`)
  : fail("source manifest path coverage", `unmapped ${unmapped.length}, unexplained ${unexplained.length}`);

/* 8. stale-claim scan */
const staleRules = [
  { re: /\b803\b/, why: "superseded trigger count" },
  { re: /module-directory|inventory-only/, why: "retired coverage state" },
  { re: /\b461 (?:of|routes)/, why: "retired operator-coverage gap figure" },
  { re: /32 routed directly/, why: "superseded routed-page count" },
];
const HIST = /HISTORICAL|historical|superseded|retired|no longer|There is no|Old value|\b797\b/;
const docFiles = files.filter((f) => f.startsWith("docs/liftor-rebuild/") && f.endsWith(".md"));
const stale = [];
for (const f of docFiles) {
  read(f).split("\n").forEach((line, i) => {
    for (const r of staleRules) if (r.re.test(line) && !HIST.test(line)) stale.push(`${f}:${i + 1} (${r.why})`);
  });
}
stale.length === 0 ? pass("stale-claim scan", "no unlabelled superseded current-state claim in the rebuild manual")
  : fail("stale-claim scan", stale.join("; "));

/* 9. docs-only diff scope */
const changed = sh(`git diff --name-only ${FREEZE}`).trim().split("\n").filter(Boolean);
const allowed = (f) => f.startsWith("docs/") || f.startsWith("scripts/") || /^src\/lib\/(.*Manual.*|manualArchitectureSync2026)\.ts$/.test(f) || f === "roadmap.md";
const outOfScope = changed.filter((f) => !allowed(f));
outOfScope.length === 0 ? pass("docs-only diff scope", `${changed.length} changed files, all documentation/manual/tooling`)
  : fail("docs-only diff scope", outOfScope.join(", "));

/* ------------------------------------------------------------------ report */
const failed = report.filter((r) => !r.ok);
for (const r of report) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name} — ${r.detail}`);
console.log(`\n${report.length - failed.length}/${report.length} checks passed.`);
process.exit(failed.length ? 1 : 0);
