import PortalAdminPage from "./PortalAdminPage";
export default function DocumentUploadPortalAdmin() {
  return <PortalAdminPage type="document_upload" title="Document Upload Portal" subtitle="Secure document upload requests for customers, sellers, partners and advisers."
    checklist={["Upload links are single-use and expire","Uploads scanned before vault commit","No directory listing exposed","All uploads audit-logged"]} />;
}
