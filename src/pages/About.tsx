import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const About = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    <section className="pt-32 pb-24">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Company
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            About Liftor AI
          </motion.h1>
        </motion.div>
      </div>
    </section>

    <section className="pb-24">
      <div className="container max-w-3xl space-y-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="text-2xl font-semibold mb-4">Our Philosophy</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            Liftor AI builds intelligent systems that allow organisations to operate more efficiently through automation and artificial intelligence. We are not a web agency — we are an AI systems engineering studio.
          </p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
          <h2 className="text-2xl font-semibold mb-4">Engineering Capability</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            Our team combines deep expertise in AI, software engineering, and systems architecture. We design platforms that are built to scale, built to last, and built to evolve alongside your organisation.
          </p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
          <h2 className="text-2xl font-semibold mb-4">Long-Term Partnership</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            We don't just build and leave. Liftor AI provides ongoing operational support — monitoring, optimising, and evolving the systems we engineer. Our clients gain a long-term technology partner invested in their success.
          </p>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default About;
