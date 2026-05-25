import CSListPage from "./CSListPage";
export default function CloseEngine() {
  return (
    <CSListPage
      title="Close Engine"
      subtitle="Prepared close actions — payment links, invoices, proposals, contracts, bookings. External send remains approval-gated."
      table="customer_sales_close_actions"
      columns={[
        { key: "close_action_type", label: "Type", badge: true },
        { key: "action_status", label: "Status", badge: true },
        { key: "amount", label: "Amount", render: (v: any, r: any) => v ? `${v} ${r.currency ?? ""}` : "—" },
        { key: "payment_provider", label: "Provider" },
        { key: "founder_approval_required", label: "Approval", render: (v: any) => v ? "required" : "auto" },
        { key: "sent_at", label: "Sent", render: (v: any) => v ? new Date(v).toLocaleString() : "—" },
      ]}
      emptyTitle="No close actions yet"
      emptyHint="Close actions are drafted by Liftor from qualified conversations. Nothing is sent until you approve."
    />
  );
}