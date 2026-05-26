import PortalPlaceholder from "./_PortalPlaceholder";
export default function CustomerPortal() {
  return <PortalPlaceholder title="Customer Portal" subtitle="Your account, orders, support and documents." sections={[
    { label: "Account summary", body: "Nothing to display yet." },
    { label: "Orders & delivery status", body: "No orders to show." },
    { label: "Support tickets", body: "You have no open tickets." },
    { label: "Documents shared with you", body: "No documents have been shared." },
  ]} />;
}
