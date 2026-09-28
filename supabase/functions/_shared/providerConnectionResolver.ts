export type ScopedProviderType = "apollo" | "smartlead" | "winnr";
export type ProviderSecretPurpose = "CREDENTIAL" | "WEBHOOK_SECRET";

export interface ScopedProviderConnection {
  id: string;
  business_id: string;
  provider_type: string;
  connection_status: string;
  is_enabled: boolean;
  inbound_receiver_enabled: boolean;
  mutations_enabled: boolean;
  credential_secret_ref: string | null;
  webhook_secret_ref: string | null;
}

export type ScopedProviderConnectionResult =
  | { ok: true; connection: ScopedProviderConnection }
  | { ok: false; reason: "provider_connection_id_required" | "provider_connection_not_found" };

/** Connection IDs are random UUIDs; their secret references cannot alias another connection. */
export function expectedProviderSecretRef(
  connectionId: string,
  providerType: ScopedProviderType,
  purpose: ProviderSecretPurpose,
): string | null {
  const compactId = connectionId.replace(/-/g, "").toUpperCase();
  if (!/^[0-9A-F]{32}$/.test(compactId)) return null;
  return `LIFTOR_OUTREACH_${providerType.toUpperCase()}_${compactId}_${purpose}`;
}

/** Selects only the exact enabled connection owned by the requested business. */
export function resolveScopedProviderConnection(
  rows: readonly ScopedProviderConnection[],
  businessId: string,
  providerConnectionId: string | null | undefined,
  providerType: ScopedProviderType,
): ScopedProviderConnectionResult {
  if (!providerConnectionId) return { ok: false, reason: "provider_connection_id_required" };
  const connection = rows.find((row) =>
    row.id === providerConnectionId &&
    row.business_id === businessId &&
    row.provider_type === providerType &&
    row.connection_status === "verified" &&
    row.is_enabled
  );
  return connection
    ? { ok: true, connection }
    : { ok: false, reason: "provider_connection_not_found" };
}

/** Resolve only the connection's namespaced server secret; never fall back globally. */
export function resolveProviderConnectionSecret(
  connection: ScopedProviderConnection,
  purpose: ProviderSecretPurpose,
  readSecret: (name: string) => string | null | undefined,
): string | null {
  const expected = expectedProviderSecretRef(connection.id, connection.provider_type as ScopedProviderType, purpose);
  const configured = purpose === "CREDENTIAL" ? connection.credential_secret_ref : connection.webhook_secret_ref;
  if (!expected || configured !== expected) return null;
  const value = readSecret(expected)?.trim();
  return value || null;
}

