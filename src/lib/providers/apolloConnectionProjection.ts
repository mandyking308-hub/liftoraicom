/** Browser-safe Apollo connection columns. Never request encrypted credentials. */
export const APOLLO_CONNECTION_UI_COLUMNS =
  "id, business_name, api_key_last4, search_api_status, search_api_error, search_api_verified_at, enrichment_api_status, enrichment_api_error, enrichment_api_verified_at, is_active, created_at" as const;
