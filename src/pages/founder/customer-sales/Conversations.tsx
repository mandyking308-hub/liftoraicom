import CSListPage from "./CSListPage";
export default function Conversations() {
  return (
    <CSListPage
      title="Conversations"
      subtitle="Every customer/prospect conversation across channels. External replies remain approval-gated."
      table="customer_sales_conversations"
      columns={[
        { key: "customer_name", label: "Customer", render: (v: any, r: any) => v ?? r.customer_email ?? r.customer_phone ?? "—" },
        { key: "channel", label: "Channel", badge: true },
        { key: "direction", label: "Dir", badge: true },
        { key: "conversation_status", label: "Status", badge: true },
        { key: "qualification_score", label: "Qual", render: (v: any) => v == null ? "—" : Number(v).toFixed(2) },
        { key: "close_probability", label: "Close prob", render: (v: any) => v == null ? "—" : `${Math.round(Number(v) * 100)}%` },
        { key: "recommended_next_action", label: "Next action" },
      ]}
      emptyTitle="No conversations yet"
      emptyHint="Conversations will appear once Liftor starts qualifying inbound/outbound contacts or once a provider sends a call/chat event."
    />
  );
}