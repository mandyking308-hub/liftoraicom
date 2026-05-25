import { DQLayout, NoAutoDeleteBanner } from "./_shared";
import FindingsList from "./FindingsList";

export default function DataQualityOrphans() {
  return (
    <DQLayout title="Orphan records" subtitle="Approvals without a source, tasks without a business/contact, payments without a customer and similar dangling rows.">
      <NoAutoDeleteBanner />
      <FindingsList types={["orphan", "missing_id"]} title="Orphans and missing references" emptyTitle="No orphan records detected" emptyHint="Records without a valid parent reference appear here for repair." />
    </DQLayout>
  );
}