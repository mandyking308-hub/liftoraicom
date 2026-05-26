import ResultList from "./_ResultList";
import { SearchLayout } from "./_shared";
export default function SearchAll() {
  return <SearchLayout title="All results" subtitle="Search the full knowledge index across record types and modules."><ResultList scopeLabel="all results" /></SearchLayout>;
}