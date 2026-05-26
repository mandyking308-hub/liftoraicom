import PortalAdminPage from "./PortalAdminPage";
export default function AdviserPortalAdmin() {
  return <PortalAdminPage type="adviser" title="Adviser Portal" subtitle="Adviser pack, documents, questions and read-only access."
    checklist={["Read-only access by default","Adviser pack documents are watermarked","Time-boxed access","Adviser cannot edit business data"]} />;
}
