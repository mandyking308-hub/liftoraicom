/**
 * Voice Provider Adapter Layer — interface only.
 *
 * Liftor's Customer Voice + Sales Close Engine talks to this adapter, never
 * directly to a voice/telephony provider. Concrete adapters (Retell, Vapi,
 * Twilio Programmable Voice, ElevenLabs, Custom) implement this interface in
 * later build tasks.
 */

export type VoiceProviderType =
  | "retell"
  | "vapi"
  | "twilio"
  | "elevenlabs"
  | "custom";

export type VoiceProviderStatus =
  | "not_connected"
  | "configured"
  | "live"
  | "paused"
  | "error";

export interface VoiceProviderRecord {
  id: string;
  provider_type: VoiceProviderType;
  provider_status: VoiceProviderStatus;
  api_secret_configured: boolean;
  webhook_url: string | null;
  phone_number: string | null;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
  web_call_enabled: boolean;
  batch_calls_enabled: boolean;
  recording_enabled: boolean;
  transcription_enabled: boolean;
  consent_notice_required: boolean;
  consent_notice_text: string | null;
  default_voice_id: string | null;
  default_voice_name: string | null;
  default_agent_id: string | null;
  default_agent_name: string | null;
  rate_limit_per_hour: number | null;
  last_test_at: string | null;
  last_test_result: string | null;
  last_error: string | null;
  next_setup_action: string | null;
}

export interface InboundCallContext {
  provider: VoiceProviderType;
  from_number: string | null;
  to_number: string | null;
  matched_product_id: string | null;
  matched_playbook_id: string | null;
  consent_notice: string | null;
  recording_enabled: boolean;
  transcription_enabled: boolean;
  must_escalate_to_human: boolean;
  escalation_reason: string | null;
}

export interface OutboundCallDraft {
  provider: VoiceProviderType;
  contact_id: string | null;
  product_id: string | null;
  playbook_id: string | null;
  to_number: string | null;
  from_number: string | null;
  voice_id: string | null;
  agent_id: string | null;
  opening_script: string;
  discovery_questions: string[];
  approved_claims: string[];
  prohibited_claims: string[];
  consent_notice: string | null;
  approval_required: boolean;
  eligibility: OutboundEligibility;
}

export interface OutboundEligibility {
  eligible: boolean;
  blockers: string[];
  warnings: string[];
}

export interface CallEventRecord {
  provider: VoiceProviderType;
  external_call_id: string | null;
  conversation_id: string | null;
  call_log_id: string | null;
  event_type: string;
  outcome: string | null;
  raw: unknown;
}

export interface TranscriptIngestResult {
  conversation_id: string | null;
  call_log_id: string | null;
  transcript_segments: number;
  characters: number;
  redacted: boolean;
}

export interface CallAnalysisResult {
  conversation_id: string;
  customer_need: string | null;
  recommended_product_id: string | null;
  recommended_offer_id: string | null;
  qualification_score: number | null;
  close_probability: number | null;
  buying_signals: string[];
  objections: string[];
  recommended_next_action: string | null;
  founder_approval_required: boolean;
  approval_reason: string | null;
}

export interface CloseActionDraft {
  conversation_id: string;
  action_type:
    | "send_offer"
    | "send_contract"
    | "send_payment_link"
    | "schedule_followup"
    | "schedule_demo"
    | "escalate_human";
  recommended_product_id: string | null;
  recommended_offer_id: string | null;
  rationale: string;
  estimated_value: number | null;
  requires_approval: boolean;
  external_action_locked: boolean;
}

export interface VoiceProviderAdapter {
  getProviderStatus(provider: VoiceProviderType): Promise<VoiceProviderRecord | null>;
  prepareInboundCallContext(payload: Record<string, unknown>): Promise<InboundCallContext>;
  prepareOutboundCallDraft(
    contact: { id?: string | null; phone?: string | null; full_name?: string | null } | null,
    product: { id?: string | null; name?: string | null; completeness?: number | null } | null,
    playbook: { id?: string | null; name?: string | null } | null,
  ): Promise<OutboundCallDraft>;
  ingestCallEvent(providerPayload: Record<string, unknown>): Promise<CallEventRecord>;
  ingestTranscript(providerPayload: Record<string, unknown>): Promise<TranscriptIngestResult>;
  analyseCall(conversationId: string): Promise<CallAnalysisResult>;
  prepareCloseAction(conversationId: string): Promise<CloseActionDraft>;
}

export class NullVoiceProviderAdapter implements VoiceProviderAdapter {
  async getProviderStatus(): Promise<VoiceProviderRecord | null> { return null; }
  async prepareInboundCallContext(): Promise<InboundCallContext> {
    return {
      provider: "custom", from_number: null, to_number: null,
      matched_product_id: null, matched_playbook_id: null,
      consent_notice: null, recording_enabled: false, transcription_enabled: false,
      must_escalate_to_human: true, escalation_reason: "no_adapter_registered",
    };
  }
  async prepareOutboundCallDraft(): Promise<OutboundCallDraft> {
    return {
      provider: "custom", contact_id: null, product_id: null, playbook_id: null,
      to_number: null, from_number: null, voice_id: null, agent_id: null,
      opening_script: "", discovery_questions: [], approved_claims: [], prohibited_claims: [],
      consent_notice: null, approval_required: true,
      eligibility: { eligible: false, blockers: ["no_adapter_registered"], warnings: [] },
    };
  }
  async ingestCallEvent(): Promise<CallEventRecord> {
    return { provider: "custom", external_call_id: null, conversation_id: null, call_log_id: null, event_type: "unknown", outcome: null, raw: null };
  }
  async ingestTranscript(): Promise<TranscriptIngestResult> {
    return { conversation_id: null, call_log_id: null, transcript_segments: 0, characters: 0, redacted: false };
  }
  async analyseCall(conversationId: string): Promise<CallAnalysisResult> {
    return {
      conversation_id: conversationId, customer_need: null,
      recommended_product_id: null, recommended_offer_id: null,
      qualification_score: null, close_probability: null,
      buying_signals: [], objections: [], recommended_next_action: null,
      founder_approval_required: true, approval_reason: "no_adapter_registered",
    };
  }
  async prepareCloseAction(conversationId: string): Promise<CloseActionDraft> {
    return {
      conversation_id: conversationId, action_type: "escalate_human",
      recommended_product_id: null, recommended_offer_id: null,
      rationale: "no_adapter_registered", estimated_value: null,
      requires_approval: true, external_action_locked: true,
    };
  }
}

export function evaluateOutboundEligibility(input: {
  provider: VoiceProviderRecord | null;
  contactConsentBasis?: string | null;
  productCompleteness?: number | null;
  founderApprovalGranted?: boolean;
  preApprovedCampaign?: boolean;
  externalActionGateEnabled?: boolean;
  callsThisHour?: number;
}): OutboundEligibility {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const p = input.provider;
  if (!p) blockers.push("provider_not_connected");
  else {
    if (p.provider_status !== "live") blockers.push(`provider_status_${p.provider_status}`);
    if (!p.outbound_enabled) blockers.push("outbound_disabled");
    if (!p.api_secret_configured) blockers.push("api_secret_missing");
  }
  if (!input.contactConsentBasis) warnings.push("contact_lawful_basis_unverified");
  if ((input.productCompleteness ?? 0) < 70) blockers.push("product_knowledge_below_70");
  if (!input.founderApprovalGranted && !input.preApprovedCampaign) blockers.push("founder_approval_required");
  if (!input.externalActionGateEnabled) blockers.push("external_action_gate_locked");
  if (p?.rate_limit_per_hour && input.callsThisHour && input.callsThisHour >= p.rate_limit_per_hour) {
    blockers.push("rate_limit_exceeded");
  }
  return { eligible: blockers.length === 0, blockers, warnings };
}

const REGISTRY = new Map<VoiceProviderType, VoiceProviderAdapter>();
export function registerVoiceProviderAdapter(provider: VoiceProviderType, adapter: VoiceProviderAdapter) {
  REGISTRY.set(provider, adapter);
}
export function getVoiceProviderAdapter(provider: VoiceProviderType): VoiceProviderAdapter {
  return REGISTRY.get(provider) ?? new NullVoiceProviderAdapter();
}

export const SUPPORTED_VOICE_PROVIDERS: { type: VoiceProviderType; label: string; description: string }[] = [
  { type: "retell", label: "Retell AI", description: "Realtime voice agents with built-in telephony." },
  { type: "vapi", label: "Vapi", description: "Realtime voice agents over PSTN, SIP and web." },
  { type: "twilio", label: "Twilio Programmable Voice", description: "Carrier-grade telephony, you bring the agent layer." },
  { type: "elevenlabs", label: "ElevenLabs ElevenAgents", description: "Conversational voice agents with ElevenLabs voices." },
  { type: "custom", label: "Custom provider", description: "Bring your own provider via webhook + adapter shim." },
];
