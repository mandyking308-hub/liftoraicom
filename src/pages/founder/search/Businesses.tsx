import ResultList from "./_ResultList";
import { SearchLayout } from "./_shared";
export default function SearchBusinesses() {
  return <SearchLayout title="Businesses" subtitle="Portfolio businesses, products and offers."><ResultList scopeLabel="businesses" fixedType={["business","product","offer"]} /></SearchLayout>;
}
