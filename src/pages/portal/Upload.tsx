import PortalPlaceholder from "./_PortalPlaceholder";
export default function UploadPortal() {
  return <PortalPlaceholder title="Document Upload Portal" subtitle="Secure upload for requested documents." sections={[
    { label: "Secure upload", body: "Upload form will appear here once you receive a valid upload request." },
    { label: "Upload request status", body: "No active upload requests." },
  ]} />;
}
