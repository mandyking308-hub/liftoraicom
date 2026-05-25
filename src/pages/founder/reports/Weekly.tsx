import ReportList from "./ReportList";
export default function ReportsWeekly() {
  return <ReportList title="Weekly report" subtitle="Last week's operating snapshot with revenue, AI ROI, approvals, alerts, incidents and recommended priorities for the next week." types={["weekly", "daily"]} />;
}