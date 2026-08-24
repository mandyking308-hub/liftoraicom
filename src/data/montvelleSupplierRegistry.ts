import { MONTVELLE_SUPPLIERS, type MontvelleSupplier } from "./montvelleSupplierSeed";
import { MONTVELLE_SUPPLIERS_BATCH_100_01_1 } from "./montvelleSuppliersBatch100_01a";
import { MONTVELLE_SUPPLIERS_BATCH_100_01_2 } from "./montvelleSuppliersBatch100_01b";
import { MONTVELLE_SUPPLIERS_BATCH_100_02_1 } from "./montvelleSuppliersBatch100_02a";
import { MONTVELLE_SUPPLIERS_BATCH_100_02_2 } from "./montvelleSuppliersBatch100_02b";
import { MONTVELLE_SUPPLIERS_BATCH_100_03_1 } from "./montvelleSuppliersBatch100_03a";
import { MONTVELLE_SUPPLIERS_BATCH_100_03_2 } from "./montvelleSuppliersBatch100_03b";
import { MONTVELLE_SUPPLIERS_BATCH_100_04_1 } from "./montvelleSuppliersBatch100_04a";
import { MONTVELLE_SUPPLIERS_BATCH_100_04_2 } from "./montvelleSuppliersBatch100_04b";
import { MONTVELLE_SUPPLIERS_BATCH_100_05_1 } from "./montvelleSuppliersBatch100_05a";
import { MONTVELLE_SUPPLIERS_BATCH_100_05_2 } from "./montvelleSuppliersBatch100_05b";
import { MONTVELLE_SUPPLIERS_BATCH_100_06_1 } from "./montvelleSuppliersBatch100_06a";
import { MONTVELLE_SUPPLIERS_BATCH_100_06_2 } from "./montvelleSuppliersBatch100_06b";

export const ALL_MONTVELLE_SUPPLIERS: MontvelleSupplier[] = [
  ...MONTVELLE_SUPPLIERS,
  ...MONTVELLE_SUPPLIERS_BATCH_100_01_1,
  ...MONTVELLE_SUPPLIERS_BATCH_100_01_2,
  ...MONTVELLE_SUPPLIERS_BATCH_100_02_1,
  ...MONTVELLE_SUPPLIERS_BATCH_100_02_2,
  ...MONTVELLE_SUPPLIERS_BATCH_100_03_1,
  ...MONTVELLE_SUPPLIERS_BATCH_100_03_2,
  ...MONTVELLE_SUPPLIERS_BATCH_100_04_1,
  ...MONTVELLE_SUPPLIERS_BATCH_100_04_2,
  ...MONTVELLE_SUPPLIERS_BATCH_100_05_1,
  ...MONTVELLE_SUPPLIERS_BATCH_100_05_2,
  ...MONTVELLE_SUPPLIERS_BATCH_100_06_1,
  ...MONTVELLE_SUPPLIERS_BATCH_100_06_2,
];

export function getMontvelleSupplier(supplierId: string) {
  return ALL_MONTVELLE_SUPPLIERS.find((supplier) => supplier.id === supplierId);
}
