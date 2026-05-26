import PortalAdminPage from "./PortalAdminPage";
export default function CustomerPortalAdmin() {
  return <PortalAdminPage type="customer" title="Customer Portal" subtitle="Account summary, orders, support tickets and shared documents for customers."
    checklist={["Scope every view to the customer's business + contact_id","Never expose internal admin notes","Tokenise document downloads","Audit every login and download"]} />;
}
