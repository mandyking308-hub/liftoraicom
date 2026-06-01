import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";

const PrivacyPolicy = () => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="Privacy policy | Liftor AI" description="How Liftor AI collects, processes, and safeguards personal and client data." />
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          {/* Header */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Liftor Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            {/* Introduction */}
            <section className="space-y-[18px] text-foreground">
              <p>
                Liftor AI ("Liftor", "we", "our", or "us") operates a global artificial intelligence infrastructure platform designed to enable organisations to build, deploy, and manage automation systems, AI agents, and digital workflows.
              </p>
              <p>
                This Privacy Policy explains how we collect, use, process, store, and protect information when you access or use the Liftor platform, website, applications, or services (collectively, the "Platform").
              </p>
              <p>
                Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.
              </p>
              <p>
                By using the Liftor platform, you acknowledge and agree to the data practices described in this Privacy Policy.
              </p>
            </section>

            {/* Section 1 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
              <p className="text-foreground">
                We may collect several categories of information from users of the Liftor platform, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>account registration information such as name, email address, and organisation details</li>
                <li>user authentication and login information</li>
                <li>system usage data and platform interaction data</li>
                <li>automation configuration data and workflow inputs</li>
                <li>AI interaction data submitted through platform tools</li>
                <li>system diagnostics, logs, and monitoring information</li>
                <li>billing, payment, and subscription information</li>
                <li>communications submitted through support or platform messaging systems</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. How We Use Information</h2>
              <p className="text-foreground">
                Liftor uses collected information for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>to operate and maintain the Liftor platform</li>
                <li>to provide AI automation and workflow services</li>
                <li>to manage user accounts and organisational environments</li>
                <li>to monitor platform performance and system reliability</li>
                <li>to improve platform features and automation capabilities</li>
                <li>to provide customer support and technical assistance</li>
                <li>to maintain platform security and detect misuse</li>
                <li>to comply with applicable legal obligations</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. AI and Automation Data Processing</h2>
              <p className="text-foreground">
                Liftor provides systems that enable organisations to deploy automation workflows and artificial intelligence tools.
              </p>
              <p className="text-foreground">
                Data submitted to the platform may be processed by AI systems and automation engines to execute tasks, generate outputs, and optimise workflows.
              </p>
              <p className="text-foreground">
                Users remain responsible for ensuring they have appropriate legal rights and permissions to submit any data processed by the Liftor platform.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Enterprise and Organisational Accounts</h2>
              <p className="text-foreground">
                Many Liftor users access the platform on behalf of organisations.
              </p>
              <p className="text-foreground">
                Where accounts are created under an organisational domain or enterprise environment, the organisation may control administrative access to platform data associated with its users.
              </p>
              <p className="text-foreground">
                Organisational administrators may be able to manage user access and review data generated within the organisation's platform environment.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">5. Data Storage and Security</h2>
              <p className="text-foreground">
                Liftor implements technical and organisational measures designed to protect information against unauthorised access, loss, misuse, or alteration.
              </p>
              <p className="text-foreground">Security measures may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>encrypted communications</li>
                <li>infrastructure security controls</li>
                <li>authentication systems</li>
                <li>monitoring and logging systems</li>
                <li>access management controls</li>
              </ul>
              <p className="text-foreground">
                No system can guarantee absolute security, but we continuously monitor and improve platform protections.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">6. Data Sharing</h2>
              <p className="text-foreground">Liftor does not sell personal information.</p>
              <p className="text-foreground">
                Information may be shared only in limited circumstances including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>with infrastructure providers supporting the platform</li>
                <li>with service providers performing operational functions</li>
                <li>when required by law, regulation, or legal process</li>
                <li>to protect the rights, security, or safety of Liftor, its users, or the public</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">7. Data Retention</h2>
              <p className="text-foreground">
                Liftor retains personal data only for as long as necessary to operate the platform, comply with legal obligations, resolve disputes, and enforce agreements.
              </p>
              <p className="text-foreground">
                Retention periods may vary depending on the type of information involved and applicable legal requirements.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">8. International Data Transfers</h2>
              <p className="text-foreground">
                Liftor operates globally. Information collected through the platform may be processed or stored in jurisdictions outside the user's country of residence.
              </p>
              <p className="text-foreground">
                Where required by applicable law, appropriate safeguards will be implemented to support lawful international data transfers.
              </p>
            </section>

            {/* Section 9 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">9. Legal Basis for Processing</h2>
              <p className="text-foreground">
                Where applicable under data protection laws such as the General Data Protection Regulation (GDPR) and UK GDPR, Liftor processes personal data based on the following legal grounds:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>performance of contractual obligations</li>
                <li>legitimate interests in operating and improving the platform</li>
                <li>compliance with legal obligations</li>
                <li>user consent where required by law</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">10. User Rights</h2>
              <p className="text-foreground">
                Depending on your jurisdiction, you may have rights regarding your personal data including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>access to personal information</li>
                <li>correction of inaccurate data</li>
                <li>deletion of personal data</li>
                <li>restriction of processing</li>
                <li>data portability</li>
              </ul>
              <p className="text-foreground">
                Requests may be submitted through platform support channels.
              </p>
            </section>

            {/* Section 11 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">11. Cookies and Tracking Technologies</h2>
              <p className="text-foreground">
                Liftor may use cookies and similar technologies to support platform functionality, improve user experience, and analyse system usage.
              </p>
              <p className="text-foreground">
                Further details are provided in the Liftor Cookie Policy.
              </p>
            </section>

            {/* Section 12 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">12. Children's Data</h2>
              <p className="text-foreground">
                Liftor services are not intended for children under the age required to provide legal consent under applicable law.
              </p>
              <p className="text-foreground">We do not knowingly collect personal data from children.</p>
              <p className="text-foreground">If such information is identified, it will be removed.</p>
            </section>

            {/* Section 13 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">13. Changes to This Privacy Policy</h2>
              <p className="text-foreground">Liftor may update this Privacy Policy periodically.</p>
              <p className="text-foreground">
                When changes are made, the "Last Updated" date at the top of this document will be revised.
              </p>
              <p className="text-foreground">
                Continued use of the platform after updates constitutes acceptance of the revised policy.
              </p>
            </section>

            {/* Section 14 */}
            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">14. Contact</h2>
              <p className="text-foreground">
                Questions regarding this Privacy Policy may be directed through the Liftor platform or official support channels.
              </p>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-6 text-sm">
            <Link to="/legal" className="text-primary hover:underline">Legal Hub</Link>
            <Link to="/legal/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
            <Link to="/legal/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
