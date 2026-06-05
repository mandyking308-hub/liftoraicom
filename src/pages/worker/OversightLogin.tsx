import WorkerLogin from "./WorkerLogin";
export default function OversightLogin() {
  return (
    <WorkerLogin
      portal="oversight"
      title="Oversight Sign In"
      subtitle="Dubai / Professional Oversight Portal"
      successPath="/oversight-portal"
    />
  );
}