import PortalAdminPage from "./PortalAdminPage";
export default function PartnerPortalAdmin() {
  return <PortalAdminPage type="partner" title="Partner Portal" subtitle="Referrals, performance, commission status and partner assets."
    checklist={["Referral data scoped to partner_id","Commission figures match Finance pack","Asset downloads tokenised and watermarked","No client PII exposed"]} />;
}
