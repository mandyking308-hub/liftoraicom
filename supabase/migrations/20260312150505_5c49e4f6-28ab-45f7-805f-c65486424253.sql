CREATE TABLE public.proposal_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_id uuid DEFAULT NULL,
  request_count integer NOT NULL DEFAULT 1,
  last_request_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_rate_limits_ip ON public.proposal_rate_limits (ip_address);
CREATE INDEX idx_proposal_rate_limits_last_request ON public.proposal_rate_limits (last_request_at);

ALTER TABLE public.proposal_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage rate limits"
  ON public.proposal_rate_limits FOR ALL
  USING (has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "Service role full access rate limits"
  ON public.proposal_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);