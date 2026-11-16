/** Metadata-only privacy transfer contract, independent of commercial fan-in. */

const ALLOWED_KEYS = new Set(["source", "businessId", "requestId", "requestType", "submittedAt"]);

export interface PrivacyTransferInput {
  source: "kindnesss";
  businessId: string;
  requestId: string;
  requestType: "access" | "erasure" | "rectification" | "restriction" | "portability" | "objection" | "other";
  submittedAt: string;
}

export function buildMetadataOnlyPrivacyTransfer(
  value: Record<string, unknown>,
): { ok: true; record: {
  business_id: string;
  contact_id: null;
  request_type: string;
  request_status: "received";
  request_source: "kindnesss_metadata_only";
  request_summary: null;
  founder_review_required: true;
  legal_review_recommended: true;
  metadata: { external_request_id: string; submitted_at: string; transfer_mode: "metadata_only" };
} } | { ok: false; reason: "invalid_metadata_only_transfer" } {
  if (!value || Object.keys(value).some((key) => !ALLOWED_KEYS.has(key))) {
    return { ok: false, reason: "invalid_metadata_only_transfer" };
  }
  const input = value as unknown as PrivacyTransferInput;
  const types = new Set(["access", "erasure", "rectification", "restriction", "portability", "objection", "other"]);
  if (
    input.source !== "kindnesss" ||
    typeof input.businessId !== "string" || !input.businessId ||
    typeof input.requestId !== "string" || !input.requestId ||
    typeof input.requestType !== "string" || !types.has(input.requestType) ||
    typeof input.submittedAt !== "string" || Number.isNaN(Date.parse(input.submittedAt))
  ) {
    return { ok: false, reason: "invalid_metadata_only_transfer" };
  }
  return {
    ok: true,
    record: {
      business_id: input.businessId,
      contact_id: null,
      request_type: input.requestType,
      request_status: "received",
      request_source: "kindnesss_metadata_only",
      request_summary: null,
      founder_review_required: true,
      legal_review_recommended: true,
      metadata: {
        external_request_id: input.requestId,
        submitted_at: input.submittedAt,
        transfer_mode: "metadata_only",
      },
    },
  };
}
