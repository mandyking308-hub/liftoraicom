import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";
import HeroSection from "@/components/home/HeroSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import ProblemSection from "@/components/home/ProblemSection";
import WhatWeBuildSection from "@/components/home/WhatWeBuildSection";
import SystemCredibilitySection from "@/components/home/SystemCredibilitySection";
import PlatformSection from "@/components/home/PlatformSection";
import BrainSection from "@/components/home/BrainSection";
import ClientsSection from "@/components/home/ClientsSection";
import ConfidentialitySection from "@/components/home/ConfidentialitySection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }
  if (user) {
    return <Navigate to="/founder" replace />;
  }

  return (
  <div className="min-h-screen bg-background relative">
    <SEOHead title="Liftor AI | Intelligent Systems Engineering" description="Liftor AI designs, builds, and operates intelligent operational platforms, automation systems, and AI agents for modern organisations." />
    {/* Global faint grid overlay */}
    <div className="fixed inset-0 global-grid opacity-20 pointer-events-none z-0" />
    <div className="relative z-10">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <ProblemSection />
      <WhatWeBuildSection />
      <SystemCredibilitySection />
      <PlatformSection />
      <BrainSection />
      <ClientsSection />
      <ConfidentialitySection />
      <CTASection />
      <Footer />
    </div>
  </div>
  );
};

export default Index;
