import CSListPage from "./CSListPage";
export default function ProductKnowledge() {
  return (
    <CSListPage
      title="Product Knowledge"
      subtitle="Products, services, packages and supporting knowledge sources Liftor uses to qualify, match and quote."
      table="customer_sales_products"
      columns={[
        { key: "product_name", label: "Product" },
        { key: "product_type", label: "Type", badge: true },
        { key: "pricing_type", label: "Pricing", badge: true },
        { key: "price_amount", label: "Price", render: (v: any, r: any) => v ? `${v} ${r.price_currency ?? ""}` : (r.price_range_min ? `${r.price_range_min}–${r.price_range_max} ${r.price_currency ?? ""}` : "quote") },
        { key: "active", label: "Active", render: (v: any) => v ? "yes" : "no" },
      ]}
      emptyTitle="No products added yet"
      emptyHint="Add products, services or packages so Liftor can match customers to the right offer and prepare quotes."
    />
  );
}