
-- Extend video_sop_assets with recording production fields
ALTER TABLE public.video_sop_assets
  ADD COLUMN IF NOT EXISTS recording_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS assigned_recorder_name text,
  ADD COLUMN IF NOT EXISTS assigned_recorder_type text,
  ADD COLUMN IF NOT EXISTS recording_method text,
  ADD COLUMN IF NOT EXISTS recording_due_date date,
  ADD COLUMN IF NOT EXISTS demo_data_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_warning_notes text;

-- Extend video_sop_links with full review/approval workflow
ALTER TABLE public.video_sop_links
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'link_added',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS customer_visibility_approved_by uuid,
  ADD COLUMN IF NOT EXISTS customer_visibility_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_handover_approved_by uuid,
  ADD COLUMN IF NOT EXISTS buyer_handover_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_checked_by uuid,
  ADD COLUMN IF NOT EXISTS privacy_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS contains_sensitive_content boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sensitive_content_waived_by uuid,
  ADD COLUMN IF NOT EXISTS sensitive_content_waived_at timestamptz,
  ADD COLUMN IF NOT EXISTS transcript_checked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS captions_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_data_used boolean NOT NULL DEFAULT false;

-- Extend video_sop_training_assignments with completion evidence
ALTER TABLE public.video_sop_training_assignments
  ADD COLUMN IF NOT EXISTS watched_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiz_passed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiz_score numeric,
  ADD COLUMN IF NOT EXISTS completion_notes text,
  ADD COLUMN IF NOT EXISTS evidence_url text,
  ADD COLUMN IF NOT EXISTS approved_completion_by uuid,
  ADD COLUMN IF NOT EXISTS approved_completion_at timestamptz,
  ADD COLUMN IF NOT EXISTS waiver_reason text,
  ADD COLUMN IF NOT EXISTS waived_by uuid,
  ADD COLUMN IF NOT EXISTS waived_at timestamptz;
