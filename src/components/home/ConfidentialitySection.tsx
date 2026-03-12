import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { ShieldCheck } from "lucide-react";

const ConfidentialitySection = () => (
  <section className="py-28 section-dark relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    <div className="container">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="max-w-2xl mx-auto text-center"
      >
        <motion.div variants={fadeUp} custom={0} className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-primary/20 bg-primary/5 text-primary mb-6">
          <ShieldCheck size={24} strokeWidth={1.5} />
        </motion.div>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold mb-6">
          Complete Client Confidentiality
        </motion.h2>
        <motion.div variants={fadeUp} custom={2} className="space-y-4 text-muted-foreground leading-relaxed">
          <p>Liftor operates with strict confidentiality standards. We do not publicly disclose client relationships. We do not publish project details without permission.</p>
          <p>Many organisations prefer to deploy AI infrastructure privately. We respect and protect that privacy.</p>
        </motion.div>
        <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap justify-center gap-3">
          {["No public disclosure", "No social media promotion", "Full discretion"].map((item) => (
            <span key={item} className="text-xs font-medium text-primary/70 border border-primary/15 rounded-full px-4 py-1.5">
              {item}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  </section>
);

export default ConfidentialitySection;
