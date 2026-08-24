export {
  MONTVELLE_ADVISORY_CATEGORY_LABELS,
  type MontvelleAdvisoryCategory,
  type MontvelleAdviser,
} from "@/data/montvelleAdvisoryNetwork";

import { MONTVELLE_ADVISORY_NETWORK as BASE_NETWORK } from "@/data/montvelleAdvisoryNetwork";
import { MONTVELLE_ADVISORY_BATCH_3 } from "@/data/montvelleAdvisoryExpansionBatch3";

const VERIFIED_PUBLIC_EMAIL_OVERRIDES: Record<
  string,
  { publicEmail: string; emailSourceUrl: string }
> = {
  "iq-eq": {
    publicEmail: "jersey@iqeq.com",
    emailSourceUrl:
      "https://www.jerseyfinance.com/ifc/business-directory/categories/trust-and-company-administration/",
  },
  jtc: {
    publicEmail: "jtc@jtcgroup.com",
    emailSourceUrl:
      "https://www.jerseyfinance.com/ifc/business-directory/categories/trust-and-company-administration/",
  },
  "trident-trust": {
    publicEmail: "jersey@tridenttrust.com",
    emailSourceUrl:
      "https://www.jerseyfinance.com/ifc/business-directory/categories/trust-and-company-administration/",
  },
};

const ENRICHED_BASE_NETWORK = BASE_NETWORK.map((firm) => {
  const override = VERIFIED_PUBLIC_EMAIL_OVERRIDES[firm.id];
  if (!override) return firm;
  return {
    ...firm,
    ...override,
    routeStatus: "verified_public_email" as const,
  };
});

export const MONTVELLE_ADVISORY_NETWORK = [
  ...ENRICHED_BASE_NETWORK,
  ...MONTVELLE_ADVISORY_BATCH_3,
];
