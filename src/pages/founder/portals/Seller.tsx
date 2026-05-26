import PortalAdminPage from "./PortalAdminPage";
export default function SellerPortalAdmin() {
  return <PortalAdminPage type="seller" title="Seller Portal" subtitle="Onboarding, listings, verification, payouts and disputes for marketplace sellers."
    checklist={["Verification status visible only to the seller","Payout figures scoped to seller_id","Dispute threads isolated per buyer","No buyer PII exposed"]} />;
}
