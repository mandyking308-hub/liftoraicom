import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";

const AcceptableUse = () => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="Acceptable use policy | Liftor AI" description="Permitted and prohibited uses of the Liftor AI platform and services." />
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Liftor Acceptable Use Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            {/* Introduction */}
            <section className="space-y-[18px] text-foreground">
              <p>This Acceptable Use Policy ("Policy") governs how users may access and use the Liftor AI platform and services (the "Platform").</p>
              <p>Liftor provides infrastructure for automation systems, artificial intelligence tools, and workflow execution.</p>
              <p>Users must ensure that their use of the platform complies with this Policy and all applicable laws and regulations.</p>
              <p>Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. Compliance With Laws</h2>
              <p className="text-foreground">Users must comply with all applicable laws, regulations, and legal obligations when using the Liftor platform.</p>
              <p className="text-foreground">The platform may not be used to perform activities that are unlawful in any applicable jurisdiction.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. Prohibited Activities</h2>
              <p className="text-foreground">Users may not use the Liftor platform to engage in activities that:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>violate applicable laws or regulations</li>
                <li>infringe the intellectual property rights of others</li>
                <li>transmit illegal, fraudulent, or deceptive content</li>
                <li>distribute malware, malicious code, or harmful software</li>
                <li>interfere with or disrupt platform operations</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. AI and Automation Misuse</h2>
              <p className="text-foreground">Users may not use Liftor AI systems to:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>generate harmful or abusive content</li>
                <li>conduct harassment or intimidation</li>
                <li>create systems designed to deceive or impersonate others</li>
                <li>automate illegal activities</li>
                <li>deploy automation intended to harm individuals, organisations, or systems</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Platform Security</h2>
              <p className="text-foreground">Users must not attempt to:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>gain unauthorised access to platform systems</li>
                <li>bypass platform security mechanisms</li>
                <li>exploit vulnerabilities</li>
                <li>interfere with system monitoring or logging</li>
                <li>conduct denial-of-service or similar attacks</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">5. Reverse Engineering and System Extraction</h2>
              <p className="text-foreground">Users may not:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>reverse engineer the Liftor platform</li>
                <li>attempt to access source code or internal architecture</li>
                <li>scrape system data at scale</li>
                <li>extract platform data for building competing services</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">6. Abuse of Automation Systems</h2>
              <p className="text-foreground">Users must not create automation workflows that:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>intentionally overload the platform</li>
                <li>attempt to bypass service safeguards</li>
                <li>manipulate platform behaviour in harmful ways</li>
                <li>create excessive or abusive automated activity</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">7. Platform Integrity</h2>
              <p className="text-foreground">Users must use Liftor in a manner that preserves the integrity and stability of the platform.</p>
              <p className="text-foreground">Activities that degrade performance or harm other users may result in suspension.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">8. Enforcement</h2>
              <p className="text-foreground">Liftor reserves the right to investigate violations of this Policy.</p>
              <p className="text-foreground">If violations are identified, Liftor may take actions including:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>restricting access to the platform</li>
                <li>suspending or terminating accounts</li>
                <li>removing harmful automation workflows</li>
                <li>reporting unlawful activity to appropriate authorities</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">9. Reporting Violations</h2>
              <p className="text-foreground">Users who become aware of violations of this Policy may report them through Liftor support channels.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">10. Changes to This Policy</h2>
              <p className="text-foreground">Liftor may update this Acceptable Use Policy periodically.</p>
              <p className="text-foreground">Continued use of the platform after updates constitutes acceptance of the revised Policy.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
            <Link to="/legal" className="text-primary hover:underline">Legal Hub</Link>
            <Link to="/legal/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link to="/legal/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AcceptableUse;
