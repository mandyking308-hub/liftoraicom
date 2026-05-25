import CSListPage from "./CSListPage";
export default function Offers() {
  return (
    <CSListPage
      title="Offers"
      subtitle="Offer variants tied to products, with close type and approval rules."
      table="customer_sales_offers"
      columns={[
        { key: "offer_name", label: "Offer" },
        { key: "offer_stage", label: "Stage", badge: true },
        { key: "close_type", label: "Close type", badge: true },
        { key: "price_amount", label: "Price", render: (v: any, r: any) => v ? `${v} ${r.price_currency ?? ""}` : "—" },
        { key: "requires_founder_approval", label: "Approval", render: (v: any) => v ? "required" : "auto" },
        { key: "active", label: "Active", render: (v: any) => v ? "yes" : "no" },
      ]}
      emptyTitle="No offers configured"
      emptyHint="Add at least one active offer per product so Liftor can recommend and prepare a close."
    />
  );
}