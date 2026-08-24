import { MONTVELLE_SUPPLIERS, type MontvelleSupplier } from "./montvelleSupplierSeed";
import { MONTVELLE_SUPPLIERS_BATCH_100_01_1 } from "./montvelleSuppliersBatch100_01a";
import { MONTVELLE_SUPPLIERS_BATCH_100_01_2 } from "./montvelleSuppliersBatch100_01b";

export const ALL_MONTVELLE_SUPPLIERS: MontvelleSupplier[] = [
  ...MONTVELLE_SUPPLIERS,
  ...MONTVELLE_SUPPLIERS_BATCH_100_01_1,
  ...MONTVELLE_SUPPLIERS_BATCH_100_01_2,
];

export function getMontvelleSupplier(supplierId: string) {
  return ALL_MONTVELLE_SUPPLIERS.find((supplier) => supplier.id === supplierId);
}
