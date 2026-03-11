
-- Manual pages: each page documents a platform module
CREATE TABLE public.manual_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL DEFAULT 'Platform Architecture',
  module_name text NOT NULL,
  purpose text DEFAULT '',
  core_functions text DEFAULT '',
  user_roles text DEFAULT '',
  connected_modules text DEFAULT '',
  data_inputs text DEFAULT '',
  data_outputs text DEFAULT '',
  operational_notes text DEFAULT '',
  content text DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage manual pages" ON public.manual_pages FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER update_manual_pages_updated_at BEFORE UPDATE ON public.manual_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Manual version history
CREATE TABLE public.manual_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number integer NOT NULL DEFAULT 1,
  summary text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage manual versions" ON public.manual_versions FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Build log (append-only)
CREATE TABLE public.build_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  module_affected text NOT NULL DEFAULT '',
  change_type text NOT NULL DEFAULT 'feature_added',
  author text NOT NULL DEFAULT 'Liftor AI',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.build_log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can view build log" ON public.build_log_entries FOR SELECT USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "Founders can insert build log" ON public.build_log_entries FOR INSERT WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- Seed the 24 module pages
INSERT INTO public.manual_pages (section, module_name, purpose, order_index) VALUES
  ('Platform Architecture', 'Public Website', 'Public-facing marketing website for Liftor AI, showcasing services and driving lead generation.', 1),
  ('Platform Architecture', 'AI Proposal Generator', 'Generates AI-powered project proposals from discovery form submissions.', 2),
  ('Platform Architecture', 'Client Portal', 'Secure portal for clients to view projects, documents, messages, and system status.', 3),
  ('Platform Architecture', 'Founder Console', 'Internal administrative dashboard for managing all platform operations.', 4),
  ('Platform Architecture', 'Partner Portal', 'Portal for referral and delivery partners to submit opportunities and collaborate.', 5),
  ('System Modules', 'Subscription Maintenance System', 'Manages ongoing maintenance subscriptions, scheduled events, and feature requests.', 6),
  ('System Modules', 'System Monitoring Dashboard', 'Real-time monitoring of all deployed client systems with health and performance metrics.', 7),
  ('AI Agents', 'AI Agent Management Framework', 'Registry and management of all AI agents across the platform.', 8),
  ('Automation Systems', 'Workflow Automation Builder', 'Design and configure automation workflows for client systems.', 9),
  ('Automation Systems', 'Automation Execution Engine', 'Core engine for executing workflow automations with step-by-step tracking.', 10),
  ('System Modules', 'Operations Command Center', 'Unified command center for real-time operational awareness.', 11),
  ('Automation Systems', 'Enterprise Process Automation Designer', 'Maps business processes and identifies automation opportunities.', 12),
  ('Platform Architecture', 'AI System Architecture Designer', 'Visual architecture design tool for planning system components and relationships.', 13),
  ('Deployment Systems', 'Deployment & Launch Manager', 'Manages deployment pipelines, launch checklists, and go-live processes.', 14),
  ('System Modules', 'Client System Control Panel', 'Client-facing control panel for managing their deployed systems.', 15),
  ('System Modules', 'Analytics & Performance Dashboard', 'Platform-wide analytics covering systems, workflows, agents, and performance.', 16),
  ('Automation Systems', 'Automation Optimisation Engine', 'Identifies optimisation opportunities across workflows and agents.', 17),
  ('Knowledge Base', 'Knowledge Base & System Memory', 'Centralised knowledge repository linking documentation to agents and workflows.', 18),
  ('System Modules', 'Global Operations Manager', 'Cross-organisation operational overview of all active systems.', 19),
  ('Organisation Structure', 'Organisation Management Layer', 'Manages organisations, members, documents, and system assignments.', 20),
  ('Security & Compliance', 'Role & Access Control System', 'Enterprise RBAC with permission management and audit logging.', 21),
  ('Security & Compliance', 'Security & Compliance System', 'Security monitoring, compliance tracking, and risk assessment.', 22),
  ('Template Library', 'Template Library', 'Reusable system templates for rapid platform deployment.', 23),
  ('Platform Expansion System', 'Platform Expansion Manager', 'Launch new ventures and operational systems using templates.', 24);
