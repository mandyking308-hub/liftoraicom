export type AllowedRecordResult =
  | { ok: true; record: Record<string, any> }
  | { ok: false; error: string; rejected_fields: string[] };

/**
 * Build a database row only from an explicit list of caller-editable fields.
 * Unknown and protected fields are rejected rather than silently ignored.
 */
export function pickAllowedRecord(
  input: unknown,
  allowedFields: readonly string[],
): AllowedRecordResult {
  if (input == null) return { ok: true, record: {} };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'record_must_be_an_object', rejected_fields: [] };
  }

  const source = input as Record<string, unknown>;
  const allowed = new Set(allowedFields);
  const rejectedFields = Object.keys(source).filter((field) => !allowed.has(field));
  if (rejectedFields.length > 0) {
    return { ok: false, error: 'record_contains_fields_that_cannot_be_set', rejected_fields: rejectedFields };
  }

  const record: Record<string, any> = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) record[field] = source[field];
  }
  return { ok: true, record };
}
