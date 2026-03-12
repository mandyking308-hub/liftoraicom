import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const TermsOfService = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Liftor Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            <section className="space-y-[18px] text-foreground">
              <p>These Terms of Service ("Terms") govern access to and use of the Liftor platform and services.</p>
              <p>Liftor provides infrastructure for organisations to build, deploy, and operate automation systems, artificial intelligence agents, and operational workflows.</p>
              <p>By accessing or using the Liftor platform, users agree to be bound by these Terms.</p>
              <p>Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. Platform Services</h2>
              <p className="text-foreground">Liftor provides a platform that enables organisations to design automation workflows, deploy AI agents, and operate digital processes.</p>
              <p className="text-foreground">Platform features may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>workflow automation systems</li>
                <li>artificial intelligence tools</li>
                <li>operational monitoring systems</li>
                <li>organisational management tools</li>
              </ul>
              <p className="text-foreground">Services may evolve as the platform develops.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. User Accounts</h2>
              <p className="text-foreground">Access to the platform requires creation of a user account.</p>
              <p className="text-foreground">Users must:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>provide accurate registration information</li>
                <li>maintain the confidentiality of account credentials</li>
                <li>ensure that account access is not shared with unauthorised parties</li>
              </ul>
              <p className="text-foreground">Users are responsible for activities conducted through their accounts.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. Organisational Accounts</h2>
              <p className="text-foreground">Many Liftor users operate the platform on behalf of organisations.</p>
              <p className="text-foreground">Organisations may control administrative access to platform environments and may manage user permissions within their accounts.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Platform Usage</h2>
              <p className="text-foreground">Users must use the Liftor platform in accordance with:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>applicable laws and regulations</li>
                <li>the Liftor Acceptable Use Policy</li>
                <li>the Liftor AI Usage Policy</li>
                <li>the Liftor Automation Safety Policy</li>
              </ul>
              <p className="text-foreground">Violations of these policies may result in account suspension or termination.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">5. AI and Automation Systems</h2>
              <p className="text-foreground">Liftor provides infrastructure that enables users to deploy AI systems and automation workflows.</p>
              <p className="text-foreground">Users remain responsible for the configuration, operation, and outcomes of systems they deploy through the platform.</p>
              <p className="text-foreground">Liftor does not control or supervise the operational decisions of user-created automation systems.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">6. Intellectual Property</h2>
              <p className="text-foreground">Liftor and its licensors retain all rights to the Liftor platform, software, and underlying technology.</p>
              <p className="text-foreground">Users may access and use the platform only as permitted under these Terms.</p>
              <p className="text-foreground">Users may not:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>reverse engineer platform systems</li>
                <li>attempt to access proprietary platform architecture</li>
                <li>copy or distribute platform technology without authorisation</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">7. Platform Availability</h2>
              <p className="text-foreground">Liftor strives to maintain reliable platform operations.</p>
              <p className="text-foreground">However, the platform may experience interruptions, updates, or maintenance periods.</p>
              <p className="text-foreground">Liftor does not guarantee uninterrupted service availability.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">8. Limitation of Liability</h2>
              <p className="text-foreground">To the maximum extent permitted by applicable law, Liftor and its operators shall not be liable for indirect, incidental, or consequential damages arising from use of the platform.</p>
              <p className="text-foreground">Liftor provides infrastructure tools, and users remain responsible for how automation systems and AI outputs are used.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">9. Termination</h2>
              <p className="text-foreground">Liftor may suspend or terminate platform access if users:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>violate platform policies</li>
                <li>misuse platform systems</li>
                <li>engage in unlawful activity</li>
              </ul>
              <p className="text-foreground">Users may discontinue platform use at any time.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">10. Changes to the Terms</h2>
              <p className="text-foreground">Liftor may update these Terms periodically to reflect platform development, legal requirements, or operational changes.</p>
              <p className="text-foreground">Continued use of the platform after updates constitutes acceptance of the revised Terms.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">11. Governing Law</h2>
              <p className="text-foreground">These Terms are governed by the laws of the State of Delaware, United States.</p>
              <p className="text-foreground">Any disputes arising from these Terms will be subject to the jurisdiction of the appropriate courts within that jurisdiction.</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
            <Link to="/legal" className="text-primary hover:underline">Legal Hub</Link>
            <Link to="/legal/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
            <Link to="/legal/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
