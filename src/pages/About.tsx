import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Brain, Workflow, BarChart3 } from "lucide-react";

const buildCards = [
  {
    icon: Brain,
    title: "AI Operational Platforms",
    desc: "Intelligent operational platforms that combine AI agents, workflow automation, enterprise integrations, and real-time operational intelligence.",
  },
  {
    icon: Workflow,
    title: "Automation & Workflow Systems",
    desc: "Systems that allow organisations to automate complex processes, monitor operations continuously, and generate insights directly from their data.",
  },
  {
    icon: BarChart3,
    title: "Operational Intelligence",
    desc: "Infrastructure that strengthens operational capability and supports long-term organisational growth through continuous data-driven intelligence.",
  },
];

const capabilities = [
  { title: "AI Engineering", desc: "Expertise in artificial intelligence, machine learning models, and intelligent agent design powering automated decision-making." },
  { title: "Enterprise Architecture", desc: "Platforms built to scale, built to last, and built to evolve alongside the organisations that depend on them." },
  { title: "Automation Systems", desc: "Every system we build prioritises operational resilience, security, and long-term maintainability across complex environments." },
];

const About = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="About Liftor AI" description="Liftor AI is an AI systems engineering company building intelligent operational platforms for modern organisations." />
    <Navbar />

    {/* Hero */}
    <section className="pt-32 pb-[120px] max-sm:pb-20">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-[720px]">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Company
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            About Liftor AI
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed mb-4">
            Liftor AI is an AI systems engineering company focused on building intelligent operational platforms for modern organisations.
          </motion.p>
          <motion.p variants={fadeUp} custom={3} className="text-lg text-muted-foreground leading-relaxed">
            Our work combines artificial intelligence, automation, enterprise integrations, and operational intelligence to create systems that allow organisations to operate more efficiently, make faster decisions, and scale complex operations.
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* Our Story — two-column */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: "hsl(220 18% 9%)" }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-12 lg:grid-cols-[280px_1fr] items-start"
        >
          <motion.div variants={fadeUp} custom={0}>
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">Origins</p>
            <h2 className="text-2xl sm:text-3xl font-bold">Our Story</h2>
          </motion.div>
          <motion.div variants={fadeUp} custom={1} className="max-w-[650px] space-y-4">
            <p className="text-muted-foreground leading-relaxed text-lg">
              Liftor AI was created from a simple observation: many organisations were trying to apply artificial intelligence to complex operational problems without the systems infrastructure required to support it.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              AI tools alone rarely solve operational challenges. Real impact comes from engineering systems that connect data, automate processes, and support decision-making across an entire organisation.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              The Liftor team comes from backgrounds in software engineering, data infrastructure, enterprise systems, and automation architecture. Through years of building platforms and complex integrations, we recognised that organisations needed more than software development.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              They needed engineered systems designed to support real operations.
            </p>
            <p className="text-foreground leading-relaxed text-lg font-medium">
              Liftor AI was built to deliver those systems.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* What We Build — cards */}
    <section className="py-[120px] max-sm:py-20">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mb-10">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Capabilities
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl font-bold mb-4">
            What We Build
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed">
            Liftor designs and deploys intelligent operational platforms that drive automation, analytics, and decision intelligence across enterprise environments.
          </motion.p>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-3">
          {buildCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="group tech-card !p-8 hover:-translate-y-1 transition-all duration-500"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <card.icon size={20} className="text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Global Engineering — two-column feature block */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: "hsl(220 18% 9%)" }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-12 lg:grid-cols-[280px_1fr] items-start"
        >
          <motion.div variants={fadeUp} custom={0}>
            <p className="text-sm font-medium text-primary tracking-widest uppercase mb-3">Reach</p>
            <h2 className="text-2xl sm:text-3xl font-bold">Global Engineering</h2>
          </motion.div>
          <motion.div variants={fadeUp} custom={1} className="max-w-[650px] space-y-4">
            <p className="text-muted-foreground leading-relaxed text-lg">
              Liftor AI works with organisations across industries and jurisdictions.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Because the systems we engineer are digital operational platforms, they can be deployed globally and integrated with existing enterprise environments regardless of geography.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Our architecture approach focuses on scalable, secure systems that support organisations operating across international markets and regulatory environments.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Engineering Capability — 3 columns */}
    <section className="py-[120px] max-sm:py-20">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mb-10">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Expertise
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl font-bold">
            Engineering Capability
          </motion.h2>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-3">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="group tech-card !p-8 hover:-translate-y-1 transition-all duration-500"
            >
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{cap.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Long-Term Partnership — centered highlight */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: "hsl(220 18% 9%)" }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/4 blur-[120px]" />
      <div className="container relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Commitment
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8">
            Long-Term Partnership
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-5">
            Liftor does not simply build systems and walk away.
          </motion.p>
          <motion.p variants={fadeUp} custom={3} className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-5">
            We remain involved in the evolution of the platforms we engineer, providing ongoing monitoring, optimisation, and operational support.
          </motion.p>
          <motion.p variants={fadeUp} custom={4} className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Our clients gain a long-term technology partner focused on improving operational performance and building systems that support their future growth.
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-[120px] max-sm:py-20 section-dark relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[140px]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="container relative z-10 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Build Your <span className="text-gradient">Intelligent System</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
            Tell us about your organisation and the systems you want to build. Our AI proposal engine will generate a structured solution outline.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Button variant="glow" size="lg" className="w-full sm:w-auto shadow-[0_0_30px_-5px_hsl(195_100%_50%/0.25)]" asChild>
              <Link to="/project-discovery">Start Your Project</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default About;
