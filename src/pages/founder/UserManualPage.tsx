import FounderLayout from "@/components/founder/FounderLayout";
import LiftorUserManualPanel from "@/components/founder/manual/LiftorUserManualPanel";

const UserManualPage = () => (
  <FounderLayout>
    <div className="max-w-7xl mx-auto p-4">
      <LiftorUserManualPanel />
    </div>
  </FounderLayout>
);

export default UserManualPage;