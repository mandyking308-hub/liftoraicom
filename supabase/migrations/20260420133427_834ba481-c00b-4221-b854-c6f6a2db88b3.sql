-- Add invoice to priority entity type enum
ALTER TYPE public.priority_entity_type ADD VALUE IF NOT EXISTS 'invoice';