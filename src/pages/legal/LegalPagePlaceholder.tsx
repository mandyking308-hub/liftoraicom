import { useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";

const titleMap: Record<string, string> = {
  "/legal/terms-of-service": "Terms of Service",
  "/legal/enterprise-services-agreement": "Enterprise Services Agreement",
  "/legal/privacy-policy": "Privacy Policy",
  "/legal/acceptable-use": "Acceptable Use Policy",
  "/legal/ai-usage-policy": "AI Usage Policy",
  "/legal/automation-safety-policy": "Automation Safety Policy",
  "/legal/security-policy": "Security Policy",
  "/legal/cookie-policy": "Cookie Policy",
  "/legal/data-processing-agreement": "Data Processing Agreement",
  "/legal/ai-output-disclaimer": "AI Output Disclaimer",
  "/legal/automation-liability-disclaimer": "Automation Liability Disclaimer",
};

const LegalPagePlaceholder = () => {
  const { pathname } = useLocation();
  const title = titleMap[pathname] ?? "Legal Document";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title={`${title} | Liftor AI`} description={`${title} for Liftor AI. Read the policy that applies to use of the Liftor AI platform and services.`} />
      <Navbar />
      <main className="flex-1 pt-16 pb-20">
        <div className="mx-auto max-w-[900px] px-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-4 text-muted-foreground">Content coming soon.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPagePlaceholder;
