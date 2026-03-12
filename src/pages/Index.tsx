import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ProblemSection from "@/components/home/ProblemSection";
import WhatWeBuildSection from "@/components/home/WhatWeBuildSection";
import ProcessSection from "@/components/home/ProcessSection";
import PlatformSection from "@/components/home/PlatformSection";
import BrainSection from "@/components/home/BrainSection";
import ClientsSection from "@/components/home/ClientsSection";
import ConfidentialitySection from "@/components/home/ConfidentialitySection";
import CTASection from "@/components/home/CTASection";

const Index = () => (
  <div className="min-h-screen bg-background relative">
    {/* Global faint grid overlay */}
    <div className="fixed inset-0 global-grid opacity-20 pointer-events-none z-0" />
    <div className="relative z-10">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <WhatWeBuildSection />
      <ProcessSection />
      <PlatformSection />
      <BrainSection />
      <ClientsSection />
      <ConfidentialitySection />
      <CTASection />
      <Footer />
    </div>
  </div>
);

export default Index;
