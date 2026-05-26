import ResultList from "./_ResultList";
import { SearchLayout } from "./_shared";
export default function SearchCommunications() {
  return <SearchLayout title="Communications" subtitle="Communications ledger, call transcript summaries and support tickets."><ResultList scopeLabel="communications" fixedType={["communication","transcript","ticket","complaint"]} /></SearchLayout>;
}
