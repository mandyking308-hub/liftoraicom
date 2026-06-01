import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Building2, Landmark, Briefcase, Rocket, Monitor, Cog, Shield, TrendingUp, Server, RefreshCw } from "lucide-react";

const industries = [
  {
    icon: Building2,
    title: "Enterprise Organisations",
    desc: "Automation of complex operational systems. We help large organisations streamline operations through intelligent AI systems that integrate with existing infrastructure.",
  },
  {
    icon: Landmark,
    title: "Financial Services",
    desc: "Data platforms and reporting automation. From real-time analytics dashboards to automated compliance reporting, we build the data infrastructure financial institutions need.",
  },
  {
    icon: Briefcase,
    title: "Family Offices & Investment Firms",
    desc: "Private AI infrastructure for wealth management. Secure, bespoke platforms that provide portfolio intelligence, automated reporting, and operational efficiency.",
  },
  {
    icon: Monitor,
    title: "Technology & SaaS Companies",
    desc: "AI-native product infrastructure and intelligent automation layers. We engineer the core systems that power product innovation and operational scale.",
  },
  {
    icon: Rocket,
    title: "Professional Services Firms",
    desc: "Workflow automation and client delivery platforms. Intelligent systems that streamline engagement management, resource allocation, and knowledge capture.",
  },
  {
    icon: Cog,
    title: "Operations-Heavy Businesses",
    desc: "End-to-end operational automation for logistics, supply chain, and process-driven organisations. Systems that reduce manual overhead and increase throughput.",
  },
];

const pillars = [
  { icon: Shield, label: "Security", desc: "Enterprise-grade architecture designed with data protection, access control, and operational integrity." },
  { icon: TrendingUp, label: "Scalability", desc: "Systems engineered to evolve with your organisation as operations grow and complexity increases." },
  { icon: Server, label: "Operational Reliability", desc: "Infrastructure built for real-world operational environments with monitoring, resilience, and performance stability." },
  { icon: RefreshCw, label: "Long-Term Evolution", desc: "AI systems that continuously improve through learning, optimisation, and strategic intelligence." },
];

const Industries = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Industries we serve | Liftor AI" description="AI systems engineering for enterprise organisations, financial services, family offices, SaaS companies, and operational businesses." />
    <Navbar />

    {/* Hero */}
    <section className="pt-32 pb-16">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Sectors
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Industries We Serve
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed">
            We work with organisations across sectors that demand precision, security, and intelligent automation.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8">
            <div className="w-20 h-px bg-primary/10" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Industry Cards */}
    <section className="pb-24">
      <div className="container">
        <div className="grid gap-6 sm:grid-cols-2">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="group tech-card !p-8 hover:-translate-y-1 transition-all duration-500"
            >
              <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 group-hover:shadow-[0_0_16px_-4px_hsl(195_100%_50%/0.3)] transition-all duration-500">
                <ind.icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">{ind.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{ind.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Infrastructure-First Approach */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-medium tracking-[0.3em] uppercase text-primary/70 mb-4">
            Our Approach
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Infrastructure-First <span className="text-gradient">Approach</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed mb-12">
            Liftor designs intelligent infrastructure rather than isolated tools. Every system integrates with existing operations and evolves with the organisation.
          </motion.p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto">
          {pillars.map((p, i) => (
            <motion.div
              key={p.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="tech-card text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                <p.icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-semibold mb-2">{p.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="pb-[120px] max-sm:pb-20 section-dark relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/4 blur-[120px]" />
      <div className="container relative z-10 text-center pt-[120px] max-sm:pt-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold mb-4">
            Build <span className="text-gradient">Intelligent Infrastructure</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
            Tell us about your organisation and the systems you want to build.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Button variant="glow" size="lg" className="w-full sm:w-auto shadow-[0_0_30px_-5px_hsl(195_100%_50%/0.25)]" asChild>
              <Link to="/project-discovery">Start a Project</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Industries;
