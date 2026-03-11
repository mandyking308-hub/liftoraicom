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

// Founder pages
import FounderOverview from "./pages/founder/FounderOverview";
import FounderProposals from "./pages/founder/FounderProposals";
import ProposalDetail from "./pages/founder/ProposalDetail";
import LeadPipeline from "./pages/founder/LeadPipeline";
import FounderProjects from "./pages/founder/FounderProjects";
import FounderProjectDetail from "./pages/founder/FounderProjectDetail";
import FounderActivity from "./pages/founder/FounderActivity";
import FounderDocuments from "./pages/founder/FounderDocuments";

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

            {/* Founder Console */}
            <Route path="/founder" element={<FounderRoute><FounderOverview /></FounderRoute>} />
            <Route path="/founder/proposals" element={<FounderRoute><FounderProposals /></FounderRoute>} />
            <Route path="/founder/proposals/:id" element={<FounderRoute><ProposalDetail /></FounderRoute>} />
            <Route path="/founder/pipeline" element={<FounderRoute><LeadPipeline /></FounderRoute>} />
            <Route path="/founder/projects" element={<FounderRoute><FounderProjects /></FounderRoute>} />
            <Route path="/founder/projects/:id" element={<FounderRoute><FounderProjectDetail /></FounderRoute>} />
            <Route path="/founder/activity" element={<FounderRoute><FounderActivity /></FounderRoute>} />
            <Route path="/founder/documents" element={<FounderRoute><FounderDocuments /></FounderRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
