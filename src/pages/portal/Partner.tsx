import PortalPlaceholder from "./_PortalPlaceholder";
export default function PartnerPortal() {
  return <PortalPlaceholder title="Partner Portal" subtitle="Referrals, performance, commission status and partner assets." sections={[
    { label: "Referrals", body: "No referrals submitted." },
    { label: "Partner performance", body: "No performance data yet." },
    { label: "Commission status", body: "No commissions accrued." },
    { label: "Partner assets", body: "Assets become available after activation." },
  ]} />;
}
