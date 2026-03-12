import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/portal/ProtectedRoute";
import FounderRoute from "@/components/founder/FounderRoute";
import PartnerRoute from "@/components/partner/PartnerRoute";

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
import NotFound from "./pages/NotFound";
import LegalHub from "./pages/legal/LegalHub";
import LegalPagePlaceholder from "./pages/legal/LegalPagePlaceholder";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import AcceptableUse from "./pages/legal/AcceptableUse";
import AIUsagePolicy from "./pages/legal/AIUsagePolicy";

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
import ManualPageDetail from "./pages/founder/ManualPageDetail";
import BuildLog from "./pages/founder/BuildLog";
import FounderRevenue from "./pages/founder/FounderRevenue";
import BrainCore from "./pages/founder/BrainCore";
import DecisionEngine from "./pages/founder/DecisionEngine";
import StrategyEngine from "./pages/founder/StrategyEngine";
import FounderCoPilot from "./pages/founder/FounderCoPilot";
import PlatformTesting from "./pages/founder/PlatformTesting";
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

            {/* Legal */}
            <Route path="/legal" element={<LegalHub />} />
            <Route path="/legal/terms-of-service" element={<LegalPagePlaceholder />} />
            <Route path="/legal/enterprise-services-agreement" element={<LegalPagePlaceholder />} />
            <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/legal/acceptable-use" element={<AcceptableUse />} />
            <Route path="/legal/ai-usage-policy" element={<LegalPagePlaceholder />} />
            <Route path="/legal/automation-safety-policy" element={<LegalPagePlaceholder />} />
            <Route path="/legal/security-policy" element={<LegalPagePlaceholder />} />
            <Route path="/legal/cookie-policy" element={<LegalPagePlaceholder />} />
            <Route path="/legal/data-processing-agreement" element={<LegalPagePlaceholder />} />
            <Route path="/legal/ai-output-disclaimer" element={<LegalPagePlaceholder />} />
            <Route path="/legal/automation-liability-disclaimer" element={<LegalPagePlaceholder />} />

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
            <Route path="/founder/command-center" element={<FounderRoute><CommandCenter /></FounderRoute>} />
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
            <Route path="/founder/manual/:id" element={<FounderRoute><ManualPageDetail /></FounderRoute>} />
            <Route path="/founder/build-log" element={<FounderRoute><BuildLog /></FounderRoute>} />
            <Route path="/founder/revenue" element={<FounderRoute><FounderRevenue /></FounderRoute>} />
            <Route path="/founder/brain" element={<FounderRoute><BrainCore /></FounderRoute>} />
            <Route path="/founder/decisions" element={<FounderRoute><DecisionEngine /></FounderRoute>} />
            <Route path="/founder/strategy" element={<FounderRoute><StrategyEngine /></FounderRoute>} />
            <Route path="/founder/copilot" element={<FounderRoute><FounderCoPilot /></FounderRoute>} />
            <Route path="/founder/testing" element={<FounderRoute><PlatformTesting /></FounderRoute>} />

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
