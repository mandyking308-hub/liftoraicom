import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

const sections = [
  {
    title: "Our Story",
    paragraphs: [
      "Liftor AI was created from a simple observation: many organisations were trying to apply artificial intelligence to complex operational problems without the systems infrastructure required to support it.",
      "AI tools alone rarely solve operational challenges. Real impact comes from engineering systems that connect data, automate processes, and support decision-making across an entire organisation.",
      "The Liftor team comes from backgrounds in software engineering, data infrastructure, enterprise systems, and automation architecture. Through years of building platforms and complex integrations, we recognised that organisations needed more than software development.",
      "They needed engineered systems designed to support real operations.",
      "Liftor AI was built to deliver those systems.",
    ],
  },
  {
    title: "What We Build",
    paragraphs: [
      "Liftor designs and deploys intelligent operational platforms that combine AI agents, workflow automation, enterprise integrations, and real-time operational intelligence.",
      "These systems allow organisations to automate complex processes, monitor operations continuously, and generate insights directly from their data.",
      "Our focus is on building infrastructure that strengthens operational capability and supports long-term organisational growth.",
    ],
  },
  {
    title: "Global Engineering",
    paragraphs: [
      "Liftor AI works with organisations across industries and jurisdictions.",
      "Because the systems we engineer are digital operational platforms, they can be deployed globally and integrated with existing enterprise environments regardless of geography.",
      "Our architecture approach focuses on scalable, secure systems that support organisations operating across international markets and regulatory environments.",
    ],
  },
  {
    title: "Engineering Capability",
    paragraphs: [
      "Our team combines expertise in artificial intelligence, software engineering, enterprise architecture, and automation systems.",
      "We design platforms that are built to scale, built to last, and built to evolve alongside the organisations that depend on them.",
      "Every system we build prioritises operational resilience, security, and long-term maintainability.",
    ],
  },
  {
    title: "Long-Term Partnership",
    paragraphs: [
      "Liftor does not simply build systems and walk away.",
      "We remain involved in the evolution of the platforms we engineer, providing ongoing monitoring, optimisation, and operational support.",
      "Our clients gain a long-term technology partner focused on improving operational performance and building systems that support their future growth.",
    ],
  },
];

const About = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="pt-32 pb-24">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
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

    {/* Content Sections */}
    {sections.map((section, sIdx) => (
      <section
        key={section.title}
        className={sIdx % 2 === 0 ? "pb-24" : "py-24 relative overflow-hidden"}
        style={sIdx % 2 !== 0 ? { background: "hsl(220 18% 9%)" } : undefined}
      >
        {sIdx % 2 !== 0 && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        )}
        <div className="container max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-bold mb-6">
              {section.title}
            </motion.h2>
            <div className="space-y-4">
              {section.paragraphs.map((p, pIdx) => (
                <motion.p
                  key={pIdx}
                  variants={fadeUp}
                  custom={pIdx + 1}
                  className="text-muted-foreground leading-relaxed text-lg"
                >
                  {p}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    ))}

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
