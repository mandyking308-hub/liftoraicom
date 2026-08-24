import { MONTVELLE_SUPPLIERS, type MontvelleSupplier } from "./montvelleSupplierSeed";
import { MONTVELLE_SUPPLIERS_BATCH_100_01_1 } from "./montvelleSuppliersBatch100_01a";
import { MONTVELLE_SUPPLIERS_BATCH_100_01_2 } from "./montvelleSuppliersBatch100_01b";
import { MONTVELLE_SUPPLIERS_BATCH_100_02_1 } from "./montvelleSuppliersBatch100_02a";
import { MONTVELLE_SUPPLIERS_BATCH_100_02_2 } from "./montvelleSuppliersBatch100_02b";

export const ALL_MONTVELLE_SUPPLIERS: MontvelleSupplier[] = [
  ...MONTVELLE_SUPPLIERS,
  ...MONTVELLE_SUPPLIERS_BATCH_100_01_1,
  ...MONTVELLE_SUPPLIERS_BATCH_100_01_2,
  ...MONTVELLE_SUPPLIERS_BATCH_100_02_1,
  ...MONTVELLE_SUPPLIERS_BATCH_100_02_2,
];

export function getMontvelleSupplier(supplierId: string) {
  return ALL_MONTVELLE_SUPPLIERS.find((supplier) => supplier.id === supplierId);
}
