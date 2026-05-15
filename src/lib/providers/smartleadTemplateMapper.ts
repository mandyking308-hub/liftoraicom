/**
 * Smartlead template mapper.
 *
 * Converts Liftor outreach placeholders ([First Name], etc.) into Smartlead-safe
 * merge tokens ({{first_name}}, etc.) and validates the resulting template for
 * unresolved placeholders, missing footer/unsubscribe, missing signature, and
 * empty/risky fields.
 *
 * Pure helper — no network, no DB, no side effects. Safe to import on client + edge.
 */

export type PlaceholderMap = Record<string, string>;

export const LIFTOR_TO_SMARTLEAD: PlaceholderMap = {
  "[First Name]": "{{first_name}}",
  "[first name]": "{{first_name}}",
  "[FirstName]": "{{first_name}}",
  "[Last Name]": "{{last_name}}",
  "[LastName]": "{{last_name}}",
  "[Company]": "{{company_name}}",
  "[Company Name]": "{{company_name}}",
  "[Website]": "{{website}}",
  "[LinkedIn]": "{{linkedin_profile}}",
  "[Linkedin]": "{{linkedin_profile}}",
  "[Email]": "{{email}}",
};

export const SUPPORTED_SMARTLEAD_TOKENS = new Set([
  "{{first_name}}",
  "{{last_name}}",
  "{{company_name}}",
  "{{website}}",
  "{{linkedin_profile}}",
  "{{email}}",
  "{{signature}}",
]);

export type ValidationIssue = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  field?: "subject" | "body";
};

export type ConversionResult = {
  original_subject: string;
  original_body: string;
  converted_subject: string;
  converted_body: string;
  issues: ValidationIssue[];
  validation_status: "ok" | "warning" | "error";
  detected_unresolved_brackets: string[];
  detected_unsupported_smartlead_tokens: string[];
  has_footer: boolean;
  has_unsubscribe: boolean;
  has_signature: boolean;
};

function convertPlaceholders(input: string): string {
  let out = input ?? "";
  for (const [from, to] of Object.entries(LIFTOR_TO_SMARTLEAD)) {
    // case-insensitive whole-token replace
    const re = new RegExp(escapeRegex(from), "gi");
    out = out.replace(re, to);
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findUnresolvedBrackets(text: string): string[] {
  // Anything left as [Word ...] after conversion is unresolved.
  const matches = (text ?? "").match(/\[[A-Za-z][^\]\n]{0,40}\]/g) ?? [];
  return Array.from(new Set(matches));
}

function findUnsupportedSmartleadTokens(text: string): string[] {
  const tokens = (text ?? "").match(/\{\{[^}\n]+\}\}/g) ?? [];
  const bad = tokens.filter((t) => !SUPPORTED_SMARTLEAD_TOKENS.has(t.toLowerCase()));
  return Array.from(new Set(bad));
}

export function convertTemplate(input: {
  subject: string;
  body: string;
  business_name?: string | null;
  unsubscribe_block?: string | null;
}): ConversionResult {
  const subject = input.subject ?? "";
  const body = input.body ?? "";
  const convertedSubject = convertPlaceholders(subject);
  const convertedBody = convertPlaceholders(body);

  const issues: ValidationIssue[] = [];

  const unresolvedSubject = findUnresolvedBrackets(convertedSubject);
  const unresolvedBody = findUnresolvedBrackets(convertedBody);
  const unresolvedAll = Array.from(new Set([...unresolvedSubject, ...unresolvedBody]));

  for (const u of unresolvedSubject) {
    issues.push({
      severity: "error",
      code: "unresolved_placeholder_subject",
      message: `Subject still contains an unresolved placeholder: ${u}`,
      field: "subject",
    });
  }
  for (const u of unresolvedBody) {
    issues.push({
      severity: "error",
      code: "unresolved_placeholder_body",
      message: `Body still contains an unresolved placeholder: ${u}`,
      field: "body",
    });
  }

  const unsupportedSubject = findUnsupportedSmartleadTokens(convertedSubject);
  const unsupportedBody = findUnsupportedSmartleadTokens(convertedBody);
  for (const t of unsupportedSubject) {
    issues.push({
      severity: "warning",
      code: "unsupported_smartlead_token",
      message: `Subject contains a Smartlead token that is not in the supported set: ${t}`,
      field: "subject",
    });
  }
  for (const t of unsupportedBody) {
    issues.push({
      severity: "warning",
      code: "unsupported_smartlead_token",
      message: `Body contains a Smartlead token that is not in the supported set: ${t}`,
      field: "body",
    });
  }

  const lowerBody = convertedBody.toLowerCase();
  const hasUnsubscribe =
    /unsubscribe|opt[- ]?out|reply\s+stop|no longer.*hear|remove me/.test(lowerBody);
  const hasFooter = hasUnsubscribe || /\n--\s*\n|sent from|^©|all rights reserved/i.test(convertedBody);

  // Signature heuristic: a sign-off line near the end (– X / -- X / Best, X / Thanks, X / a personal name).
  const tail = convertedBody.trim().split(/\n+/).slice(-4).join("\n");
  const hasSignature =
    /(^|\n)\s*(?:[–-]{1,2}\s*\S+|best,|thanks,|cheers,|kind regards,|regards,)/i.test(tail);

  if (!hasUnsubscribe) {
    issues.push({
      severity: "error",
      code: "missing_unsubscribe",
      message: "Body has no detectable unsubscribe / opt-out language. Smartlead requires this for cold outreach.",
      field: "body",
    });
  }
  if (!hasFooter) {
    issues.push({
      severity: "warning",
      code: "missing_footer",
      message: "Body has no detectable footer block.",
      field: "body",
    });
  }
  if (!hasSignature) {
    issues.push({
      severity: "warning",
      code: "missing_signature",
      message: "Body has no detectable sender sign-off (e.g. '– NeonCandy', 'Best, …').",
      field: "body",
    });
  }
  if (!subject.trim()) {
    issues.push({
      severity: "error",
      code: "empty_subject",
      message: "Subject is empty.",
      field: "subject",
    });
  }
  if (!body.trim()) {
    issues.push({
      severity: "error",
      code: "empty_body",
      message: "Body is empty.",
      field: "body",
    });
  }
  if (subject.length > 120) {
    issues.push({
      severity: "warning",
      code: "long_subject",
      message: `Subject is ${subject.length} chars; aim for under 80.`,
      field: "subject",
    });
  }

  const validation_status: ConversionResult["validation_status"] = issues.some((i) => i.severity === "error")
    ? "error"
    : issues.some((i) => i.severity === "warning")
      ? "warning"
      : "ok";

  return {
    original_subject: subject,
    original_body: body,
    converted_subject: convertedSubject,
    converted_body: convertedBody,
    issues,
    validation_status,
    detected_unresolved_brackets: unresolvedAll,
    detected_unsupported_smartlead_tokens: Array.from(
      new Set([...unsupportedSubject, ...unsupportedBody]),
    ),
    has_footer: hasFooter,
    has_unsubscribe: hasUnsubscribe,
    has_signature: hasSignature,
  };
}

export type LiftorSequenceStep = {
  step_number: number;
  subject: string;
  body: string;
  delay_days: number;
};

export type ConvertedSequenceStep = LiftorSequenceStep & {
  conversion: ConversionResult;
};

export function convertSequence(steps: LiftorSequenceStep[]): ConvertedSequenceStep[] {
  return steps
    .slice()
    .sort((a, b) => a.step_number - b.step_number)
    .map((s) => ({ ...s, conversion: convertTemplate({ subject: s.subject, body: s.body }) }));
}