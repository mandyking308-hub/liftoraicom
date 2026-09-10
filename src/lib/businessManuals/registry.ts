// Business Manuals registry — SINGLE SOURCE OF TRUTH.
//
// The canonical markdown lives in GitHub under docs/business-manuals/<slug>/.
// The in-app Business Manuals screen renders these exact files via Vite `?raw`
// imports, so GitHub and Lovable can never drift apart.

import billyTechnical from "../../../docs/business-manuals/billy-and-the-wild-forest/technical-manual.md?raw";
import billyUser from "../../../docs/business-manuals/billy-and-the-wild-forest/user-guide.md?raw";
import billyCustomer from "../../../docs/business-manuals/billy-and-the-wild-forest/customer-facing-manual.md?raw";
import aureliaTechnical from "../../../docs/business-manuals/aurelia/technical-manual.md?raw";
import aureliaUser from "../../../docs/business-manuals/aurelia/user-guide.md?raw";
import aureliaCustomer from "../../../docs/business-manuals/aurelia/customer-facing-manual.md?raw";
import kindnesssTechnical from "../../../docs/business-manuals/kindnesss/technical-manual.md?raw";
import kindnesssUser from "../../../docs/business-manuals/kindnesss/user-guide.md?raw";
import kindnesssCustomer from "../../../docs/business-manuals/kindnesss/customer-facing-manual.md?raw";
import kingsbridgeTechnical from "../../../docs/business-manuals/kingsbridge-global/technical-manual.md?raw";
import kingsbridgeUser from "../../../docs/business-manuals/kingsbridge-global/user-guide.md?raw";
import kingsbridgeCustomer from "../../../docs/business-manuals/kingsbridge-global/customer-facing-manual.md?raw";

import { EducationBusinessSlug } from "../education/educationBusinesses";

export type BusinessManualKind = "technical-manual" | "user-guide" | "customer-facing-manual";

export interface BusinessManualEntry {
  business_slug: EducationBusinessSlug;
  business_name: string;
  kind: BusinessManualKind;
  title: string;
  /** Canonical GitHub path — same file rendered in app */
  github_path: string;
  content: string;
}

const KIND_TITLES: Record<BusinessManualKind, string> = {
  "technical-manual": "Technical Manual",
  "user-guide": "User Guide",
  "customer-facing-manual": "Customer-Facing Manual",
};

function entry(
  slug: EducationBusinessSlug,
  name: string,
  kind: BusinessManualKind,
  content: string,
): BusinessManualEntry {
  return {
    business_slug: slug,
    business_name: name,
    kind,
    title: `${name} — ${KIND_TITLES[kind]}`,
    github_path: `docs/business-manuals/${slug}/${kind}.md`,
    content,
  };
}

export const BUSINESS_MANUALS: BusinessManualEntry[] = [
  entry("billy-and-the-wild-forest", "Billy and the Wild Forest", "technical-manual", billyTechnical),
  entry("billy-and-the-wild-forest", "Billy and the Wild Forest", "user-guide", billyUser),
  entry("billy-and-the-wild-forest", "Billy and the Wild Forest", "customer-facing-manual", billyCustomer),
  entry("aurelia", "Aurelia", "technical-manual", aureliaTechnical),
  entry("aurelia", "Aurelia", "user-guide", aureliaUser),
  entry("aurelia", "Aurelia", "customer-facing-manual", aureliaCustomer),
  entry("kindnesss", "Kindnesss", "technical-manual", kindnesssTechnical),
  entry("kindnesss", "Kindnesss", "user-guide", kindnesssUser),
  entry("kindnesss", "Kindnesss", "customer-facing-manual", kindnesssCustomer),
  entry("kingsbridge-global", "Kingsbridge Global", "technical-manual", kingsbridgeTechnical),
  entry("kingsbridge-global", "Kingsbridge Global", "user-guide", kingsbridgeUser),
  entry("kingsbridge-global", "Kingsbridge Global", "customer-facing-manual", kingsbridgeCustomer),
];

export function manualsForBusiness(slug: EducationBusinessSlug): BusinessManualEntry[] {
  return BUSINESS_MANUALS.filter((m) => m.business_slug === slug);
}
