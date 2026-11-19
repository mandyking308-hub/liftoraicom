// Builds the single Liftor Complete Manual (Markdown + Word) from the manual sources.
import { writeFileSync } from "fs";
import { buildPageGuideMarkdown } from "../src/lib/liftorPageGuide";
import * as U from "../src/lib/liftorUserManualContent";
import { ARCHITECTURE_SYNC_MARKDOWN, ARCHITECTURE_SYNC_VERSION } from "../src/lib/manualArchitectureSync2026";
import * as F from "../src/lib/founderManualContent";
import { SLIM_MANDY_MANUAL_MARKDOWN } from "../src/lib/slimMandyManualContent";

const sec = (x: any): string => {
  if (!x || typeof x !== "object") return "";
  const title = x.title ?? x.heading ?? "";
  const body = x.body ?? x.content ?? (Array.isArray(x.steps) ? x.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") : "");
  const rest = Object.entries(x).filter(([k]) => !["title","heading","body","content","steps","number","key","anchor"].includes(k))
    .map(([k, v]) => Array.isArray(v) ? `**${k}:**\n${v.map((i) => `- ${typeof i === "string" ? i : JSON.stringify(i)}`).join("\n")}` : typeof v === "string" ? `**${k}:** ${v}` : "").filter(Boolean).join("\n\n");
  return title || body ? `### ${title}\n\n${body}\n\n${rest}`.trim() : "";
};

const out: string[] = [
  "# Liftor — Complete Manual",
  `_One document: user guide for every page, operating manual, technical manual and portable summary. Built ${new Date().toISOString().slice(0,10)}._`,
  "",
  "> Part 1 is the current guide (19 November 2026). Later parts keep earlier dated material for history; where they differ, Part 1 wins. All external actions (sending, posting, charging, going live) remain OFF.",
  "",
  "## Checked 19 November 2026",
  "- Every one of the 198 pages listed in Part 1 was checked: each exists in Liftor and opens at the address shown.",
  "- Live records checked: Kindnesss is the only active business; all 19 safety switches are OFF; Smartlead campaign 4103531 is DRAFTED with 6 leads and 0 sent; 200 mailboxes are registered (180 GSM commercial + 20 GHAT charity); the School Register holds 52,591 schools.",
  "- The setup reader reads the home page plus up to 30 more pages of a website (31 in total).",
  "- Parts 2 to 4 are earlier, dated material kept for the record. They contain out-of-date instructions (for example 'start in the Command Centre' — Liftor HQ replaced it; Neon Candy as the test business — it is archived). Do not follow Parts 2 to 4 where they differ from Part 1.",
  "",
  "# Part 1 — User guide: every section and every page (CURRENT)",
  buildPageGuideMarkdown().replace(/^# .*\n/, ""),
  "# Part 2 — HISTORICAL: earlier operating manual (not current)",
  `_Version ${U.LIFTOR_USER_MANUAL_VERSION}_`,
  "## Simple guide", ...U.LIFTOR_SIMPLE_GUIDE.map(sec),
  "## Full operating manual", ...U.LIFTOR_FULL_GUIDE.map(sec),
  "## New business flow", ...U.NEW_BUSINESS_OPERATING_FLOW.map((s, i) => `${i + 1}. ${s}`),
  "## Other operating guides",
  ...Object.entries(U).filter(([k, v]) => !["LIFTOR_SIMPLE_GUIDE","LIFTOR_FULL_GUIDE","NEW_BUSINESS_OPERATING_FLOW","COMMAND_CENTRE_MANUAL_LINKS"].includes(k) && v && typeof v === "object")
    .flatMap(([, v]) => Array.isArray(v) ? v.map(sec) : [sec(v)]),
  "# Part 3 — HISTORICAL: technical manual as of 13 October 2026 (not current)",
  `_Architecture sync ${ARCHITECTURE_SYNC_VERSION}_`,
  ARCHITECTURE_SYNC_MARKDOWN,
  ...Object.entries(F).filter(([, v]) => typeof v === "string").map(([, v]) => v as string),
  "# Part 4 — HISTORICAL: portable summary as of 13 October 2026 (not current)",
  SLIM_MANDY_MANUAL_MARKDOWN.replace(/^# /gm, "## "),
];
writeFileSync("/tmp/liftor-complete-manual.md", out.filter(Boolean).join("\n\n"));
