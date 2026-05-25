import { DQLayout, NoAutoDeleteBanner } from "./_shared";
import FindingsList from "./FindingsList";

export default function DataQualityStale() {
  return (
    <DQLayout title="Stale records" subtitle="Records that have not changed in too long, cached context older than allowed freshness or pipelines stuck in an outdated state.">
      <NoAutoDeleteBanner />
      <FindingsList types={["stale", "polluted_context"]} title="Stale & polluted context" emptyTitle="No stale records detected" emptyHint="Records past their freshness threshold and cached AI context past its TTL appear here." />
    </DQLayout>
  );
}