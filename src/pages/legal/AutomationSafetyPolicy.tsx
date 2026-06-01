import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";

const AutomationSafetyPolicy = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="Automation safety policy | Liftor AI" description="Safety constraints, human-in-the-loop gates, and approval boundaries for Liftor AI automations." />
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Liftor Automation Safety Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            <section className="space-y-[18px] text-foreground">
              <p>This Automation Safety Policy governs how automation systems created and operated through the Liftor platform must be designed and managed.</p>
              <p>Liftor provides infrastructure for organisations to build automation workflows, deploy AI agents, and execute operational processes.</p>
              <p>Users remain responsible for the configuration and operation of automation systems deployed through the platform.</p>
              <p>Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. Responsibility for Automation Systems</h2>
              <p className="text-foreground">Users are responsible for the automation workflows, processes, and AI agents they deploy through the Liftor platform.</p>
              <p className="text-foreground">Users must ensure that automation systems operate in accordance with applicable laws, organisational policies, and appropriate operational safeguards.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. Safe Automation Design</h2>
              <p className="text-foreground">Automation workflows should be designed to minimise the risk of unintended consequences.</p>
              <p className="text-foreground">Users should ensure that automation systems include appropriate validation, monitoring, and oversight.</p>
              <p className="text-foreground">Automation systems should be tested before being deployed into operational environments.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. Human Oversight</h2>
              <p className="text-foreground">Automation systems should include mechanisms for human oversight where appropriate.</p>
              <p className="text-foreground">Organisations deploying automation through Liftor should ensure that qualified personnel can review, intervene, or disable automation systems if necessary.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Risk Management</h2>
              <p className="text-foreground">Users must not deploy automation systems that are reasonably likely to cause harm to individuals, organisations, or systems.</p>
              <p className="text-foreground">Automation systems must not be designed to perform unlawful activities or create harmful outcomes.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">5. Monitoring and Control</h2>
              <p className="text-foreground">Users should monitor automation systems to ensure they operate as intended.</p>
              <p className="text-foreground">Where automation systems produce unexpected behaviour, users must take prompt action to investigate and correct the issue.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">6. Platform Safeguards</h2>
              <p className="text-foreground">Liftor may implement safeguards to protect platform integrity and reduce risks associated with automation systems.</p>
              <p className="text-foreground">These safeguards may include system monitoring, automation controls, and platform security protections.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">7. Suspension of Unsafe Systems</h2>
              <p className="text-foreground">Liftor reserves the right to suspend or disable automation systems that:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>violate platform policies</li>
                <li>create security risks</li>
                <li>threaten platform stability</li>
                <li>are used in unlawful or harmful ways</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">8. Policy Updates</h2>
              <p className="text-foreground">Liftor may update this Automation Safety Policy periodically.</p>
              <p className="text-foreground">Continued use of the platform after updates constitutes acceptance of the revised policy.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
            <Link to="/legal" className="text-primary hover:underline">Legal Hub</Link>
            <Link to="/legal/ai-usage-policy" className="text-primary hover:underline">AI Usage Policy</Link>
            <Link to="/legal/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AutomationSafetyPolicy;
