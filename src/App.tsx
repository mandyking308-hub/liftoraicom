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
import PartnerRoute from "@/components/partner/PartnerRoute";
import ScrollToTop from "@/components/ScrollToTop";

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
import CreativeAssetsHub from "./pages/founder/CreativeAssetsHub";
import SocialBrain from "./pages/founder/SocialBrain";
import SocialAutopilotPage from "./pages/founder/SocialAutopilotPage";
import FounderCoPilot from "./pages/founder/FounderCoPilot";
import PlatformTesting from "./pages/founder/PlatformTesting";
import FounderLegalConsole from "./pages/founder/FounderLegalConsole";
import ComplianceDashboard from "./pages/founder/compliance/ComplianceDashboard";
import ComplianceEvents from "./pages/founder/compliance/ComplianceEvents";
import ComplianceRules from "./pages/founder/compliance/ComplianceRules";
import CRMDashboard from "./pages/founder/CRMDashboard";
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
            <Route path="/founder/brain" element={<FounderRoute><BrainCore /></FounderRoute>} />
            <Route path="/founder/decisions" element={<FounderRoute><DecisionEngine /></FounderRoute>} />
            <Route path="/founder/strategy" element={<FounderRoute><StrategyEngine /></FounderRoute>} />
            <Route path="/founder/marketing" element={<FounderRoute><MarketingHub /></FounderRoute>} />
            <Route path="/founder/support" element={<FounderRoute><SupportHub /></FounderRoute>} />
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
            <Route path="/founder/copilot" element={<FounderRoute><FounderCoPilot /></FounderRoute>} />
            <Route path="/founder/testing" element={<FounderRoute><PlatformTesting /></FounderRoute>} />
            <Route path="/founder/legal" element={<FounderRoute><FounderLegalConsole /></FounderRoute>} />
            <Route path="/founder/compliance" element={<FounderRoute><ComplianceDashboard /></FounderRoute>} />
            <Route path="/founder/compliance/events" element={<FounderRoute><ComplianceEvents /></FounderRoute>} />
            <Route path="/founder/compliance/rules" element={<FounderRoute><ComplianceRules /></FounderRoute>} />
            <Route path="/founder/crm" element={<FounderRoute><CRMDashboard /></FounderRoute>} />
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

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
