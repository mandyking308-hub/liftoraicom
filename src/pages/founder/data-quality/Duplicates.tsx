import { DQLayout, NoAutoDeleteBanner } from "./_shared";
import FindingsList from "./FindingsList";

export default function DataQualityDuplicates() {
  return (
    <DQLayout title="Duplicate records" subtitle="Suspected duplicate contacts, businesses and revenue rows. Data Quality Agent groups likely duplicates and drafts merge actions. Merge execution requires founder approval.">
      <NoAutoDeleteBanner />
      <FindingsList types={["duplicate"]} title="Duplicate clusters" emptyTitle="No duplicate clusters detected" emptyHint="The Data Quality Agent groups likely duplicates here once a daily scan flags them." />
    </DQLayout>
  );
}