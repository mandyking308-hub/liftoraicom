#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationDir = path.join(repoRoot, "supabase", "migrations");
const seedFiles = [
  "20260824140100_seed_billionaire_access_research_2026_part_1.sql",
  "20260824140200_seed_billionaire_access_research_2026_part_2.sql",
  "20260824140300_seed_billionaire_access_research_2026_part_3.sql",
  "20260824140400_seed_billionaire_access_research_2026_part_4.sql",
];
const requiredFiles = [
  "20260824140000_create_billionaire_access_research_2026.sql",
  ...seedFiles,
  "20260824140500_reconcile_billionaire_access_research_2026.sql",
];
const expectedStatuses = {
  verified_public_institutional: 2217,
  verified_institutional_restricted: 933,
  verified_institutional_source_age_warning: 74,
  verified_institutional_switchboard_or_postal: 18,
  legal_compliance_block: 60,
  deceased_remove_from_active_outreach: 3,
  enhanced_compliance_review: 123,
};

function fail(message) {
  throw new Error(message);
}

try {
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(migrationDir, file))) fail(`Missing migration: ${file}`);
  }

  const rows = new Set();
  const statusCounts = Object.fromEntries(Object.keys(expectedStatuses).map((status) => [status, 0]));

  for (const file of seedFiles) {
    const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
    for (const line of sql.split(/\r?\n/)) {
      const match = line.match(/^\((\d+),/);
      if (!match) continue;
      const sourceRow = Number(match[1]);
      if (rows.has(sourceRow)) fail(`Duplicate source row ${sourceRow}`);
      rows.add(sourceRow);
      if (!line.includes(", false, ")) fail(`Outreach is not explicitly false for source row ${sourceRow}`);

      const matchedStatuses = Object.keys(expectedStatuses).filter((status) =>
        line.includes(`'${status}'`),
      );
      if (matchedStatuses.length !== 1) {
        fail(`Expected one verification status for source row ${sourceRow}`);
      }
      statusCounts[matchedStatuses[0]] += 1;
    }
  }

  if (rows.size !== 3428) fail(`Expected 3428 seed rows, found ${rows.size}`);
  for (let sourceRow = 1; sourceRow <= 3428; sourceRow += 1) {
    if (!rows.has(sourceRow)) fail(`Missing source row ${sourceRow}`);
  }
  for (const [status, expected] of Object.entries(expectedStatuses)) {
    if (statusCounts[status] !== expected) {
      fail(`Status count mismatch for ${status}: expected ${expected}, got ${statusCounts[status]}`);
    }
  }

  console.log(JSON.stringify({
    migrations: requiredFiles.length,
    sourceRows: rows.size,
    missingRows: 0,
    duplicateRows: 0,
    statusCounts,
    outreachAllowed: false,
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
