
-- 1. Extend pricing registry with provenance/confidence
ALTER TABLE public.ai_provider_pricing
  ADD COLUMN IF NOT EXISTS pricing_source text,
  ADD COLUMN IF NOT EXISTS pricing_source_url text,
  ADD COLUMN IF NOT EXISTS confidence text NOT NULL DEFAULT 'estimated'
    CHECK (confidence IN ('verified', 'estimated', 'unknown'));

-- 2. Tag every cost row with its basis
ALTER TABLE public.ai_gateway_requests
  ADD COLUMN IF NOT EXISTS cost_basis text;

ALTER TABLE public.ai_usage_ledger
  ADD COLUMN IF NOT EXISTS cost_basis text,
  ADD COLUMN IF NOT EXISTS actual_cost_gbp numeric(12,6);

-- 3. Seed pricing rows (estimated; verified by founder later).
-- Prices are USD per 1M tokens. They are deliberately marked confidence='estimated'.
INSERT INTO public.ai_provider_pricing
  (provider_name, model_name, model_tier, input_cost_per_1m_tokens, output_cost_per_1m_tokens, currency,
   active, pricing_source, pricing_source_url, confidence, notes)
VALUES
  ('openai', 'openai/gpt-5',                 'premium',  1.25, 10.00, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate — verify on official OpenAI pricing page'),
  ('openai', 'openai/gpt-5-mini',            'standard', 0.25,  2.00, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate'),
  ('openai', 'openai/gpt-5-nano',            'cheap',    0.05,  0.40, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate'),
  ('openai', 'openai/gpt-5.5',               'premium',  2.50, 15.00, 'USD', true, 'estimated', null, 'estimated', 'Liftor Brain default — verify when official rate published'),
  ('openai', 'openai/gpt-5.4',               'premium',  2.00, 12.00, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate'),
  ('openai', 'openai/gpt-5.4-mini',          'standard', 0.30,  2.40, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate'),
  ('google', 'google/gemini-2.5-pro',        'premium',  1.25, 10.00, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate'),
  ('google', 'google/gemini-2.5-flash',      'standard', 0.075, 0.30, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate'),
  ('google', 'google/gemini-2.5-flash-lite', 'cheap',    0.04,  0.15, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate'),
  ('google', 'google/gemini-3-flash-preview','standard', 0.10,  0.40, 'USD', true, 'estimated', null, 'estimated', 'Liftor default fallback — verify when official rate published'),
  ('google', 'google/gemini-3.5-flash',      'standard', 0.15,  0.60, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate'),
  ('google', 'google/gemini-3.1-pro-preview','premium',  1.50, 12.00, 'USD', true, 'estimated', null, 'estimated', 'Seed estimate')
ON CONFLICT DO NOTHING;
