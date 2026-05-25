import ReportList from "./ReportList";
export default function ReportsMonthly() {
  return <ReportList title="Monthly report" subtitle="Monthly operating performance, AI spend & ROI, customer sales, upgrades, delivery, support and scale/keep/watch/pause/retire recommendations per venture." types={["monthly", "quarterly"]} />;
}