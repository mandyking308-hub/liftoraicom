import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const AutomationLiabilityDisclaimer = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Automation Liability Disclaimer</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[18px] text-foreground">
            <p>The Liftor platform enables users to deploy automation workflows and AI-driven operational systems.</p>
            <p>Users are solely responsible for the automation systems they create, configure, and operate through the platform.</p>
            <p>Liftor provides infrastructure tools and does not supervise or control how automation systems are deployed by users.</p>
            <p>Users must ensure that automation workflows operate safely and in compliance with applicable laws and organisational policies.</p>
            <p>Liftor shall not be liable for operational outcomes resulting from user-configured automation systems.</p>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
            <Link to="/legal" className="text-primary hover:underline">Legal Hub</Link>
            <Link to="/legal/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AutomationLiabilityDisclaimer;
