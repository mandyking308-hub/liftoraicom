import { DQLayout, NoAutoDeleteBanner } from "./_shared";
import FindingsList from "./FindingsList";

export default function DataQualityRevenueIntegrity() {
  return (
    <DQLayout title="Revenue integrity" subtitle="Revenue marked confirmed without a matching payment, mismatched amounts, missing invoice IDs and schema mismatches between CRM and finance.">
      <NoAutoDeleteBanner />
      <FindingsList types={["invalid_amount", "schema_mismatch", "suspicious"]} title="Revenue & schema issues" emptyTitle="Revenue ledger looks clean" emptyHint="Mismatches between confirmed revenue, payment evidence and invoice records appear here." />
    </DQLayout>
  );
}