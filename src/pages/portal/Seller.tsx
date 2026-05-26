import PortalPlaceholder from "./_PortalPlaceholder";
export default function SellerPortal() {
  return <PortalPlaceholder title="Seller Portal" subtitle="Onboarding, listings, verification, payouts and disputes." sections={[
    { label: "Onboarding checklist", body: "Complete the onboarding steps once your account is activated." },
    { label: "Listings", body: "No listings yet." },
    { label: "Verification", body: "Verification not started." },
    { label: "Payout status", body: "No payouts to display." },
    { label: "Disputes", body: "No active disputes." },
  ]} />;
}
