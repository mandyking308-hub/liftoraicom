import ResultList from "./_ResultList";
import { SearchLayout } from "./_shared";
export default function SearchDocuments() {
  return <SearchLayout title="Documents" subtitle="Document vault metadata and contracts (summaries only — bodies never indexed)."><ResultList scopeLabel="documents" fixedType={["document","contract"]} /></SearchLayout>;
}
