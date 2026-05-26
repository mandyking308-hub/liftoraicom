import ResultList from "./_ResultList";
import { SearchLayout } from "./_shared";
export default function SearchAudit() {
  return <SearchLayout title="Audit & decisions" subtitle="Audit events, founder decisions, approvals, incidents and invoices/payments."><ResultList scopeLabel="audit & decisions" fixedType={["audit","decision","approval","incident","invoice","payment"]} /></SearchLayout>;
}
