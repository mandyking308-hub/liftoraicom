import { DQLayout, NoAutoDeleteBanner } from "./_shared";
import FindingsList from "./FindingsList";

export default function DataQualityTestData() {
  return (
    <DQLayout title="Test-data board" subtitle="LIVE_INTERNAL_TEST rows, sandbox leakage and seed data found in live tables. These are excluded from KPIs and reporting until relabelled or archived.">
      <NoAutoDeleteBanner />
      <FindingsList types={["test_data"]} title="Test-data leakage" emptyTitle="No test data found in live tables" emptyHint="Records tagged LIVE_INTERNAL_TEST or matching test patterns will be listed here." />
    </DQLayout>
  );
}