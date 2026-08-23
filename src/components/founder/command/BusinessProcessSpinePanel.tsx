import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow } from "lucide-react";
import BusinessProcessHealthCard from "./BusinessProcessHealthCard";
import DeliveryEngineCard from "./DeliveryEngineCard";
import CustomerOnboardingCard from "./CustomerOnboardingCard";
import SupportSLACard from "./SupportSLACard";
import ComplaintsRefundsCard from "./ComplaintsRefundsCard";
import ContractLifecycleCard from "./ContractLifecycleCard";
import VendorManagementCard from "./VendorManagementCard";
import PeopleOperationsCard from "./PeopleOperationsCard";
import AccessGovernanceCard from "./AccessGovernanceCard";
import PrivacyOperationsCard from "./PrivacyOperationsCard";
import IncidentContinuityCard from "./IncidentContinuityCard";
import AdviserHandoffPackCard from "./AdviserHandoffPackCard";
import FounderReportingPackCard from "./FounderReportingPackCard";
import ProductReleaseCard from "./ProductReleaseCard";
import DataQualityCard from "./DataQualityCard";
import KnowledgeGovernanceCard from "./KnowledgeGovernanceCard";
import CapacityPlanningCard from "./CapacityPlanningCard";
import MarketplaceCard from "./MarketplaceCard";
import SellerOpsCard from "./SellerOpsCard";
import MarketplaceGrowthCard from "./MarketplaceGrowthCard";
import MarketplaceHealthCard from "./MarketplaceHealthCard";
import BusinessArchetypeCard from "./BusinessArchetypeCard";
import BusinessTemplateCard from "./BusinessTemplateCard";
import EntityMapCard from "./EntityMapCard";
import LaunchFactoryCard from "./LaunchFactoryCard";
import IntegrationMapCard from "./IntegrationMapCard";
import BusinessComplianceCard from "./BusinessComplianceCard";
import ContextGuardCard from "./ContextGuardCard";
import { FabricActivationCard } from "./FabricActivationCard";
import PortfolioPrioritisationCard from "./PortfolioPrioritisationCard";
import ResourceAllocationCard from "./ResourceAllocationCard";
import PortfolioRiskCard from "./PortfolioRiskCard";
import BusinessLifecycleCard from "./BusinessLifecycleCard";
import ProductCatalogueCard from "./ProductCatalogueCard";
import PricingMarginCard from "./PricingMarginCard";
import ChannelStrategyCard from "./ChannelStrategyCard";
import AttributionEngineCard from "./AttributionEngineCard";
import PartnerEngineCard from "./PartnerEngineCard";
import IPAssetsCard from "./IPAssetsCard";
import InsuranceLiabilityCard from "./InsuranceLiabilityCard";
import ExitMetricsCard from "./ExitMetricsCard";
import PortfolioDiversityHealthCard from "./PortfolioDiversityHealthCard";
import MasterWorkQueueCard from "./MasterWorkQueueCard";
import UnifiedNotificationsCard from "./UnifiedNotificationsCard";
import RoleAccessCard from "./RoleAccessCard";
import ReportingTruthCard from "./ReportingTruthCard";
import PortalsCard from "./PortalsCard";
import ReconciliationCard from "./ReconciliationCard";
import JurisdictionTaxCard from "./JurisdictionTaxCard";
import EcommerceEngineCard from "./EcommerceEngineCard";
import SchedulingEngineCard from "./SchedulingEngineCard";
import DocumentVaultCard from "./DocumentVaultCard";
import AiEvalCard from "./AiEvalCard";
import SopVersionControlCard from "./SopVersionControlCard";
import BackupRecoveryCard from "./BackupRecoveryCard";
import DecisionRegisterCard from "./DecisionRegisterCard";
import PortfolioMemoryCard from "./PortfolioMemoryCard";
import ControlFabricCard from "./ControlFabricCard";
import DataAssetRegisterPanel from "./DataAssetRegisterPanel";
import ScheduledJobsCard from "./ScheduledJobsCard";
import SystemConfigCard from "./SystemConfigCard";
import ConnectorHealthCard from "./ConnectorHealthCard";
import WebhookHealthCard from "./WebhookHealthCard";
import AuditLedgerHealthCard from "./AuditLedgerHealthCard";
import GlobalSearchCard from "./GlobalSearchCard";
import ImportCentreCard from "./ImportCentreCard";
import IdentityResolutionCard from "./IdentityResolutionCard";
import CommunicationsLedgerCard from "./CommunicationsLedgerCard";
import RelationshipHealthCard from "./RelationshipHealthCard";
import TrustSafetyCard from "./TrustSafetyCard";
import InternalSlaCard from "./InternalSlaCard";
import DeploymentControlCard from "./DeploymentControlCard";
import PlatformMonitorCard from "./PlatformMonitorCard";
import CollectionsCard from "./CollectionsCard";
import VoiceOfCustomerCard from "./VoiceOfCustomerCard";
import ExperimentEngineCard from "./ExperimentEngineCard";
import WindDownCard from "./WindDownCard";
import PolicyCoverageCard from "./PolicyCoverageCard";
import AgentCapabilityCard from "./AgentCapabilityCard";
import AttentionGuardCard from "./AttentionGuardCard";

/**
 * Business Process Spine — single integrated panel that surfaces every
 * live business-process engine on the Command Centre. Live-first; no
 * artificial gates. Approval-gated actions remain inside each module.
 */
export default function BusinessProcessSpinePanel() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 space-y-4">
      <Card className="tech-card border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow size={18} className="text-primary" />
            Whole Business Process Spine
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">
              Live-first
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Every Liftor business-process engine — sales, revenue, delivery, support, finance,
          compliance, governance and capacity — surfaced in one place. Daily operations stay
          on the surface; only customer-impacting or irreversible actions are approval-gated
          inside each module.
        </CardContent>
      </Card>

      <BusinessProcessHealthCard />

      <ControlFabricCard />

      <DataAssetRegisterPanel />

      <UnifiedNotificationsCard />

      <RoleAccessCard />

      <MasterWorkQueueCard />

      <ReportingTruthCard />

      <ReconciliationCard />

      <JurisdictionTaxCard />
      <EcommerceEngineCard />
      <SchedulingEngineCard />
      <DocumentVaultCard />
      <AiEvalCard />
      <SopVersionControlCard />
      <BackupRecoveryCard />
      <DecisionRegisterCard />
      <PortfolioMemoryCard />
      <ScheduledJobsCard />
      <SystemConfigCard />
      <ConnectorHealthCard />
      <WebhookHealthCard />
      <AuditLedgerHealthCard />
      <GlobalSearchCard />
      <ImportCentreCard />
      <IdentityResolutionCard />
      <CommunicationsLedgerCard />
      <RelationshipHealthCard />
      <TrustSafetyCard />
      <InternalSlaCard />
      <DeploymentControlCard />
      <PlatformMonitorCard />
      <CollectionsCard />
      <VoiceOfCustomerCard />
      <ExperimentEngineCard />
      <WindDownCard />
      <PolicyCoverageCard />
      <AgentCapabilityCard />
      <AttentionGuardCard />

      <PortalsCard />

      <PortfolioDiversityHealthCard />

      <MarketplaceHealthCard />

      <BusinessArchetypeCard />

      <BusinessTemplateCard />

      <EntityMapCard />

      <LaunchFactoryCard />

      <IntegrationMapCard />

      <BusinessComplianceCard />

      <ContextGuardCard />

      <FabricActivationCard />

      <PortfolioPrioritisationCard />

      <ResourceAllocationCard />

      <PortfolioRiskCard />

      <BusinessLifecycleCard />

      <ProductCatalogueCard />

      <PricingMarginCard />

      <ChannelStrategyCard />

      <AttributionEngineCard />

      <PartnerEngineCard />

      <IPAssetsCard />

      <InsuranceLiabilityCard />

      <ExitMetricsCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DeliveryEngineCard />
        <CustomerOnboardingCard />
        <SupportSLACard />
        <ComplaintsRefundsCard />
        <ContractLifecycleCard />
        <VendorManagementCard />
        <PeopleOperationsCard />
        <AccessGovernanceCard />
        <PrivacyOperationsCard />
        <IncidentContinuityCard />
        <CapacityPlanningCard />
        <DataQualityCard />
        <KnowledgeGovernanceCard />
        <ProductReleaseCard />
        <AdviserHandoffPackCard />
        <FounderReportingPackCard />
        <MarketplaceCard />
        <SellerOpsCard />
        <MarketplaceGrowthCard />
      </div>
    </div>
  );
}
