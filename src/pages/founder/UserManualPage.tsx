import FounderLayout from "@/components/founder/FounderLayout";
import LiftorUserManualPanel from "@/components/founder/manual/LiftorUserManualPanel";
import BusinessRehearsalSimulationPanel from "@/components/founder/activation/BusinessRehearsalSimulationPanel";
import PreLiveBaselineControlPanel from "@/components/founder/activation/PreLiveBaselineControlPanel";
import FinalGoToUseReadinessPanel from "@/components/founder/command/FinalGoToUseReadinessPanel";
import RevenueTargetOperatingPanel from "@/components/founder/revenue/RevenueTargetOperatingPanel";

const UserManualPage = () => (
  <FounderLayout>
    <div className="max-w-7xl mx-auto p-4">
      <LiftorUserManualPanel />
      <div className="mt-4"><BusinessRehearsalSimulationPanel /></div>
      <div className="mt-4"><PreLiveBaselineControlPanel /></div>
      <div className="mt-4"><RevenueTargetOperatingPanel /></div>
      <div className="mt-4"><FinalGoToUseReadinessPanel /></div>
    </div>
  </FounderLayout>
);

export default UserManualPage;