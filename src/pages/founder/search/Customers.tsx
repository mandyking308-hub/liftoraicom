import ResultList from "./_ResultList";
import { SearchLayout } from "./_shared";
export default function SearchCustomers() {
  return <SearchLayout title="Customers" subtitle="Customers, contacts, sellers and partners."><ResultList scopeLabel="customers" fixedType={["customer","contact","seller","partner"]} /></SearchLayout>;
}
