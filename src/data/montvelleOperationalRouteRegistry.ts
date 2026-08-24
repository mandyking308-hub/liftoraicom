import {
  MONTVELLE_OPERATIONAL_ROUTES,
  type MontvelleOperationalRoute,
} from "./montvelleOperationalRoutes";
import { MONTVELLE_OPERATIONAL_ROUTES_BATCH_02 } from "./montvelleOperationalRoutesBatch02";

export const ALL_MONTVELLE_OPERATIONAL_ROUTES: MontvelleOperationalRoute[] = [
  ...MONTVELLE_OPERATIONAL_ROUTES,
  ...MONTVELLE_OPERATIONAL_ROUTES_BATCH_02,
];

export function getAllMontvelleOperationalRoutes(supplierId: string) {
  return ALL_MONTVELLE_OPERATIONAL_ROUTES.filter((route) => route.supplierId === supplierId);
}

export function getFulfilmentReadyMontvelleRoutes(supplierId: string) {
  return getAllMontvelleOperationalRoutes(supplierId).filter((route) => route.usableForFulfilment);
}
