import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, Cpu, Layers, Clock, ExternalLink, PoundSterling, TrendingUp, Download } from "lucide-react";
import ArchitectureDiagram from "@/components/proposal/ArchitectureDiagram";
import SystemCredibilitySection from "@/components/home/SystemCredibilitySection";

const generateProposalPDF = (form: FormData, proposal: Proposal) => {
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const archList = (proposal.architecture_components || [])
    .map((c) => `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;">${c.name}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;text-transform:capitalize;">${c.type}</td></tr>`)
    .join("");

  const costRows = (proposal.estimated_cost_breakdown || [])
    .map((c) => `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;">${c.category}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;font-size:13px;text-align:right;">${c.estimate}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AI System Proposal – ${form.companyName}</title>
<style>
  @page { margin: 30mm 20mm; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
  .cover { text-align: center; padding: 80px 0 60px; page-break-after: always; }
  .cover h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px; color: #0f172a; }
  .cover .subtitle { font-size: 16px; color: #64748b; margin: 0 0 40px; }
  .cover .meta { font-size: 13px; color: #94a3b8; }
  .cover .meta span { display: block; margin: 4px 0; }
  .cover .logo { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #6366f1; margin-bottom: 60px; }
  h2 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 36px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
  h3 { font-size: 14px; font-weight: 600; color: #334155; margin: 20px 0 8px; }
  p, li { font-size: 13px; color: #475569; }
  ul { padding-left: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { padding: 8px 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12px; text-align: left; font-weight: 600; color: #334155; }
  .highlight-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 16px 0; }
  .highlight-box .big { font-size: 24px; font-weight: 700; color: #0f172a; margin: 4px 0; }
  .roi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
  .roi-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; }
  .roi-card .label { font-size: 11px; color: #64748b; margin: 0 0 4px; }
  .roi-card .value { font-size: 18px; font-weight: 700; color: #166534; margin: 0; }
  .disclaimer { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 32px 0; page-break-inside: avoid; }
  .disclaimer h2 { color: #92400e; border-bottom-color: #fde68a; margin-top: 0; }
  .disclaimer p { font-size: 12px; color: #78716c; }
  .next-steps { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; }
  .vs-bar { display: flex; align-items: center; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center; }
  .vs-bar > div { flex: 1; }
  .vs-bar .arrow { flex: 0; color: #94a3b8; font-size: 20px; }
  @media print { body { padding: 0; } .cover { padding: 120px 0 80px; } }
</style></head><body>

<div class="cover">
  <div class="logo">LIFTOR AI</div>
  <h1>AI System Proposal</h1>
  <p class="subtitle">Prepared by Liftor AI</p>
  <div class="meta">
    <span>${date}</span>
    <span>${form.industry} · ${form.projectTypes.join(", ")}</span>
    <span>${form.companyName}</span>
  </div>
</div>

<h2>1. Executive Summary</h2>
<p>${proposal.suggested_solution}</p>

<h2>2. System Architecture Overview</h2>
<p>The proposed system comprises the following major components:</p>
${archList ? `<table><thead><tr><th>Component</th><th>Type</th></tr></thead><tbody>${archList}</tbody></table>` : "<p>Architecture details will be defined during technical discovery.</p>"}

<h2>3. Implementation Scope</h2>
<p>${proposal.estimated_scope}</p>

<h2>4. Implementation Timeline</h2>
<p><strong>Estimated Timeline:</strong> ${proposal.estimated_timeline}</p>
<p>The implementation will follow structured phases:</p>
<ul>
  <li><strong>Phase 1:</strong> Architecture Design & Technical Discovery</li>
  <li><strong>Phase 2:</strong> Platform Development & AI Agent Engineering</li>
  <li><strong>Phase 3:</strong> Integration, Testing & Quality Assurance</li>
  <li><strong>Phase 4:</strong> Deployment, Optimisation & Handover</li>
</ul>

${proposal.estimated_cost_range ? `
<h2>5. Estimated Investment</h2>
<div class="highlight-box">
  <p style="font-size:12px;color:#64748b;margin:0;">Total Estimated Investment</p>
  <p class="big">${proposal.estimated_cost_range}</p>
</div>
${costRows ? `<table><thead><tr><th>Category</th><th style="text-align:right;">Estimate</th></tr></thead><tbody>${costRows}</tbody></table>` : ""}
<p style="font-size:11px;color:#94a3b8;">Investment estimates are indicative and depend on system complexity, integrations, and deployment scale.</p>
` : ""}

${proposal.estimated_annual_savings ? `
<h2>6. Projected Business Impact</h2>
<div class="roi-grid">
  <div class="roi-card"><p class="label">Annual Operational Savings</p><p class="value">${proposal.estimated_annual_savings}</p></div>
  <div class="roi-card"><p class="label">Return on Investment</p><p class="value">${proposal.estimated_roi_period}</p></div>
  <div class="roi-card"><p class="label">Productivity Improvement</p><p class="value">${proposal.estimated_productivity_gain}</p></div>
</div>
<h3>Strategic Impact</h3>
<p>${proposal.estimated_roi_summary}</p>
${proposal.estimated_cost_range ? `
<div class="vs-bar">
  <div><p style="font-size:11px;color:#64748b;margin:0 0 4px;">Investment</p><p style="font-size:14px;font-weight:600;margin:0;">${proposal.estimated_cost_range}</p></div>
  <div class="arrow">→</div>
  <div><p style="font-size:11px;color:#64748b;margin:0 0 4px;">Expected Annual Savings</p><p style="font-size:14px;font-weight:600;color:#166534;margin:0;">${proposal.estimated_annual_savings}</p></div>
</div>` : ""}
` : ""}

<div class="disclaimer">
  <h2>Important Notice</h2>
  <p>This document provides an indicative system proposal generated using automated analysis based on the information provided.</p>
  <p>All cost estimates, timelines, and potential business impacts are illustrative estimates only and are not legally binding.</p>
  <p>Actual project scope, implementation costs, timelines, and financial outcomes may vary significantly following detailed technical discovery and requirements analysis.</p>
  <p>No contractual obligations or commitments are created by this document.</p>
  <p>A formal statement of work and commercial agreement will be required before any implementation work begins.</p>
</div>

<div class="next-steps">
  <h2 style="margin-top:0;">Next Steps</h2>
  <p>To progress this proposal, a technical discovery session will be conducted to validate system requirements, integrations, and operational goals.</p>
  <p>Following discovery, a formal architecture specification and implementation proposal will be prepared.</p>
</div>

</body></html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) { toast.error("Please allow popups to download the PDF"); return; }
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
  toast.success("PDF export opened — use 'Save as PDF' in the print dialog");
};

const TOTAL_STEPS = 7;

const projectTypeOptions = [
  "AI Agents",
  "Business Process Automation",
  "Custom AI Platform",
  "Internal Dashboard / Operations System",
  "Data Analysis System",
  "Enterprise AI Transformation",
  "Not sure / need advice",
];

const processOptions = [
  "Customer Support",
  "Data Processing",
  "Document Analysis",
  "Reporting",
  "Workflow Management",
  "Financial Analysis",
  "Internal Operations",
];

const scaleOptions = [
  { value: "small", label: "Small Internal Tool" },
  { value: "department", label: "Department Automation" },
  { value: "org-wide", label: "Organisation-Wide System" },
  { value: "enterprise", label: "Global / Enterprise Platform" },
];

const timelineOptions = [
  { value: "immediately", label: "Immediately" },
  { value: "3-months", label: "Within 3 Months" },
  { value: "6-months", label: "Within 6 Months" },
  { value: "exploratory", label: "Exploratory Stage" },
];

const companySizeOptions = [
  "1–10 employees",
  "10–50 employees",
  "50–200 employees",
  "200–1000 employees",
  "1000+",
];

interface FormData {
  companyName: string;
  industry: string;
  companySize: string;
  websiteUrl: string;
  contactName: string;
  contactEmail: string;
  projectTypes: string[];
  businessProblem: string;
  processesToAutomate: string[];
  customProcess: string;
  projectScale: string;
  timeline: string;
}

interface ArchComponent {
  name: string;
  type: string;
}

interface CostBreakdownItem {
  category: string;
  estimate: string;
}

interface Proposal {
  suggested_solution: string;
  estimated_scope: string;
  estimated_timeline: string;
  architecture_components?: ArchComponent[];
  estimated_cost_range?: string;
  estimated_cost_breakdown?: CostBreakdownItem[];
  estimated_roi_summary?: string;
  estimated_annual_savings?: string;
  estimated_roi_period?: string;
  estimated_productivity_gain?: string;
}

const featureCards = [
  { icon: Cpu, title: "System Architecture Design", desc: "AI recommends a high-level architecture for your intelligent system." },
  { icon: Layers, title: "Implementation Scope", desc: "Receive a structured breakdown of workflows, integrations, and automation components." },
  { icon: Clock, title: "Project Timeline", desc: "Get an estimated implementation timeline based on system complexity." },
  { icon: PoundSterling, title: "Investment Estimate", desc: "Receive an enterprise-grade cost estimate with a detailed engineering breakdown." },
  { icon: TrendingUp, title: "ROI Forecast", desc: "See projected annual savings, payback period, and productivity gains." },
];

const howItWorksSteps = [
  { step: "01", title: "Describe Your Organisation", text: "Tell us about your company, industry, and current operations." },
  { step: "02", title: "Define Your System Goals", text: "Explain the processes you want to automate or intelligence systems you want to build." },
  { step: "03", title: "AI Generates Your Proposal", text: "Liftor AI produces a structured system proposal with architecture and delivery estimates." },
];

const AIProposal = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>({
    companyName: "",
    industry: "",
    companySize: "",
    websiteUrl: "",
    contactName: "",
    contactEmail: "",
    projectTypes: [],
    businessProblem: "",
    processesToAutomate: [],
    customProcess: "",
    projectScale: "",
    timeline: "",
  });

  const update = (field: keyof FormData, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: "projectTypes" | "processesToAutomate", item: string) => {
    setForm((prev) => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item] };
    });
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!(form.companyName && form.industry && form.companySize);
      case 2: return form.projectTypes.length > 0;
      case 3: return form.businessProblem.length > 10;
      case 4: return form.processesToAutomate.length > 0;
      case 5: return !!form.projectScale;
      case 6: return !!form.timeline;
      default: return true;
    }
  };

  const generateProposal = async () => {
    setLoading(true);
    try {
      const allProcesses = [...form.processesToAutomate];
      if (form.customProcess.trim()) allProcesses.push(form.customProcess.trim());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      let data;
      let error;
      try {
        const result = await supabase.functions.invoke("generate-proposal", {
          body: {
            projectTypes: form.projectTypes,
            businessProblem: form.businessProblem,
            processesToAutomate: allProcesses,
            projectScale: form.projectScale,
            timeline: form.timeline,
            industry: form.industry,
          },
        });
        data = result.data;
        error = result.error;
      } catch (abortErr: any) {
        if (abortErr?.name === "AbortError") {
          throw new Error("Generating your proposal is taking longer than expected. Please try again.");
        }
        throw abortErr;
      } finally {
        clearTimeout(timeoutId);
      }

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Schema integrity validation
      const isValid =
        typeof data?.suggested_solution === "string" && data.suggested_solution.length > 0 &&
        typeof data?.estimated_scope === "string" && data.estimated_scope.length > 0 &&
        typeof data?.estimated_timeline === "string" && data.estimated_timeline.length > 0;

      if (!isValid) {
        console.error("Schema validation failed:", data);
        throw new Error("Proposal generation encountered a formatting issue. Please try again.");
      }

      // Ensure architecture_components is an array (graceful fallback)
      if (!Array.isArray(data.architecture_components)) {
        data.architecture_components = [];
      }

      setProposal(data);
      setStep(7);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to generate proposal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitProposal = async () => {
    if (!proposal) return;
    setSubmitting(true);
    try {
      const allProcesses = [...form.processesToAutomate];
      if (form.customProcess.trim()) allProcesses.push(form.customProcess.trim());

      const { error } = await supabase.from("proposals").insert({
        company_name: form.companyName,
        industry: form.industry,
        company_size: form.companySize,
        website_url: form.websiteUrl || null,
        contact_name: form.contactName || null,
        contact_email: form.contactEmail || null,
        project_types: form.projectTypes,
        business_problem: form.businessProblem,
        processes_to_automate: allProcesses,
        project_scale: form.projectScale,
        timeline: form.timeline,
        ai_suggested_solution: proposal.suggested_solution,
        ai_estimated_scope: proposal.estimated_scope,
        ai_estimated_timeline: proposal.estimated_timeline,
        ai_estimated_cost_range: proposal.estimated_cost_range || null,
        ai_estimated_cost_breakdown: (proposal.estimated_cost_breakdown || null) as any,
        ai_estimated_roi_summary: proposal.estimated_roi_summary || null,
        ai_estimated_annual_savings: proposal.estimated_annual_savings || null,
        ai_estimated_roi_period: proposal.estimated_roi_period || null,
        ai_estimated_productivity_gain: proposal.estimated_productivity_gain || null,
      } as any);

      if (error) throw error;

      // Save architecture to the architectures table
      if (proposal.architecture_components && proposal.architecture_components.length > 0) {
        const typeToSystemType: Record<string, string> = {
          system: "platform",
          agent: "ai_agent_system",
          workflow: "automation_system",
          integration: "integration_layer",
          interface: "platform",
        };
        const primaryType = proposal.architecture_components[0]?.type || "system";

        const { data: archData, error: archError } = await supabase.from("architectures").insert({
          name: `${form.companyName} – AI Proposed Architecture`,
          client_organisation: form.companyName,
          system_type: typeToSystemType[primaryType] || "platform",
          system_purpose: proposal.suggested_solution,
          status: "draft",
        }).select("id").single();

        if (!archError && archData) {
          const compRows = proposal.architecture_components.map((comp, idx) => ({
            architecture_id: archData.id,
            name: comp.name,
            component_type: comp.type === "system" ? "data_layer" : comp.type,
            order_index: idx,
          }));
          await supabase.from("architecture_components").insert(compRows);
        }
      }

      setSubmitted(true);
      toast.success("Proposal submitted successfully.");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 6) {
      generateProposal();
    } else {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  };

  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const progressPercent = proposal ? 100 : ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-32 pb-24">
          <div className="container max-w-2xl text-center">
            <motion.div initial="hidden" animate="visible">
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6">
                <CheckCircle2 size={40} />
              </motion.div>
              <motion.h1 variants={fadeUp} custom={1} className="text-4xl font-bold mb-4">
                Proposal Submitted
              </motion.h1>
              <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground">
                Thank you, {form.companyName}. Our team will review your proposal and be in touch shortly.
              </motion.p>
            </motion.div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="container max-w-4xl text-center">
          <motion.div initial="hidden" animate="visible">
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-4">
              AI Proposal Generator
            </motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl font-bold mb-5">
              Design Your AI System
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-2xl mx-auto leading-relaxed text-lg">
              Tell us about your organisation and the systems you want to build. Our AI will generate a structured proposal including architecture recommendations, automation workflows, and an estimated implementation timeline.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <SystemCredibilitySection />

      {/* Generate an AI System Proposal */}
      <section className="pb-16">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-bold mb-4">
              Generate an AI System Proposal
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Liftor's AI analyses your organisation's requirements and produces a structured proposal for building intelligent systems. The proposal includes recommended architecture, automation workflows, integration points, and a delivery timeline.
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((card, i) => (
              <motion.div key={card.title} variants={fadeUp} custom={i} className="tech-card !p-6 flex flex-col">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <card.icon size={20} />
                </div>
                <h3 className="text-base font-semibold mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="pb-16">
        <div className="container max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-bold">
              How It Works
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid md:grid-cols-3 gap-6">
            {howItWorksSteps.map((s, i) => (
              <motion.div key={s.step} variants={fadeUp} custom={i} className="tech-card !p-6 flex flex-col">
                <span className="text-2xl font-bold text-primary/40 mb-3">{s.step}</span>
                <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Example AI Output */}
      <section className="pb-20">
        <div className="container max-w-3xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-8">
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-bold">
              Example AI Output
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div variants={fadeUp} custom={0} className="tech-card !p-8 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={18} className="text-primary" />
                <h3 className="text-lg font-semibold">Example AI System Proposal</h3>
              </div>

              <div>
                <h4 className="text-xs font-medium text-primary tracking-widest uppercase mb-1">Suggested Solution</h4>
                <p className="text-sm">Enterprise Automation Platform with AI Agents</p>
              </div>

              <div>
                <h4 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Estimated Scope</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Workflow automation engine</li>
                  <li>• AI document processing agents</li>
                  <li>• Integration with CRM and financial systems</li>
                  <li>• Real-time operational analytics dashboard</li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Estimated Timeline</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Phase 1 – Architecture Design (2 weeks)</li>
                  <li>Phase 2 – System Development (6 weeks)</li>
                  <li>Phase 3 – Deployment & Optimisation (4 weeks)</li>
                </ul>
              </div>
            </motion.div>

            <motion.p variants={fadeUp} custom={1} className="text-xs text-muted-foreground text-center mt-4">
              This is an example of the structured proposal generated by Liftor AI.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="flex justify-center pb-16">
        <div className="w-20 h-px bg-primary/20" />
      </div>

      {/* Form */}
      <section className="pb-24">
        <div className="container max-w-2xl">
          <motion.div initial="hidden" animate="visible" className="mb-10">
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Start Your Proposal
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold mb-2">
              {step < 7 ? "Tell Us About Your Project" : "Your Proposal Outline"}
            </motion.h2>
          </motion.div>

          {/* Progress bar */}
          <div className="mb-10">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Step {Math.min(step, 6)} of 6</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="p-8 rounded-xl border border-border/50 bg-card"
            >
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold mb-4">Company Information</h2>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Company Name *</label>
                    <Input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Your company" className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Industry *</label>
                    <Input value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="e.g. Financial Services, Healthcare" className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Company Size *</label>
                    <Select value={form.companySize} onValueChange={(v) => update("companySize", v)}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select size" /></SelectTrigger>
                      <SelectContent>
                        {companySizeOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Website URL</label>
                    <Input value={form.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} placeholder="https://yourcompany.com" className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Primary Contact Name</label>
                    <Input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Full name" className="bg-secondary border-border" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email</label>
                    <Input type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} placeholder="contact@company.com" className="bg-secondary border-border" />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2">What type of system are you looking to build?</h2>
                  <p className="text-sm text-muted-foreground mb-4">Select all that apply.</p>
                  {projectTypeOptions.map((opt) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                      <Checkbox
                        checked={form.projectTypes.includes(opt)}
                        onCheckedChange={() => toggleArrayItem("projectTypes", opt)}
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2">Describe the problem your organisation is trying to solve.</h2>
                  <Textarea
                    value={form.businessProblem}
                    onChange={(e) => update("businessProblem", e.target.value)}
                    placeholder="Our team spends significant time reviewing documents and preparing reports..."
                    className="bg-secondary border-border min-h-[180px]"
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2">Which processes do you want to automate?</h2>
                  <p className="text-sm text-muted-foreground mb-4">Select all that apply.</p>
                  {processOptions.map((opt) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer">
                      <Checkbox
                        checked={form.processesToAutomate.includes(opt)}
                        onCheckedChange={() => toggleArrayItem("processesToAutomate", opt)}
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                  <div className="pt-2">
                    <label className="text-sm font-medium mb-1.5 block">Other (specify)</label>
                    <Input
                      value={form.customProcess}
                      onChange={(e) => update("customProcess", e.target.value)}
                      placeholder="Any other processes..."
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2">How large is the system expected to be?</h2>
                  {scaleOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        form.projectScale === opt.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                      }`}
                      onClick={() => update("projectScale", opt.value)}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        form.projectScale === opt.value ? "border-primary" : "border-muted-foreground"
                      }`}>
                        {form.projectScale === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-2">When would you like to start this project?</h2>
                  {timelineOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        form.timeline === opt.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                      }`}
                      onClick={() => update("timeline", opt.value)}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        form.timeline === opt.value ? "border-primary" : "border-muted-foreground"
                      }`}>
                        {form.timeline === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {step === 7 && proposal && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={20} className="text-primary" />
                    <h2 className="text-xl font-semibold">AI-Generated Proposal Outline</h2>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-1">Project Type</h3>
                      <p className="text-sm">{form.projectTypes.join(", ")}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-1">Key Problem Identified</h3>
                      <p className="text-sm text-muted-foreground">{form.businessProblem}</p>
                    </div>

                    {/* Suggested Solution */}
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Suggested AI Solution</h3>
                      <p className="text-sm leading-relaxed">{proposal.suggested_solution}</p>
                    </div>

                    {/* Architecture Diagram */}
                    {proposal.architecture_components && proposal.architecture_components.length > 0 && (
                      <div className="p-5 rounded-lg bg-secondary/50 border border-border/50">
                        <ArchitectureDiagram components={proposal.architecture_components} />
                      </div>
                    )}

                    {/* Estimated Scope */}
                    <div>
                      <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-1">Estimated System Complexity</h3>
                      <p className="text-sm text-muted-foreground">{proposal.estimated_scope}</p>
                    </div>

                    {/* Estimated Timeline */}
                    <div>
                      <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-1">Estimated Development Timeline</h3>
                      <p className="text-sm text-muted-foreground">{proposal.estimated_timeline}</p>
                    </div>

                    {/* Estimated Investment */}
                    {proposal.estimated_cost_range && (
                      <div className="p-5 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
                        <div>
                          <h3 className="text-xs font-medium text-primary tracking-widest uppercase mb-2">Estimated Investment</h3>
                          <p className="text-2xl font-bold">{proposal.estimated_cost_range}</p>
                        </div>

                        {proposal.estimated_cost_breakdown && proposal.estimated_cost_breakdown.length > 0 && (
                          <div className="grid gap-2">
                            {proposal.estimated_cost_breakdown.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-md bg-background/50 border border-border/30">
                                <span className="text-sm text-muted-foreground">{item.category}</span>
                                <span className="text-sm font-medium">{item.estimate}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Investment estimates are indicative and depend on system complexity, integrations, and deployment scale. Final pricing is confirmed following technical discovery.
                        </p>
                      </div>
                    )}

                    {/* Projected Business Impact (ROI) */}
                    {proposal.estimated_annual_savings && (
                      <div className="space-y-4">
                        <h3 className="text-xs font-medium text-primary tracking-widest uppercase">Projected Business Impact</h3>

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Annual Operational Savings</p>
                            <p className="text-lg font-bold text-green-400">{proposal.estimated_annual_savings}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Return on Investment</p>
                            <p className="text-lg font-bold text-green-400">{proposal.estimated_roi_period}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Productivity Improvement</p>
                            <p className="text-lg font-bold text-green-400">{proposal.estimated_productivity_gain}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                            <p className="text-xs text-muted-foreground mb-1">Strategic Impact</p>
                            <p className="text-sm leading-relaxed">{proposal.estimated_roi_summary}</p>
                          </div>
                        </div>

                        {/* Investment vs Savings visual */}
                        {proposal.estimated_cost_range && (
                          <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 border border-border/30">
                            <div className="flex-1 text-center">
                              <p className="text-xs text-muted-foreground mb-1">Investment</p>
                              <p className="text-sm font-semibold">{proposal.estimated_cost_range}</p>
                            </div>
                            <div className="text-muted-foreground">
                              <ArrowRight size={20} />
                            </div>
                            <div className="flex-1 text-center">
                              <p className="text-xs text-muted-foreground mb-1">Expected Annual Savings</p>
                              <p className="text-sm font-semibold text-green-400">{proposal.estimated_annual_savings}</p>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          ROI projections are indicative estimates based on comparable enterprise automation deployments. Actual results depend on implementation scope, adoption rate, and operational context.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 1 && step <= 7 ? (
              <Button variant="outline-light" onClick={prev} disabled={loading}>
                <ArrowLeft size={16} /> Back
              </Button>
            ) : <div />}

            {step < 7 && (
              <Button variant="glow" onClick={next} disabled={!canProceed() || loading}>
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Generating...</>
                ) : step === 6 ? (
                  <><Sparkles size={16} /> Generate AI Proposal</>
                ) : (
                  <>Next Step <ArrowRight size={16} /></>
                )}
              </Button>
            )}

            {step === 7 && proposal && (
              <div className="flex items-center gap-3">
                <Button variant="outline-light" onClick={() => generateProposalPDF(form, proposal)}>
                  <Download size={16} /> Download Full Proposal PDF
                </Button>
                <Button variant="glow" onClick={submitProposal} disabled={submitting}>
                  {submitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                  ) : (
                    <>Submit Proposal Request</>
                  )}
                </Button>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Your responses are used to generate an AI system proposal. No commitment required.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AIProposal;
