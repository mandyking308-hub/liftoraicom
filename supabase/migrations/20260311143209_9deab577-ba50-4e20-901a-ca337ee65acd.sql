
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'founder', 'client');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Add a lead_status column to proposals for the pipeline
ALTER TABLE public.proposals ADD COLUMN lead_status TEXT NOT NULL DEFAULT 'new_inquiry';

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Only founders can read activity log
CREATE POLICY "Founders can view activity log" ON public.activity_log
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

-- Allow service role / triggers to insert
CREATE POLICY "System can insert activity" ON public.activity_log
  FOR INSERT WITH CHECK (true);

-- Update proposals RLS: founders can read all proposals
DROP POLICY IF EXISTS "Service role can read proposals" ON public.proposals;
CREATE POLICY "Founders can read all proposals" ON public.proposals
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

-- Founders can update proposals (for lead_status changes)
CREATE POLICY "Founders can update proposals" ON public.proposals
  FOR UPDATE USING (public.has_role(auth.uid(), 'founder'));

-- Update projects RLS: founders can read all projects
CREATE POLICY "Founders can view all projects" ON public.projects
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

-- Founders can insert/update projects
CREATE POLICY "Founders can create projects" ON public.projects
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can update projects" ON public.projects
  FOR UPDATE USING (public.has_role(auth.uid(), 'founder'));

-- Founders can view all stages
CREATE POLICY "Founders can view all stages" ON public.project_stages
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can manage stages" ON public.project_stages
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can update stages" ON public.project_stages
  FOR UPDATE USING (public.has_role(auth.uid(), 'founder'));

-- Founders can view all milestones
CREATE POLICY "Founders can view all milestones" ON public.project_milestones
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can manage milestones" ON public.project_milestones
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can update milestones" ON public.project_milestones
  FOR UPDATE USING (public.has_role(auth.uid(), 'founder'));

-- Founders can view all updates
CREATE POLICY "Founders can view all updates" ON public.project_updates
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can post updates" ON public.project_updates
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'founder'));

-- Founders can view all documents
CREATE POLICY "Founders can view all documents" ON public.project_documents
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can manage documents" ON public.project_documents
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'founder'));

-- Founders can view all messages
CREATE POLICY "Founders can view all messages" ON public.project_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can send messages" ON public.project_messages
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'founder'));

-- Founders can view all support requests
CREATE POLICY "Founders can view all support requests" ON public.support_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can update support requests" ON public.support_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'founder'));

-- Founders can view all profiles
CREATE POLICY "Founders can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

-- Activity log trigger for new proposals
CREATE OR REPLACE FUNCTION public.log_new_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('proposal_submitted', 'New proposal from ' || NEW.company_name, 'proposal', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_proposal_created
  AFTER INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.log_new_proposal();

-- Activity log trigger for support requests
CREATE OR REPLACE FUNCTION public.log_new_support_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('support_request', 'New support request: ' || NEW.title, 'support_request', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_support_request_created
  AFTER INSERT ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_new_support_request();
