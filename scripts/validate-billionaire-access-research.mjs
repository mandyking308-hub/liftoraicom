#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const EXPECTED_ROWS = 3428;

const ALLOWED_STATUSES = new Set([
  "verified_public_institutional",
  "verified_institutional_restricted",
  "verified_institutional_switchboard_or_postal",
  "verified_institutional_source_age_warning",
  "legal_compliance_block",
  "enhanced_compliance_review",
  "deceased_remove_from_active_outreach",
]);

const EXPECTED_FINAL_COUNTS = {
  verified_public_institutional: 2217,
  verified_institutional_restricted: 933,
  verified_institutional_source_age_warning: 74,
  verified_institutional_switchboard_or_postal: 18,
  legal_compliance_block: 60,
  deceased_remove_from_active_outreach: 3,
  enhanced_compliance_review: 123,
};

function batchPath(batch) {
  const number = String(batch).padStart(3, "0");
  if (batch === 1) {
    return "docs/billionaire-access-verification-batch-001-2026-top100.md";
  }
  if (batch <= 5) {
    const start = (batch - 1) * 100 + 1;
    return `docs/billionaire-access-verification-batch-${number}-2026-ranks-${start}-${batch * 100}.md`;
  }
  const start = (batch - 1) * 100 + 1;
  const end = batch === 35 ? EXPECTED_ROWS : batch * 100;
  return `docs/billionaire-access-verification-batch-${number}-2026-rows-${start}-${end}.md`;
}

const BATCH_FILES = Array.from({ length: 35 }, (_, index) => batchPath(index + 1));
const BATCH_001_OVERRIDES =
  "docs/billionaire-access-verification-batch-001-compliance-overrides-2026-08-23.md";
const BATCH_016_CORRECTIONS =
  "docs/billionaire-access-verification-batch-016-corrections-2026-08-24.md";

function fail(message) {
  throw new Error(message);
}

function readRepoFile(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) fail(`Missing source file: ${relativePath}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function splitCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function findTable(markdown, headerMatcher, sourceFile) {
  const lines = markdown.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("|")) continue;
    const headers = splitCells(lines[index]);
    if (!headerMatcher(headers)) continue;

    const rows = [];
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      if (!lines[rowIndex].trim().startsWith("|")) break;
      rows.push(splitCells(lines[rowIndex]));
    }
    return { headers, rows };
  }
  fail(`Could not find the expected table in ${sourceFile}`);
}

function columnIndex(headers, matcher, label, sourceFile) {
  const index = headers.findIndex((header) => matcher.test(header.toLowerCase()));
  if (index === -1) fail(`Missing ${label} column in ${sourceFile}`);
  return index;
}

function parseStatus(value) {
  return value.match(/`([^`]+)`/)?.[1] ?? value.trim();
}

function parseBatchFile(sourceFile) {
  const table = findTable(
    readRepoFile(sourceFile),
    (headers) =>
      headers.some((header) => /billionaire/i.test(header)) &&
      headers.some((header) => /^(#|row|rank|seq\.?)$/i.test(header)),
    sourceFile,
  );
  const headers = table.headers.map((header) => header.toLowerCase());
  const rowIndex = columnIndex(headers, /^(#|row|rank|seq\.?)$/, "row", sourceFile);
  const nameIndex = columnIndex(headers, /billionaire/, "billionaire", sourceFile);
  const routeIndex = columnIndex(headers, /route|organisation/, "route", sourceFile);
  const statusIndex = columnIndex(headers, /verification|^status$/, "status", sourceFile);
  const accessIndex = headers.findIndex((header) => /access mode/.test(header));
  const restrictionIndex = headers.findIndex((header) => /restriction/.test(header));
  const sourceIndex = headers.findIndex((header) => /source/.test(header));

  return table.rows.map((cells) => {
    const sourceRow = Number((cells[rowIndex] ?? "").replace(/[^\d]/g, ""));
    if (!Number.isInteger(sourceRow) || sourceRow < 1) {
      fail(`Invalid source row in ${sourceFile}: ${cells[rowIndex]}`);
    }
    const verificationStatus = parseStatus(cells[statusIndex] ?? "");
    if (!ALLOWED_STATUSES.has(verificationStatus)) {
      fail(`Unexpected status ${verificationStatus} for source row ${sourceRow}`);
    }
    return {
      sourceRow,
      billionaire: cells[nameIndex],
      institutionalRoute: cells[routeIndex],
      accessMode: accessIndex === -1 ? null : cells[accessIndex],
      restriction: restrictionIndex === -1 ? null : cells[restrictionIndex],
      verificationStatus,
      officialSource: sourceIndex === -1 ? null : cells[sourceIndex],
      evidenceFile: sourceFile,
      overlayFiles: [],
      correctionNote: null,
      outreachAllowed: false,
    };
  });
}

function applyBatch001Overrides(recordsByRow) {
  const sourceFile = BATCH_001_OVERRIDES;
  const table = findTable(
    readRepoFile(sourceFile),
    (headers) =>
      headers.some((header) => /Batch 001 row/i.test(header)) &&
      headers.some((header) => /Override classification/i.test(header)),
    sourceFile,
  );
  const headers = table.headers.map((header) => header.toLowerCase());
  const rowIndex = columnIndex(headers, /batch 001 row/, "row", sourceFile);
  const statusIndex = columnIndex(headers, /override classification/, "override status", sourceFile);
  const reasonIndex = columnIndex(headers, /reason/, "reason", sourceFile);
  const sourceIndex = columnIndex(headers, /evidence/, "evidence", sourceFile);

  for (const cells of table.rows) {
    const sourceRow = Number(cells[rowIndex].replace(/[^\d]/g, ""));
    const record = recordsByRow.get(sourceRow);
    if (!record) fail(`Override refers to missing source row ${sourceRow}`);
    const verificationStatus = parseStatus(cells[statusIndex]);
    if (!ALLOWED_STATUSES.has(verificationStatus)) {
      fail(`Unexpected override status ${verificationStatus} for source row ${sourceRow}`);
    }
    record.verificationStatus = verificationStatus;
    record.restriction = cells[reasonIndex];
    record.officialSource = cells[sourceIndex];
    record.overlayFiles.push(sourceFile);
  }
  return table.rows.length;
}

function correctedStatus(sourceRow, correctionText) {
  const matches = [...ALLOWED_STATUSES].filter((status) =>
    correctionText.includes(`\`${status}\``),
  );
  if (matches.length === 1) return matches[0];
  if (sourceRow === 1594 && /restricted institutional asset route/i.test(correctionText)) {
    return "verified_institutional_restricted";
  }
  fail(`Could not determine one corrected status for source row ${sourceRow}`);
}

function applyBatch016Corrections(recordsByRow) {
  const sourceFile = BATCH_016_CORRECTIONS;
  const table = findTable(
    readRepoFile(sourceFile),
    (headers) =>
      headers.some((header) => /^Row$/i.test(header)) &&
      headers.some((header) => /Corrected route/i.test(header)),
    sourceFile,
  );
  const headers = table.headers.map((header) => header.toLowerCase());
  const rowIndex = columnIndex(headers, /^row$/, "row", sourceFile);
  const correctionIndex = columnIndex(headers, /corrected route/, "correction", sourceFile);

  for (const cells of table.rows) {
    const sourceRow = Number(cells[rowIndex].replace(/[^\d]/g, ""));
    const record = recordsByRow.get(sourceRow);
    if (!record) fail(`Correction refers to missing source row ${sourceRow}`);
    const correctionText = cells[correctionIndex];
    record.verificationStatus = correctedStatus(sourceRow, correctionText);
    record.correctionNote = correctionText;
    record.overlayFiles.push(sourceFile);
  }
  return table.rows.length;
}

function countStatuses(records) {
  return records.reduce((counts, record) => {
    counts[record.verificationStatus] = (counts[record.verificationStatus] ?? 0) + 1;
    return counts;
  }, {});
}

function assertCounts(actual) {
  for (const [status, expected] of Object.entries(EXPECTED_FINAL_COUNTS)) {
    if ((actual[status] ?? 0) !== expected) {
      fail(`Status count mismatch for ${status}: expected ${expected}, got ${actual[status] ?? 0}`);
    }
  }
}

function validate() {
  const recordsByRow = new Map();
  const batchSummary = [];

  for (const sourceFile of BATCH_FILES) {
    const records = parseBatchFile(sourceFile);
    for (const record of records) {
      if (recordsByRow.has(record.sourceRow)) fail(`Duplicate source row ${record.sourceRow}`);
      recordsByRow.set(record.sourceRow, record);
    }
    batchSummary.push({
      sourceFile,
      rows: records.length,
      firstRow: records[0]?.sourceRow ?? null,
      lastRow: records.at(-1)?.sourceRow ?? null,
    });
  }

  const missingRows = [];
  for (let sourceRow = 1; sourceRow <= EXPECTED_ROWS; sourceRow += 1) {
    if (!recordsByRow.has(sourceRow)) missingRows.push(sourceRow);
  }
  if (recordsByRow.size !== EXPECTED_ROWS || missingRows.length > 0) {
    fail(
      `Coverage mismatch: expected ${EXPECTED_ROWS} unique rows, got ${recordsByRow.size}; ` +
        `missing ${missingRows.slice(0, 20).join(", ")}`,
    );
  }

  const batch001Overrides = applyBatch001Overrides(recordsByRow);
  const batch016Corrections = applyBatch016Corrections(recordsByRow);
  const records = [...recordsByRow.values()].sort((a, b) => a.sourceRow - b.sourceRow);
  const statusCounts = countStatuses(records);
  assertCounts(statusCounts);

  return {
    manifest: {
      sourceUniverse: "Forbes World's Billionaires 2026 derivative used by Liftor",
      sourceRows: EXPECTED_ROWS,
      batchFiles: BATCH_FILES.length,
      firstRow: records[0].sourceRow,
      lastRow: records.at(-1).sourceRow,
      missingRows: 0,
      duplicateRows: 0,
      batch001Overrides,
      batch016Corrections,
      overlayRows: batch001Overrides + batch016Corrections,
      statusCounts,
      outreachAllowed: false,
      productionReconciliationRequired: true,
      productionUniverseRows: 2754,
      highConfidenceMatches: 2274,
      ambiguousMatches: 4,
      new2026Names: 1150,
      dropoffCandidates: 480,
    },
    batchSummary,
    records,
  };
}

function parseArgs(argv) {
  const options = { output: null, printRecords: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      options.output = argv[index + 1];
      if (!options.output) fail("--output requires a file path");
      index += 1;
    } else if (arg === "--print-records") {
      options.printRecords = true;
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

try {
  const options = parseArgs(process.argv.slice(2));
  const result = validate();
  if (options.output) {
    const outputPath = path.resolve(REPO_ROOT, options.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  console.log(
    JSON.stringify(options.printRecords ? result : { manifest: result.manifest }, null, 2),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
