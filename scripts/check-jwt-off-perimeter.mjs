#!/usr/bin/env node
/**
 * Stage 1 regression guard.
 *
 * Every Edge Function deployed with `verify_jwt = false` must carry an explicit
 * perimeter classification in docs/liftor-rebuild/jwt-off-perimeter-inventory.json.
 * This script fails when:
 *   - a verify_jwt = false function has no inventory entry
 *   - an inventory entry names a function that is no longer verify_jwt = false
 *   - an entry uses a perimeter kind outside the allowed list
 *   - a write-capable entry has no mechanism recorded
 */
import { readFileSync } from "node:fs";

const config = readFileSync("supabase/config.toml", "utf8");
const inventory = JSON.parse(
  readFileSync("docs/liftor-rebuild/jwt-off-perimeter-inventory.json", "utf8"),
);

const jwtOff = [];
const lines = config.split("\n");
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^\[functions\.([a-z0-9-]+)\]\s*$/);
  if (!m) continue;
  for (let j = i + 1; j < lines.length && !lines[j].startsWith("["); j++) {
    if (/^verify_jwt\s*=\s*false\s*$/.test(lines[j].trim())) jwtOff.push(m[1]);
  }
}

const errors = [];
const known = Object.keys(inventory.functions);
const allowed = new Set(inventory.allowed_perimeter_kinds);

for (const fn of jwtOff) {
  if (!known.includes(fn)) {
    errors.push(`verify_jwt=false function "${fn}" has no perimeter classification`);
  }
}
for (const fn of known) {
  if (!jwtOff.includes(fn)) {
    errors.push(`inventory entry "${fn}" is no longer verify_jwt=false — remove or update it`);
  }
  const e = inventory.functions[fn];
  if (!allowed.has(e.perimeter)) errors.push(`"${fn}" uses unknown perimeter kind "${e.perimeter}"`);
  if (!e.mechanism || e.mechanism.length < 10) errors.push(`"${fn}" has no recorded mechanism`);
  if (e.write_capable && !e.writes) errors.push(`"${fn}" is write-capable with no recorded writes`);
}

if (errors.length) {
  console.error("JWT-off perimeter check FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`JWT-off perimeter check passed: ${jwtOff.length} functions, all classified.`);
