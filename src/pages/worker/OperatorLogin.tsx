import WorkerLogin from "./WorkerLogin";
export default function OperatorLogin() {
  return (
    <WorkerLogin
      portal="operator"
      title="Operator Sign In"
      subtitle="Technical Operator Portal"
      successPath="/operator-portal"
    />
  );
}