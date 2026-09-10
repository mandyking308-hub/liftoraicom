// Portfolio-wide cross-brand collision / ownership logic (pure TS mirror of the
// transactional RPC public.claim_portfolio_contact / public.release_portfolio_contact).
//
// Rules:
//  - one contact may be RELEVANT to many brands
//  - only ONE brand may actively OWN outbound to that person at a time
//  - a reply / active conversation blocks competing-brand outreach
//  - a cooldown applies before a different portfolio brand may approach
//  - global suppression, unsubscribe/DNC and hard bounce block ALL brands
//  - founder override may beat prioritisation/ownership, but NEVER beats a hard block

export const COLLISION_ENGINE_VERSION = "edu-collision-1.0.0";
export const DEFAULT_CROSS_BRAND_COOLDOWN_DAYS = 30;

export type CollisionReasonCode =
  | "global_suppression"
  | "hard_bounce"
  | "unsubscribed"
  | "do_not_contact"
  | "active_conversation_block"
  | "owned_by_other_brand"
  | "cross_brand_cooldown"
  | "already_owned_by_requesting_brand"
  | "no_conflict";

/** Reason codes a founder override can never bypass. */
export const HARD_BLOCK_REASON_CODES: CollisionReasonCode[] = [
  "global_suppression",
  "hard_bounce",
  "unsubscribed",
  "do_not_contact",
  "active_conversation_block",
];

export interface CollisionContact {
  id: string;
  is_globally_suppressed?: boolean | null;
  hard_bounced?: boolean | null;
  unsubscribed_at?: string | null;
  do_not_contact_at?: string | null;
  do_not_contact_reason?: string | null;
  conversation_active?: boolean | null;
  last_replied_at?: string | null;
}

export interface OwnershipRow {
  contact_id: string;
  business_name: string;
  campaign_key?: string | null;
  status: "active" | "released";
  claimed_at?: string | null;
  released_at?: string | null;
  cooldown_until?: string | null;
}

export interface CollisionInput {
  contact: CollisionContact;
  requestingBusiness: string;
  activeOwnership?: OwnershipRow | null;
  /** Most recent released ownership rows (used for cooldown evaluation) */
  releasedOwnerships?: OwnershipRow[];
  founderOverride?: boolean;
  founderOverrideReason?: string;
  now?: Date;
}

export interface CollisionDecision {
  decision: "allowed" | "blocked";
  reason_codes: CollisionReasonCode[];
  hard_blocked: boolean;
  overridable: boolean;
  founder_override_applied: boolean;
  current_owner_business: string | null;
  current_owner_campaign_key: string | null;
  cooldown_until: string | null;
  engine_version: string;
  explanation: string;
}

export function evaluateCollision(input: CollisionInput): CollisionDecision {
  const now = input.now ?? new Date();
  const c = input.contact;
  const hard: CollisionReasonCode[] = [];
  const soft: CollisionReasonCode[] = [];

  if (c.is_globally_suppressed) hard.push("global_suppression");
  if (c.hard_bounced) hard.push("hard_bounce");
  if (c.unsubscribed_at) hard.push("unsubscribed");
  if (c.do_not_contact_at) hard.push("do_not_contact");

  const owner = input.activeOwnership && input.activeOwnership.status === "active"
    ? input.activeOwnership
    : null;
  const ownedBySomeoneElse = !!owner && owner.business_name !== input.requestingBusiness;

  // An active reply/conversation blocks competing brands outright.
  if (c.conversation_active && ownedBySomeoneElse) hard.push("active_conversation_block");
  if (c.conversation_active && !owner) hard.push("active_conversation_block");

  if (ownedBySomeoneElse) soft.push("owned_by_other_brand");

  let cooldownUntil: string | null = null;
  for (const rel of input.releasedOwnerships ?? []) {
    if (rel.business_name === input.requestingBusiness) continue;
    if (!rel.cooldown_until) continue;
    if (new Date(rel.cooldown_until).getTime() > now.getTime()) {
      if (!cooldownUntil || new Date(rel.cooldown_until) > new Date(cooldownUntil)) {
        cooldownUntil = rel.cooldown_until;
      }
    }
  }
  if (cooldownUntil) soft.push("cross_brand_cooldown");

  if (owner && !ownedBySomeoneElse && hard.length === 0) {
    return {
      decision: "allowed",
      reason_codes: ["already_owned_by_requesting_brand"],
      hard_blocked: false,
      overridable: false,
      founder_override_applied: false,
      current_owner_business: owner.business_name,
      current_owner_campaign_key: owner.campaign_key ?? null,
      cooldown_until: cooldownUntil,
      engine_version: COLLISION_ENGINE_VERSION,
      explanation: `${input.requestingBusiness} already owns this contact.`,
    };
  }

  const overrideApplied = !!input.founderOverride && hard.length === 0 && soft.length > 0;

  if (hard.length > 0) {
    return {
      decision: "blocked",
      reason_codes: [...hard, ...soft],
      hard_blocked: true,
      overridable: false,
      founder_override_applied: false,
      current_owner_business: owner?.business_name ?? null,
      current_owner_campaign_key: owner?.campaign_key ?? null,
      cooldown_until: cooldownUntil,
      engine_version: COLLISION_ENGINE_VERSION,
      explanation: `Hard safety block: ${hard.join(", ")}. Founder override cannot bypass this.`,
    };
  }

  if (soft.length > 0 && !overrideApplied) {
    return {
      decision: "blocked",
      reason_codes: soft,
      hard_blocked: false,
      overridable: true,
      founder_override_applied: false,
      current_owner_business: owner?.business_name ?? null,
      current_owner_campaign_key: owner?.campaign_key ?? null,
      cooldown_until: cooldownUntil,
      engine_version: COLLISION_ENGINE_VERSION,
      explanation: `Blocked by portfolio collision: ${soft.join(", ")}. A deliberate founder override may proceed.`,
    };
  }

  return {
    decision: "allowed",
    reason_codes: overrideApplied ? soft : ["no_conflict"],
    hard_blocked: false,
    overridable: true,
    founder_override_applied: overrideApplied,
    current_owner_business: owner?.business_name ?? null,
    current_owner_campaign_key: owner?.campaign_key ?? null,
    cooldown_until: cooldownUntil,
    engine_version: COLLISION_ENGINE_VERSION,
    explanation: overrideApplied
      ? `Founder override applied over: ${soft.join(", ")} (${input.founderOverrideReason || "no reason supplied"}).`
      : "No portfolio collision.",
  };
}

export function cooldownFrom(releasedAt: Date, days = DEFAULT_CROSS_BRAND_COOLDOWN_DAYS): Date {
  return new Date(releasedAt.getTime() + days * 24 * 60 * 60 * 1000);
}
