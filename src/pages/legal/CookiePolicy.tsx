import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const CookiePolicy = () => {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-[72px] pb-[88px]">
        <div className="mx-auto max-w-[900px] px-6" style={{ lineHeight: 1.6 }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Liftor Cookie Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: {today}</p>

          <div className="mt-[44px] space-y-[44px]">
            <section className="space-y-[18px] text-foreground">
              <p>This Cookie Policy explains how cookies and similar technologies are used when you access or use the Liftor platform and website.</p>
              <p>Liftor AI is operated by Global Solutions Management LLC, a company organised in the State of Delaware, United States.</p>
              <p>This policy should be read together with the Liftor Privacy Policy.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">1. What Are Cookies</h2>
              <p className="text-foreground">Cookies are small text files stored on your device when you visit a website or use an online service.</p>
              <p className="text-foreground">Cookies allow systems to recognise devices and remember certain information about user activity.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">2. How Liftor Uses Cookies</h2>
              <p className="text-foreground">Liftor may use cookies and similar technologies to support the operation of the platform.</p>
              <p className="text-foreground">These uses may include:</p>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>maintaining secure user sessions</li>
                <li>enabling core platform functionality</li>
                <li>remembering user preferences</li>
                <li>monitoring system performance</li>
                <li>analysing platform usage</li>
              </ul>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">3. Types of Cookies</h2>
              <p className="text-foreground">Liftor may use several types of cookies including:</p>
              <h3 className="text-lg font-medium text-foreground mt-4">Essential Cookies</h3>
              <p className="text-foreground">These cookies are necessary for the platform to function properly.</p>
              <h3 className="text-lg font-medium text-foreground mt-4">Functional Cookies</h3>
              <p className="text-foreground">These cookies remember user preferences and improve platform usability.</p>
              <h3 className="text-lg font-medium text-foreground mt-4">Analytics Cookies</h3>
              <p className="text-foreground">These cookies help analyse how users interact with the platform in order to improve services.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">4. Managing Cookies</h2>
              <p className="text-foreground">Most web browsers allow users to manage cookie preferences.</p>
              <p className="text-foreground">Users may choose to block or delete cookies through their browser settings.</p>
              <p className="text-foreground">However, disabling certain cookies may affect the functionality of the platform.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">5. Third-Party Cookies</h2>
              <p className="text-foreground">Some services integrated with the platform may use cookies provided by third parties.</p>
              <p className="text-foreground">These cookies are governed by the privacy policies of the relevant third-party providers.</p>
            </section>

            <section className="space-y-[18px]">
              <h2 className="text-2xl font-semibold text-foreground">6. Updates to This Policy</h2>
              <p className="text-foreground">Liftor may update this Cookie Policy periodically.</p>
              <p className="text-foreground">When changes are made, the "Last Updated" date at the top of this document will be revised.</p>
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

export default CookiePolicy;
