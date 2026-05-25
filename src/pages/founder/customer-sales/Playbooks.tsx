import CSListPage from "./CSListPage";
export default function Playbooks() {
  return (
    <CSListPage
      title="Playbooks"
      subtitle="Opening scripts, discovery questions, qualification rules, objection responses, closing scripts and do-not-say rules."
      table="customer_sales_playbooks"
      columns={[
        { key: "playbook_name", label: "Playbook" },
        { key: "use_case", label: "Use case", badge: true },
        { key: "tone_of_voice", label: "Tone" },
        { key: "active", label: "Active", render: (v: any) => v ? "yes" : "no" },
      ]}
      emptyTitle="No playbooks added yet"
      emptyHint="Add at least one playbook per use case (discovery, demo, objection handling, close, follow-up, renewal)."
    />
  );
}