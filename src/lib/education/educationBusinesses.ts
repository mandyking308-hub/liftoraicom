// Canonical education portfolio businesses (Chat 3 commercial layer).
// Names here are the EXACT canonical business names used in public.businesses.
// This file does not touch Apollo scoring or the Apollo Credit Firewall.

export type EducationBusinessSlug =
  | "billy-and-the-wild-forest"
  | "aurelia"
  | "kindnesss"
  | "kingsbridge-global";

export interface EducationBusinessDefinition {
  slug: EducationBusinessSlug;
  /** Exact canonical name in public.businesses */
  name: string;
  positioning: string;
  campaignKey: string;
  /** Deterministic tie-break order for first-proposition selection */
  priorityOrder: number;
}

export const EDUCATION_BUSINESSES: EducationBusinessDefinition[] = [
  {
    slug: "billy-and-the-wild-forest",
    name: "Billy and the Wild Forest",
    positioning: "Emotional understanding, inclusion and beautifully illustrated literacy for every child.",
    campaignKey: "edu-billy-2026-q4-controlled",
    priorityOrder: 1,
  },
  {
    slug: "aurelia",
    name: "Aurelia",
    positioning: "Create. Learn. Achieve. Safely.",
    campaignKey: "edu-aurelia-2026-shell",
    priorityOrder: 2,
  },
  {
    slug: "kindnesss",
    name: "Kindnesss",
    positioning: "Small acts. Big hearts.",
    campaignKey: "edu-kindnesss-2026-shell",
    priorityOrder: 3,
  },
  {
    slug: "kingsbridge-global",
    name: "Kingsbridge Global",
    positioning: "Education Without Borders.",
    campaignKey: "edu-kingsbridge-2026-shell",
    priorityOrder: 4,
  },
];

export const EDUCATION_BUSINESS_NAMES = EDUCATION_BUSINESSES.map((b) => b.name);

export function businessBySlug(slug: EducationBusinessSlug): EducationBusinessDefinition {
  const found = EDUCATION_BUSINESSES.find((b) => b.slug === slug);
  if (!found) throw new Error(`Unknown education business slug: ${slug}`);
  return found;
}

export function businessByName(name: string): EducationBusinessDefinition | null {
  return EDUCATION_BUSINESSES.find((b) => b.name === name) ?? null;
}

/** Businesses that must never be touched by the education commercial layer. */
export const NON_EDUCATION_PROTECTED_BUSINESSES = ["Neon Candy"] as const;

export function isProtectedNonEducationBusiness(name: string): boolean {
  return (NON_EDUCATION_PROTECTED_BUSINESSES as readonly string[]).includes(name);
}
