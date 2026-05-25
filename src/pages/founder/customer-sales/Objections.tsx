import CSListPage from "./CSListPage";
export default function Objections() {
  return (
    <CSListPage
      title="Objection Library"
      subtitle="Approved objection responses, evidence/proof, escalation rules and do-not-say."
      table="customer_sales_objection_library"
      columns={[
        { key: "objection", label: "Objection" },
        { key: "approved_response", label: "Approved response", render: (v: any) => v ? String(v).slice(0, 80) + (String(v).length > 80 ? "…" : "") : "—" },
        { key: "escalation_required", label: "Escalate", render: (v: any) => v ? "yes" : "no" },
        { key: "active", label: "Active", render: (v: any) => v ? "yes" : "no" },
      ]}
      emptyTitle="No objections recorded"
      emptyHint="Capture the top objections you hear and the approved responses Liftor is allowed to use."
    />
  );
}