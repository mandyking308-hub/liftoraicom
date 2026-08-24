import {
  MONTVELLE_OPERATIONAL_ROUTES,
  type MontvelleOperationalRoute,
} from "./montvelleOperationalRoutes";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_02 } from "./montvelleOperationalRoutesBatch02";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_01_1 } from "./montvelleOperationalRoutesBatch100_01a";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_01_2 } from "./montvelleOperationalRoutesBatch100_01b";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_02_1 } from "./montvelleOperationalRoutesBatch100_02a";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_02_2 } from "./montvelleOperationalRoutesBatch100_02b";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_03_1 } from "./montvelleOperationalRoutesBatch100_03a";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_03_2 } from "./montvelleOperationalRoutesBatch100_03b";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_04_1 } from "./montvelleOperationalRoutesBatch100_04a";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_04_2 } from "./montvelleOperationalRoutesBatch100_04b";

export const ALL_MONTVELLE_OPERATIONAL_ROUTES: MontvelleOperationalRoute[] = [
  ...MONTVELLE_OPERATIONAL_ROUTES,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_02,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_01_1,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_01_2,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_02_1,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_02_2,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_03_1,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_03_2,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_04_1,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_100_04_2,
];

export function getAllMontvelleOperationalRoutes(supplierId: string) {
  return ALL_MONTVELLE_OPERATIONAL_ROUTES.filter((route) => route.supplierId === supplierId);
}

export function getFulfilmentReadyMontvelleRoutes(supplierId: string) {
  return getAllMontvelleOperationalRoutes(supplierId).filter((route) => route.usableForFulfilment);
}
