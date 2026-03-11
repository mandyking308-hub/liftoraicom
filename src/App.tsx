import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import WhatWeBuild from "./pages/WhatWeBuild";
import Industries from "./pages/Industries";
import Method from "./pages/Method";
import CaseStudies from "./pages/CaseStudies";
import PartnerProgram from "./pages/PartnerProgram";
import ProjectDiscovery from "./pages/ProjectDiscovery";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/what-we-build" element={<WhatWeBuild />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="/method" element={<Method />} />
          <Route path="/case-studies" element={<CaseStudies />} />
          <Route path="/partners" element={<PartnerProgram />} />
          <Route path="/project-discovery" element={<ProjectDiscovery />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
