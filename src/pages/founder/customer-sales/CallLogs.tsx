import CSListPage from "./CSListPage";
export default function CallLogs() {
  return (
    <CSListPage
      title="Call Logs"
      subtitle="Voice/phone/web-call records with consent and transcript metadata."
      table="customer_sales_call_logs"
      orderBy="started_at"
      columns={[
        { key: "started_at", label: "Started", render: (v: any) => v ? new Date(v).toLocaleString() : "—" },
        { key: "provider_name", label: "Provider" },
        { key: "call_direction", label: "Dir", badge: true },
        { key: "from_number", label: "From" },
        { key: "to_number", label: "To" },
        { key: "duration_seconds", label: "Sec" },
        { key: "outcome", label: "Outcome", badge: true },
        { key: "consent_recorded", label: "Consent", render: (v: any) => v ? "yes" : "no" },
      ]}
      emptyTitle="No calls logged yet"
      emptyHint="Once a provider is connected and webhooks are configured, calls will appear here with transcript and outcome."
    />
  );
}