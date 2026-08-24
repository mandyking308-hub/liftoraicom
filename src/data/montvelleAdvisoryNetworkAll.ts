export {
  MONTVELLE_ADVISORY_CATEGORY_LABELS,
  type MontvelleAdvisoryCategory,
  type MontvelleAdviser,
} from "@/data/montvelleAdvisoryNetwork";

import { MONTVELLE_ADVISORY_NETWORK as BASE_NETWORK } from "@/data/montvelleAdvisoryNetwork";
import { MONTVELLE_ADVISORY_BATCH_3 } from "@/data/montvelleAdvisoryExpansionBatch3";

export const MONTVELLE_ADVISORY_NETWORK = [
  ...BASE_NETWORK,
  ...MONTVELLE_ADVISORY_BATCH_3,
];
