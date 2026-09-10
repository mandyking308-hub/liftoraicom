// Deterministic first-proposition selection across the four education businesses.
// Founder override is supported and always audited, but override NEVER bypasses
// the safety blocks enforced in portfolioCollision.ts / outreachEligibilityGate.ts.

import { EDUCATION_BUSINESSES, EducationBusinessSlug } from "./educationBusinesses";
import {
  BusinessRelevanceResult,
  RELEVANCE_QUALIFICATION_THRESHOLD,
  RelevanceContactInput,
  scoreAllEducationBusinesses,
} from "./educationBusinessRelevance";

export interface PrioritisationResult {
  selected_slug: EducationBusinessSlug | null;
  selected_business: string | null;
  selection_reason: string;
  founder_override: boolean;
  ranked: BusinessRelevanceResult[];
  engine_version: string;
}

export const PRIORITISATION_ENGINE_VERSION = "edu-prioritisation-1.0.0";

const TIE_BREAK = new Map<EducationBusinessSlug, number>(
  EDUCATION_BUSINESSES.map((b) => [b.slug, b.priorityOrder]),
);

export function rankEducationBusinesses(contact: RelevanceContactInput): BusinessRelevanceResult[] {
  return scoreAllEducationBusinesses(contact).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (TIE_BREAK.get(a.business_slug) ?? 99) - (TIE_BREAK.get(b.business_slug) ?? 99);
  });
}

export function selectFirstProposition(
  contact: RelevanceContactInput,
  options: {
    minScore?: number;
    founderOverrideSlug?: EducationBusinessSlug | null;
    founderOverrideReason?: string;
  } = {},
): PrioritisationResult {
  const minScore = options.minScore ?? RELEVANCE_QUALIFICATION_THRESHOLD;
  const ranked = rankEducationBusinesses(contact);

  if (options.founderOverrideSlug) {
    const chosen = ranked.find((r) => r.business_slug === options.founderOverrideSlug)!;
    return {
      selected_slug: chosen.business_slug,
      selected_business: chosen.business_name,
      selection_reason: `founder_override: ${options.founderOverrideReason || "no reason supplied"} (engine rank ${
        ranked.findIndex((r) => r.business_slug === chosen.business_slug) + 1
      }, score ${chosen.score})`,
      founder_override: true,
      ranked,
      engine_version: PRIORITISATION_ENGINE_VERSION,
    };
  }

  const top = ranked[0];
  if (!top || top.score < minScore) {
    return {
      selected_slug: null,
      selected_business: null,
      selection_reason: `no_business_above_threshold (top score ${top?.score ?? 0} < ${minScore})`,
      founder_override: false,
      ranked,
      engine_version: PRIORITISATION_ENGINE_VERSION,
    };
  }

  return {
    selected_slug: top.business_slug,
    selected_business: top.business_name,
    selection_reason: `top_relevance score=${top.score} categories=${top.categories.join("|")}`,
    founder_override: false,
    ranked,
    engine_version: PRIORITISATION_ENGINE_VERSION,
  };
}
