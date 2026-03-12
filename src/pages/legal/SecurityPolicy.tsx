import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const SecurityPolicy = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Liftor Security Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            <section className="space-y-[18px] text-foreground">
              <p>This Security Policy describes the measures implemented to protect the Liftor platform and the information processed through it.</p>
              <p>Liftor provides infrastructure for automation systems, artificial intelligence tools, and operational workflows used by organisations around the world.</p>
              <p>Maintaining platform security and system integrity is a core priority.</p>
              <p>Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. Platform Infrastructure Security</h2>
              <p className="text-foreground">Liftor implements infrastructure protections designed to safeguard the platform and its services.</p>
              <p className="text-foreground">Security measures may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>secure cloud infrastructure</li>
                <li>network security controls</li>
                <li>encryption of communications</li>
                <li>system monitoring and logging</li>
                <li>access control systems</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. Access Management</h2>
              <p className="text-foreground">Access to platform systems and administrative tools is restricted to authorised personnel.</p>
              <p className="text-foreground">Access controls may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>authentication requirements</li>
                <li>role-based access controls</li>
                <li>monitoring of privileged activity</li>
                <li>periodic review of system access</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. Platform Monitoring</h2>
              <p className="text-foreground">Liftor monitors system performance and infrastructure activity to detect potential security threats or operational issues.</p>
              <p className="text-foreground">Monitoring systems may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>infrastructure monitoring tools</li>
                <li>security event logging</li>
                <li>anomaly detection systems</li>
                <li>operational alerts and notifications</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Data Protection</h2>
              <p className="text-foreground">Liftor implements safeguards designed to protect data processed through the platform.</p>
              <p className="text-foreground">These safeguards may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>encryption in transit</li>
                <li>secure infrastructure configuration</li>
                <li>controlled access to platform data</li>
                <li>monitoring of system activity</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">5. Security Incident Response</h2>
              <p className="text-foreground">Liftor maintains procedures for responding to potential security incidents.</p>
              <p className="text-foreground">These procedures may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>investigation of security alerts</li>
                <li>containment of identified threats</li>
                <li>remediation of vulnerabilities</li>
                <li>communication with affected parties when required</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">6. User Security Responsibilities</h2>
              <p className="text-foreground">Users are responsible for maintaining the security of their platform accounts.</p>
              <p className="text-foreground">Users should:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>protect login credentials</li>
                <li>use strong authentication practices</li>
                <li>avoid sharing account access</li>
                <li>report suspicious activity</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">7. Third-Party Services</h2>
              <p className="text-foreground">The Liftor platform may rely on third-party infrastructure providers and service partners.</p>
              <p className="text-foreground">These providers operate under their own security and compliance frameworks.</p>
              <p className="text-foreground">Liftor works with service providers that support reliable and secure platform operations.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">8. Security Improvements</h2>
              <p className="text-foreground">Liftor continuously evaluates and improves security practices in response to evolving risks and technological developments.</p>
              <p className="text-foreground">Security practices may change as the platform evolves.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">9. Policy Updates</h2>
              <p className="text-foreground">Liftor may update this Security Policy periodically.</p>
              <p className="text-foreground">Continued use of the platform after updates constitutes acceptance of the revised policy.</p>
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

export default SecurityPolicy;
