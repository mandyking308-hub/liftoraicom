import PortalPlaceholder from "./_PortalPlaceholder";
export default function AdviserPortal() {
  return <PortalPlaceholder title="Adviser Portal" subtitle="Adviser pack, documents and questions (read-only)." sections={[
    { label: "Adviser pack", body: "No pack has been shared yet." },
    { label: "Documents", body: "No documents available." },
    { label: "Questions", body: "No outstanding questions." },
    { label: "Access status", body: "Read-only access. Time-boxed once activated." },
  ]} />;
}
