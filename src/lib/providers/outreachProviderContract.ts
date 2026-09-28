/**
 * Provider-neutral outreach boundaries.
 *
 * A provider connection is always selected in the context of one Liftor
 * business. External IDs remain mapping values; the Liftor IDs below are the
 * only canonical identities exposed to CRM callers.
 */

export type OutreachProviderType = "apollo" | "smartlead" | "winnr";
export type ProviderExecutionMode = "read" | "preview" | "mutate";

export interface ProviderOperationContext {
  businessId: string;
  providerConnectionId: string;
  idempotencyKey: string;
  mode: ProviderExecutionMode;
}

export interface ProviderExternalIdentity {
  providerType: OutreachProviderType;
  providerConnectionId: string;
  providerEntityId: string;
  providerParentEntityId: string | null;
}

export interface CanonicalContactReference {
  liftorContactId: string;
  businessContactRelationshipId: string;
  businessId: string;
}

export interface ProviderCandidate {
  externalIdentity: ProviderExternalIdentity;
  displayName: string | null;
  companyName: string | null;
  title: string | null;
  emailAvailable: boolean;
  sourcePayload: Record<string, unknown>;
}

export interface ProviderEventEnvelope {
  providerType: OutreachProviderType;
  providerConnectionId: string;
  providerEventId: string | null;
  idempotencyKey: string;
  occurredAt: string | null;
  eventType: string;
  providerCampaignId: string | null;
  providerLeadId: string | null;
  providerMailboxId: string | null;
  payload: Record<string, unknown>;
}

export interface ProspectDiscoveryBoundary {
  discoverCandidates(
    context: ProviderOperationContext,
    criteria: Record<string, unknown>,
  ): Promise<ProviderCandidate[]>;
}

export interface ProspectEnrichmentBoundary {
  enrichContact(
    context: ProviderOperationContext,
    contact: CanonicalContactReference,
    fields: readonly string[],
  ): Promise<Record<string, unknown>>;
}

export interface CampaignExecutionBoundary {
  previewLeadEnrollment(
    context: ProviderOperationContext,
    campaignMappingId: string,
    leadMappingId: string,
  ): Promise<{ eligible: boolean; blockers: string[] }>;
  readEvents(
    context: ProviderOperationContext,
    cursor?: string | null,
  ): Promise<{ events: ProviderEventEnvelope[]; nextCursor: string | null }>;
}

export interface SenderInfrastructureBoundary {
  listSenderEstate(context: ProviderOperationContext): Promise<readonly Record<string, unknown>[]>;
  readSenderHealth(
    context: ProviderOperationContext,
    providerMailboxId: string,
  ): Promise<Record<string, unknown>>;
}

/** Fail closed before any adapter can read a credential or invoke a provider. */
export function assertProviderOperationContext(
  context: ProviderOperationContext,
  expectedBusinessId?: string,
): void {
  if (!context.businessId || !context.providerConnectionId || !context.idempotencyKey) {
    throw new Error("provider_operation_scope_required");
  }
  if (expectedBusinessId && context.businessId !== expectedBusinessId) {
    throw new Error("provider_business_scope_mismatch");
  }
  if (context.mode === "mutate") {
    throw new Error("provider_mutations_disabled");
  }
}
