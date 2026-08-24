import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SurveyResponse from "@/pages/public/SurveyResponse";
import CustomerReportView from "@/pages/public/CustomerReportView";
import CustomerOnboardingView from "@/pages/public/CustomerOnboardingView";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/portal/ProtectedRoute";
import FounderRoute from "@/components/founder/FounderRoute";
import SecurityVaultOverview from "@/pages/founder/security-vault/Overview";
import SecurityVaultBuildSnapshots from "@/pages/founder/security-vault/BuildSnapshots";
import SecurityVaultSecretsRegister from "@/pages/founder/security-vault/SecretsRegister";
import SecurityVaultBackupRestore from "@/pages/founder/security-vault/BackupRestore";
import SecurityVaultSecurityAudit from "@/pages/founder/security-vault/SecurityAudit";
import SystemModeBanner from "@/components/system/SystemModeBanner";
import RuntimeModeOverview from "@/pages/founder/runtime-mode/Overview";
import ApprovalsOpsOverview from "@/pages/founder/approvals-ops/Overview";
import SystemHealthOverview from "@/pages/founder/system-health/Overview";
import CrossContaminationOverview from "@/pages/founder/cross-contamination/Overview";
import RecoveryOverview from "@/pages/founder/recovery/Overview";
import BusinessActivationOverview from "@/pages/founder/business-activation/Overview";
import MondayReadinessOverview from "@/pages/founder/monday-readiness/Overview";
import MondayLaunchOverview from "@/pages/founder/monday-launch/Overview";
import PartnerRoute from "@/components/partner/PartnerRoute";
import ScrollToTop from "@/components/ScrollToTop";
import WorkerRoute from "@/components/worker/WorkerRoute";
import OperatorLogin from "@/pages/worker/OperatorLogin";
import OperatorPortal from "@/pages/worker/OperatorPortal";
import OversightLogin from "@/pages/worker/OversightLogin";
import OversightPortal from "@/pages/worker/OversightPortal";
import HumanWorkforceControl from "@/pages/founder/HumanWorkforceControl";
import InsuranceClaimsPage from "@/pages/founder/operating-loops/InsuranceClaims";
import StatutoryFilingsPage from "@/pages/founder/operating-loops/StatutoryFilings";
import CorporateSecretarialPage from "@/pages/founder/operating-loops/CorporateSecretarial";
import InternationalExpansionPage from "@/pages/founder/operating-loops/InternationalExpansion";
import DataRoomPage from "@/pages/founder/operating-loops/DataRoom";
import ReleaseWorkflowPage from "@/pages/founder/operating-loops/ReleaseWorkflow";
import PortfolioFxPage from "@/pages/founder/operating-loops/PortfolioFx";
import CampaignFactory from "@/pages/founder/CampaignFactory";
import AutomationBook from "@/pages/founder/AutomationBook";
import WorkerManuals from "@/pages/founder/WorkerManuals";
import WorkerHelpAudit from "@/pages/founder/WorkerHelpAudit";

// Public pages
import Index from "./pages/Index";
import WhatWeBuild from "./pages/WhatWeBuild";
import Industries from "./pages/Industries";
import Method from "./pages/Method";
import CaseStudies from "./pages/CaseStudies";
import PartnerProgram from "./pages/PartnerProgram";
import ProjectDiscovery from "./pages/ProjectDiscovery";
import About from "./pages/About";
import AIProposal from "./pages/AIProposal";
import Platform from "./pages/Platform";
import Systems from "./pages/Systems";
import Architecture from "./pages/Architecture";
import NotFound from "./pages/NotFound";
import LegalHub from "./pages/legal/LegalHub";
import LegalPagePlaceholder from "./pages/legal/LegalPagePlaceholder";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import AcceptableUse from "./pages/legal/AcceptableUse";
import AIUsagePolicy from "./pages/legal/AIUsagePolicy";
import AutomationSafetyPolicy from "./pages/legal/AutomationSafetyPolicy";
import SecurityPolicy from "./pages/legal/SecurityPolicy";
import CookiePolicy from "./pages/legal/CookiePolicy";
import DataProcessingAgreement from "./pages/legal/DataProcessingAgreement";
import TermsOfService from "./pages/legal/TermsOfService";
import EnterpriseServicesAgreement from "./pages/legal/EnterpriseServicesAgreement";
import AIOutputDisclaimer from "./pages/legal/AIOutputDisclaimer";
import AutomationLiabilityDisclaimer from "./pages/legal/AutomationLiabilityDisclaimer";
import SecurityReporting from "./pages/legal/SecurityReporting";

// Portal pages
import PortalLogin from "./pages/portal/PortalLogin";
import PortalSignup from "./pages/portal/PortalSignup";
import ForgotPassword from "./pages/portal/ForgotPassword";
import ResetPassword from "./pages/portal/ResetPassword";
import Dashboard from "./pages/portal/Dashboard";
import Projects from "./pages/portal/Projects";
import ProjectDetail from "./pages/portal/ProjectDetail";
import Documents from "./pages/portal/Documents";
import Messages from "./pages/portal/Messages";
import Support from "./pages/portal/Support";
import MaintenanceDashboard from "./pages/portal/MaintenanceDashboard";
import MaintenanceSchedule from "./pages/portal/MaintenanceSchedule";
import MaintenanceUpdates from "./pages/portal/MaintenanceUpdates";
import FeatureRequests from "./pages/portal/FeatureRequests";
import ClientSystemMonitoring from "./pages/portal/ClientSystemMonitoring";
import ClientControlPanel from "./pages/portal/ClientControlPanel";
import ClientSystemDetail from "./pages/portal/ClientSystemDetail";
import ClientAnalytics from "./pages/portal/ClientAnalytics";
import ClientOptimisation from "./pages/portal/ClientOptimisation";

// Founder pages
import FounderOverview from "./pages/founder/FounderOverview";
import FounderProposals from "./pages/founder/FounderProposals";
import ProposalDetail from "./pages/founder/ProposalDetail";
import LeadPipeline from "./pages/founder/LeadPipeline";
import FounderProjects from "./pages/founder/FounderProjects";
import FounderProjectDetail from "./pages/founder/FounderProjectDetail";
import FounderActivity from "./pages/founder/FounderActivity";
import FounderDocuments from "./pages/founder/FounderDocuments";
import MonitoringDashboard from "./pages/founder/MonitoringDashboard";
import MonitoringSystemDetail from "./pages/founder/MonitoringSystemDetail";
import AgentDirectory from "./pages/founder/AgentDirectory";
import AgentProfile from "./pages/founder/AgentProfile";
import WorkflowDirectory from "./pages/founder/WorkflowDirectory";
import WorkflowDetail from "./pages/founder/WorkflowDetail";
import IntegrationDirectory from "./pages/founder/IntegrationDirectory";
import IntegrationDetail from "./pages/founder/IntegrationDetail";
import ExecutionDashboard from "./pages/founder/ExecutionDashboard";
import ExecutionDetail from "./pages/founder/ExecutionDetail";
import CommandCenter from "./pages/founder/CommandCenter";
import CommandCentre from "./pages/founder/CommandCentre";
import StarterPackMaterialiserPage from "./pages/founder/StarterPackMaterialiser";
import BusinessOnboardingFactoryPage from "./pages/founder/BusinessOnboardingFactory";
import StartHere from "./pages/founder/StartHere";
import StartHereSetupBusiness from "./pages/founder/StartHereSetupBusiness";
import FounderUserGuide from "./pages/founder/FounderUserGuide";
import BusinessSetupTunnel from "./pages/founder/BusinessSetupTunnel";
import DailyOperator from "./pages/founder/DailyOperator";
import FounderMoney from "./pages/founder/FounderMoney";
import VideoSopFactoryPage from "./pages/founder/VideoSopFactory";
import RelationshipIntelligencePage from "./pages/founder/RelationshipIntelligence";
import BillionaireIntelligence from "./pages/founder/BillionaireIntelligence";
import RelationshipIntelligenceImport from "./pages/founder/RelationshipIntelligenceImport";
import GlobalPrRadar from "./pages/founder/GlobalPrRadar";
import VideoLibrary from "./pages/founder/VideoLibrary";
import HealthcareOverlay from "./pages/founder/HealthcareOverlay";
import BusinessInternalActivationPage from "./pages/founder/BusinessInternalActivation";
import BusinessDailyOperatingLoopPage from "./pages/founder/BusinessDailyOperatingLoop";
import BusinessWeeklyReviewPage from "./pages/founder/BusinessWeeklyReview";
import ExternalActivationReadinessPage from "./pages/founder/ExternalActivationReadiness";
import MicroBatchPreparationPage from "./pages/founder/MicroBatchPreparation";
import BuildPhaseCloseoutPage from "./pages/founder/BuildPhaseCloseout";
import ManualsHubPage from "./pages/founder/ManualsHub";
import LiftorBrain from "./pages/founder/LiftorBrain";
import PortfolioExitCommandCentre from "./pages/founder/PortfolioExitCommandCentre";
import FounderLedExitSalesEngine from "./pages/founder/FounderLedExitSalesEngine";
import FounderLedBuyerMarketEngine from "./pages/founder/FounderLedBuyerMarketEngine";
import PortfolioExitAssetDetail from "./pages/founder/PortfolioExitAssetDetail";
import MAIntelligenceWorkspace from "./pages/founder/MAIntelligenceWorkspace";
import ExitValuationEngine from "./pages/founder/ExitValuationEngine";
import QuarterlyBuildSelector from "./pages/founder/QuarterlyBuildSelector";
import QuarterlyProductionMachine from "./pages/founder/QuarterlyProductionMachine";
import QPMBuildPackValidator from "./pages/founder/quarterly-production-machine/BuildPackValidator";
import QPMPromptQueue from "./pages/founder/quarterly-production-machine/PromptQueue";
import QPMVerticalLaunch from "./pages/founder/quarterly-production-machine/VerticalLaunch";
import QPMProductionPack from "./pages/founder/quarterly-production-machine/ProductionPack";
import QPMLovablePack from "./pages/founder/quarterly-production-machine/LovablePack";
import FRRadarOverview from "./pages/founder/funding-radar/Overview";
import FRCompanies from "./pages/founder/funding-radar/Companies";
import FRCompanyDetail from "./pages/founder/funding-radar/CompanyDetail";
import FRClusters from "./pages/founder/funding-radar/Clusters";
import FRCapitalEfficiency from "./pages/founder/funding-radar/CapitalEfficiency";
import FRMonthlyRun from "./pages/founder/funding-radar/MonthlyRun";
import FRShortlist from "./pages/founder/funding-radar/Shortlist";
import FRDecisionPack from "./pages/founder/funding-radar/DecisionPack";
import FRSettings from "./pages/founder/funding-radar/Settings";
import FRWatchlist from "./pages/founder/funding-radar/Watchlist";
import FRWatchlistDetail from "./pages/founder/funding-radar/WatchlistDetail";
import FRWeaknessSignals from "./pages/founder/funding-radar/WeaknessSignals";
import FRMarketMaps from "./pages/founder/funding-radar/MarketMaps";
import FRWhiteSpace from "./pages/founder/funding-radar/WhiteSpace";
import FRBuildHandoffPack from "./pages/founder/funding-radar/BuildHandoffPack";
import FRBusinessAutopsy from "./pages/founder/funding-radar/BusinessAutopsy";
import FRBusinessAutopsyDetail from "./pages/founder/funding-radar/BusinessAutopsyDetail";
import ExecutionHandoff from "./pages/founder/ExecutionHandoff";
import PortfolioExitManual from "./pages/founder/PortfolioExitManual";
import PortfolioExitControls from "./pages/founder/PortfolioExitControls";
import PortfolioExitHardening from "./pages/founder/PortfolioExitHardening";
import PortfolioExitReleaseGate from "./pages/founder/PortfolioExitReleaseGate";
import PortfolioBuyerWarmUp from "./pages/founder/PortfolioBuyerWarmUp";
import PortfolioInvestorIntelligence from "./pages/founder/PortfolioInvestorIntelligence";
import PortfolioCompetitorIntelligence from "./pages/founder/PortfolioCompetitorIntelligence";
import PortfolioOperatingPanels from "./pages/founder/PortfolioOperatingPanels";
import AIGatewayBypassRegister from "./pages/founder/AIGatewayBypassRegister";
import AIUsageLedger from "./pages/founder/AIUsageLedger";
import AIModelRouting from "./pages/founder/AIModelRouting";
import AIBusinessBudgets from "./pages/founder/AIBusinessBudgets";
import AIAgentCostControls from "./pages/founder/AIAgentCostControls";
import AICostAlerts from "./pages/founder/AICostAlerts";
import AIROIEngine from "./pages/founder/AIROIEngine";
import AIApprovalGates from "./pages/founder/AIApprovalGates";
import AIPromptTemplates from "./pages/founder/AIPromptTemplates";
import AICachedContext from "./pages/founder/AICachedContext";
import AIProviderPricing from "./pages/founder/AIProviderPricing";
import AIQualityScoring from "./pages/founder/AIQualityScoring";
import AISecurityCentre from "./pages/founder/AISecurityCentre";
import AIQueueControl from "./pages/founder/AIQueueControl";
import AISandbox from "./pages/founder/AISandbox";
import AIFinancePack from "./pages/founder/AIFinancePack";
import AILiveOperations from "./pages/founder/AILiveOperations";
import AICostGovernorHub from "./pages/founder/AICostGovernorHub";
import AIFirstUseSetup from "./pages/founder/AIFirstUseSetup";
import FirstUseConfiguration from "./pages/founder/FirstUseConfiguration";
import CustomerSalesHub from "./pages/founder/customer-sales/CustomerSalesHub";
import CustomerSalesVoiceConsole from "./pages/founder/customer-sales/VoiceConsole";
import CustomerSalesProductKnowledge from "./pages/founder/customer-sales/ProductKnowledge";
import CustomerSalesPlaybooks from "./pages/founder/customer-sales/Playbooks";
import CustomerSalesConversations from "./pages/founder/customer-sales/Conversations";
import CustomerSalesCallLogs from "./pages/founder/customer-sales/CallLogs";
import CustomerSalesCloseEngine from "./pages/founder/customer-sales/CloseEngine";
import CustomerSalesOffers from "./pages/founder/customer-sales/Offers";
import CustomerSalesObjections from "./pages/founder/customer-sales/Objections";
import CustomerSalesFollowUp from "./pages/founder/customer-sales/FollowUp";
import CustomerSalesSafetyCentre from "./pages/founder/customer-sales/SafetyCentre";
import CustomerSalesSettings from "./pages/founder/customer-sales/Settings";
import SalesTargetsCockpit from "./pages/founder/sales-targets/Cockpit";
import SalesTargetsBusiness from "./pages/founder/sales-targets/BusinessTargets";
import SalesTargetsActivityPlan from "./pages/founder/sales-targets/ActivityPlan";
import SalesTargetsConversion from "./pages/founder/sales-targets/Conversion";
import SalesTargetsGaps from "./pages/founder/sales-targets/Gaps";
import SalesTargetsForecast from "./pages/founder/sales-targets/Forecast";
import SalesCoachingDashboard from "./pages/founder/sales-coaching/Dashboard";
import SalesCoachingConversions from "./pages/founder/sales-coaching/Conversions";
import SalesCoachingObjections from "./pages/founder/sales-coaching/Objections";
import SalesCoachingScripts from "./pages/founder/sales-coaching/Scripts";
import SalesCoachingWinsLosses from "./pages/founder/sales-coaching/WinsLosses";
import SalesCoachingRecommendations from "./pages/founder/sales-coaching/Recommendations";
import RevenueAutopilotOverview from "./pages/founder/revenue-autopilot/Overview";
import RevenueAutopilotToday from "./pages/founder/revenue-autopilot/Today";
import RevenueAutopilotTargets from "./pages/founder/revenue-autopilot/Targets";
import RevenueAutopilotTasks from "./pages/founder/revenue-autopilot/Tasks";
import RevenueAutopilotGaps from "./pages/founder/revenue-autopilot/Gaps";
import RevenueAutopilotApprovals from "./pages/founder/revenue-autopilot/Approvals";
import QTCOverview from "./pages/founder/quote-to-cash/Overview";
import QTCQuotes from "./pages/founder/quote-to-cash/Quotes";
import QTCProposals from "./pages/founder/quote-to-cash/Proposals";
import QTCInvoices from "./pages/founder/quote-to-cash/Invoices";
import QTCPayments from "./pages/founder/quote-to-cash/Payments";
import QTCRevenueConfirmation from "./pages/founder/quote-to-cash/RevenueConfirmation";
import QTCSettings from "./pages/founder/quote-to-cash/Settings";
import QTCPaymentArchitectureReadiness from "./pages/founder/quote-to-cash/PaymentArchitectureReadiness";
import QTCStripePriceMapping from "./pages/founder/quote-to-cash/StripePriceMapping";
import QTCPaymentControlCentre from "./pages/founder/quote-to-cash/PaymentControlCentre";
import DeliveryOverview from "./pages/founder/delivery/Overview";
import DeliveryOrders from "./pages/founder/delivery/Orders";
import DeliveryTasks from "./pages/founder/delivery/Tasks";
import DeliveryCapacity from "./pages/founder/delivery/Capacity";
import DeliveryBlockers from "./pages/founder/delivery/Blockers";
import DeliveryCompletionProof from "./pages/founder/delivery/CompletionProof";
import DeliverySettings from "./pages/founder/delivery/Settings";
import CustomerOnboardingOverview from "./pages/founder/customer-onboarding/Overview";
import CustomerOnboardingCustomers from "./pages/founder/customer-onboarding/Customers";
import CustomerOnboardingChecklists from "./pages/founder/customer-onboarding/Checklists";
import CustomerOnboardingMissingInfo from "./pages/founder/customer-onboarding/MissingInfo";
import CustomerOnboardingWelcomePacks from "./pages/founder/customer-onboarding/WelcomePacks";
import CustomerOnboardingSettings from "./pages/founder/customer-onboarding/Settings";
import SupportTicketsOverview from "./pages/founder/support-tickets/Overview";
import SupportTicketsQueue from "./pages/founder/support-tickets/Queue";
import SupportTicketsSLA from "./pages/founder/support-tickets/SLA";
import SupportTicketsEscalations from "./pages/founder/support-tickets/Escalations";
import SupportTicketsKnowledge from "./pages/founder/support-tickets/Knowledge";
import SupportTicketsSettings from "./pages/founder/support-tickets/Settings";
import ComplaintsOverview from "./pages/founder/complaints/Overview";
import ComplaintsRefunds from "./pages/founder/complaints/Refunds";
import ComplaintsDisputes from "./pages/founder/complaints/Disputes";
import ComplaintsEscalations from "./pages/founder/complaints/Escalations";
import ComplaintsEvidence from "./pages/founder/complaints/Evidence";
import ComplaintsSettings from "./pages/founder/complaints/Settings";
import ContractsOverview from "./pages/founder/contracts/Overview";
import ContractsDrafts from "./pages/founder/contracts/Drafts";
import ContractsSignature from "./pages/founder/contracts/Signature";
import ContractsObligations from "./pages/founder/contracts/Obligations";
import ContractsRenewals from "./pages/founder/contracts/Renewals";
import ContractsRisk from "./pages/founder/contracts/Risk";
import ContractsSettings from "./pages/founder/contracts/Settings";
import VendorsOverview from "./pages/founder/vendors/Overview";
import VendorsSaas from "./pages/founder/vendors/Saas";
import VendorsContracts from "./pages/founder/vendors/Contracts";
import VendorsCosts from "./pages/founder/vendors/Costs";
import VendorsRenewals from "./pages/founder/vendors/Renewals";
import VendorsAccess from "./pages/founder/vendors/Access";
import VendorsRisk from "./pages/founder/vendors/Risk";
import PeopleOverview from "./pages/founder/people/Overview";
import PeopleOperators from "./pages/founder/people/Operators";
import PeopleTasks from "./pages/founder/people/Tasks";
import PeopleAccess from "./pages/founder/people/Access";
import PeopleTraining from "./pages/founder/people/Training";
import PeopleQuality from "./pages/founder/people/Quality";
import PeopleHandover from "./pages/founder/people/Handover";
import AccessGovernanceOverview from "./pages/founder/access-governance/Overview";
import AccessGovernanceSystems from "./pages/founder/access-governance/Systems";
import AccessGovernanceSecrets from "./pages/founder/access-governance/Secrets";
import AccessGovernanceUsers from "./pages/founder/access-governance/Users";
import AccessGovernanceRevocation from "./pages/founder/access-governance/Revocation";
import AccessGovernanceRotation from "./pages/founder/access-governance/Rotation";
import AccessGovernanceAudit from "./pages/founder/access-governance/Audit";
import PrivacyOverview from "./pages/founder/privacy/Overview";
import PrivacyDSAR from "./pages/founder/privacy/DSAR";
import PrivacyRetention from "./pages/founder/privacy/Retention";
import PrivacyConsent from "./pages/founder/privacy/Consent";
import PrivacyProcessors from "./pages/founder/privacy/Processors";
import PrivacyBreaches from "./pages/founder/privacy/Breaches";
import PrivacySettings from "./pages/founder/privacy/Settings";
import IncidentsOverview from "./pages/founder/incidents/Overview";
import IncidentsLive from "./pages/founder/incidents/Live";
import IncidentsPostmortems from "./pages/founder/incidents/Postmortems";
import IncidentsContinuity from "./pages/founder/incidents/Continuity";
import IncidentsNotifications from "./pages/founder/incidents/Notifications";
import IncidentsSettings from "./pages/founder/incidents/Settings";
import AdviserPackOverview from "./pages/founder/adviser-pack/Overview";
import AdviserPackMonthly from "./pages/founder/adviser-pack/Monthly";
import AdviserPackEntities from "./pages/founder/adviser-pack/Entities";
import AdviserPackRevenue from "./pages/founder/adviser-pack/Revenue";
import AdviserPackExpenses from "./pages/founder/adviser-pack/Expenses";
import AdviserPackDocuments from "./pages/founder/adviser-pack/Documents";
import AdviserPackQuestions from "./pages/founder/adviser-pack/Questions";
import ReportsOverview from "./pages/founder/reports/Overview";
import ReportsWeekly from "./pages/founder/reports/Weekly";
import ReportsMonthly from "./pages/founder/reports/Monthly";
import ReportsPortfolio from "./pages/founder/reports/Portfolio";
import ReportsDecisions from "./pages/founder/reports/Decisions";
import ReportsArchive from "./pages/founder/reports/Archive";
import ProductOverview from "./pages/founder/product/Overview";
import ProductFeatures from "./pages/founder/product/Features";
import ProductBugs from "./pages/founder/product/Bugs";
import ProductQA from "./pages/founder/product/QA";
import ProductReleases from "./pages/founder/product/Releases";
import ProductRollback from "./pages/founder/product/Rollback";
import ProductKnownIssues from "./pages/founder/product/KnownIssues";
import DataQualityOverview from "./pages/founder/data-quality/Overview";
import DataQualityDuplicates from "./pages/founder/data-quality/Duplicates";
import DataQualityTestData from "./pages/founder/data-quality/TestData";
import DataQualityOrphans from "./pages/founder/data-quality/Orphans";
import DataQualityStale from "./pages/founder/data-quality/Stale";
import DataQualityRevenueIntegrity from "./pages/founder/data-quality/RevenueIntegrity";
import DataQualityRepairQueue from "./pages/founder/data-quality/RepairQueue";
import CapacityOverview from "./pages/founder/capacity/Overview";
import CapacityBusiness from "./pages/founder/capacity/Business";
import CapacityAgents from "./pages/founder/capacity/Agents";
import CapacityHumans from "./pages/founder/capacity/Humans";
import CapacityDelivery from "./pages/founder/capacity/Delivery";
import CapacityBottlenecks from "./pages/founder/capacity/Bottlenecks";
import CapacityForecast from "./pages/founder/capacity/Forecast";
import MarketplaceOverview from "./pages/founder/marketplace/Overview";
import MarketplaceRecruitment from "./pages/founder/marketplace/Recruitment";
import MarketplaceProspects from "./pages/founder/marketplace/Prospects";
import MarketplaceOnboarding from "./pages/founder/marketplace/Onboarding";
import MarketplaceVerification from "./pages/founder/marketplace/Verification";
import MarketplaceListings from "./pages/founder/marketplace/Listings";
import MarketplaceSupplyDemand from "./pages/founder/marketplace/SupplyDemand";
import MarketplacePerformance from "./pages/founder/marketplace/Performance";
import MarketplaceSettings from "./pages/founder/marketplace/Settings";
import SellerAccounts from "./pages/founder/marketplace/SellerAccounts";
import SellerChecklist from "./pages/founder/marketplace/SellerChecklist";
import ListingQueue from "./pages/founder/marketplace/ListingQueue";
import SellerPayouts from "./pages/founder/marketplace/Payouts";
import SellerTerms from "./pages/founder/marketplace/Terms";
import SellerPerformanceBoard from "./pages/founder/marketplace/Performance2";
import SellerRisk from "./pages/founder/marketplace/Risk";
import MarketplaceLiquidity from "./pages/founder/marketplace/Liquidity";
import MarketplaceCategoryBalance from "./pages/founder/marketplace/CategoryBalance";
import MarketplaceLocationBalance from "./pages/founder/marketplace/LocationBalance";
import MarketplaceGrowthActions from "./pages/founder/marketplace/GrowthActions";
import ArchetypeOverview from "./pages/founder/archetypes/Overview";
import ArchetypeClassifier from "./pages/founder/archetypes/Classifier";
import ArchetypeBusinessMap from "./pages/founder/archetypes/BusinessMap";
import ArchetypeRecommendations from "./pages/founder/archetypes/Recommendations";
import ArchetypeSettings from "./pages/founder/archetypes/Settings";
import BTOverview from "./pages/founder/business-templates/Overview";
import BTLibrary from "./pages/founder/business-templates/Library";
import BTApply from "./pages/founder/business-templates/Apply";
import BTBusinessSetup from "./pages/founder/business-templates/BusinessSetup";
import BTSettings from "./pages/founder/business-templates/Settings";
import EMOverview from "./pages/founder/entity-map/Overview";
import EMEntities from "./pages/founder/entity-map/Entities";
import EMBusinesses from "./pages/founder/entity-map/Businesses";
import EMRevenueRouting from "./pages/founder/entity-map/RevenueRouting";
import EMAdviserQuestions from "./pages/founder/entity-map/AdviserQuestions";
import EMSettings from "./pages/founder/entity-map/Settings";

// Launch Factory
import LFOverview from "./pages/founder/launch-factory/Overview";
import LFBrand from "./pages/founder/launch-factory/Brand";
import LFDomains from "./pages/founder/launch-factory/Domains";
import LFEmail from "./pages/founder/launch-factory/Email";
import LFSocials from "./pages/founder/launch-factory/Socials";
import LFLegalPages from "./pages/founder/launch-factory/LegalPages";
import LFTracking from "./pages/founder/launch-factory/Tracking";
import LFChecklist from "./pages/founder/launch-factory/Checklist";

// Integration Needs Map
import IMOverview from "./pages/founder/integration-map/Overview";
import IMBusinesses from "./pages/founder/integration-map/Businesses";
import IMProviders from "./pages/founder/integration-map/Providers";
import IMMissing from "./pages/founder/integration-map/Missing";
import IMRisks from "./pages/founder/integration-map/Risks";
import IMSettings from "./pages/founder/integration-map/Settings";

// Business Compliance Rules
import BCOverview from "./pages/founder/business-compliance/Overview";
import BCBusinesses from "./pages/founder/business-compliance/Businesses";
import BCRules from "./pages/founder/business-compliance/Rules";
import BCClaims from "./pages/founder/business-compliance/Claims";
import BCChannels from "./pages/founder/business-compliance/Channels";
import BCApprovalTriggers from "./pages/founder/business-compliance/ApprovalTriggers";

// AI Compliance Control Layer
import AICOverview from "./pages/founder/ai-compliance/Overview";
import AICSystems from "./pages/founder/ai-compliance/Systems";
import AICDataFlows from "./pages/founder/ai-compliance/DataFlows";
import AICOversight from "./pages/founder/ai-compliance/Oversight";
import AICEvidence from "./pages/founder/ai-compliance/Evidence";
import AICRisk from "./pages/founder/ai-compliance/Risk";
import AICGaps from "./pages/founder/ai-compliance/Gaps";

// Multi-Business Context Guard
import CGOverview from "./pages/founder/context-guard/Overview";
import CGEvents from "./pages/founder/context-guard/Events";
import CGMissing from "./pages/founder/context-guard/MissingBusiness";
import CGCross from "./pages/founder/context-guard/CrossContamination";
import CGSettings from "./pages/founder/context-guard/Settings";

// Portfolio Prioritisation Engine
import PPOverview from "./pages/founder/portfolio-prioritisation/Overview";
import PPScores from "./pages/founder/portfolio-prioritisation/Scores";
import PPBuildNow from "./pages/founder/portfolio-prioritisation/BuildNow";
import PPScale from "./pages/founder/portfolio-prioritisation/Scale";
import PPPark from "./pages/founder/portfolio-prioritisation/Park";
import PPDecisions from "./pages/founder/portfolio-prioritisation/Decisions";

// Resource Allocation Engine
import RAOverview from "./pages/founder/resource-allocation/Overview";
import RAAIBudget from "./pages/founder/resource-allocation/AIBudget";
import RAHumanTime from "./pages/founder/resource-allocation/HumanTime";
import RAFounderAttention from "./pages/founder/resource-allocation/FounderAttention";
import RACash from "./pages/founder/resource-allocation/Cash";
import RARecommendations from "./pages/founder/resource-allocation/Recommendations";

// Portfolio Risk Matrix
import PROverview from "./pages/founder/portfolio-risk/Overview";
import PRMatrix from "./pages/founder/portfolio-risk/Matrix";
import PRBusinesses from "./pages/founder/portfolio-risk/Businesses";
import PRCritical from "./pages/founder/portfolio-risk/Critical";
import PRActions from "./pages/founder/portfolio-risk/Actions";

// Business Lifecycle Stage Control
import BLOverview from "./pages/founder/business-lifecycle/Overview";
import BLStages from "./pages/founder/business-lifecycle/Stages";
import BLBusinesses from "./pages/founder/business-lifecycle/Businesses";
import BLTransitions from "./pages/founder/business-lifecycle/Transitions";
import BLSettings from "./pages/founder/business-lifecycle/Settings";

// Global Product / Offer Catalogue
import PCOverview from "./pages/founder/product-catalogue/Overview";
import PCProducts from "./pages/founder/product-catalogue/Products";
import PCPackages from "./pages/founder/product-catalogue/Packages";
import PCAddOns from "./pages/founder/product-catalogue/AddOns";
import PCOffers from "./pages/founder/product-catalogue/Offers";
import PCPricing from "./pages/founder/product-catalogue/Pricing";
import PCClaims from "./pages/founder/product-catalogue/Claims";
import PMOverview from "./pages/founder/pricing-margin/Overview";
import PMProducts from "./pages/founder/pricing-margin/Products";
import PMBusinesses from "./pages/founder/pricing-margin/Businesses";
import PMDiscounts from "./pages/founder/pricing-margin/Discounts";
import PMBreakeven from "./pages/founder/pricing-margin/Breakeven";
import PMRecommendations from "./pages/founder/pricing-margin/Recommendations";
import CSOverview from "./pages/founder/channel-strategy/Overview";
import CSBusinesses from "./pages/founder/channel-strategy/Businesses";
import CSChannels from "./pages/founder/channel-strategy/Channels";
import CSCampaigns from "./pages/founder/channel-strategy/Campaigns";
import CSRecommendations from "./pages/founder/channel-strategy/Recommendations";
import AAOverview from "./pages/founder/analytics-attribution/Overview";
import AASources from "./pages/founder/analytics-attribution/Sources";
import AACampaigns from "./pages/founder/analytics-attribution/Campaigns";
import AARevenue from "./pages/founder/analytics-attribution/Revenue";
import AAFunnel from "./pages/founder/analytics-attribution/Funnel";
import AASettings from "./pages/founder/analytics-attribution/Settings";
import PAOverview from "./pages/founder/partners/Overview";
import PAProspects from "./pages/founder/partners/Prospects";
import PAReferrals from "./pages/founder/partners/Referrals";
import PAAffiliates from "./pages/founder/partners/Affiliates";
import PACommissions from "./pages/founder/partners/Commissions";
import PAPerformance from "./pages/founder/partners/Performance";
import IPOverview from "./pages/founder/ip-assets/Overview";
import IPCatalogue from "./pages/founder/ip-assets/Catalogue";
import IPRights from "./pages/founder/ip-assets/Rights";
import IPLicensing from "./pages/founder/ip-assets/Licensing";
import IPDistribution from "./pages/founder/ip-assets/Distribution";
import IPRisks from "./pages/founder/ip-assets/Risks";
import InsuranceOverview from "./pages/founder/insurance-liability/Overview";
import InsuranceBusinesses from "./pages/founder/insurance-liability/Businesses";
import InsurancePolicies from "./pages/founder/insurance-liability/Policies";
import InsuranceGaps from "./pages/founder/insurance-liability/Gaps";
import InsuranceClaims from "./pages/founder/insurance-liability/Claims";
import ExitOverview from "./pages/founder/exit-metrics/Overview";
import ExitBusinesses from "./pages/founder/exit-metrics/Businesses";
import ExitArchetypes from "./pages/founder/exit-metrics/Archetypes";
import ExitReadiness from "./pages/founder/exit-metrics/Readiness";
import ExitBuyerFit from "./pages/founder/exit-metrics/BuyerFit";
import ExitDataRoom from "./pages/founder/exit-metrics/DataRoom";
import PETDashboard from "./pages/founder/portfolio-exit-targets/Dashboard";
import PETBusinesses from "./pages/founder/portfolio-exit-targets/Businesses";
import PETDetail from "./pages/founder/portfolio-exit-targets/Detail";
import PETAlerts from "./pages/founder/portfolio-exit-targets/Alerts";
import PETSettings from "./pages/founder/portfolio-exit-targets/Settings";
import DROverview from "./pages/founder/distressed-radar/Overview";
import DRAcquisition from "./pages/founder/distressed-radar/Acquisition";
import DRAcquisitionDetail from "./pages/founder/distressed-radar/AcquisitionDetail";
import DRDisposal from "./pages/founder/distressed-radar/Disposal";
import DRFinancing from "./pages/founder/distressed-radar/Financing";
import DRSources from "./pages/founder/distressed-radar/Sources";
import AFOverview from "./pages/founder/acquisition-funding/Overview";
import AFOpportunities from "./pages/founder/acquisition-funding/Opportunities";
import AFOpportunityDetail from "./pages/founder/acquisition-funding/OpportunityDetail";
import AFFunders from "./pages/founder/acquisition-funding/Funders";
import AFDeals from "./pages/founder/acquisition-funding/Deals";
import AFPitches from "./pages/founder/acquisition-funding/Pitches";
import PortfolioDiversityOverview from "./pages/founder/portfolio-diversity/Overview";
import WorkQueueOverview from "./pages/founder/work-queue/Overview";
import WorkQueueToday from "./pages/founder/work-queue/Today";
import WorkQueueByBusiness from "./pages/founder/work-queue/ByBusiness";
import WorkQueueByAgent from "./pages/founder/work-queue/ByAgent";
import WorkQueueApprovals from "./pages/founder/work-queue/Approvals";
import WorkQueueBlocked from "./pages/founder/work-queue/Blocked";
import WorkQueueHighValue from "./pages/founder/work-queue/HighValue";
import WorkQueueOverdue from "./pages/founder/work-queue/Overdue";
import WorkQueueSettings from "./pages/founder/work-queue/Settings";
import NotificationsOverview from "./pages/founder/notifications/Overview";
import NotificationsInbox from "./pages/founder/notifications/Inbox";
import NotificationsUrgent from "./pages/founder/notifications/Urgent";
import NotificationsEscalations from "./pages/founder/notifications/Escalations";
import NotificationsRules from "./pages/founder/notifications/Rules";
import NotificationsArchive from "./pages/founder/notifications/Archive";
import NotificationsSettings from "./pages/founder/notifications/Settings";
import RolesOverview from "./pages/founder/roles/Overview";
import RolesUsers from "./pages/founder/roles/Users";
import RolesPermissions from "./pages/founder/roles/Permissions";
import RolesDelegation from "./pages/founder/roles/Delegation";
import RolesAccessRequests from "./pages/founder/roles/AccessRequests";
import RolesAudit from "./pages/founder/roles/Audit";
import RolesSettings from "./pages/founder/roles/Settings";
import ReportingTruthOverview from "./pages/founder/reporting-truth/Overview";
import ReportingTruthKpiDictionary from "./pages/founder/reporting-truth/KpiDictionary";
import ReportingTruthDefinitions from "./pages/founder/reporting-truth/Definitions";
import ReportingTruthReconciliation from "./pages/founder/reporting-truth/Reconciliation";
import ReportingTruthConflicts from "./pages/founder/reporting-truth/Conflicts";
import ReportingTruthSettings from "./pages/founder/reporting-truth/Settings";
import ReconciliationOverview from "./pages/founder/reconciliation/Overview";
import ReconciliationPayments from "./pages/founder/reconciliation/Payments";
import ReconciliationInvoices from "./pages/founder/reconciliation/Invoices";
import ReconciliationBank from "./pages/founder/reconciliation/Bank";
import ReconciliationPayouts from "./pages/founder/reconciliation/Payouts";
import ReconciliationRefunds from "./pages/founder/reconciliation/Refunds";
import ReconciliationUnmatched from "./pages/founder/reconciliation/Unmatched";
import ReconciliationSettings from "./pages/founder/reconciliation/Settings";
import JTOverview from "./pages/founder/jurisdiction-tax/Overview";
import JTCurrencies from "./pages/founder/jurisdiction-tax/Currencies";
import JTRevenue from "./pages/founder/jurisdiction-tax/Revenue";
import JTCustomers from "./pages/founder/jurisdiction-tax/Customers";
import JTSellers from "./pages/founder/jurisdiction-tax/Sellers";
import JTAdviserReview from "./pages/founder/jurisdiction-tax/AdviserReview";
import JTSettings from "./pages/founder/jurisdiction-tax/Settings";
import EcommerceOverview from "./pages/founder/ecommerce/Overview";
import EcommerceProducts from "./pages/founder/ecommerce/Products";
import EcommerceInventory from "./pages/founder/ecommerce/Inventory";
import EcommerceOrders from "./pages/founder/ecommerce/Orders";
import EcommerceFulfilment from "./pages/founder/ecommerce/Fulfilment";
import EcommerceReturns from "./pages/founder/ecommerce/Returns";
import EcommerceSuppliers from "./pages/founder/ecommerce/Suppliers";
import EcommerceSettings from "./pages/founder/ecommerce/Settings";
import SchedulingOverview from "./pages/founder/scheduling/Overview";
import SchedulingAvailability from "./pages/founder/scheduling/Availability";
import SchedulingBookings from "./pages/founder/scheduling/Bookings";
import SchedulingResources from "./pages/founder/scheduling/Resources";
import SchedulingNoShows from "./pages/founder/scheduling/NoShows";
import SchedulingSettings from "./pages/founder/scheduling/Settings";
import DocumentsOverview from "./pages/founder/documents/Overview";
import DocumentsVault from "./pages/founder/documents/Vault";
import DocumentsEvidence from "./pages/founder/documents/Evidence";
import DocumentsDataRoom from "./pages/founder/documents/DataRoom";
import DocumentsPolicies from "./pages/founder/documents/Policies";
import DocumentsRequests from "./pages/founder/documents/Requests";
import DocumentsAccess from "./pages/founder/documents/Access";
import SopsOverview from "./pages/founder/sops/Overview";
import SopsLibrary from "./pages/founder/sops/Library";
import SopsVersions from "./pages/founder/sops/Versions";
import SopsReviews from "./pages/founder/sops/Reviews";
import SopsAgentUsage from "./pages/founder/sops/AgentUsage";
import SopsConflicts from "./pages/founder/sops/Conflicts";
import SopsSettings from "./pages/founder/sops/Settings";
import BROverview from "./pages/founder/backup-recovery/Overview";
import BRStatus from "./pages/founder/backup-recovery/Status";
import BRExports from "./pages/founder/backup-recovery/Exports";
import BRRestore from "./pages/founder/backup-recovery/Restore";
import BREmergencyPack from "./pages/founder/backup-recovery/EmergencyPack";
import BRSettings from "./pages/founder/backup-recovery/Settings";
import EvalsOverview from "./pages/founder/ai-evals/Overview";
import EvalsTestSuites from "./pages/founder/ai-evals/TestSuites";
import EvalsResults from "./pages/founder/ai-evals/Results";
import EvalsAgents from "./pages/founder/ai-evals/Agents";
import EvalsRegression from "./pages/founder/ai-evals/Regression";
import EvalsSafety from "./pages/founder/ai-evals/Safety";
import EvalsSettings from "./pages/founder/ai-evals/Settings";
import DecisionsOverview from "./pages/founder/decisions/Overview";
import DecisionsOpen from "./pages/founder/decisions/Open";
import DecisionsMade from "./pages/founder/decisions/Made";
import DecisionsImplemented from "./pages/founder/decisions/Implemented";
import DecisionsReview from "./pages/founder/decisions/Review";
import DecisionsSettings from "./pages/founder/decisions/Settings";
import PortMemOverview from "./pages/founder/portfolio-memory/Overview";
import PortMemBusinesses from "./pages/founder/portfolio-memory/Businesses";
import PortMemPacks from "./pages/founder/portfolio-memory/HandoverPacks";
import PortMemOperator from "./pages/founder/portfolio-memory/OperatorBriefs";
import PortMemAdviser from "./pages/founder/portfolio-memory/AdviserBriefs";
import PortMemBuyer from "./pages/founder/portfolio-memory/BuyerBriefs";
import PortMemHistory from "./pages/founder/portfolio-memory/History";
import SJOverview from "./pages/founder/scheduled-jobs/Overview";
import SJJobs from "./pages/founder/scheduled-jobs/Jobs";
import SJRuns from "./pages/founder/scheduled-jobs/Runs";
import SJFailures from "./pages/founder/scheduled-jobs/Failures";
import SJCalendar from "./pages/founder/scheduled-jobs/Calendar";
import SJSettings from "./pages/founder/scheduled-jobs/Settings";
import SCOverview from "./pages/founder/system-config/Overview";
import SCFeatureFlags from "./pages/founder/system-config/FeatureFlags";
import SCModules from "./pages/founder/system-config/Modules";
import SCExternalActions from "./pages/founder/system-config/ExternalActions";
import SCBusinessOverrides from "./pages/founder/system-config/BusinessOverrides";
import SCAudit from "./pages/founder/system-config/Audit";
import ConnectorsOverview from "./pages/founder/connectors/Overview";
import ConnectorsRegistry from "./pages/founder/connectors/Registry";
import ConnectorsHealth from "./pages/founder/connectors/Health";
import ConnectorsWebhooks from "./pages/founder/connectors/Webhooks";
import ConnectorsSecrets from "./pages/founder/connectors/Secrets";
import ConnectorsBusinessMap from "./pages/founder/connectors/BusinessMap";
import ConnectorsSettings from "./pages/founder/connectors/Settings";
import WebhooksOverview from "./pages/founder/webhooks/Overview";
import WebhooksInbox from "./pages/founder/webhooks/Inbox";
import WebhooksProviders from "./pages/founder/webhooks/Providers";
import WebhooksNormalised from "./pages/founder/webhooks/NormalisedEvents";
import WebhooksFailures from "./pages/founder/webhooks/Failures";
import WebhooksSettings from "./pages/founder/webhooks/Settings";
import AuditOverview from "./pages/founder/audit-ledger/Overview";
import AuditEvents from "./pages/founder/audit-ledger/Events";
import AuditByBusiness from "./pages/founder/audit-ledger/ByBusiness";
import AuditByUser from "./pages/founder/audit-ledger/ByUser";
import AuditByModule from "./pages/founder/audit-ledger/ByModule";
import AuditSensitive from "./pages/founder/audit-ledger/Sensitive";
import AuditSettings from "./pages/founder/audit-ledger/Settings";
import ImportOverview from "./pages/founder/imports/Overview";
import ImportUpload from "./pages/founder/imports/Upload";
import ImportMapping from "./pages/founder/imports/Mapping";
import ImportPreview from "./pages/founder/imports/Preview";
import ImportHistory from "./pages/founder/imports/History";
import ImportRollback from "./pages/founder/imports/Rollback";
import ImportSettings from "./pages/founder/imports/Settings";
import IdentityOverview from "./pages/founder/identity-resolution/Overview";
import IdentityPeople from "./pages/founder/identity-resolution/People";
import IdentityDuplicates from "./pages/founder/identity-resolution/Duplicates";
import IdentityRoles from "./pages/founder/identity-resolution/Roles";
import IdentityMergeQueue from "./pages/founder/identity-resolution/MergeQueue";
import IdentityDoNotContact from "./pages/founder/identity-resolution/DoNotContact";
import IdentitySettings from "./pages/founder/identity-resolution/Settings";
import CommsOverview from "./pages/founder/communications/Overview";
import CommsLedger from "./pages/founder/communications/Ledger";
import CommsByContact from "./pages/founder/communications/ByContact";
import CommsByBusiness from "./pages/founder/communications/ByBusiness";
import CommsDrafts from "./pages/founder/communications/Drafts";
import CommsReceived from "./pages/founder/communications/Received";
import CommsSettings from "./pages/founder/communications/Settings";
import RhOverview from "./pages/founder/relationship-health/Overview";
import RhCustomers from "./pages/founder/relationship-health/Customers";
import RhSellers from "./pages/founder/relationship-health/Sellers";
import RhPartners from "./pages/founder/relationship-health/Partners";
import RhRisks from "./pages/founder/relationship-health/Risks";
import RhOpportunities from "./pages/founder/relationship-health/Opportunities";
import TsOverview from "./pages/founder/trust-safety/Overview";
import TsRiskEvents from "./pages/founder/trust-safety/RiskEvents";
import TsAccounts from "./pages/founder/trust-safety/Accounts";
import TsPayments from "./pages/founder/trust-safety/Payments";
import TsMessages from "./pages/founder/trust-safety/Messages";
import TsActions from "./pages/founder/trust-safety/Actions";
import TsSettings from "./pages/founder/trust-safety/Settings";
import SlaOverview from "./pages/founder/internal-sla/Overview";
import SlaHandoffs from "./pages/founder/internal-sla/Handoffs";
import SlaOverdue from "./pages/founder/internal-sla/Overdue";
import SlaByAgent from "./pages/founder/internal-sla/ByAgent";
import SlaByHuman from "./pages/founder/internal-sla/ByHuman";
import SlaSettings from "./pages/founder/internal-sla/Settings";
import DepOverview from "./pages/founder/deployment/Overview";
import DepEnvironments from "./pages/founder/deployment/Environments";
import DepReleases from "./pages/founder/deployment/Releases";
import DepMigrations from "./pages/founder/deployment/Migrations";
import DepEdgeFunctions from "./pages/founder/deployment/EdgeFunctions";
import DepEnvVars from "./pages/founder/deployment/EnvVars";
import DepRollback from "./pages/founder/deployment/Rollback";
import DepSettings from "./pages/founder/deployment/Settings";
import CollectionsOverview from "./pages/founder/collections/Overview";
import CollectionsOverdue from "./pages/founder/collections/Overdue";
import CollectionsFailedPayments from "./pages/founder/collections/FailedPayments";
import CollectionsReminders from "./pages/founder/collections/Reminders";
import CollectionsPaymentPlans from "./pages/founder/collections/PaymentPlans";
import CollectionsServiceHolds from "./pages/founder/collections/ServiceHolds";
import CollectionsSettings from "./pages/founder/collections/Settings";
import VocOverview from "./pages/founder/customer-feedback/Overview";
import VocSignals from "./pages/founder/customer-feedback/Signals";
import VocFeatureRequests from "./pages/founder/customer-feedback/FeatureRequests";
import VocTestimonials from "./pages/founder/customer-feedback/Testimonials";
import VocReviews from "./pages/founder/customer-feedback/Reviews";
import VocChurnReasons from "./pages/founder/customer-feedback/ChurnReasons";
import VocInsights from "./pages/founder/customer-feedback/Insights";
import ExperimentsOverview from "./pages/founder/experiments/Overview";
import ExperimentPlans from "./pages/founder/experiments/Plans";
import ExperimentResults from "./pages/founder/experiments/Results";
import ExperimentWinners from "./pages/founder/experiments/Winners";
import ExperimentLearningLibrary from "./pages/founder/experiments/LearningLibrary";
import WindDownOverview from "./pages/founder/wind-down/Overview";
import WindDownPause from "./pages/founder/wind-down/Pause";
import WindDownClosureChecklist from "./pages/founder/wind-down/ClosureChecklist";
import WindDownCustomerOffboarding from "./pages/founder/wind-down/CustomerOffboarding";
import WindDownVendorCancellation from "./pages/founder/wind-down/VendorCancellation";
import WindDownDataRetention from "./pages/founder/wind-down/DataRetention";
import WindDownArchive from "./pages/founder/wind-down/Archive";
import PoliciesOverview from "./pages/founder/policies/Overview";
import PoliciesBusinesses from "./pages/founder/policies/Businesses";
import PoliciesCoverage from "./pages/founder/policies/Coverage";
import PoliciesDrafts from "./pages/founder/policies/Drafts";
import PoliciesReview from "./pages/founder/policies/Review";
import PoliciesPublicPages from "./pages/founder/policies/PublicPages";
import AgentCapabilitiesOverview from "./pages/founder/agent-capabilities/Overview";
import AgentCapabilitiesRegistry from "./pages/founder/agent-capabilities/Registry";
import AgentCapabilitiesBoundaries from "./pages/founder/agent-capabilities/Boundaries";
import AgentCapabilitiesApprovalRules from "./pages/founder/agent-capabilities/ApprovalRules";
import AgentCapabilitiesEscalations from "./pages/founder/agent-capabilities/Escalations";
import AgentCapabilitiesAudit from "./pages/founder/agent-capabilities/Audit";
import AttentionOverview from "./pages/founder/attention-guard/Overview";
import AttentionToday from "./pages/founder/attention-guard/Today";
import AttentionNoise from "./pages/founder/attention-guard/Noise";
import AttentionDecisions from "./pages/founder/attention-guard/Decisions";
import AttentionDelegation from "./pages/founder/attention-guard/Delegation";
import AttentionSettings from "./pages/founder/attention-guard/Settings";
import PlatMonOverview from "./pages/founder/platform-monitor/Overview";
import PlatMonPerformance from "./pages/founder/platform-monitor/Performance";
import PlatMonErrors from "./pages/founder/platform-monitor/Errors";
import PlatMonRateLimits from "./pages/founder/platform-monitor/RateLimits";
import PlatMonCosts from "./pages/founder/platform-monitor/Costs";
import PlatMonScalability from "./pages/founder/platform-monitor/Scalability";
import PlatMonRecommendations from "./pages/founder/platform-monitor/Recommendations";
import SearchOverview from "./pages/founder/search/Overview";
import SearchAll from "./pages/founder/search/All";
import SearchCustomers from "./pages/founder/search/Customers";
import SearchBusinesses from "./pages/founder/search/Businesses";
import SearchDocuments from "./pages/founder/search/Documents";
import SearchCommunications from "./pages/founder/search/Communications";
import SearchAudit from "./pages/founder/search/Audit";
import SearchSettings from "./pages/founder/search/Settings";
import PortalsOverview from "./pages/founder/portals/Overview";
import PortalsCustomerAdmin from "./pages/founder/portals/Customer";
import PortalsSellerAdmin from "./pages/founder/portals/Seller";
import PortalsPartnerAdmin from "./pages/founder/portals/Partner";
import PortalsAdviserAdmin from "./pages/founder/portals/Adviser";
import PortalsDocumentUploadAdmin from "./pages/founder/portals/DocumentUpload";
import PortalsAccessPage from "./pages/founder/portals/Access";
import PortalsSettings from "./pages/founder/portals/Settings";
import PublicCustomerPortal from "./pages/portal/Customer";
import PublicSellerPortal from "./pages/portal/Seller";
import PublicPartnerPortal from "./pages/portal/Partner";
import PublicAdviserPortal from "./pages/portal/Adviser";
import PublicUploadPortal from "./pages/portal/Upload";
import KnowledgeOverview from "./pages/founder/knowledge-governance/Overview";
import KnowledgeSources from "./pages/founder/knowledge-governance/Sources";
import KnowledgeConflicts from "./pages/founder/knowledge-governance/Conflicts";
import KnowledgeStale from "./pages/founder/knowledge-governance/Stale";
import KnowledgeApprovedClaims from "./pages/founder/knowledge-governance/ApprovedClaims";
import KnowledgeManualSync from "./pages/founder/knowledge-governance/ManualSync";
import CustomerUpgradesHub from "./pages/founder/customer-upgrades/Hub";
import CustomerUpgradesOpportunities from "./pages/founder/customer-upgrades/Opportunities";
import CustomerUpgradesProductLadders from "./pages/founder/customer-upgrades/ProductLadders";
import CustomerUpgradesRenewals from "./pages/founder/customer-upgrades/Renewals";
import CustomerUpgradesRules from "./pages/founder/customer-upgrades/UpgradeRules";
import CustomerUpgradesFollowUp from "./pages/founder/customer-upgrades/FollowUp";
import AIFounderActionBoard from "./pages/founder/AIFounderActionBoard";
import AIRuntimeOrchestration from "./pages/founder/AIRuntimeOrchestration";
import AIOrchestrationLive from "./pages/founder/AIOrchestrationLive";
import AIRuntimeHealth from "./pages/founder/AIRuntimeHealth";
import DataIngestionCentre from "./pages/founder/DataIngestionCentre";
import BrainSessions from "./pages/founder/BrainSessions";
import BrainDrafts from "./pages/founder/BrainDrafts";
import BrainAudit from "./pages/founder/BrainAudit";
import BrainTools from "./pages/founder/BrainTools";
import BrainProvider from "./pages/founder/BrainProvider";
import ProcessDirectory from "./pages/founder/ProcessDirectory";
import ProcessDetail from "./pages/founder/ProcessDetail";
import ArchitectureDirectory from "./pages/founder/ArchitectureDirectory";
import ArchitectureDetail from "./pages/founder/ArchitectureDetail";
import DeploymentDirectory from "./pages/founder/DeploymentDirectory";
import DeploymentDetail from "./pages/founder/DeploymentDetail";
import FounderAnalytics from "./pages/founder/FounderAnalytics";
import OptimisationDashboard from "./pages/founder/OptimisationDashboard";
import KnowledgeDirectory from "./pages/founder/KnowledgeDirectory";
import KnowledgeDetail from "./pages/founder/KnowledgeDetail";
import GlobalOperations from "./pages/founder/GlobalOperations";
import OrganisationDirectory from "./pages/founder/OrganisationDirectory";
import OrganisationProfile from "./pages/founder/OrganisationProfile";
import AccessControl from "./pages/founder/AccessControl";
import SecurityDashboard from "./pages/founder/SecurityDashboard";
import TemplateDirectory from "./pages/founder/TemplateDirectory";
import TemplateDetail from "./pages/founder/TemplateDetail";
import PlatformExpansion from "./pages/founder/PlatformExpansion";
import PlatformLaunchDetail from "./pages/founder/PlatformLaunchDetail";
import FounderManual from "./pages/founder/FounderManual";
import UserManualPage from "./pages/founder/UserManualPage";
import ManualPageDetail from "./pages/founder/ManualPageDetail";
import FullSystemMirror from "./pages/founder/FullSystemMirror";
import BuildLog from "./pages/founder/BuildLog";
import FounderRevenue from "./pages/founder/FounderRevenue";
import BrainCore from "./pages/founder/BrainCore";
import DecisionEngine from "./pages/founder/DecisionEngine";
import StrategyEngine from "./pages/founder/StrategyEngine";
import MarketingHub from "./pages/founder/MarketingHub";
import SupportHub from "./pages/founder/SupportHub";
import SupportKnowledgeAgent from "./pages/founder/SupportKnowledgeAgent";
import CustomerSuccess from "./pages/founder/CustomerSuccess";
import ClientPortal from "./pages/founder/ClientPortal";
import CreativeAssetsHub from "./pages/founder/CreativeAssetsHub";
import SocialBrain from "./pages/founder/SocialBrain";
import SocialAutopilotPage from "./pages/founder/SocialAutopilotPage";
import SocialRelationshipsPage from "./pages/founder/SocialRelationshipsPage";
import FounderCoPilot from "./pages/founder/FounderCoPilot";
import PlatformTesting from "./pages/founder/PlatformTesting";
import FounderLegalConsole from "./pages/founder/FounderLegalConsole";
import ComplianceDashboard from "./pages/founder/compliance/ComplianceDashboard";
import ComplianceEvents from "./pages/founder/compliance/ComplianceEvents";
import ComplianceRules from "./pages/founder/compliance/ComplianceRules";
import CRMDashboard from "./pages/founder/CRMDashboard";
import BillionaireAccessResearch from "./pages/founder/BillionaireAccessResearch";
import PriorityDashboard from "./pages/founder/priority/PriorityDashboard";
import SendingHealth from "./pages/founder/sending/SendingHealth";
import SystemDashboard from "./pages/founder/system/SystemDashboard";
import SystemEvents from "./pages/founder/system/SystemEvents";
import SystemHealth from "./pages/founder/system/SystemHealth";
import ExecutionModes from "./pages/founder/system/ExecutionModes";
import CRMContacts from "./pages/founder/CRMContacts";
import CRMContactDetail from "./pages/founder/CRMContactDetail";
import CRMInboxes from "./pages/founder/CRMInboxes";
import CRMInboxConfigure from "./pages/founder/CRMInboxConfigure";
import FinanceDashboard from "./pages/founder/finance/FinanceDashboard";
import FinanceTargets from "./pages/founder/finance/FinanceTargets";
import FinanceDeals from "./pages/founder/finance/FinanceDeals";
import FinanceInvoices from "./pages/founder/finance/FinanceInvoices";
import FinancePayments from "./pages/founder/finance/FinancePayments";
import OutreachDashboard from "./pages/founder/outreach/OutreachDashboard";
import OutreachImports from "./pages/founder/outreach/OutreachImports";
import OutreachCampaigns from "./pages/founder/outreach/OutreachCampaigns";
import OutreachQueue from "./pages/founder/outreach/OutreachQueue";
import CampaignLiveMonitor from "./pages/founder/outreach/CampaignLiveMonitor";
import ApolloIntegration from "./pages/founder/outreach/ApolloIntegration";
import EngagementTracking from "./pages/founder/outreach/EngagementTracking";
import ControlledSendPreview from "./pages/founder/outreach/ControlledSendPreview";
import QueueAudit from "./pages/founder/outreach/QueueAudit";
import ConversationsDashboard from "./pages/founder/conversations/ConversationsDashboard";
import ConversationDetail from "./pages/founder/conversations/ConversationDetail";
import InternalProposals from "./pages/founder/proposals/InternalProposals";
import InternalProposalDetail from "./pages/founder/proposals/InternalProposalDetail";
import DemosDashboard from "./pages/founder/proposals/DemosDashboard";
import SuppliersDashboard from "./pages/founder/suppliers/SuppliersDashboard";
import SupplierDetail from "./pages/founder/suppliers/SupplierDetail";
import AssignmentsDashboard from "./pages/founder/suppliers/AssignmentsDashboard";
import PublicProposalView from "./pages/public/PublicProposalView";
import PublicProposalAccept from "./pages/public/PublicProposalAccept";
import PublicDemo from "./pages/public/PublicDemo";
// Supplier portal
import SupplierLogin from "./pages/supplier/SupplierLogin";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierAssignments from "./pages/supplier/SupplierAssignments";
// Partner pages
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import PartnerOpportunities from "./pages/partner/PartnerOpportunities";
import PartnerOpportunityDetail from "./pages/partner/PartnerOpportunityDetail";
import PartnerProjects from "./pages/partner/PartnerProjects";
import PartnerProjectDetail from "./pages/partner/PartnerProjectDetail";
import PartnerDocuments from "./pages/partner/PartnerDocuments";
import PartnerMessages from "./pages/partner/PartnerMessages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <SystemModeBanner />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/what-we-build" element={<WhatWeBuild />} />
            <Route path="/industries" element={<Industries />} />
            <Route path="/method" element={<Method />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/partners" element={<PartnerProgram />} />
            <Route path="/project-discovery" element={<ProjectDiscovery />} />
            <Route path="/about" element={<About />} />
            <Route path="/ai-proposal" element={<AIProposal />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/systems" element={<Systems />} />
            <Route path="/architecture" element={<Architecture />} />

            {/* Legal */}
            <Route path="/legal" element={<LegalHub />} />
            <Route path="/legal/terms-of-service" element={<TermsOfService />} />
            <Route path="/legal/enterprise-services-agreement" element={<EnterpriseServicesAgreement />} />
            <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/legal/acceptable-use" element={<AcceptableUse />} />
            <Route path="/legal/ai-usage-policy" element={<AIUsagePolicy />} />
            <Route path="/legal/automation-safety-policy" element={<AutomationSafetyPolicy />} />
            <Route path="/legal/security-policy" element={<SecurityPolicy />} />
            <Route path="/legal/cookie-policy" element={<CookiePolicy />} />
            <Route path="/legal/data-processing-agreement" element={<DataProcessingAgreement />} />
            <Route path="/legal/ai-output-disclaimer" element={<AIOutputDisclaimer />} />
            <Route path="/legal/automation-liability-disclaimer" element={<AutomationLiabilityDisclaimer />} />
            <Route path="/legal/security-reporting" element={<SecurityReporting />} />
            <Route path="/survey/:token" element={<SurveyResponse />} />
            <Route path="/customer-report/:token" element={<CustomerReportView />} />
            <Route path="/onboarding/:token" element={<CustomerOnboardingView />} />

            {/* Auth */}
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal/signup" element={<PortalSignup />} />
            <Route path="/portal/forgot-password" element={<ForgotPassword />} />
            <Route path="/portal/reset-password" element={<ResetPassword />} />

            {/* External Portals Architecture — public placeholders (not activated by default) */}
            <Route path="/portal/customer" element={<PublicCustomerPortal />} />
            <Route path="/portal/seller" element={<PublicSellerPortal />} />
            <Route path="/portal/partner" element={<PublicPartnerPortal />} />
            <Route path="/portal/adviser" element={<PublicAdviserPortal />} />
            <Route path="/portal/upload" element={<PublicUploadPortal />} />

            {/* Protected Client Portal */}
            <Route path="/portal/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/portal/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/portal/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/portal/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/portal/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/portal/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
            <Route path="/portal/maintenance" element={<ProtectedRoute><MaintenanceDashboard /></ProtectedRoute>} />
            <Route path="/portal/maintenance/schedule" element={<ProtectedRoute><MaintenanceSchedule /></ProtectedRoute>} />
            <Route path="/portal/maintenance/updates" element={<ProtectedRoute><MaintenanceUpdates /></ProtectedRoute>} />
            <Route path="/portal/maintenance/features" element={<ProtectedRoute><FeatureRequests /></ProtectedRoute>} />
            <Route path="/portal/monitoring" element={<ProtectedRoute><ClientSystemMonitoring /></ProtectedRoute>} />
            <Route path="/portal/systems" element={<ProtectedRoute><ClientControlPanel /></ProtectedRoute>} />
            <Route path="/portal/systems/:id" element={<ProtectedRoute><ClientSystemDetail /></ProtectedRoute>} />
            <Route path="/portal/analytics" element={<ProtectedRoute><ClientAnalytics /></ProtectedRoute>} />
            <Route path="/portal/optimisation" element={<ProtectedRoute><ClientOptimisation /></ProtectedRoute>} />

            {/* Founder Console */}
            <Route path="/founder" element={<FounderRoute><FounderOverview /></FounderRoute>} />
            <Route path="/founder/proposals" element={<FounderRoute><FounderProposals /></FounderRoute>} />
            <Route path="/founder/proposals/:id" element={<FounderRoute><ProposalDetail /></FounderRoute>} />
            <Route path="/founder/pipeline" element={<FounderRoute><LeadPipeline /></FounderRoute>} />
            <Route path="/founder/projects" element={<FounderRoute><FounderProjects /></FounderRoute>} />
            <Route path="/founder/projects/:id" element={<FounderRoute><FounderProjectDetail /></FounderRoute>} />
            <Route path="/founder/activity" element={<FounderRoute><FounderActivity /></FounderRoute>} />
            <Route path="/founder/documents" element={<FounderRoute><FounderDocuments /></FounderRoute>} />
            <Route path="/founder/monitoring" element={<FounderRoute><MonitoringDashboard /></FounderRoute>} />
            <Route path="/founder/monitoring/:id" element={<FounderRoute><MonitoringSystemDetail /></FounderRoute>} />
            <Route path="/founder/agents" element={<FounderRoute><AgentDirectory /></FounderRoute>} />
            <Route path="/founder/agents/:id" element={<FounderRoute><AgentProfile /></FounderRoute>} />
            <Route path="/founder/workflows" element={<FounderRoute><WorkflowDirectory /></FounderRoute>} />
            <Route path="/founder/workflows/:id" element={<FounderRoute><WorkflowDetail /></FounderRoute>} />
            <Route path="/founder/integrations" element={<FounderRoute><IntegrationDirectory /></FounderRoute>} />
            <Route path="/founder/integrations/:id" element={<FounderRoute><IntegrationDetail /></FounderRoute>} />
            <Route path="/founder/executions" element={<FounderRoute><ExecutionDashboard /></FounderRoute>} />
            <Route path="/founder/executions/:id" element={<FounderRoute><ExecutionDetail /></FounderRoute>} />
            <Route path="/founder/command-centre" element={<FounderRoute><CommandCentre /></FounderRoute>} />
            <Route path="/founder/command-center" element={<Navigate to="/founder/command-centre" replace />} />
            <Route path="/founder/start-here" element={<FounderRoute><StartHere /></FounderRoute>} />
            <Route path="/founder/start-here/setup-business" element={<FounderRoute><StartHereSetupBusiness /></FounderRoute>} />
            <Route path="/founder/user-guide" element={<FounderRoute><FounderUserGuide /></FounderRoute>} />
            <Route path="/founder/business-setup-tunnel" element={<FounderRoute><BusinessSetupTunnel /></FounderRoute>} />
            <Route path="/founder/daily-operator" element={<FounderRoute><DailyOperator /></FounderRoute>} />
            <Route path="/founder/money" element={<FounderRoute><FounderMoney /></FounderRoute>} />
            <Route path="/founder/starter-pack-materialiser" element={<FounderRoute><StarterPackMaterialiserPage /></FounderRoute>} />
            <Route path="/founder/business-onboarding-factory" element={<FounderRoute><BusinessOnboardingFactoryPage /></FounderRoute>} />
            <Route path="/founder/video-sop-factory" element={<FounderRoute><VideoSopFactoryPage /></FounderRoute>} />
            <Route path="/founder/relationship-intelligence" element={<FounderRoute><RelationshipIntelligencePage /></FounderRoute>} />
            <Route path="/founder/billionaire-intelligence" element={<FounderRoute><BillionaireIntelligence /></FounderRoute>} />
            <Route path="/founder/relationship-intelligence/import" element={<FounderRoute><RelationshipIntelligenceImport /></FounderRoute>} />
            <Route path="/founder/global-pr-radar" element={<FounderRoute><GlobalPrRadar /></FounderRoute>} />
            <Route path="/founder/video-library" element={<FounderRoute><VideoLibrary /></FounderRoute>} />
            <Route path="/founder/healthcare-overlay" element={<FounderRoute><HealthcareOverlay /></FounderRoute>} />
            <Route path="/founder/insurance-claims" element={<FounderRoute><InsuranceClaimsPage /></FounderRoute>} />
            <Route path="/founder/statutory-filings" element={<FounderRoute><StatutoryFilingsPage /></FounderRoute>} />
            <Route path="/founder/corporate-secretarial" element={<FounderRoute><CorporateSecretarialPage /></FounderRoute>} />
            <Route path="/founder/international-expansion" element={<FounderRoute><InternationalExpansionPage /></FounderRoute>} />
            <Route path="/founder/data-room" element={<FounderRoute><DataRoomPage /></FounderRoute>} />
            <Route path="/founder/release-workflow" element={<FounderRoute><ReleaseWorkflowPage /></FounderRoute>} />
            <Route path="/founder/portfolio-fx" element={<FounderRoute><PortfolioFxPage /></FounderRoute>} />
            <Route path="/founder/business-internal-activation" element={<FounderRoute><BusinessInternalActivationPage /></FounderRoute>} />
            <Route path="/founder/business-daily-operating-loop" element={<FounderRoute><BusinessDailyOperatingLoopPage /></FounderRoute>} />
            <Route path="/founder/business-weekly-review" element={<FounderRoute><BusinessWeeklyReviewPage /></FounderRoute>} />
            <Route path="/founder/external-activation-readiness" element={<FounderRoute><ExternalActivationReadinessPage /></FounderRoute>} />
            <Route path="/founder/micro-batch-preparation" element={<FounderRoute><MicroBatchPreparationPage /></FounderRoute>} />
            <Route path="/founder/build-phase-closeout" element={<FounderRoute><BuildPhaseCloseoutPage /></FounderRoute>} />
            <Route path="/founder/manuals-hub" element={<FounderRoute><ManualsHubPage /></FounderRoute>} />
            <Route path="/founder/portfolio-exit" element={<FounderRoute><PortfolioExitCommandCentre /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/:assetId" element={<FounderRoute><PortfolioExitAssetDetail /></FounderRoute>} />
            <Route path="/founder/founder-led-exit" element={<FounderRoute><FounderLedExitSalesEngine /></FounderRoute>} />
            <Route path="/founder/founder-led-buyer-market" element={<FounderRoute><FounderLedBuyerMarketEngine /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/intelligence" element={<FounderRoute><MAIntelligenceWorkspace /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/valuation" element={<FounderRoute><ExitValuationEngine /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/build-selector" element={<FounderRoute><QuarterlyBuildSelector /></FounderRoute>} />
            <Route path="/founder/quarterly-production-machine" element={<FounderRoute><QuarterlyProductionMachine /></FounderRoute>} />
            <Route path="/founder/funding-radar" element={<FounderRoute><FRRadarOverview /></FounderRoute>} />
            <Route path="/founder/funding-radar/companies" element={<FounderRoute><FRCompanies /></FounderRoute>} />
            <Route path="/founder/funding-radar/company/:id" element={<FounderRoute><FRCompanyDetail /></FounderRoute>} />
            <Route path="/founder/funding-radar/clusters" element={<FounderRoute><FRClusters /></FounderRoute>} />
            <Route path="/founder/funding-radar/capital-efficiency" element={<FounderRoute><FRCapitalEfficiency /></FounderRoute>} />
            <Route path="/founder/funding-radar/monthly-run" element={<FounderRoute><FRMonthlyRun /></FounderRoute>} />
            <Route path="/founder/funding-radar/shortlist" element={<FounderRoute><FRShortlist /></FounderRoute>} />
            <Route path="/founder/funding-radar/decision-pack" element={<FounderRoute><FRDecisionPack /></FounderRoute>} />
            <Route path="/founder/funding-radar/settings" element={<FounderRoute><FRSettings /></FounderRoute>} />
            <Route path="/founder/funding-radar/watchlist" element={<FounderRoute><FRWatchlist /></FounderRoute>} />
            <Route path="/founder/funding-radar/watchlist/:id" element={<FounderRoute><FRWatchlistDetail /></FounderRoute>} />
            <Route path="/founder/funding-radar/weakness-signals" element={<FounderRoute><FRWeaknessSignals /></FounderRoute>} />
            <Route path="/founder/funding-radar/market-maps" element={<FounderRoute><FRMarketMaps /></FounderRoute>} />
            <Route path="/founder/funding-radar/white-space" element={<FounderRoute><FRWhiteSpace /></FounderRoute>} />
            <Route path="/founder/funding-radar/handoff/:id" element={<FounderRoute><FRBuildHandoffPack /></FounderRoute>} />
            <Route path="/founder/funding-radar/business-autopsy" element={<FounderRoute><FRBusinessAutopsy /></FounderRoute>} />
            <Route path="/founder/funding-radar/business-autopsy/:id" element={<FounderRoute><FRBusinessAutopsyDetail /></FounderRoute>} />
            <Route path="/founder/quarterly-production-machine/build-generator" element={<FounderRoute><FRBusinessAutopsy /></FounderRoute>} />
            <Route path="/founder/quarterly-production-machine/build-pack-validator" element={<FounderRoute><QPMBuildPackValidator /></FounderRoute>} />
            <Route path="/founder/quarterly-production-machine/prompt-queue" element={<FounderRoute><QPMPromptQueue /></FounderRoute>} />
            <Route path="/founder/quarterly-production-machine/vertical-launch" element={<FounderRoute><QPMVerticalLaunch /></FounderRoute>} />
            <Route path="/founder/quarterly-production-machine/production-pack" element={<FounderRoute><QPMProductionPack /></FounderRoute>} />
            <Route path="/founder/quarterly-production-machine/lovable-pack" element={<FounderRoute><QPMLovablePack /></FounderRoute>} />
            <Route path="/founder/security-vault" element={<FounderRoute><SecurityVaultOverview /></FounderRoute>} />
            <Route path="/founder/security-vault/build-snapshots" element={<FounderRoute><SecurityVaultBuildSnapshots /></FounderRoute>} />
            <Route path="/founder/security-vault/secrets-register" element={<FounderRoute><SecurityVaultSecretsRegister /></FounderRoute>} />
            <Route path="/founder/security-vault/backup-restore" element={<FounderRoute><SecurityVaultBackupRestore /></FounderRoute>} />
            <Route path="/founder/security-vault/security-audit" element={<FounderRoute><SecurityVaultSecurityAudit /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/execution-handoff" element={<FounderRoute><ExecutionHandoff /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/manual" element={<FounderRoute><PortfolioExitManual /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/controls" element={<FounderRoute><PortfolioExitControls /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/ingestion" element={<FounderRoute><DataIngestionCentre /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/hardening" element={<FounderRoute><PortfolioExitHardening /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/release-gate" element={<FounderRoute><PortfolioExitReleaseGate /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/buyer-warmup" element={<FounderRoute><PortfolioBuyerWarmUp /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/investors" element={<FounderRoute><PortfolioInvestorIntelligence /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/competitors" element={<FounderRoute><PortfolioCompetitorIntelligence /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/operating-panels" element={<FounderRoute><PortfolioOperatingPanels /></FounderRoute>} />
            <Route path="/founder/portfolio-exit/ai-bypass-register" element={<FounderRoute><AIGatewayBypassRegister /></FounderRoute>} />
            <Route path="/founder/ai-cost" element={<FounderRoute><AICostGovernorHub /></FounderRoute>} />
            <Route path="/founder/ai-cost/first-use" element={<FounderRoute><AIFirstUseSetup /></FounderRoute>} />
            <Route path="/founder/first-use-configuration" element={<FounderRoute><FirstUseConfiguration /></FounderRoute>} />
            <Route path="/founder/customer-sales" element={<FounderRoute><CustomerSalesHub /></FounderRoute>} />
            <Route path="/founder/customer-sales/voice-console" element={<FounderRoute><CustomerSalesVoiceConsole /></FounderRoute>} />
            <Route path="/founder/customer-sales/product-knowledge" element={<FounderRoute><CustomerSalesProductKnowledge /></FounderRoute>} />
            <Route path="/founder/customer-sales/playbooks" element={<FounderRoute><CustomerSalesPlaybooks /></FounderRoute>} />
            <Route path="/founder/customer-sales/conversations" element={<FounderRoute><CustomerSalesConversations /></FounderRoute>} />
            <Route path="/founder/customer-sales/call-logs" element={<FounderRoute><CustomerSalesCallLogs /></FounderRoute>} />
            <Route path="/founder/customer-sales/close-engine" element={<FounderRoute><CustomerSalesCloseEngine /></FounderRoute>} />
            <Route path="/founder/customer-sales/offers" element={<FounderRoute><CustomerSalesOffers /></FounderRoute>} />
            <Route path="/founder/customer-sales/objections" element={<FounderRoute><CustomerSalesObjections /></FounderRoute>} />
            <Route path="/founder/customer-sales/follow-up" element={<FounderRoute><CustomerSalesFollowUp /></FounderRoute>} />
            <Route path="/founder/customer-sales/safety" element={<FounderRoute><CustomerSalesSafetyCentre /></FounderRoute>} />
            <Route path="/founder/customer-sales/settings" element={<FounderRoute><CustomerSalesSettings /></FounderRoute>} />
            <Route path="/founder/sales-targets" element={<FounderRoute><SalesTargetsCockpit /></FounderRoute>} />
            <Route path="/founder/sales-targets/business" element={<FounderRoute><SalesTargetsBusiness /></FounderRoute>} />
            <Route path="/founder/sales-targets/activity-plan" element={<FounderRoute><SalesTargetsActivityPlan /></FounderRoute>} />
            <Route path="/founder/sales-targets/conversion" element={<FounderRoute><SalesTargetsConversion /></FounderRoute>} />
            <Route path="/founder/sales-targets/gaps" element={<FounderRoute><SalesTargetsGaps /></FounderRoute>} />
            <Route path="/founder/sales-targets/forecast" element={<FounderRoute><SalesTargetsForecast /></FounderRoute>} />
            <Route path="/founder/sales-coaching" element={<FounderRoute><SalesCoachingDashboard /></FounderRoute>} />
            <Route path="/founder/sales-coaching/conversions" element={<FounderRoute><SalesCoachingConversions /></FounderRoute>} />
            <Route path="/founder/sales-coaching/objections" element={<FounderRoute><SalesCoachingObjections /></FounderRoute>} />
            <Route path="/founder/sales-coaching/scripts" element={<FounderRoute><SalesCoachingScripts /></FounderRoute>} />
            <Route path="/founder/sales-coaching/wins-losses" element={<FounderRoute><SalesCoachingWinsLosses /></FounderRoute>} />
            <Route path="/founder/sales-coaching/recommendations" element={<FounderRoute><SalesCoachingRecommendations /></FounderRoute>} />
            <Route path="/founder/revenue-autopilot" element={<FounderRoute><RevenueAutopilotOverview /></FounderRoute>} />
            <Route path="/founder/revenue-autopilot/today" element={<FounderRoute><RevenueAutopilotToday /></FounderRoute>} />
            <Route path="/founder/revenue-autopilot/targets" element={<FounderRoute><RevenueAutopilotTargets /></FounderRoute>} />
            <Route path="/founder/revenue-autopilot/tasks" element={<FounderRoute><RevenueAutopilotTasks /></FounderRoute>} />
            <Route path="/founder/revenue-autopilot/gaps" element={<FounderRoute><RevenueAutopilotGaps /></FounderRoute>} />
            <Route path="/founder/revenue-autopilot/approvals" element={<FounderRoute><RevenueAutopilotApprovals /></FounderRoute>} />
            <Route path="/founder/quote-to-cash" element={<FounderRoute><QTCOverview /></FounderRoute>} />
            <Route path="/founder/quote-to-cash/quotes" element={<FounderRoute><QTCQuotes /></FounderRoute>} />
            <Route path="/founder/quote-to-cash/proposals" element={<FounderRoute><QTCProposals /></FounderRoute>} />
            <Route path="/founder/quote-to-cash/invoices" element={<FounderRoute><QTCInvoices /></FounderRoute>} />
            <Route path="/founder/quote-to-cash/payments" element={<FounderRoute><QTCPayments /></FounderRoute>} />
            <Route path="/founder/quote-to-cash/revenue-confirmation" element={<FounderRoute><QTCRevenueConfirmation /></FounderRoute>} />
            <Route path="/founder/quote-to-cash/payment-architecture-readiness" element={<FounderRoute><QTCPaymentArchitectureReadiness /></FounderRoute>} />
            <Route path="/founder/quote-to-cash/stripe-price-mapping" element={<FounderRoute><QTCStripePriceMapping /></FounderRoute>} />
            <Route path="/founder/quote-to-cash/payment-control-centre" element={<FounderRoute><QTCPaymentControlCentre /></FounderRoute>} />
            <Route path="/founder/quote-to-cash/settings" element={<FounderRoute><QTCSettings /></FounderRoute>} />
            <Route path="/founder/delivery" element={<FounderRoute><DeliveryOverview /></FounderRoute>} />
            <Route path="/founder/delivery/orders" element={<FounderRoute><DeliveryOrders /></FounderRoute>} />
            <Route path="/founder/delivery/tasks" element={<FounderRoute><DeliveryTasks /></FounderRoute>} />
            <Route path="/founder/delivery/capacity" element={<FounderRoute><DeliveryCapacity /></FounderRoute>} />
            <Route path="/founder/delivery/blockers" element={<FounderRoute><DeliveryBlockers /></FounderRoute>} />
            <Route path="/founder/delivery/completion-proof" element={<FounderRoute><DeliveryCompletionProof /></FounderRoute>} />
            <Route path="/founder/delivery/settings" element={<FounderRoute><DeliverySettings /></FounderRoute>} />
            <Route path="/founder/customer-onboarding" element={<FounderRoute><CustomerOnboardingOverview /></FounderRoute>} />
            <Route path="/founder/customer-onboarding/customers" element={<FounderRoute><CustomerOnboardingCustomers /></FounderRoute>} />
            <Route path="/founder/customer-onboarding/checklists" element={<FounderRoute><CustomerOnboardingChecklists /></FounderRoute>} />
            <Route path="/founder/customer-onboarding/missing-info" element={<FounderRoute><CustomerOnboardingMissingInfo /></FounderRoute>} />
            <Route path="/founder/customer-onboarding/welcome-packs" element={<FounderRoute><CustomerOnboardingWelcomePacks /></FounderRoute>} />
            <Route path="/founder/customer-onboarding/settings" element={<FounderRoute><CustomerOnboardingSettings /></FounderRoute>} />
            <Route path="/founder/support-tickets" element={<FounderRoute><SupportTicketsOverview /></FounderRoute>} />
            <Route path="/founder/support-tickets/queue" element={<FounderRoute><SupportTicketsQueue /></FounderRoute>} />
            <Route path="/founder/support-tickets/sla" element={<FounderRoute><SupportTicketsSLA /></FounderRoute>} />
            <Route path="/founder/support-tickets/escalations" element={<FounderRoute><SupportTicketsEscalations /></FounderRoute>} />
            <Route path="/founder/support-tickets/knowledge" element={<FounderRoute><SupportTicketsKnowledge /></FounderRoute>} />
            <Route path="/founder/support-tickets/settings" element={<FounderRoute><SupportTicketsSettings /></FounderRoute>} />
            <Route path="/founder/complaints" element={<FounderRoute><ComplaintsOverview /></FounderRoute>} />
            <Route path="/founder/complaints/refunds" element={<FounderRoute><ComplaintsRefunds /></FounderRoute>} />
            <Route path="/founder/complaints/disputes" element={<FounderRoute><ComplaintsDisputes /></FounderRoute>} />
            <Route path="/founder/complaints/escalations" element={<FounderRoute><ComplaintsEscalations /></FounderRoute>} />
            <Route path="/founder/complaints/evidence" element={<FounderRoute><ComplaintsEvidence /></FounderRoute>} />
            <Route path="/founder/complaints/settings" element={<FounderRoute><ComplaintsSettings /></FounderRoute>} />
            <Route path="/founder/contracts" element={<FounderRoute><ContractsOverview /></FounderRoute>} />
            <Route path="/founder/contracts/drafts" element={<FounderRoute><ContractsDrafts /></FounderRoute>} />
            <Route path="/founder/contracts/signature" element={<FounderRoute><ContractsSignature /></FounderRoute>} />
            <Route path="/founder/contracts/obligations" element={<FounderRoute><ContractsObligations /></FounderRoute>} />
            <Route path="/founder/contracts/renewals" element={<FounderRoute><ContractsRenewals /></FounderRoute>} />
            <Route path="/founder/contracts/risk" element={<FounderRoute><ContractsRisk /></FounderRoute>} />
            <Route path="/founder/contracts/settings" element={<FounderRoute><ContractsSettings /></FounderRoute>} />
            <Route path="/founder/vendors" element={<FounderRoute><VendorsOverview /></FounderRoute>} />
            <Route path="/founder/vendors/saas" element={<FounderRoute><VendorsSaas /></FounderRoute>} />
            <Route path="/founder/vendors/contracts" element={<FounderRoute><VendorsContracts /></FounderRoute>} />
            <Route path="/founder/vendors/costs" element={<FounderRoute><VendorsCosts /></FounderRoute>} />
            <Route path="/founder/vendors/renewals" element={<FounderRoute><VendorsRenewals /></FounderRoute>} />
            <Route path="/founder/vendors/access" element={<FounderRoute><VendorsAccess /></FounderRoute>} />
            <Route path="/founder/vendors/risk" element={<FounderRoute><VendorsRisk /></FounderRoute>} />
            <Route path="/founder/people" element={<FounderRoute><PeopleOverview /></FounderRoute>} />
            <Route path="/founder/people/operators" element={<FounderRoute><PeopleOperators /></FounderRoute>} />
            <Route path="/founder/people/tasks" element={<FounderRoute><PeopleTasks /></FounderRoute>} />
            <Route path="/founder/people/access" element={<FounderRoute><PeopleAccess /></FounderRoute>} />
            <Route path="/founder/people/training" element={<FounderRoute><PeopleTraining /></FounderRoute>} />
            <Route path="/founder/people/quality" element={<FounderRoute><PeopleQuality /></FounderRoute>} />
            <Route path="/founder/people/handover" element={<FounderRoute><PeopleHandover /></FounderRoute>} />
            <Route path="/founder/access-governance" element={<FounderRoute><AccessGovernanceOverview /></FounderRoute>} />
            <Route path="/founder/access-governance/systems" element={<FounderRoute><AccessGovernanceSystems /></FounderRoute>} />
            <Route path="/founder/access-governance/secrets" element={<FounderRoute><AccessGovernanceSecrets /></FounderRoute>} />
            <Route path="/founder/access-governance/users" element={<FounderRoute><AccessGovernanceUsers /></FounderRoute>} />
            <Route path="/founder/access-governance/revocation" element={<FounderRoute><AccessGovernanceRevocation /></FounderRoute>} />
            <Route path="/founder/access-governance/rotation" element={<FounderRoute><AccessGovernanceRotation /></FounderRoute>} />
            <Route path="/founder/access-governance/audit" element={<FounderRoute><AccessGovernanceAudit /></FounderRoute>} />
            <Route path="/founder/privacy" element={<FounderRoute><PrivacyOverview /></FounderRoute>} />
            <Route path="/founder/privacy/dsar" element={<FounderRoute><PrivacyDSAR /></FounderRoute>} />
            <Route path="/founder/privacy/retention" element={<FounderRoute><PrivacyRetention /></FounderRoute>} />
            <Route path="/founder/privacy/consent" element={<FounderRoute><PrivacyConsent /></FounderRoute>} />
            <Route path="/founder/privacy/processors" element={<FounderRoute><PrivacyProcessors /></FounderRoute>} />
            <Route path="/founder/privacy/breaches" element={<FounderRoute><PrivacyBreaches /></FounderRoute>} />
            <Route path="/founder/privacy/settings" element={<FounderRoute><PrivacySettings /></FounderRoute>} />
            <Route path="/founder/incidents" element={<FounderRoute><IncidentsOverview /></FounderRoute>} />
            <Route path="/founder/incidents/live" element={<FounderRoute><IncidentsLive /></FounderRoute>} />
            <Route path="/founder/incidents/postmortems" element={<FounderRoute><IncidentsPostmortems /></FounderRoute>} />
            <Route path="/founder/incidents/continuity" element={<FounderRoute><IncidentsContinuity /></FounderRoute>} />
            <Route path="/founder/incidents/notifications" element={<FounderRoute><IncidentsNotifications /></FounderRoute>} />
            <Route path="/founder/incidents/settings" element={<FounderRoute><IncidentsSettings /></FounderRoute>} />
            <Route path="/founder/adviser-pack" element={<FounderRoute><AdviserPackOverview /></FounderRoute>} />
            <Route path="/founder/adviser-pack/monthly" element={<FounderRoute><AdviserPackMonthly /></FounderRoute>} />
            <Route path="/founder/adviser-pack/entities" element={<FounderRoute><AdviserPackEntities /></FounderRoute>} />
            <Route path="/founder/adviser-pack/revenue" element={<FounderRoute><AdviserPackRevenue /></FounderRoute>} />
            <Route path="/founder/adviser-pack/expenses" element={<FounderRoute><AdviserPackExpenses /></FounderRoute>} />
            <Route path="/founder/adviser-pack/documents" element={<FounderRoute><AdviserPackDocuments /></FounderRoute>} />
            <Route path="/founder/adviser-pack/questions" element={<FounderRoute><AdviserPackQuestions /></FounderRoute>} />
            <Route path="/founder/reports" element={<FounderRoute><ReportsOverview /></FounderRoute>} />
            <Route path="/founder/reports/weekly" element={<FounderRoute><ReportsWeekly /></FounderRoute>} />
            <Route path="/founder/reports/monthly" element={<FounderRoute><ReportsMonthly /></FounderRoute>} />
            <Route path="/founder/reports/portfolio" element={<FounderRoute><ReportsPortfolio /></FounderRoute>} />
            <Route path="/founder/reports/decisions" element={<FounderRoute><ReportsDecisions /></FounderRoute>} />
            <Route path="/founder/reports/archive" element={<FounderRoute><ReportsArchive /></FounderRoute>} />
            <Route path="/founder/product" element={<FounderRoute><ProductOverview /></FounderRoute>} />
            <Route path="/founder/product/features" element={<FounderRoute><ProductFeatures /></FounderRoute>} />
            <Route path="/founder/product/bugs" element={<FounderRoute><ProductBugs /></FounderRoute>} />
            <Route path="/founder/product/qa" element={<FounderRoute><ProductQA /></FounderRoute>} />
            <Route path="/founder/product/releases" element={<FounderRoute><ProductReleases /></FounderRoute>} />
            <Route path="/founder/product/rollback" element={<FounderRoute><ProductRollback /></FounderRoute>} />
            <Route path="/founder/product/known-issues" element={<FounderRoute><ProductKnownIssues /></FounderRoute>} />
            <Route path="/founder/data-quality" element={<FounderRoute><DataQualityOverview /></FounderRoute>} />
            <Route path="/founder/data-quality/duplicates" element={<FounderRoute><DataQualityDuplicates /></FounderRoute>} />
            <Route path="/founder/data-quality/test-data" element={<FounderRoute><DataQualityTestData /></FounderRoute>} />
            <Route path="/founder/data-quality/orphans" element={<FounderRoute><DataQualityOrphans /></FounderRoute>} />
            <Route path="/founder/data-quality/stale" element={<FounderRoute><DataQualityStale /></FounderRoute>} />
            <Route path="/founder/data-quality/revenue-integrity" element={<FounderRoute><DataQualityRevenueIntegrity /></FounderRoute>} />
            <Route path="/founder/data-quality/repair-queue" element={<FounderRoute><DataQualityRepairQueue /></FounderRoute>} />
            <Route path="/founder/knowledge-governance" element={<FounderRoute><KnowledgeOverview /></FounderRoute>} />
            <Route path="/founder/knowledge-governance/sources" element={<FounderRoute><KnowledgeSources /></FounderRoute>} />
            <Route path="/founder/knowledge-governance/conflicts" element={<FounderRoute><KnowledgeConflicts /></FounderRoute>} />
            <Route path="/founder/knowledge-governance/stale" element={<FounderRoute><KnowledgeStale /></FounderRoute>} />
            <Route path="/founder/knowledge-governance/approved-claims" element={<FounderRoute><KnowledgeApprovedClaims /></FounderRoute>} />
            <Route path="/founder/knowledge-governance/manual-sync" element={<FounderRoute><KnowledgeManualSync /></FounderRoute>} />
            <Route path="/founder/capacity" element={<FounderRoute><CapacityOverview /></FounderRoute>} />
            <Route path="/founder/capacity/business" element={<FounderRoute><CapacityBusiness /></FounderRoute>} />
            <Route path="/founder/capacity/agents" element={<FounderRoute><CapacityAgents /></FounderRoute>} />
            <Route path="/founder/capacity/humans" element={<FounderRoute><CapacityHumans /></FounderRoute>} />
            <Route path="/founder/capacity/delivery" element={<FounderRoute><CapacityDelivery /></FounderRoute>} />
            <Route path="/founder/capacity/bottlenecks" element={<FounderRoute><CapacityBottlenecks /></FounderRoute>} />
            <Route path="/founder/capacity/forecast" element={<FounderRoute><CapacityForecast /></FounderRoute>} />
            <Route path="/founder/marketplace" element={<FounderRoute><MarketplaceOverview /></FounderRoute>} />
            <Route path="/founder/marketplace/seller-recruitment" element={<FounderRoute><MarketplaceRecruitment /></FounderRoute>} />
            <Route path="/founder/marketplace/seller-prospects" element={<FounderRoute><MarketplaceProspects /></FounderRoute>} />
            <Route path="/founder/marketplace/seller-onboarding" element={<FounderRoute><MarketplaceOnboarding /></FounderRoute>} />
            <Route path="/founder/marketplace/seller-verification" element={<FounderRoute><MarketplaceVerification /></FounderRoute>} />
            <Route path="/founder/marketplace/listings" element={<FounderRoute><MarketplaceListings /></FounderRoute>} />
            <Route path="/founder/marketplace/supply-demand" element={<FounderRoute><MarketplaceSupplyDemand /></FounderRoute>} />
            <Route path="/founder/marketplace/seller-performance" element={<FounderRoute><SellerPerformanceBoard /></FounderRoute>} />
            <Route path="/founder/marketplace/active-sellers" element={<FounderRoute><MarketplacePerformance /></FounderRoute>} />
            <Route path="/founder/marketplace/settings" element={<FounderRoute><MarketplaceSettings /></FounderRoute>} />
            <Route path="/founder/marketplace/seller-accounts" element={<FounderRoute><SellerAccounts /></FounderRoute>} />
            <Route path="/founder/marketplace/seller-checklist" element={<FounderRoute><SellerChecklist /></FounderRoute>} />
            <Route path="/founder/marketplace/listing-queue" element={<FounderRoute><ListingQueue /></FounderRoute>} />
            <Route path="/founder/marketplace/payouts" element={<FounderRoute><SellerPayouts /></FounderRoute>} />
            <Route path="/founder/marketplace/terms" element={<FounderRoute><SellerTerms /></FounderRoute>} />
            <Route path="/founder/marketplace/performance-board" element={<FounderRoute><SellerPerformanceBoard /></FounderRoute>} />
            <Route path="/founder/marketplace/risk" element={<FounderRoute><SellerRisk /></FounderRoute>} />
            <Route path="/founder/marketplace/liquidity" element={<FounderRoute><MarketplaceLiquidity /></FounderRoute>} />
            <Route path="/founder/marketplace/category-balance" element={<FounderRoute><MarketplaceCategoryBalance /></FounderRoute>} />
            <Route path="/founder/marketplace/location-balance" element={<FounderRoute><MarketplaceLocationBalance /></FounderRoute>} />
            <Route path="/founder/marketplace/growth-actions" element={<FounderRoute><MarketplaceGrowthActions /></FounderRoute>} />
            <Route path="/founder/business-archetypes" element={<FounderRoute><ArchetypeOverview /></FounderRoute>} />
            <Route path="/founder/business-archetypes/classifier" element={<FounderRoute><ArchetypeClassifier /></FounderRoute>} />
            <Route path="/founder/business-archetypes/business-map" element={<FounderRoute><ArchetypeBusinessMap /></FounderRoute>} />
            <Route path="/founder/business-archetypes/recommendations" element={<FounderRoute><ArchetypeRecommendations /></FounderRoute>} />
            <Route path="/founder/business-archetypes/settings" element={<FounderRoute><ArchetypeSettings /></FounderRoute>} />
            <Route path="/founder/business-templates" element={<FounderRoute><BTOverview /></FounderRoute>} />
            <Route path="/founder/business-templates/library" element={<FounderRoute><BTLibrary /></FounderRoute>} />
            <Route path="/founder/business-templates/apply" element={<FounderRoute><BTApply /></FounderRoute>} />
            <Route path="/founder/business-templates/business-setup" element={<FounderRoute><BTBusinessSetup /></FounderRoute>} />
            <Route path="/founder/business-templates/settings" element={<FounderRoute><BTSettings /></FounderRoute>} />
            <Route path="/founder/entity-map" element={<FounderRoute><EMOverview /></FounderRoute>} />
            <Route path="/founder/entity-map/entities" element={<FounderRoute><EMEntities /></FounderRoute>} />
            <Route path="/founder/entity-map/businesses" element={<FounderRoute><EMBusinesses /></FounderRoute>} />
            <Route path="/founder/entity-map/revenue-routing" element={<FounderRoute><EMRevenueRouting /></FounderRoute>} />
            <Route path="/founder/entity-map/adviser-questions" element={<FounderRoute><EMAdviserQuestions /></FounderRoute>} />
            <Route path="/founder/entity-map/settings" element={<FounderRoute><EMSettings /></FounderRoute>} />
            <Route path="/founder/launch-factory" element={<FounderRoute><LFOverview /></FounderRoute>} />
            <Route path="/founder/launch-factory/brand" element={<FounderRoute><LFBrand /></FounderRoute>} />
            <Route path="/founder/launch-factory/domains" element={<FounderRoute><LFDomains /></FounderRoute>} />
            <Route path="/founder/launch-factory/email" element={<FounderRoute><LFEmail /></FounderRoute>} />
            <Route path="/founder/launch-factory/socials" element={<FounderRoute><LFSocials /></FounderRoute>} />
            <Route path="/founder/launch-factory/legal-pages" element={<FounderRoute><LFLegalPages /></FounderRoute>} />
            <Route path="/founder/launch-factory/tracking" element={<FounderRoute><LFTracking /></FounderRoute>} />
            <Route path="/founder/launch-factory/checklist" element={<FounderRoute><LFChecklist /></FounderRoute>} />
            <Route path="/founder/launch-factory/vertical-launch-cannon" element={<FounderRoute><QPMVerticalLaunch /></FounderRoute>} />
            <Route path="/founder/integration-map" element={<FounderRoute><IMOverview /></FounderRoute>} />
            <Route path="/founder/integration-map/businesses" element={<FounderRoute><IMBusinesses /></FounderRoute>} />
            <Route path="/founder/integration-map/providers" element={<FounderRoute><IMProviders /></FounderRoute>} />
            <Route path="/founder/integration-map/missing" element={<FounderRoute><IMMissing /></FounderRoute>} />
            <Route path="/founder/integration-map/risks" element={<FounderRoute><IMRisks /></FounderRoute>} />
            <Route path="/founder/integration-map/settings" element={<FounderRoute><IMSettings /></FounderRoute>} />
            <Route path="/founder/business-compliance" element={<FounderRoute><BCOverview /></FounderRoute>} />
            <Route path="/founder/business-compliance/businesses" element={<FounderRoute><BCBusinesses /></FounderRoute>} />
            <Route path="/founder/business-compliance/rules" element={<FounderRoute><BCRules /></FounderRoute>} />
            <Route path="/founder/business-compliance/claims" element={<FounderRoute><BCClaims /></FounderRoute>} />
            <Route path="/founder/business-compliance/channels" element={<FounderRoute><BCChannels /></FounderRoute>} />
            <Route path="/founder/business-compliance/approval-triggers" element={<FounderRoute><BCApprovalTriggers /></FounderRoute>} />

            {/* AI Compliance Control Layer */}
            <Route path="/founder/ai-compliance" element={<FounderRoute><AICOverview /></FounderRoute>} />
            <Route path="/founder/ai-compliance/systems" element={<FounderRoute><AICSystems /></FounderRoute>} />
            <Route path="/founder/ai-compliance/data-flows" element={<FounderRoute><AICDataFlows /></FounderRoute>} />
            <Route path="/founder/ai-compliance/oversight" element={<FounderRoute><AICOversight /></FounderRoute>} />
            <Route path="/founder/ai-compliance/evidence" element={<FounderRoute><AICEvidence /></FounderRoute>} />
            <Route path="/founder/ai-compliance/risk" element={<FounderRoute><AICRisk /></FounderRoute>} />
            <Route path="/founder/ai-compliance/gaps" element={<FounderRoute><AICGaps /></FounderRoute>} />
            {/* Canonical: Multi-Business Context Fabric */}
            <Route path="/founder/context-fabric" element={<FounderRoute><CGOverview /></FounderRoute>} />
            <Route path="/founder/context-fabric/events" element={<FounderRoute><CGEvents /></FounderRoute>} />
            <Route path="/founder/context-fabric/missing-business" element={<FounderRoute><CGMissing /></FounderRoute>} />
            <Route path="/founder/context-fabric/cross-contamination" element={<FounderRoute><CGCross /></FounderRoute>} />
            <Route path="/founder/context-fabric/settings" element={<FounderRoute><CGSettings /></FounderRoute>} />
            <Route path="/founder/runtime-mode" element={<FounderRoute><RuntimeModeOverview /></FounderRoute>} />
            <Route path="/founder/approvals-ops" element={<FounderRoute><ApprovalsOpsOverview /></FounderRoute>} />
            <Route path="/founder/system-health" element={<FounderRoute><SystemHealthOverview /></FounderRoute>} />
            <Route path="/founder/cross-contamination" element={<FounderRoute><CrossContaminationOverview /></FounderRoute>} />
            <Route path="/founder/recovery" element={<FounderRoute><RecoveryOverview /></FounderRoute>} />
            <Route path="/founder/business-activation" element={<FounderRoute><BusinessActivationOverview /></FounderRoute>} />
            <Route path="/founder/monday-readiness" element={<FounderRoute><MondayReadinessOverview /></FounderRoute>} />
            <Route path="/founder/monday-launch" element={<FounderRoute><MondayLaunchOverview /></FounderRoute>} />
            {/* Backward-compat aliases — old Context Guard URLs redirect to canonical Context Fabric */}
            <Route path="/founder/context-guard" element={<Navigate to="/founder/context-fabric" replace />} />
            <Route path="/founder/context-guard/events" element={<Navigate to="/founder/context-fabric/events" replace />} />
            <Route path="/founder/context-guard/missing-business" element={<Navigate to="/founder/context-fabric/missing-business" replace />} />
            <Route path="/founder/context-guard/cross-contamination" element={<Navigate to="/founder/context-fabric/cross-contamination" replace />} />
            <Route path="/founder/context-guard/settings" element={<Navigate to="/founder/context-fabric/settings" replace />} />
            <Route path="/founder/portfolio-prioritisation" element={<FounderRoute><PPOverview /></FounderRoute>} />
            <Route path="/founder/portfolio-prioritisation/scores" element={<FounderRoute><PPScores /></FounderRoute>} />
            <Route path="/founder/portfolio-prioritisation/build-now" element={<FounderRoute><PPBuildNow /></FounderRoute>} />
            <Route path="/founder/portfolio-prioritisation/scale" element={<FounderRoute><PPScale /></FounderRoute>} />
            <Route path="/founder/portfolio-prioritisation/park" element={<FounderRoute><PPPark /></FounderRoute>} />
            <Route path="/founder/portfolio-prioritisation/decisions" element={<FounderRoute><PPDecisions /></FounderRoute>} />
            <Route path="/founder/resource-allocation" element={<FounderRoute><RAOverview /></FounderRoute>} />
            <Route path="/founder/resource-allocation/ai-budget" element={<FounderRoute><RAAIBudget /></FounderRoute>} />
            <Route path="/founder/resource-allocation/human-time" element={<FounderRoute><RAHumanTime /></FounderRoute>} />
            <Route path="/founder/resource-allocation/founder-attention" element={<FounderRoute><RAFounderAttention /></FounderRoute>} />
            <Route path="/founder/resource-allocation/cash" element={<FounderRoute><RACash /></FounderRoute>} />
            <Route path="/founder/resource-allocation/recommendations" element={<FounderRoute><RARecommendations /></FounderRoute>} />
            <Route path="/founder/portfolio-risk" element={<FounderRoute><PROverview /></FounderRoute>} />
            <Route path="/founder/portfolio-risk/matrix" element={<FounderRoute><PRMatrix /></FounderRoute>} />
            <Route path="/founder/portfolio-risk/businesses" element={<FounderRoute><PRBusinesses /></FounderRoute>} />
            <Route path="/founder/portfolio-risk/critical" element={<FounderRoute><PRCritical /></FounderRoute>} />
            <Route path="/founder/portfolio-risk/actions" element={<FounderRoute><PRActions /></FounderRoute>} />
            <Route path="/founder/business-lifecycle" element={<FounderRoute><BLOverview /></FounderRoute>} />
            <Route path="/founder/business-lifecycle/stages" element={<FounderRoute><BLStages /></FounderRoute>} />
            <Route path="/founder/business-lifecycle/businesses" element={<FounderRoute><BLBusinesses /></FounderRoute>} />
            <Route path="/founder/business-lifecycle/transitions" element={<FounderRoute><BLTransitions /></FounderRoute>} />
            <Route path="/founder/business-lifecycle/settings" element={<FounderRoute><BLSettings /></FounderRoute>} />
            <Route path="/founder/product-catalogue" element={<FounderRoute><PCOverview /></FounderRoute>} />
            <Route path="/founder/product-catalogue/products" element={<FounderRoute><PCProducts /></FounderRoute>} />
            <Route path="/founder/product-catalogue/packages" element={<FounderRoute><PCPackages /></FounderRoute>} />
            <Route path="/founder/product-catalogue/add-ons" element={<FounderRoute><PCAddOns /></FounderRoute>} />
            <Route path="/founder/product-catalogue/offers" element={<FounderRoute><PCOffers /></FounderRoute>} />
            <Route path="/founder/product-catalogue/pricing" element={<FounderRoute><PCPricing /></FounderRoute>} />
            <Route path="/founder/product-catalogue/claims" element={<FounderRoute><PCClaims /></FounderRoute>} />
            <Route path="/founder/pricing-margin" element={<FounderRoute><PMOverview /></FounderRoute>} />
            <Route path="/founder/pricing-margin/products" element={<FounderRoute><PMProducts /></FounderRoute>} />
            <Route path="/founder/pricing-margin/businesses" element={<FounderRoute><PMBusinesses /></FounderRoute>} />
            <Route path="/founder/pricing-margin/discounts" element={<FounderRoute><PMDiscounts /></FounderRoute>} />
            <Route path="/founder/pricing-margin/breakeven" element={<FounderRoute><PMBreakeven /></FounderRoute>} />
            <Route path="/founder/pricing-margin/recommendations" element={<FounderRoute><PMRecommendations /></FounderRoute>} />
            <Route path="/founder/channel-strategy" element={<FounderRoute><CSOverview /></FounderRoute>} />
            <Route path="/founder/channel-strategy/businesses" element={<FounderRoute><CSBusinesses /></FounderRoute>} />
            <Route path="/founder/channel-strategy/channels" element={<FounderRoute><CSChannels /></FounderRoute>} />
            <Route path="/founder/channel-strategy/campaigns" element={<FounderRoute><CSCampaigns /></FounderRoute>} />
            <Route path="/founder/channel-strategy/recommendations" element={<FounderRoute><CSRecommendations /></FounderRoute>} />
            <Route path="/founder/analytics-attribution" element={<FounderRoute><AAOverview /></FounderRoute>} />
            <Route path="/founder/analytics-attribution/sources" element={<FounderRoute><AASources /></FounderRoute>} />
            <Route path="/founder/analytics-attribution/campaigns" element={<FounderRoute><AACampaigns /></FounderRoute>} />
            <Route path="/founder/analytics-attribution/revenue" element={<FounderRoute><AARevenue /></FounderRoute>} />
            <Route path="/founder/analytics-attribution/funnel" element={<FounderRoute><AAFunnel /></FounderRoute>} />
            <Route path="/founder/analytics-attribution/settings" element={<FounderRoute><AASettings /></FounderRoute>} />
            <Route path="/founder/partners" element={<FounderRoute><PAOverview /></FounderRoute>} />
            <Route path="/founder/partners/prospects" element={<FounderRoute><PAProspects /></FounderRoute>} />
            <Route path="/founder/partners/referrals" element={<FounderRoute><PAReferrals /></FounderRoute>} />
            <Route path="/founder/partners/affiliates" element={<FounderRoute><PAAffiliates /></FounderRoute>} />
            <Route path="/founder/partners/commissions" element={<FounderRoute><PACommissions /></FounderRoute>} />
            <Route path="/founder/partners/performance" element={<FounderRoute><PAPerformance /></FounderRoute>} />
            <Route path="/founder/ip-assets" element={<FounderRoute><IPOverview /></FounderRoute>} />
            <Route path="/founder/ip-assets/catalogue" element={<FounderRoute><IPCatalogue /></FounderRoute>} />
            <Route path="/founder/ip-assets/rights" element={<FounderRoute><IPRights /></FounderRoute>} />
            <Route path="/founder/ip-assets/licensing" element={<FounderRoute><IPLicensing /></FounderRoute>} />
            <Route path="/founder/ip-assets/distribution" element={<FounderRoute><IPDistribution /></FounderRoute>} />
            <Route path="/founder/ip-assets/risks" element={<FounderRoute><IPRisks /></FounderRoute>} />
            <Route path="/founder/insurance-liability" element={<FounderRoute><InsuranceOverview /></FounderRoute>} />
            <Route path="/founder/insurance-liability/businesses" element={<FounderRoute><InsuranceBusinesses /></FounderRoute>} />
            <Route path="/founder/insurance-liability/policies" element={<FounderRoute><InsurancePolicies /></FounderRoute>} />
            <Route path="/founder/insurance-liability/gaps" element={<FounderRoute><InsuranceGaps /></FounderRoute>} />
            <Route path="/founder/insurance-liability/claims" element={<FounderRoute><InsuranceClaims /></FounderRoute>} />
            <Route path="/founder/exit-metrics" element={<FounderRoute><ExitOverview /></FounderRoute>} />
            <Route path="/founder/exit-metrics/businesses" element={<FounderRoute><ExitBusinesses /></FounderRoute>} />
            <Route path="/founder/exit-metrics/archetypes" element={<FounderRoute><ExitArchetypes /></FounderRoute>} />
            <Route path="/founder/exit-metrics/readiness" element={<FounderRoute><ExitReadiness /></FounderRoute>} />
            <Route path="/founder/exit-metrics/buyer-fit" element={<FounderRoute><ExitBuyerFit /></FounderRoute>} />
            <Route path="/founder/exit-metrics/data-room" element={<FounderRoute><ExitDataRoom /></FounderRoute>} />
            <Route path="/founder/portfolio-exit-targets" element={<FounderRoute><PETDashboard /></FounderRoute>} />
            <Route path="/founder/portfolio-exit-targets/businesses" element={<FounderRoute><PETBusinesses /></FounderRoute>} />
            <Route path="/founder/portfolio-exit-targets/alerts" element={<FounderRoute><PETAlerts /></FounderRoute>} />
            <Route path="/founder/portfolio-exit-targets/settings" element={<FounderRoute><PETSettings /></FounderRoute>} />
            <Route path="/founder/portfolio-exit-targets/:id" element={<FounderRoute><PETDetail /></FounderRoute>} />
            <Route path="/founder/distressed-radar" element={<FounderRoute><DROverview /></FounderRoute>} />
            <Route path="/founder/distressed-radar/acquisition" element={<FounderRoute><DRAcquisition /></FounderRoute>} />
            <Route path="/founder/distressed-radar/acquisition/:id" element={<FounderRoute><DRAcquisitionDetail /></FounderRoute>} />
            <Route path="/founder/distressed-radar/disposal" element={<FounderRoute><DRDisposal /></FounderRoute>} />
            <Route path="/founder/distressed-radar/financing" element={<FounderRoute><DRFinancing /></FounderRoute>} />
            <Route path="/founder/distressed-radar/sources" element={<FounderRoute><DRSources /></FounderRoute>} />
            <Route path="/founder/acquisition-funding" element={<FounderRoute><AFOverview /></FounderRoute>} />
            <Route path="/founder/acquisition-funding/opportunities" element={<FounderRoute><AFOpportunities /></FounderRoute>} />
            <Route path="/founder/acquisition-funding/opportunities/:id" element={<FounderRoute><AFOpportunityDetail /></FounderRoute>} />
            <Route path="/founder/acquisition-funding/funders" element={<FounderRoute><AFFunders /></FounderRoute>} />
            <Route path="/founder/acquisition-funding/deals" element={<FounderRoute><AFDeals /></FounderRoute>} />
            <Route path="/founder/acquisition-funding/pitches" element={<FounderRoute><AFPitches /></FounderRoute>} />
            <Route path="/founder/portfolio-diversity" element={<FounderRoute><PortfolioDiversityOverview /></FounderRoute>} />
            <Route path="/founder/work-queue" element={<FounderRoute><WorkQueueOverview /></FounderRoute>} />
            <Route path="/founder/work-queue/today" element={<FounderRoute><WorkQueueToday /></FounderRoute>} />
            <Route path="/founder/work-queue/by-business" element={<FounderRoute><WorkQueueByBusiness /></FounderRoute>} />
            <Route path="/founder/work-queue/by-agent" element={<FounderRoute><WorkQueueByAgent /></FounderRoute>} />
            <Route path="/founder/work-queue/approvals" element={<FounderRoute><WorkQueueApprovals /></FounderRoute>} />
            <Route path="/founder/work-queue/blocked" element={<FounderRoute><WorkQueueBlocked /></FounderRoute>} />
            <Route path="/founder/work-queue/high-value" element={<FounderRoute><WorkQueueHighValue /></FounderRoute>} />
            <Route path="/founder/work-queue/overdue" element={<FounderRoute><WorkQueueOverdue /></FounderRoute>} />
            <Route path="/founder/work-queue/settings" element={<FounderRoute><WorkQueueSettings /></FounderRoute>} />
            <Route path="/founder/notifications" element={<FounderRoute><NotificationsOverview /></FounderRoute>} />
            <Route path="/founder/notifications/inbox" element={<FounderRoute><NotificationsInbox /></FounderRoute>} />
            <Route path="/founder/notifications/urgent" element={<FounderRoute><NotificationsUrgent /></FounderRoute>} />
            <Route path="/founder/notifications/escalations" element={<FounderRoute><NotificationsEscalations /></FounderRoute>} />
            <Route path="/founder/notifications/rules" element={<FounderRoute><NotificationsRules /></FounderRoute>} />
            <Route path="/founder/notifications/archive" element={<FounderRoute><NotificationsArchive /></FounderRoute>} />
            <Route path="/founder/notifications/settings" element={<FounderRoute><NotificationsSettings /></FounderRoute>} />
            <Route path="/founder/roles" element={<FounderRoute><RolesOverview /></FounderRoute>} />
            <Route path="/founder/roles/users" element={<FounderRoute><RolesUsers /></FounderRoute>} />
            <Route path="/founder/roles/permissions" element={<FounderRoute><RolesPermissions /></FounderRoute>} />
            <Route path="/founder/roles/delegation" element={<FounderRoute><RolesDelegation /></FounderRoute>} />
            <Route path="/founder/roles/access-requests" element={<FounderRoute><RolesAccessRequests /></FounderRoute>} />
            <Route path="/founder/roles/audit" element={<FounderRoute><RolesAudit /></FounderRoute>} />
            <Route path="/founder/roles/settings" element={<FounderRoute><RolesSettings /></FounderRoute>} />
            <Route path="/founder/reporting-truth" element={<FounderRoute><ReportingTruthOverview /></FounderRoute>} />
            <Route path="/founder/reporting-truth/kpi-dictionary" element={<FounderRoute><ReportingTruthKpiDictionary /></FounderRoute>} />
            <Route path="/founder/reporting-truth/definitions" element={<FounderRoute><ReportingTruthDefinitions /></FounderRoute>} />
            <Route path="/founder/reporting-truth/reconciliation" element={<FounderRoute><ReportingTruthReconciliation /></FounderRoute>} />
            <Route path="/founder/reporting-truth/conflicts" element={<FounderRoute><ReportingTruthConflicts /></FounderRoute>} />
            <Route path="/founder/reporting-truth/settings" element={<FounderRoute><ReportingTruthSettings /></FounderRoute>} />
            <Route path="/founder/reconciliation" element={<FounderRoute><ReconciliationOverview /></FounderRoute>} />
            <Route path="/founder/reconciliation/payments" element={<FounderRoute><ReconciliationPayments /></FounderRoute>} />
            <Route path="/founder/reconciliation/invoices" element={<FounderRoute><ReconciliationInvoices /></FounderRoute>} />
            <Route path="/founder/reconciliation/bank" element={<FounderRoute><ReconciliationBank /></FounderRoute>} />
            <Route path="/founder/reconciliation/payouts" element={<FounderRoute><ReconciliationPayouts /></FounderRoute>} />
            <Route path="/founder/reconciliation/refunds" element={<FounderRoute><ReconciliationRefunds /></FounderRoute>} />
            <Route path="/founder/reconciliation/unmatched" element={<FounderRoute><ReconciliationUnmatched /></FounderRoute>} />
            <Route path="/founder/reconciliation/settings" element={<FounderRoute><ReconciliationSettings /></FounderRoute>} />
            <Route path="/founder/jurisdiction-tax" element={<FounderRoute><JTOverview /></FounderRoute>} />
            <Route path="/founder/jurisdiction-tax/currencies" element={<FounderRoute><JTCurrencies /></FounderRoute>} />
            <Route path="/founder/jurisdiction-tax/revenue" element={<FounderRoute><JTRevenue /></FounderRoute>} />
            <Route path="/founder/jurisdiction-tax/customers" element={<FounderRoute><JTCustomers /></FounderRoute>} />
            <Route path="/founder/jurisdiction-tax/sellers" element={<FounderRoute><JTSellers /></FounderRoute>} />
            <Route path="/founder/jurisdiction-tax/adviser-review" element={<FounderRoute><JTAdviserReview /></FounderRoute>} />
            <Route path="/founder/jurisdiction-tax/settings" element={<FounderRoute><JTSettings /></FounderRoute>} />
            <Route path="/founder/ecommerce" element={<FounderRoute><EcommerceOverview /></FounderRoute>} />
            <Route path="/founder/ecommerce/products" element={<FounderRoute><EcommerceProducts /></FounderRoute>} />
            <Route path="/founder/ecommerce/inventory" element={<FounderRoute><EcommerceInventory /></FounderRoute>} />
            <Route path="/founder/ecommerce/orders" element={<FounderRoute><EcommerceOrders /></FounderRoute>} />
            <Route path="/founder/ecommerce/fulfilment" element={<FounderRoute><EcommerceFulfilment /></FounderRoute>} />
            <Route path="/founder/ecommerce/returns" element={<FounderRoute><EcommerceReturns /></FounderRoute>} />
            <Route path="/founder/ecommerce/suppliers" element={<FounderRoute><EcommerceSuppliers /></FounderRoute>} />
            <Route path="/founder/ecommerce/settings" element={<FounderRoute><EcommerceSettings /></FounderRoute>} />
            <Route path="/founder/scheduling" element={<FounderRoute><SchedulingOverview /></FounderRoute>} />
            <Route path="/founder/scheduling/availability" element={<FounderRoute><SchedulingAvailability /></FounderRoute>} />
            <Route path="/founder/scheduling/bookings" element={<FounderRoute><SchedulingBookings /></FounderRoute>} />
            <Route path="/founder/scheduling/resources" element={<FounderRoute><SchedulingResources /></FounderRoute>} />
            <Route path="/founder/scheduling/no-shows" element={<FounderRoute><SchedulingNoShows /></FounderRoute>} />
            <Route path="/founder/scheduling/settings" element={<FounderRoute><SchedulingSettings /></FounderRoute>} />
            <Route path="/founder/documents" element={<FounderRoute><DocumentsOverview /></FounderRoute>} />
            <Route path="/founder/documents/vault" element={<FounderRoute><DocumentsVault /></FounderRoute>} />
            <Route path="/founder/documents/evidence" element={<FounderRoute><DocumentsEvidence /></FounderRoute>} />
            <Route path="/founder/documents/data-room" element={<FounderRoute><DocumentsDataRoom /></FounderRoute>} />
            <Route path="/founder/documents/policies" element={<FounderRoute><DocumentsPolicies /></FounderRoute>} />
            <Route path="/founder/documents/requests" element={<FounderRoute><DocumentsRequests /></FounderRoute>} />
            <Route path="/founder/documents/access" element={<FounderRoute><DocumentsAccess /></FounderRoute>} />
            <Route path="/founder/sops" element={<FounderRoute><SopsOverview /></FounderRoute>} />
            <Route path="/founder/sops/library" element={<FounderRoute><SopsLibrary /></FounderRoute>} />
            <Route path="/founder/sops/versions" element={<FounderRoute><SopsVersions /></FounderRoute>} />
            <Route path="/founder/sops/reviews" element={<FounderRoute><SopsReviews /></FounderRoute>} />
            <Route path="/founder/sops/agent-usage" element={<FounderRoute><SopsAgentUsage /></FounderRoute>} />
            <Route path="/founder/sops/conflicts" element={<FounderRoute><SopsConflicts /></FounderRoute>} />
            <Route path="/founder/sops/settings" element={<FounderRoute><SopsSettings /></FounderRoute>} />
            <Route path="/founder/backup-recovery" element={<FounderRoute><BROverview /></FounderRoute>} />
            <Route path="/founder/backup-recovery/status" element={<FounderRoute><BRStatus /></FounderRoute>} />
            <Route path="/founder/backup-recovery/exports" element={<FounderRoute><BRExports /></FounderRoute>} />
            <Route path="/founder/backup-recovery/restore" element={<FounderRoute><BRRestore /></FounderRoute>} />
            <Route path="/founder/backup-recovery/emergency-pack" element={<FounderRoute><BREmergencyPack /></FounderRoute>} />
            <Route path="/founder/backup-recovery/settings" element={<FounderRoute><BRSettings /></FounderRoute>} />
            <Route path="/founder/ai-evals" element={<FounderRoute><EvalsOverview /></FounderRoute>} />
            <Route path="/founder/ai-evals/test-suites" element={<FounderRoute><EvalsTestSuites /></FounderRoute>} />
            <Route path="/founder/ai-evals/results" element={<FounderRoute><EvalsResults /></FounderRoute>} />
            <Route path="/founder/ai-evals/agents" element={<FounderRoute><EvalsAgents /></FounderRoute>} />
            <Route path="/founder/ai-evals/regression" element={<FounderRoute><EvalsRegression /></FounderRoute>} />
            <Route path="/founder/ai-evals/safety" element={<FounderRoute><EvalsSafety /></FounderRoute>} />
            <Route path="/founder/ai-evals/settings" element={<FounderRoute><EvalsSettings /></FounderRoute>} />
            <Route path="/founder/decisions" element={<FounderRoute><DecisionsOverview /></FounderRoute>} />
            <Route path="/founder/decisions/open" element={<FounderRoute><DecisionsOpen /></FounderRoute>} />
            <Route path="/founder/decisions/made" element={<FounderRoute><DecisionsMade /></FounderRoute>} />
            <Route path="/founder/decisions/implemented" element={<FounderRoute><DecisionsImplemented /></FounderRoute>} />
            <Route path="/founder/decisions/review" element={<FounderRoute><DecisionsReview /></FounderRoute>} />
            <Route path="/founder/decisions/settings" element={<FounderRoute><DecisionsSettings /></FounderRoute>} />
            <Route path="/founder/portfolio-memory" element={<FounderRoute><PortMemOverview /></FounderRoute>} />
            <Route path="/founder/portfolio-memory/businesses" element={<FounderRoute><PortMemBusinesses /></FounderRoute>} />
            <Route path="/founder/portfolio-memory/handover-packs" element={<FounderRoute><PortMemPacks /></FounderRoute>} />
            <Route path="/founder/portfolio-memory/operator-briefs" element={<FounderRoute><PortMemOperator /></FounderRoute>} />
            <Route path="/founder/portfolio-memory/adviser-briefs" element={<FounderRoute><PortMemAdviser /></FounderRoute>} />
            <Route path="/founder/portfolio-memory/buyer-briefs" element={<FounderRoute><PortMemBuyer /></FounderRoute>} />
            <Route path="/founder/portfolio-memory/history" element={<FounderRoute><PortMemHistory /></FounderRoute>} />
            <Route path="/founder/scheduled-jobs" element={<FounderRoute><SJOverview /></FounderRoute>} />
            <Route path="/founder/scheduled-jobs/jobs" element={<FounderRoute><SJJobs /></FounderRoute>} />
            <Route path="/founder/scheduled-jobs/runs" element={<FounderRoute><SJRuns /></FounderRoute>} />
            <Route path="/founder/scheduled-jobs/failures" element={<FounderRoute><SJFailures /></FounderRoute>} />
            <Route path="/founder/scheduled-jobs/calendar" element={<FounderRoute><SJCalendar /></FounderRoute>} />
            <Route path="/founder/scheduled-jobs/settings" element={<FounderRoute><SJSettings /></FounderRoute>} />
            <Route path="/founder/system-config" element={<FounderRoute><SCOverview /></FounderRoute>} />
            <Route path="/founder/system-config/feature-flags" element={<FounderRoute><SCFeatureFlags /></FounderRoute>} />
            <Route path="/founder/system-config/modules" element={<FounderRoute><SCModules /></FounderRoute>} />
            <Route path="/founder/system-config/external-actions" element={<FounderRoute><SCExternalActions /></FounderRoute>} />
            <Route path="/founder/system-config/business-overrides" element={<FounderRoute><SCBusinessOverrides /></FounderRoute>} />
            <Route path="/founder/system-config/audit" element={<FounderRoute><SCAudit /></FounderRoute>} />
            <Route path="/founder/connectors" element={<FounderRoute><ConnectorsOverview /></FounderRoute>} />
            <Route path="/founder/connectors/registry" element={<FounderRoute><ConnectorsRegistry /></FounderRoute>} />
            <Route path="/founder/connectors/health" element={<FounderRoute><ConnectorsHealth /></FounderRoute>} />
            <Route path="/founder/connectors/webhooks" element={<FounderRoute><ConnectorsWebhooks /></FounderRoute>} />
            <Route path="/founder/connectors/secrets" element={<FounderRoute><ConnectorsSecrets /></FounderRoute>} />
            <Route path="/founder/connectors/business-map" element={<FounderRoute><ConnectorsBusinessMap /></FounderRoute>} />
            <Route path="/founder/connectors/settings" element={<FounderRoute><ConnectorsSettings /></FounderRoute>} />
            <Route path="/founder/webhooks" element={<FounderRoute><WebhooksOverview /></FounderRoute>} />
            <Route path="/founder/webhooks/inbox" element={<FounderRoute><WebhooksInbox /></FounderRoute>} />
            <Route path="/founder/webhooks/providers" element={<FounderRoute><WebhooksProviders /></FounderRoute>} />
            <Route path="/founder/webhooks/normalised-events" element={<FounderRoute><WebhooksNormalised /></FounderRoute>} />
            <Route path="/founder/webhooks/failures" element={<FounderRoute><WebhooksFailures /></FounderRoute>} />
            <Route path="/founder/webhooks/settings" element={<FounderRoute><WebhooksSettings /></FounderRoute>} />
            <Route path="/founder/audit-ledger" element={<FounderRoute><AuditOverview /></FounderRoute>} />
            <Route path="/founder/audit-ledger/events" element={<FounderRoute><AuditEvents /></FounderRoute>} />
            <Route path="/founder/audit-ledger/by-business" element={<FounderRoute><AuditByBusiness /></FounderRoute>} />
            <Route path="/founder/audit-ledger/by-user" element={<FounderRoute><AuditByUser /></FounderRoute>} />
            <Route path="/founder/audit-ledger/by-module" element={<FounderRoute><AuditByModule /></FounderRoute>} />
            <Route path="/founder/audit-ledger/sensitive" element={<FounderRoute><AuditSensitive /></FounderRoute>} />
            <Route path="/founder/audit-ledger/settings" element={<FounderRoute><AuditSettings /></FounderRoute>} />
            <Route path="/founder/imports" element={<FounderRoute><ImportOverview /></FounderRoute>} />
            <Route path="/founder/imports/upload" element={<FounderRoute><ImportUpload /></FounderRoute>} />
            <Route path="/founder/imports/mapping" element={<FounderRoute><ImportMapping /></FounderRoute>} />
            <Route path="/founder/imports/preview" element={<FounderRoute><ImportPreview /></FounderRoute>} />
            <Route path="/founder/imports/history" element={<FounderRoute><ImportHistory /></FounderRoute>} />
            <Route path="/founder/imports/rollback" element={<FounderRoute><ImportRollback /></FounderRoute>} />
            <Route path="/founder/imports/settings" element={<FounderRoute><ImportSettings /></FounderRoute>} />
            <Route path="/founder/identity-resolution" element={<FounderRoute><IdentityOverview /></FounderRoute>} />
            <Route path="/founder/identity-resolution/people" element={<FounderRoute><IdentityPeople /></FounderRoute>} />
            <Route path="/founder/identity-resolution/duplicates" element={<FounderRoute><IdentityDuplicates /></FounderRoute>} />
            <Route path="/founder/identity-resolution/roles" element={<FounderRoute><IdentityRoles /></FounderRoute>} />
            <Route path="/founder/identity-resolution/merge-queue" element={<FounderRoute><IdentityMergeQueue /></FounderRoute>} />
            <Route path="/founder/identity-resolution/do-not-contact" element={<FounderRoute><IdentityDoNotContact /></FounderRoute>} />
            <Route path="/founder/identity-resolution/settings" element={<FounderRoute><IdentitySettings /></FounderRoute>} />
            <Route path="/founder/communications" element={<FounderRoute><CommsOverview /></FounderRoute>} />
            <Route path="/founder/communications/ledger" element={<FounderRoute><CommsLedger /></FounderRoute>} />
            <Route path="/founder/communications/by-contact" element={<FounderRoute><CommsByContact /></FounderRoute>} />
            <Route path="/founder/communications/by-business" element={<FounderRoute><CommsByBusiness /></FounderRoute>} />
            <Route path="/founder/communications/drafts" element={<FounderRoute><CommsDrafts /></FounderRoute>} />
            <Route path="/founder/communications/received" element={<FounderRoute><CommsReceived /></FounderRoute>} />
            <Route path="/founder/communications/settings" element={<FounderRoute><CommsSettings /></FounderRoute>} />
            <Route path="/founder/relationship-health" element={<FounderRoute><RhOverview /></FounderRoute>} />
            <Route path="/founder/relationship-health/customers" element={<FounderRoute><RhCustomers /></FounderRoute>} />
            <Route path="/founder/relationship-health/sellers" element={<FounderRoute><RhSellers /></FounderRoute>} />
            <Route path="/founder/relationship-health/partners" element={<FounderRoute><RhPartners /></FounderRoute>} />
            <Route path="/founder/relationship-health/risks" element={<FounderRoute><RhRisks /></FounderRoute>} />
            <Route path="/founder/relationship-health/opportunities" element={<FounderRoute><RhOpportunities /></FounderRoute>} />
            <Route path="/founder/trust-safety" element={<FounderRoute><TsOverview /></FounderRoute>} />
            <Route path="/founder/trust-safety/risk-events" element={<FounderRoute><TsRiskEvents /></FounderRoute>} />
            <Route path="/founder/trust-safety/accounts" element={<FounderRoute><TsAccounts /></FounderRoute>} />
            <Route path="/founder/trust-safety/payments" element={<FounderRoute><TsPayments /></FounderRoute>} />
            <Route path="/founder/trust-safety/messages" element={<FounderRoute><TsMessages /></FounderRoute>} />
            <Route path="/founder/trust-safety/actions" element={<FounderRoute><TsActions /></FounderRoute>} />
            <Route path="/founder/trust-safety/settings" element={<FounderRoute><TsSettings /></FounderRoute>} />
            <Route path="/founder/internal-sla" element={<FounderRoute><SlaOverview /></FounderRoute>} />
            <Route path="/founder/internal-sla/handoffs" element={<FounderRoute><SlaHandoffs /></FounderRoute>} />
            <Route path="/founder/internal-sla/overdue" element={<FounderRoute><SlaOverdue /></FounderRoute>} />
            <Route path="/founder/internal-sla/by-agent" element={<FounderRoute><SlaByAgent /></FounderRoute>} />
            <Route path="/founder/internal-sla/by-human" element={<FounderRoute><SlaByHuman /></FounderRoute>} />
            <Route path="/founder/internal-sla/settings" element={<FounderRoute><SlaSettings /></FounderRoute>} />
            <Route path="/founder/deployment" element={<FounderRoute><DepOverview /></FounderRoute>} />
            <Route path="/founder/deployment/environments" element={<FounderRoute><DepEnvironments /></FounderRoute>} />
            <Route path="/founder/deployment/releases" element={<FounderRoute><DepReleases /></FounderRoute>} />
            <Route path="/founder/deployment/migrations" element={<FounderRoute><DepMigrations /></FounderRoute>} />
            <Route path="/founder/deployment/edge-functions" element={<FounderRoute><DepEdgeFunctions /></FounderRoute>} />
            <Route path="/founder/deployment/env-vars" element={<FounderRoute><DepEnvVars /></FounderRoute>} />
            <Route path="/founder/deployment/rollback" element={<FounderRoute><DepRollback /></FounderRoute>} />
            <Route path="/founder/deployment/settings" element={<FounderRoute><DepSettings /></FounderRoute>} />
            <Route path="/founder/collections" element={<FounderRoute><CollectionsOverview /></FounderRoute>} />
            <Route path="/founder/collections/overdue" element={<FounderRoute><CollectionsOverdue /></FounderRoute>} />
            <Route path="/founder/collections/failed-payments" element={<FounderRoute><CollectionsFailedPayments /></FounderRoute>} />
            <Route path="/founder/collections/reminders" element={<FounderRoute><CollectionsReminders /></FounderRoute>} />
            <Route path="/founder/collections/payment-plans" element={<FounderRoute><CollectionsPaymentPlans /></FounderRoute>} />
            <Route path="/founder/collections/service-holds" element={<FounderRoute><CollectionsServiceHolds /></FounderRoute>} />
            <Route path="/founder/collections/settings" element={<FounderRoute><CollectionsSettings /></FounderRoute>} />
            <Route path="/founder/customer-feedback" element={<FounderRoute><VocOverview /></FounderRoute>} />
            <Route path="/founder/customer-feedback/signals" element={<FounderRoute><VocSignals /></FounderRoute>} />
            <Route path="/founder/customer-feedback/feature-requests" element={<FounderRoute><VocFeatureRequests /></FounderRoute>} />
            <Route path="/founder/customer-feedback/testimonials" element={<FounderRoute><VocTestimonials /></FounderRoute>} />
            <Route path="/founder/customer-feedback/reviews" element={<FounderRoute><VocReviews /></FounderRoute>} />
            <Route path="/founder/customer-feedback/churn-reasons" element={<FounderRoute><VocChurnReasons /></FounderRoute>} />
            <Route path="/founder/customer-feedback/insights" element={<FounderRoute><VocInsights /></FounderRoute>} />
            <Route path="/founder/experiments" element={<FounderRoute><ExperimentsOverview /></FounderRoute>} />
            <Route path="/founder/experiments/plans" element={<FounderRoute><ExperimentPlans /></FounderRoute>} />
            <Route path="/founder/experiments/results" element={<FounderRoute><ExperimentResults /></FounderRoute>} />
            <Route path="/founder/experiments/winners" element={<FounderRoute><ExperimentWinners /></FounderRoute>} />
            <Route path="/founder/experiments/learning-library" element={<FounderRoute><ExperimentLearningLibrary /></FounderRoute>} />
            <Route path="/founder/business-wind-down" element={<FounderRoute><WindDownOverview /></FounderRoute>} />
            <Route path="/founder/business-wind-down/pause" element={<FounderRoute><WindDownPause /></FounderRoute>} />
            <Route path="/founder/business-wind-down/closure-checklist" element={<FounderRoute><WindDownClosureChecklist /></FounderRoute>} />
            <Route path="/founder/business-wind-down/customer-offboarding" element={<FounderRoute><WindDownCustomerOffboarding /></FounderRoute>} />
            <Route path="/founder/business-wind-down/vendor-cancellation" element={<FounderRoute><WindDownVendorCancellation /></FounderRoute>} />
            <Route path="/founder/business-wind-down/data-retention" element={<FounderRoute><WindDownDataRetention /></FounderRoute>} />
            <Route path="/founder/business-wind-down/archive" element={<FounderRoute><WindDownArchive /></FounderRoute>} />
            <Route path="/founder/policies" element={<FounderRoute><PoliciesOverview /></FounderRoute>} />
            <Route path="/founder/policies/businesses" element={<FounderRoute><PoliciesBusinesses /></FounderRoute>} />
            <Route path="/founder/policies/coverage" element={<FounderRoute><PoliciesCoverage /></FounderRoute>} />
            <Route path="/founder/policies/drafts" element={<FounderRoute><PoliciesDrafts /></FounderRoute>} />
            <Route path="/founder/policies/review" element={<FounderRoute><PoliciesReview /></FounderRoute>} />
            <Route path="/founder/policies/public-pages" element={<FounderRoute><PoliciesPublicPages /></FounderRoute>} />
            <Route path="/founder/agent-capabilities" element={<FounderRoute><AgentCapabilitiesOverview /></FounderRoute>} />
            <Route path="/founder/agent-capabilities/registry" element={<FounderRoute><AgentCapabilitiesRegistry /></FounderRoute>} />
            <Route path="/founder/agent-capabilities/boundaries" element={<FounderRoute><AgentCapabilitiesBoundaries /></FounderRoute>} />
            <Route path="/founder/agent-capabilities/approval-rules" element={<FounderRoute><AgentCapabilitiesApprovalRules /></FounderRoute>} />
            <Route path="/founder/agent-capabilities/escalations" element={<FounderRoute><AgentCapabilitiesEscalations /></FounderRoute>} />
            <Route path="/founder/agent-capabilities/audit" element={<FounderRoute><AgentCapabilitiesAudit /></FounderRoute>} />
            <Route path="/founder/attention-guard" element={<FounderRoute><AttentionOverview /></FounderRoute>} />
            <Route path="/founder/attention-guard/today" element={<FounderRoute><AttentionToday /></FounderRoute>} />
            <Route path="/founder/attention-guard/noise" element={<FounderRoute><AttentionNoise /></FounderRoute>} />
            <Route path="/founder/attention-guard/decisions" element={<FounderRoute><AttentionDecisions /></FounderRoute>} />
            <Route path="/founder/attention-guard/delegation" element={<FounderRoute><AttentionDelegation /></FounderRoute>} />
            <Route path="/founder/attention-guard/settings" element={<FounderRoute><AttentionSettings /></FounderRoute>} />
            <Route path="/founder/platform-monitor" element={<FounderRoute><PlatMonOverview /></FounderRoute>} />
            <Route path="/founder/platform-monitor/performance" element={<FounderRoute><PlatMonPerformance /></FounderRoute>} />
            <Route path="/founder/platform-monitor/errors" element={<FounderRoute><PlatMonErrors /></FounderRoute>} />
            <Route path="/founder/platform-monitor/rate-limits" element={<FounderRoute><PlatMonRateLimits /></FounderRoute>} />
            <Route path="/founder/platform-monitor/costs" element={<FounderRoute><PlatMonCosts /></FounderRoute>} />
            <Route path="/founder/platform-monitor/scalability" element={<FounderRoute><PlatMonScalability /></FounderRoute>} />
            <Route path="/founder/platform-monitor/recommendations" element={<FounderRoute><PlatMonRecommendations /></FounderRoute>} />
            <Route path="/founder/search" element={<FounderRoute><SearchOverview /></FounderRoute>} />
            <Route path="/founder/search/all" element={<FounderRoute><SearchAll /></FounderRoute>} />
            <Route path="/founder/search/customers" element={<FounderRoute><SearchCustomers /></FounderRoute>} />
            <Route path="/founder/search/businesses" element={<FounderRoute><SearchBusinesses /></FounderRoute>} />
            <Route path="/founder/search/documents" element={<FounderRoute><SearchDocuments /></FounderRoute>} />
            <Route path="/founder/search/communications" element={<FounderRoute><SearchCommunications /></FounderRoute>} />
            <Route path="/founder/search/audit" element={<FounderRoute><SearchAudit /></FounderRoute>} />
            <Route path="/founder/search/settings" element={<FounderRoute><SearchSettings /></FounderRoute>} />
            <Route path="/founder/portals" element={<FounderRoute><PortalsOverview /></FounderRoute>} />
            <Route path="/founder/portals/customer" element={<FounderRoute><PortalsCustomerAdmin /></FounderRoute>} />
            <Route path="/founder/portals/seller" element={<FounderRoute><PortalsSellerAdmin /></FounderRoute>} />
            <Route path="/founder/portals/partner" element={<FounderRoute><PortalsPartnerAdmin /></FounderRoute>} />
            <Route path="/founder/portals/adviser" element={<FounderRoute><PortalsAdviserAdmin /></FounderRoute>} />
            <Route path="/founder/portals/document-upload" element={<FounderRoute><PortalsDocumentUploadAdmin /></FounderRoute>} />
            <Route path="/founder/portals/access" element={<FounderRoute><PortalsAccessPage /></FounderRoute>} />
            <Route path="/founder/portals/settings" element={<FounderRoute><PortalsSettings /></FounderRoute>} />
            {/* Cleanup alias: founder/admin portal management lives under /founder/portal-admin/*
                to avoid clashing with the public /portal/* customer/partner/seller surfaces.
                Legacy /founder/portals/* routes above remain alive to keep deep links working. */}
            <Route path="/founder/portal-admin" element={<FounderRoute><PortalsOverview /></FounderRoute>} />
            <Route path="/founder/portal-admin/customer" element={<FounderRoute><PortalsCustomerAdmin /></FounderRoute>} />
            <Route path="/founder/portal-admin/seller" element={<FounderRoute><PortalsSellerAdmin /></FounderRoute>} />
            <Route path="/founder/portal-admin/partner" element={<FounderRoute><PortalsPartnerAdmin /></FounderRoute>} />
            <Route path="/founder/portal-admin/adviser" element={<FounderRoute><PortalsAdviserAdmin /></FounderRoute>} />
            <Route path="/founder/portal-admin/document-upload" element={<FounderRoute><PortalsDocumentUploadAdmin /></FounderRoute>} />
            <Route path="/founder/portal-admin/access" element={<FounderRoute><PortalsAccessPage /></FounderRoute>} />
            <Route path="/founder/portal-admin/settings" element={<FounderRoute><PortalsSettings /></FounderRoute>} />
            <Route path="/founder/customer-upgrades" element={<FounderRoute><CustomerUpgradesHub /></FounderRoute>} />
            <Route path="/founder/customer-upgrades/opportunities" element={<FounderRoute><CustomerUpgradesOpportunities /></FounderRoute>} />
            <Route path="/founder/customer-upgrades/product-ladders" element={<FounderRoute><CustomerUpgradesProductLadders /></FounderRoute>} />
            <Route path="/founder/customer-upgrades/renewals" element={<FounderRoute><CustomerUpgradesRenewals /></FounderRoute>} />
            <Route path="/founder/customer-upgrades/upgrade-rules" element={<FounderRoute><CustomerUpgradesRules /></FounderRoute>} />
            <Route path="/founder/customer-upgrades/follow-up" element={<FounderRoute><CustomerUpgradesFollowUp /></FounderRoute>} />
            <Route path="/founder/ai-cost/action-board" element={<FounderRoute><AIFounderActionBoard /></FounderRoute>} />
            <Route path="/founder/ai-cost/runtime" element={<FounderRoute><AIRuntimeOrchestration /></FounderRoute>} />
            <Route path="/founder/ai-cost/orchestration-live" element={<FounderRoute><AIOrchestrationLive /></FounderRoute>} />
            <Route path="/founder/ai-cost/health" element={<FounderRoute><AIRuntimeHealth /></FounderRoute>} />
            <Route path="/founder/ai-cost/ledger" element={<FounderRoute><AIUsageLedger /></FounderRoute>} />
            <Route path="/founder/ai-cost/routing" element={<FounderRoute><AIModelRouting /></FounderRoute>} />
            <Route path="/founder/ai-cost/budgets" element={<FounderRoute><AIBusinessBudgets /></FounderRoute>} />
            <Route path="/founder/ai-cost/agent-controls" element={<FounderRoute><AIAgentCostControls /></FounderRoute>} />
            <Route path="/founder/ai-cost/alerts" element={<FounderRoute><AICostAlerts /></FounderRoute>} />
            <Route path="/founder/ai-cost/roi" element={<FounderRoute><AIROIEngine /></FounderRoute>} />
            <Route path="/founder/ai-cost/approvals" element={<FounderRoute><AIApprovalGates /></FounderRoute>} />
            <Route path="/founder/ai-cost/templates" element={<FounderRoute><AIPromptTemplates /></FounderRoute>} />
            <Route path="/founder/ai-cost/context" element={<FounderRoute><AICachedContext /></FounderRoute>} />
            <Route path="/founder/ai-cost/pricing" element={<FounderRoute><AIProviderPricing /></FounderRoute>} />
            <Route path="/founder/ai-cost/quality" element={<FounderRoute><AIQualityScoring /></FounderRoute>} />
            <Route path="/founder/ai-cost/security" element={<FounderRoute><AISecurityCentre /></FounderRoute>} />
            <Route path="/founder/ai-cost/queue" element={<FounderRoute><AIQueueControl /></FounderRoute>} />
            <Route path="/founder/ai-cost/sandbox" element={<FounderRoute><AISandbox /></FounderRoute>} />
            <Route path="/founder/ai-cost/finance" element={<FounderRoute><AIFinancePack /></FounderRoute>} />
            <Route path="/founder/ai-cost/live" element={<FounderRoute><AILiveOperations /></FounderRoute>} />
            <Route path="/founder/brain" element={<FounderRoute><LiftorBrain /></FounderRoute>} />
            <Route path="/founder/brain/sessions" element={<FounderRoute><BrainSessions /></FounderRoute>} />
            <Route path="/founder/brain/drafts" element={<FounderRoute><BrainDrafts /></FounderRoute>} />
            <Route path="/founder/brain/audit" element={<FounderRoute><BrainAudit /></FounderRoute>} />
            <Route path="/founder/brain/tools" element={<FounderRoute><BrainTools /></FounderRoute>} />
            <Route path="/founder/brain/provider" element={<FounderRoute><BrainProvider /></FounderRoute>} />
            <Route path="/founder/command-center/legacy" element={<FounderRoute><CommandCenter /></FounderRoute>} />
            <Route path="/founder/processes" element={<FounderRoute><ProcessDirectory /></FounderRoute>} />
            <Route path="/founder/processes/:id" element={<FounderRoute><ProcessDetail /></FounderRoute>} />
            <Route path="/founder/architectures" element={<FounderRoute><ArchitectureDirectory /></FounderRoute>} />
            <Route path="/founder/architectures/:id" element={<FounderRoute><ArchitectureDetail /></FounderRoute>} />
            <Route path="/founder/deployments" element={<FounderRoute><DeploymentDirectory /></FounderRoute>} />
            <Route path="/founder/deployments/:id" element={<FounderRoute><DeploymentDetail /></FounderRoute>} />
            <Route path="/founder/analytics" element={<FounderRoute><FounderAnalytics /></FounderRoute>} />
            <Route path="/founder/optimisation" element={<FounderRoute><OptimisationDashboard /></FounderRoute>} />
            <Route path="/founder/knowledge" element={<FounderRoute><KnowledgeDirectory /></FounderRoute>} />
            <Route path="/founder/knowledge/:id" element={<FounderRoute><KnowledgeDetail /></FounderRoute>} />
            <Route path="/founder/operations" element={<FounderRoute><GlobalOperations /></FounderRoute>} />
            <Route path="/founder/organisations" element={<FounderRoute><OrganisationDirectory /></FounderRoute>} />
            <Route path="/founder/organisations/:id" element={<FounderRoute><OrganisationProfile /></FounderRoute>} />
            <Route path="/founder/access-control" element={<FounderRoute><AccessControl /></FounderRoute>} />
            <Route path="/founder/security" element={<FounderRoute><SecurityDashboard /></FounderRoute>} />
            <Route path="/founder/templates" element={<FounderRoute><TemplateDirectory /></FounderRoute>} />
            <Route path="/founder/templates/:id" element={<FounderRoute><TemplateDetail /></FounderRoute>} />
            <Route path="/founder/expansion" element={<FounderRoute><PlatformExpansion /></FounderRoute>} />
            <Route path="/founder/expansion/:id" element={<FounderRoute><PlatformLaunchDetail /></FounderRoute>} />
            <Route path="/founder/manual" element={<FounderRoute><FounderManual /></FounderRoute>} />
            <Route path="/founder/manual/full" element={<FounderRoute><FullSystemMirror /></FounderRoute>} />
            <Route path="/founder/manual/user" element={<FounderRoute><UserManualPage /></FounderRoute>} />
            <Route path="/founder/manual/:id" element={<FounderRoute><ManualPageDetail /></FounderRoute>} />
            <Route path="/founder/build-log" element={<FounderRoute><BuildLog /></FounderRoute>} />
            <Route path="/founder/revenue" element={<FounderRoute><FounderRevenue /></FounderRoute>} />
            <Route path="/founder/brain-core" element={<FounderRoute><BrainCore /></FounderRoute>} />
            <Route path="/founder/decisions" element={<FounderRoute><DecisionEngine /></FounderRoute>} />
            <Route path="/founder/strategy" element={<FounderRoute><StrategyEngine /></FounderRoute>} />
            <Route path="/founder/marketing" element={<FounderRoute><MarketingHub /></FounderRoute>} />
            <Route path="/founder/support" element={<FounderRoute><SupportHub /></FounderRoute>} />
            <Route path="/founder/support/knowledge-agent" element={<FounderRoute><SupportKnowledgeAgent /></FounderRoute>} />
            <Route path="/founder/customer-success" element={<FounderRoute><CustomerSuccess /></FounderRoute>} />
            <Route path="/founder/clients" element={<FounderRoute><ClientPortal /></FounderRoute>} />
            <Route path="/founder/assets" element={<FounderRoute><CreativeAssetsHub /></FounderRoute>} />
            <Route path="/founder/social" element={<FounderRoute><SocialBrain /></FounderRoute>} />
            <Route path="/founder/social-autopilot" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/accounts" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/assets" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/content" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/calendar" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/publishing" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/inbox" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/replies" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/engagement" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/performance" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/settings" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/funnels" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-autopilot/ads" element={<FounderRoute><SocialAutopilotPage /></FounderRoute>} />
            <Route path="/founder/social-relationships" element={<FounderRoute><SocialRelationshipsPage /></FounderRoute>} />
            <Route path="/founder/social-relationships/connections" element={<FounderRoute><SocialRelationshipsPage /></FounderRoute>} />
            <Route path="/founder/social-relationships/discovery" element={<FounderRoute><SocialRelationshipsPage /></FounderRoute>} />
            <Route path="/founder/social-relationships/targets" element={<FounderRoute><SocialRelationshipsPage /></FounderRoute>} />
            <Route path="/founder/social-relationships/queue" element={<FounderRoute><SocialRelationshipsPage /></FounderRoute>} />
            <Route path="/founder/social-relationships/inbox" element={<FounderRoute><SocialRelationshipsPage /></FounderRoute>} />
            <Route path="/founder/social-relationships/policies" element={<FounderRoute><SocialRelationshipsPage /></FounderRoute>} />
            <Route path="/founder/copilot" element={<FounderRoute><FounderCoPilot /></FounderRoute>} />
            <Route path="/founder/testing" element={<FounderRoute><PlatformTesting /></FounderRoute>} />
            <Route path="/founder/legal" element={<FounderRoute><FounderLegalConsole /></FounderRoute>} />
            <Route path="/founder/compliance" element={<FounderRoute><ComplianceDashboard /></FounderRoute>} />
            <Route path="/founder/compliance/events" element={<FounderRoute><ComplianceEvents /></FounderRoute>} />
            <Route path="/founder/compliance/rules" element={<FounderRoute><ComplianceRules /></FounderRoute>} />
            <Route path="/founder/crm" element={<FounderRoute><CRMDashboard /></FounderRoute>} />
            <Route path="/founder/crm/billionaire-access" element={<FounderRoute><BillionaireAccessResearch /></FounderRoute>} />
            <Route path="/founder/crm/contacts" element={<FounderRoute><CRMContacts /></FounderRoute>} />
            <Route path="/founder/crm/contacts/:id" element={<FounderRoute><CRMContactDetail /></FounderRoute>} />
            <Route path="/founder/crm/inboxes" element={<FounderRoute><CRMInboxes /></FounderRoute>} />
            <Route path="/founder/crm/inboxes/:id/configure" element={<FounderRoute><CRMInboxConfigure /></FounderRoute>} />
            <Route path="/founder/finance" element={<FounderRoute><FinanceDashboard /></FounderRoute>} />
            <Route path="/founder/finance/targets" element={<FounderRoute><FinanceTargets /></FounderRoute>} />
            <Route path="/founder/finance/deals" element={<FounderRoute><FinanceDeals /></FounderRoute>} />
            <Route path="/founder/finance/invoices" element={<FounderRoute><FinanceInvoices /></FounderRoute>} />
            <Route path="/founder/finance/payments" element={<FounderRoute><FinancePayments /></FounderRoute>} />
            <Route path="/founder/outreach" element={<FounderRoute><OutreachDashboard /></FounderRoute>} />
            <Route path="/founder/outreach/imports" element={<FounderRoute><OutreachImports /></FounderRoute>} />
            <Route path="/founder/outreach/campaigns" element={<FounderRoute><OutreachCampaigns /></FounderRoute>} />
            <Route path="/founder/outreach/queue" element={<FounderRoute><OutreachQueue /></FounderRoute>} />
            <Route path="/founder/outreach/live-monitor" element={<FounderRoute><CampaignLiveMonitor /></FounderRoute>} />
            <Route path="/founder/outreach/apollo" element={<FounderRoute><ApolloIntegration /></FounderRoute>} />
            <Route path="/founder/outreach/engagement" element={<FounderRoute><EngagementTracking /></FounderRoute>} />
            <Route path="/founder/outreach/send-preview" element={<FounderRoute><ControlledSendPreview /></FounderRoute>} />
            <Route path="/founder/outreach/queue-audit" element={<FounderRoute><QueueAudit /></FounderRoute>} />
            <Route path="/founder/conversations" element={<FounderRoute><ConversationsDashboard /></FounderRoute>} />
            <Route path="/founder/conversations/:id" element={<FounderRoute><ConversationDetail /></FounderRoute>} />
            <Route path="/founder/internal-proposals" element={<FounderRoute><InternalProposals /></FounderRoute>} />
            <Route path="/founder/internal-proposals/:id" element={<FounderRoute><InternalProposalDetail /></FounderRoute>} />
            <Route path="/founder/demos" element={<FounderRoute><DemosDashboard /></FounderRoute>} />
            <Route path="/founder/suppliers" element={<FounderRoute><SuppliersDashboard /></FounderRoute>} />
            <Route path="/founder/suppliers/:id" element={<FounderRoute><SupplierDetail /></FounderRoute>} />
            <Route path="/founder/assignments" element={<FounderRoute><AssignmentsDashboard /></FounderRoute>} />
            <Route path="/founder/priority" element={<FounderRoute><PriorityDashboard /></FounderRoute>} />
            <Route path="/founder/sending" element={<FounderRoute><SendingHealth /></FounderRoute>} />
            <Route path="/founder/system" element={<FounderRoute><SystemDashboard /></FounderRoute>} />
            <Route path="/founder/system/events" element={<FounderRoute><SystemEvents /></FounderRoute>} />
            <Route path="/founder/system/health" element={<FounderRoute><SystemHealth /></FounderRoute>} />
            <Route path="/founder/system/modes" element={<FounderRoute><ExecutionModes /></FounderRoute>} />

            {/* Public proposal + demo */}
            <Route path="/proposals/view/:token" element={<PublicProposalView />} />
            <Route path="/proposals/accept/:token" element={<PublicProposalAccept />} />
            <Route path="/demo/:token" element={<PublicDemo />} />

            {/* Supplier Portal */}
            <Route path="/supplier/login" element={<SupplierLogin />} />
            <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
            <Route path="/supplier/assignments" element={<SupplierAssignments />} />

            {/* Partner Portal */}
            <Route path="/partner" element={<PartnerRoute><PartnerDashboard /></PartnerRoute>} />
            <Route path="/partner/opportunities" element={<PartnerRoute><PartnerOpportunities /></PartnerRoute>} />
            <Route path="/partner/opportunities/:id" element={<PartnerRoute><PartnerOpportunityDetail /></PartnerRoute>} />
            <Route path="/partner/projects" element={<PartnerRoute><PartnerProjects /></PartnerRoute>} />
            <Route path="/partner/projects/:id" element={<PartnerRoute><PartnerProjectDetail /></PartnerRoute>} />
            <Route path="/partner/documents" element={<PartnerRoute><PartnerDocuments /></PartnerRoute>} />
            <Route path="/partner/messages" element={<PartnerRoute><PartnerMessages /></PartnerRoute>} />

            {/* Worker portals */}
            <Route path="/operator-login" element={<OperatorLogin />} />
            <Route
              path="/operator-portal"
              element={
                <WorkerRoute portal="operator" loginPath="/operator-login">
                  <OperatorPortal />
                </WorkerRoute>
              }
            />
            <Route path="/oversight-login" element={<OversightLogin />} />
            <Route
              path="/oversight-portal"
              element={
                <WorkerRoute portal="oversight" loginPath="/oversight-login">
                  <OversightPortal />
                </WorkerRoute>
              }
            />
            <Route
              path="/founder/human-workforce-control"
              element={
                <FounderRoute>
                  <HumanWorkforceControl />
                </FounderRoute>
              }
            />
            <Route
              path="/founder/campaign-factory"
              element={
                <FounderRoute>
                  <CampaignFactory />
                </FounderRoute>
              }
            />
            <Route
              path="/founder/automation-book"
              element={
                <FounderRoute>
                  <AutomationBook />
                </FounderRoute>
              }
            />
            <Route
              path="/founder/worker-manuals"
              element={
                <FounderRoute>
                  <WorkerManuals />
                </FounderRoute>
              }
            />
            <Route
              path="/founder/worker-help-audit"
              element={
                <FounderRoute>
                  <WorkerHelpAudit />
                </FounderRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
