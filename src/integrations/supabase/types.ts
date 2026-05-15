export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_anomalies: {
        Row: {
          anomaly_type: string
          created_at: string
          description: string | null
          flagged: boolean
          id: string
          severity: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          anomaly_type: string
          created_at?: string
          description?: string | null
          flagged?: boolean
          id?: string
          severity?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          anomaly_type?: string
          created_at?: string
          description?: string | null
          flagged?: boolean
          id?: string
          severity?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      access_audit_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          business_name: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
        }
        Insert: {
          business_name?: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      agent_action_audit_log: {
        Row: {
          action_status: string
          action_type: string
          agent_key: string | null
          apollo_called: boolean
          blocked_reason: string | null
          business_id: string | null
          confirmation_phrase: string | null
          created_at: string
          dry_run: boolean
          email_sent: boolean
          external_provider_called: boolean
          founder_user_id: string | null
          id: string
          metadata: Json
          smartlead_post_called: boolean
          source_function: string | null
          source_id: string | null
          source_table: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_status: string
          action_type: string
          agent_key?: string | null
          apollo_called?: boolean
          blocked_reason?: string | null
          business_id?: string | null
          confirmation_phrase?: string | null
          created_at?: string
          dry_run?: boolean
          email_sent?: boolean
          external_provider_called?: boolean
          founder_user_id?: string | null
          id?: string
          metadata?: Json
          smartlead_post_called?: boolean
          source_function?: string | null
          source_id?: string | null
          source_table?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_status?: string
          action_type?: string
          agent_key?: string | null
          apollo_called?: boolean
          blocked_reason?: string | null
          business_id?: string | null
          confirmation_phrase?: string | null
          created_at?: string
          dry_run?: boolean
          email_sent?: boolean
          external_provider_called?: boolean
          founder_user_id?: string | null
          id?: string
          metadata?: Json
          smartlead_post_called?: boolean
          source_function?: string | null
          source_id?: string | null
          source_table?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      agent_activity_logs: {
        Row: {
          action: string
          agent_id: string
          created_at: string
          details: string | null
          id: string
          system_name: string | null
        }
        Insert: {
          action: string
          agent_id: string
          created_at?: string
          details?: string | null
          id?: string
          system_name?: string | null
        }
        Update: {
          action?: string
          agent_id?: string
          created_at?: string
          details?: string | null
          id?: string
          system_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_alerts: {
        Row: {
          affected_system: string | null
          agent_id: string
          created_at: string
          description: string | null
          id: string
          resolved: boolean
          severity: string
          title: string
        }
        Insert: {
          affected_system?: string | null
          agent_id: string
          created_at?: string
          description?: string | null
          id?: string
          resolved?: boolean
          severity?: string
          title: string
        }
        Update: {
          affected_system?: string | null
          agent_id?: string
          created_at?: string
          description?: string | null
          id?: string
          resolved?: boolean
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_alerts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_business_live_settings: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          founder_approval_required: boolean
          id: string
          metadata: Json
          risk_level: string
          setting_key: string
          setting_value: boolean
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          risk_level?: string
          setting_key: string
          setting_value?: boolean
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          risk_level?: string
          setting_key?: string
          setting_value?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      agent_handover_log: {
        Row: {
          business_id: string | null
          contact_id: string | null
          context_payload: Json
          conversation_id: string | null
          created_at: string
          founder_review_required: boolean
          from_agent_key: string
          id: string
          priority_level: string
          rule_key: string | null
          source_id: string | null
          source_table: string | null
          status: string
          summary: string | null
          task_id: string | null
          to_agent_key: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          contact_id?: string | null
          context_payload?: Json
          conversation_id?: string | null
          created_at?: string
          founder_review_required?: boolean
          from_agent_key: string
          id?: string
          priority_level?: string
          rule_key?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          summary?: string | null
          task_id?: string | null
          to_agent_key: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          contact_id?: string | null
          context_payload?: Json
          conversation_id?: string | null
          created_at?: string
          founder_review_required?: boolean
          from_agent_key?: string
          id?: string
          priority_level?: string
          rule_key?: string | null
          source_id?: string | null
          source_table?: string | null
          status?: string
          summary?: string | null
          task_id?: string | null
          to_agent_key?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_handover_rules: {
        Row: {
          auto_create_task: boolean
          created_at: string
          enabled: boolean
          founder_review_required: boolean
          from_agent_key: string
          from_customer_stage: string | null
          handover_type: string
          id: string
          metadata: Json
          priority_level: string
          required_context: Json
          rule_key: string
          to_agent_key: string
          to_customer_stage: string | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          auto_create_task?: boolean
          created_at?: string
          enabled?: boolean
          founder_review_required?: boolean
          from_agent_key: string
          from_customer_stage?: string | null
          handover_type: string
          id?: string
          metadata?: Json
          priority_level?: string
          required_context?: Json
          rule_key: string
          to_agent_key: string
          to_customer_stage?: string | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          auto_create_task?: boolean
          created_at?: string
          enabled?: boolean
          founder_review_required?: boolean
          from_agent_key?: string
          from_customer_stage?: string | null
          handover_type?: string
          id?: string
          metadata?: Json
          priority_level?: string
          required_context?: Json
          rule_key?: string
          to_agent_key?: string
          to_customer_stage?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_system_assignments: {
        Row: {
          agent_id: string
          assigned_at: string
          id: string
          system_id: string
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          id?: string
          system_id: string
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          id?: string
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_system_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_system_assignments_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "monitored_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_task_stats: {
        Row: {
          agent_id: string
          created_at: string
          date: string
          id: string
          tasks_completed: number
          tasks_failed: number
          tasks_pending: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          date?: string
          id?: string
          tasks_completed?: number
          tasks_failed?: number
          tasks_pending?: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          date?: string
          id?: string
          tasks_completed?: number
          tasks_failed?: number
          tasks_pending?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_task_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["ai_action_type"]
          ai_quality_flag: Database["public"]["Enums"]["ai_quality_flag"]
          classification: string
          contact_id: string
          conversation_id: string
          created_at: string
          error_message: string
          id: string
          quality_reason: string
          regenerated: boolean
          reply_latency_seconds: number | null
          reply_preview: string
          status: Database["public"]["Enums"]["ai_action_status"]
          tokens_used: number
        }
        Insert: {
          action_type: Database["public"]["Enums"]["ai_action_type"]
          ai_quality_flag?: Database["public"]["Enums"]["ai_quality_flag"]
          classification?: string
          contact_id: string
          conversation_id: string
          created_at?: string
          error_message?: string
          id?: string
          quality_reason?: string
          regenerated?: boolean
          reply_latency_seconds?: number | null
          reply_preview?: string
          status?: Database["public"]["Enums"]["ai_action_status"]
          tokens_used?: number
        }
        Update: {
          action_type?: Database["public"]["Enums"]["ai_action_type"]
          ai_quality_flag?: Database["public"]["Enums"]["ai_quality_flag"]
          classification?: string
          contact_id?: string
          conversation_id?: string
          created_at?: string
          error_message?: string
          id?: string
          quality_reason?: string
          regenerated?: boolean
          reply_latency_seconds?: number | null
          reply_preview?: string
          status?: Database["public"]["Enums"]["ai_action_status"]
          tokens_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_operating_status: {
        Row: {
          agent_key: string
          auto_action_status: boolean
          blocked_items: number
          completed_items: number
          created_at: string
          current_blockers: Json
          error_count: number
          health: string
          id: string
          last_checked_at: string | null
          last_run_at: string | null
          metadata: Json
          no_send_status: boolean
          pending_items: number
          status: string
          updated_at: string
        }
        Insert: {
          agent_key: string
          auto_action_status?: boolean
          blocked_items?: number
          completed_items?: number
          created_at?: string
          current_blockers?: Json
          error_count?: number
          health?: string
          id?: string
          last_checked_at?: string | null
          last_run_at?: string | null
          metadata?: Json
          no_send_status?: boolean
          pending_items?: number
          status?: string
          updated_at?: string
        }
        Update: {
          agent_key?: string
          auto_action_status?: boolean
          blocked_items?: number
          completed_items?: number
          created_at?: string
          current_blockers?: Json
          error_count?: number
          health?: string
          id?: string
          last_checked_at?: string | null
          last_run_at?: string | null
          metadata?: Json
          no_send_status?: boolean
          pending_items?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_permissions: {
        Row: {
          agent_role_id: string
          allowed: boolean
          created_at: string
          feature_flag_required: string | null
          id: string
          metadata: Json
          notes: string | null
          permission_key: string
          permission_label: string
          requires_founder_approval: boolean
          updated_at: string
        }
        Insert: {
          agent_role_id: string
          allowed?: boolean
          created_at?: string
          feature_flag_required?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          permission_key: string
          permission_label: string
          requires_founder_approval?: boolean
          updated_at?: string
        }
        Update: {
          agent_role_id?: string
          allowed?: boolean
          created_at?: string
          feature_flag_required?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          permission_key?: string
          permission_label?: string
          requires_founder_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_permissions_agent_role_id_fkey"
            columns: ["agent_role_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_roles: {
        Row: {
          agent_category: string
          agent_key: string
          agent_name: string
          auto_action_allowed: boolean
          can_call_external_providers: boolean
          can_create_deals: boolean
          can_create_invoices: boolean
          can_create_proposals: boolean
          can_mutate_operational_data: boolean
          can_read_conversations: boolean
          can_read_crm: boolean
          can_read_finance: boolean
          can_read_suppliers: boolean
          can_send_email: boolean
          created_at: string
          default_status: string
          description: string | null
          founder_approval_required: boolean
          guardrails: Json
          id: string
          metadata: Json
          primary_module: string | null
          risk_level: string
          updated_at: string
        }
        Insert: {
          agent_category: string
          agent_key: string
          agent_name: string
          auto_action_allowed?: boolean
          can_call_external_providers?: boolean
          can_create_deals?: boolean
          can_create_invoices?: boolean
          can_create_proposals?: boolean
          can_mutate_operational_data?: boolean
          can_read_conversations?: boolean
          can_read_crm?: boolean
          can_read_finance?: boolean
          can_read_suppliers?: boolean
          can_send_email?: boolean
          created_at?: string
          default_status?: string
          description?: string | null
          founder_approval_required?: boolean
          guardrails?: Json
          id?: string
          metadata?: Json
          primary_module?: string | null
          risk_level?: string
          updated_at?: string
        }
        Update: {
          agent_category?: string
          agent_key?: string
          agent_name?: string
          auto_action_allowed?: boolean
          can_call_external_providers?: boolean
          can_create_deals?: boolean
          can_create_invoices?: boolean
          can_create_proposals?: boolean
          can_mutate_operational_data?: boolean
          can_read_conversations?: boolean
          can_read_crm?: boolean
          can_read_finance?: boolean
          can_read_suppliers?: boolean
          can_send_email?: boolean
          created_at?: string
          default_status?: string
          description?: string | null
          founder_approval_required?: boolean
          guardrails?: Json
          id?: string
          metadata?: Json
          primary_module?: string | null
          risk_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_task_queue: {
        Row: {
          agent_key: string
          agent_output: Json
          auto_execute_allowed: boolean
          blockers: Json
          business_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          deal_id: string | null
          dependencies: Json
          dry_run_only: boolean
          due_at: string | null
          error_message: string | null
          execution_enabled: boolean
          founder_approval_required: boolean
          id: string
          interaction_id: string | null
          invoice_id: string | null
          priority_level: string
          proposal_id: string | null
          recommended_action: string | null
          source_id: string | null
          source_system: string | null
          source_table: string | null
          status: string
          supplier_id: string | null
          task_summary: string | null
          task_title: string
          task_type: string
          updated_at: string
        }
        Insert: {
          agent_key: string
          agent_output?: Json
          auto_execute_allowed?: boolean
          blockers?: Json
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          dependencies?: Json
          dry_run_only?: boolean
          due_at?: string | null
          error_message?: string | null
          execution_enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          interaction_id?: string | null
          invoice_id?: string | null
          priority_level?: string
          proposal_id?: string | null
          recommended_action?: string | null
          source_id?: string | null
          source_system?: string | null
          source_table?: string | null
          status?: string
          supplier_id?: string | null
          task_summary?: string | null
          task_title: string
          task_type: string
          updated_at?: string
        }
        Update: {
          agent_key?: string
          agent_output?: Json
          auto_execute_allowed?: boolean
          blockers?: Json
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          dependencies?: Json
          dry_run_only?: boolean
          due_at?: string | null
          error_message?: string | null
          execution_enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          interaction_id?: string | null
          invoice_id?: string | null
          priority_level?: string
          proposal_id?: string | null
          recommended_action?: string | null
          source_id?: string | null
          source_system?: string | null
          source_table?: string | null
          status?: string
          supplier_id?: string | null
          task_summary?: string | null
          task_title?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_task_types: {
        Row: {
          auto_execute_allowed: boolean
          created_at: string
          creates_operational_record: boolean
          default_agent_key: string
          description: string | null
          dry_run_only: boolean
          external_provider_call: boolean
          founder_approval_required: boolean
          id: string
          label: string
          metadata: Json
          sends_email: boolean
          task_type: string
          updated_at: string
        }
        Insert: {
          auto_execute_allowed?: boolean
          created_at?: string
          creates_operational_record?: boolean
          default_agent_key: string
          description?: string | null
          dry_run_only?: boolean
          external_provider_call?: boolean
          founder_approval_required?: boolean
          id?: string
          label: string
          metadata?: Json
          sends_email?: boolean
          task_type: string
          updated_at?: string
        }
        Update: {
          auto_execute_allowed?: boolean
          created_at?: string
          creates_operational_record?: boolean
          default_agent_key?: string
          description?: string | null
          dry_run_only?: boolean
          external_provider_call?: boolean
          founder_approval_required?: boolean
          id?: string
          label?: string
          metadata?: Json
          sends_email?: boolean
          task_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          agent_function: string
          created_at: string
          id: string
          last_activity: string | null
          name: string
          purpose: string | null
          status: string
          system_id: string
          tasks_completed_total: number
          tasks_pending: number
          updated_at: string
        }
        Insert: {
          agent_function?: string
          created_at?: string
          id?: string
          last_activity?: string | null
          name: string
          purpose?: string | null
          status?: string
          system_id: string
          tasks_completed_total?: number
          tasks_pending?: number
          updated_at?: string
        }
        Update: {
          agent_function?: string
          created_at?: string
          id?: string
          last_activity?: string | null
          name?: string
          purpose?: string | null
          status?: string
          system_id?: string
          tasks_completed_total?: number
          tasks_pending?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "monitored_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_draft_reviews: {
        Row: {
          agent_task_id: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          business_id: string | null
          compliance_flags: Json
          contact_id: string | null
          context_summary: string | null
          conversation_id: string | null
          created_at: string
          customer_summary: string | null
          detected_intent: string | null
          draft_body: string | null
          draft_subject: string | null
          founder_review_required: boolean
          id: string
          intent_confidence: number | null
          interaction_id: string | null
          metadata: Json
          recommended_reply_strategy: string | null
          rejected_at: string | null
          rejection_reason: string | null
          risk_flags: Json
          send_allowed: boolean
          tone_profile: string | null
          updated_at: string
        }
        Insert: {
          agent_task_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          compliance_flags?: Json
          contact_id?: string | null
          context_summary?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_summary?: string | null
          detected_intent?: string | null
          draft_body?: string | null
          draft_subject?: string | null
          founder_review_required?: boolean
          id?: string
          intent_confidence?: number | null
          interaction_id?: string | null
          metadata?: Json
          recommended_reply_strategy?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          risk_flags?: Json
          send_allowed?: boolean
          tone_profile?: string | null
          updated_at?: string
        }
        Update: {
          agent_task_id?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string | null
          compliance_flags?: Json
          contact_id?: string | null
          context_summary?: string | null
          conversation_id?: string | null
          created_at?: string
          customer_summary?: string | null
          detected_intent?: string | null
          draft_body?: string | null
          draft_subject?: string | null
          founder_review_required?: boolean
          id?: string
          intent_confidence?: number | null
          interaction_id?: string | null
          metadata?: Json
          recommended_reply_strategy?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          risk_flags?: Json
          send_allowed?: boolean
          tone_profile?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_drafts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          classification: string | null
          contact_id: string
          conversation_id: string
          created_at: string
          draft_body: string
          edited_body: string | null
          id: string
          inbox_id: string | null
          rejection_reason: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["ai_draft_status"]
          suggested_tags: string[] | null
          triggered_by_inbound_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          classification?: string | null
          contact_id: string
          conversation_id: string
          created_at?: string
          draft_body: string
          edited_body?: string | null
          id?: string
          inbox_id?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["ai_draft_status"]
          suggested_tags?: string[] | null
          triggered_by_inbound_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          classification?: string | null
          contact_id?: string
          conversation_id?: string
          created_at?: string
          draft_body?: string
          edited_body?: string | null
          id?: string
          inbox_id?: string | null
          rejection_reason?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["ai_draft_status"]
          suggested_tags?: string[] | null
          triggered_by_inbound_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_drafts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_drafts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "ai_drafts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_drafts_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "command_centre_active_inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_drafts_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inbox_health_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_drafts_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_drafts_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "warmup_progress"
            referencedColumns: ["inbox_id"]
          },
          {
            foreignKeyName: "ai_drafts_triggered_by_inbound_id_fkey"
            columns: ["triggered_by_inbound_id"]
            isOneToOne: false
            referencedRelation: "inbound_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_reply_tone_profiles: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          forbidden_phrases: Json
          id: string
          label: string
          required_checks: Json
          style_rules: Json
          tone_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          forbidden_phrases?: Json
          id?: string
          label: string
          required_checks?: Json
          style_rules?: Json
          tone_key: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          forbidden_phrases?: Json
          id?: string
          label?: string
          required_checks?: Json
          style_rules?: Json
          tone_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      apollo_automation_runs: {
        Row: {
          business_name: string
          contacts_new: number
          contacts_updated: number
          created_at: string
          enrichment_credits_used: number
          enrichment_skipped_reason: string | null
          errors: Json
          found: number
          id: string
          notes: string | null
          qualified: number
          run_date: string
          search_run_id: string | null
          searched: number
          segment_fit: string | null
          segment_id: string
          skipped_duplicates: number
          skipped_suppressed: number
          staged: number
          status: string
          updated_at: string
        }
        Insert: {
          business_name: string
          contacts_new?: number
          contacts_updated?: number
          created_at?: string
          enrichment_credits_used?: number
          enrichment_skipped_reason?: string | null
          errors?: Json
          found?: number
          id?: string
          notes?: string | null
          qualified?: number
          run_date?: string
          search_run_id?: string | null
          searched?: number
          segment_fit?: string | null
          segment_id: string
          skipped_duplicates?: number
          skipped_suppressed?: number
          staged?: number
          status?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          contacts_new?: number
          contacts_updated?: number
          created_at?: string
          enrichment_credits_used?: number
          enrichment_skipped_reason?: string | null
          errors?: Json
          found?: number
          id?: string
          notes?: string | null
          qualified?: number
          run_date?: string
          search_run_id?: string | null
          searched?: number
          segment_fit?: string | null
          segment_id?: string
          skipped_duplicates?: number
          skipped_suppressed?: number
          staged?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apollo_automation_runs_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "apollo_sync_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      apollo_connections: {
        Row: {
          api_key_cipher: string
          api_key_last4: string
          business_name: string
          created_at: string
          enrichment_api_error: string
          enrichment_api_status: string
          enrichment_api_verified_at: string | null
          id: string
          is_active: boolean
          search_api_error: string
          search_api_status: string
          search_api_verified_at: string | null
          updated_at: string
        }
        Insert: {
          api_key_cipher: string
          api_key_last4: string
          business_name: string
          created_at?: string
          enrichment_api_error?: string
          enrichment_api_status?: string
          enrichment_api_verified_at?: string | null
          id?: string
          is_active?: boolean
          search_api_error?: string
          search_api_status?: string
          search_api_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          api_key_cipher?: string
          api_key_last4?: string
          business_name?: string
          created_at?: string
          enrichment_api_error?: string
          enrichment_api_status?: string
          enrichment_api_verified_at?: string | null
          id?: string
          is_active?: boolean
          search_api_error?: string
          search_api_status?: string
          search_api_verified_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      apollo_credit_ledger: {
        Row: {
          apollo_person_ids: string[]
          business_id: string | null
          business_name: string
          created_at: string
          credits_used: number
          function_source: string
          id: string
          metadata: Json
        }
        Insert: {
          apollo_person_ids?: string[]
          business_id?: string | null
          business_name: string
          created_at?: string
          credits_used?: number
          function_source: string
          id?: string
          metadata?: Json
        }
        Update: {
          apollo_person_ids?: string[]
          business_id?: string | null
          business_name?: string
          created_at?: string
          credits_used?: number
          function_source?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "apollo_credit_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      apollo_leads: {
        Row: {
          ai_tags: string[]
          apollo_org_id: string | null
          apollo_person_id: string
          business_name: string
          company: string | null
          contact_id: string | null
          country: string | null
          created_at: string
          email: string | null
          enrichment_payload: Json | null
          error: string
          first_name: string | null
          has_email_flag: boolean
          id: string
          last_name: string | null
          linkedin_url: string | null
          qualification: Database["public"]["Enums"]["bcr_qualification"] | null
          qualification_reason: string
          run_id: string
          search_payload: Json
          segment_id: string
          status: Database["public"]["Enums"]["apollo_lead_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_tags?: string[]
          apollo_org_id?: string | null
          apollo_person_id: string
          business_name: string
          company?: string | null
          contact_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          enrichment_payload?: Json | null
          error?: string
          first_name?: string | null
          has_email_flag?: boolean
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          qualification?:
            | Database["public"]["Enums"]["bcr_qualification"]
            | null
          qualification_reason?: string
          run_id: string
          search_payload?: Json
          segment_id: string
          status?: Database["public"]["Enums"]["apollo_lead_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_tags?: string[]
          apollo_org_id?: string | null
          apollo_person_id?: string
          business_name?: string
          company?: string | null
          contact_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          enrichment_payload?: Json | null
          error?: string
          first_name?: string | null
          has_email_flag?: boolean
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          qualification?:
            | Database["public"]["Enums"]["bcr_qualification"]
            | null
          qualification_reason?: string
          run_id?: string
          search_payload?: Json
          segment_id?: string
          status?: Database["public"]["Enums"]["apollo_lead_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apollo_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apollo_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "apollo_leads_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "apollo_sync_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apollo_leads_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "apollo_sync_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      apollo_sync_runs: {
        Row: {
          apollo_credits_used: number | null
          business_name: string
          completed_at: string | null
          contacts_duplicate: number
          contacts_imported: number
          contacts_new: number
          contacts_skipped_no_email: number
          contacts_suppressed: number
          contacts_updated: number
          created_at: string
          emails_returned: number
          enrichment_attempted: number
          errors: Json
          id: string
          maybe_count: number
          needs_review_count: number
          not_qualified_count: number
          page_fetched: number | null
          people_found: number
          people_with_email_flag: number
          qualified_count: number
          ready_to_stage_count: number
          search_pages_fetched: number
          segment_id: string
          skipped_already_seen: number | null
          started_at: string
          status: Database["public"]["Enums"]["apollo_run_status"]
          triggered_by: string | null
          unseen_in_batch: number | null
          updated_at: string
        }
        Insert: {
          apollo_credits_used?: number | null
          business_name: string
          completed_at?: string | null
          contacts_duplicate?: number
          contacts_imported?: number
          contacts_new?: number
          contacts_skipped_no_email?: number
          contacts_suppressed?: number
          contacts_updated?: number
          created_at?: string
          emails_returned?: number
          enrichment_attempted?: number
          errors?: Json
          id?: string
          maybe_count?: number
          needs_review_count?: number
          not_qualified_count?: number
          page_fetched?: number | null
          people_found?: number
          people_with_email_flag?: number
          qualified_count?: number
          ready_to_stage_count?: number
          search_pages_fetched?: number
          segment_id: string
          skipped_already_seen?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["apollo_run_status"]
          triggered_by?: string | null
          unseen_in_batch?: number | null
          updated_at?: string
        }
        Update: {
          apollo_credits_used?: number | null
          business_name?: string
          completed_at?: string | null
          contacts_duplicate?: number
          contacts_imported?: number
          contacts_new?: number
          contacts_skipped_no_email?: number
          contacts_suppressed?: number
          contacts_updated?: number
          created_at?: string
          emails_returned?: number
          enrichment_attempted?: number
          errors?: Json
          id?: string
          maybe_count?: number
          needs_review_count?: number
          not_qualified_count?: number
          page_fetched?: number | null
          people_found?: number
          people_with_email_flag?: number
          qualified_count?: number
          ready_to_stage_count?: number
          search_pages_fetched?: number
          segment_id?: string
          skipped_already_seen?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["apollo_run_status"]
          triggered_by?: string | null
          unseen_in_batch?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apollo_sync_runs_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "apollo_sync_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      apollo_sync_segments: {
        Row: {
          apollo_person_ids_enriched: string[]
          apollo_person_ids_imported: string[]
          apollo_person_ids_seen: string[]
          apollo_person_ids_skipped_existing: string[]
          apollo_person_ids_skipped_no_email: string[]
          auto_enrich: boolean
          auto_qualify: boolean
          automation_enabled: boolean
          business_name: string
          created_at: string
          current_page: number
          daily_enrichment_cap: number
          daily_search_cap: number
          default_relevance_category: string | null
          default_tags: string[]
          email_only: boolean
          hold_for_approval: boolean
          id: string
          is_active: boolean
          last_page_processed: number | null
          last_scheduled_run_at: string | null
          max_contacts_per_run: number
          mode: Database["public"]["Enums"]["apollo_segment_mode"]
          next_page: number
          require_good_fit: boolean
          saved_list_id: string | null
          schedule_cron: string
          search_criteria: Json
          segment_name: string
          skip_suppressed: boolean
          updated_at: string
        }
        Insert: {
          apollo_person_ids_enriched?: string[]
          apollo_person_ids_imported?: string[]
          apollo_person_ids_seen?: string[]
          apollo_person_ids_skipped_existing?: string[]
          apollo_person_ids_skipped_no_email?: string[]
          auto_enrich?: boolean
          auto_qualify?: boolean
          automation_enabled?: boolean
          business_name: string
          created_at?: string
          current_page?: number
          daily_enrichment_cap?: number
          daily_search_cap?: number
          default_relevance_category?: string | null
          default_tags?: string[]
          email_only?: boolean
          hold_for_approval?: boolean
          id?: string
          is_active?: boolean
          last_page_processed?: number | null
          last_scheduled_run_at?: string | null
          max_contacts_per_run?: number
          mode?: Database["public"]["Enums"]["apollo_segment_mode"]
          next_page?: number
          require_good_fit?: boolean
          saved_list_id?: string | null
          schedule_cron?: string
          search_criteria?: Json
          segment_name: string
          skip_suppressed?: boolean
          updated_at?: string
        }
        Update: {
          apollo_person_ids_enriched?: string[]
          apollo_person_ids_imported?: string[]
          apollo_person_ids_seen?: string[]
          apollo_person_ids_skipped_existing?: string[]
          apollo_person_ids_skipped_no_email?: string[]
          auto_enrich?: boolean
          auto_qualify?: boolean
          automation_enabled?: boolean
          business_name?: string
          created_at?: string
          current_page?: number
          daily_enrichment_cap?: number
          daily_search_cap?: number
          default_relevance_category?: string | null
          default_tags?: string[]
          email_only?: boolean
          hold_for_approval?: boolean
          id?: string
          is_active?: boolean
          last_page_processed?: number | null
          last_scheduled_run_at?: string | null
          max_contacts_per_run?: number
          mode?: Database["public"]["Enums"]["apollo_segment_mode"]
          next_page?: number
          require_good_fit?: boolean
          saved_list_id?: string | null
          schedule_cron?: string
          search_criteria?: Json
          segment_name?: string
          skip_suppressed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      architecture_components: {
        Row: {
          agent_id: string | null
          architecture_id: string
          component_type: string
          created_at: string
          description: string | null
          id: string
          integration_id: string | null
          name: string
          order_index: number
          workflow_id: string | null
        }
        Insert: {
          agent_id?: string | null
          architecture_id: string
          component_type?: string
          created_at?: string
          description?: string | null
          id?: string
          integration_id?: string | null
          name: string
          order_index?: number
          workflow_id?: string | null
        }
        Update: {
          agent_id?: string | null
          architecture_id?: string
          component_type?: string
          created_at?: string
          description?: string | null
          id?: string
          integration_id?: string | null
          name?: string
          order_index?: number
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_components_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_components_architecture_id_fkey"
            columns: ["architecture_id"]
            isOneToOne: false
            referencedRelation: "architectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_components_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_components_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_relationships: {
        Row: {
          architecture_id: string
          created_at: string
          id: string
          relationship_label: string | null
          source_component_id: string
          target_component_id: string
        }
        Insert: {
          architecture_id: string
          created_at?: string
          id?: string
          relationship_label?: string | null
          source_component_id: string
          target_component_id: string
        }
        Update: {
          architecture_id?: string
          created_at?: string
          id?: string
          relationship_label?: string | null
          source_component_id?: string
          target_component_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_relationships_architecture_id_fkey"
            columns: ["architecture_id"]
            isOneToOne: false
            referencedRelation: "architectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_relationships_source_component_id_fkey"
            columns: ["source_component_id"]
            isOneToOne: false
            referencedRelation: "architecture_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_relationships_target_component_id_fkey"
            columns: ["target_component_id"]
            isOneToOne: false
            referencedRelation: "architecture_components"
            referencedColumns: ["id"]
          },
        ]
      }
      architectures: {
        Row: {
          client_organisation: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          system_purpose: string | null
          system_type: string
          updated_at: string
        }
        Insert: {
          client_organisation?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          system_purpose?: string | null
          system_type?: string
          updated_at?: string
        }
        Update: {
          client_organisation?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          system_purpose?: string | null
          system_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          acknowledged_at: string | null
          assigned_at: string
          auto_assigned: boolean
          business_name: string
          completed_at: string | null
          completion_confirmed_by_founder: boolean
          confirmed_at: string | null
          contact_id: string | null
          created_at: string
          deal_id: string
          expected_completion_date: string | null
          failed_at: string | null
          id: string
          notes: string
          required_skills: string[]
          requires_finance_action: boolean
          share_contact_details: boolean
          sla_status: Database["public"]["Enums"]["assignment_sla_status"]
          started_at: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          supplier_id: string
          supplier_note: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_at?: string
          auto_assigned?: boolean
          business_name?: string
          completed_at?: string | null
          completion_confirmed_by_founder?: boolean
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id: string
          expected_completion_date?: string | null
          failed_at?: string | null
          id?: string
          notes?: string
          required_skills?: string[]
          requires_finance_action?: boolean
          share_contact_details?: boolean
          sla_status?: Database["public"]["Enums"]["assignment_sla_status"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          supplier_id: string
          supplier_note?: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          assigned_at?: string
          auto_assigned?: boolean
          business_name?: string
          completed_at?: string | null
          completion_confirmed_by_founder?: boolean
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string
          expected_completion_date?: string | null
          failed_at?: string | null
          id?: string
          notes?: string
          required_skills?: string[]
          requires_finance_action?: boolean
          share_contact_details?: boolean
          sla_status?: Database["public"]["Enums"]["assignment_sla_status"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          supplier_id?: string
          supplier_note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "assignments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          automation_type: string
          created_at: string
          description: string | null
          execution_count: number
          failure_count: number
          id: string
          last_execution: string | null
          last_result: string | null
          name: string
          status: string
          success_count: number
          system_id: string
          updated_at: string
        }
        Insert: {
          automation_type?: string
          created_at?: string
          description?: string | null
          execution_count?: number
          failure_count?: number
          id?: string
          last_execution?: string | null
          last_result?: string | null
          name: string
          status?: string
          success_count?: number
          system_id: string
          updated_at?: string
        }
        Update: {
          automation_type?: string
          created_at?: string
          description?: string | null
          execution_count?: number
          failure_count?: number
          id?: string
          last_execution?: string | null
          last_result?: string | null
          name?: string
          status?: string
          success_count?: number
          system_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "monitored_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      autonomy_action_audit: {
        Row: {
          action_type: string
          agent_key: string | null
          allowed: boolean
          blocked_reason: string | null
          business_id: string | null
          channel_key: string | null
          created_at: string
          credit_spend: boolean
          email_sent: boolean
          external_action: boolean
          founder_approval_required: boolean
          id: string
          jurisdiction_code: string | null
          language_code: string | null
          metadata: Json
          policy_id: string | null
          provider_mutation: boolean
          requested_autonomy_level: number | null
          resolved_autonomy_level: number | null
          source_id: string | null
          source_table: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_type: string
          agent_key?: string | null
          allowed?: boolean
          blocked_reason?: string | null
          business_id?: string | null
          channel_key?: string | null
          created_at?: string
          credit_spend?: boolean
          email_sent?: boolean
          external_action?: boolean
          founder_approval_required?: boolean
          id?: string
          jurisdiction_code?: string | null
          language_code?: string | null
          metadata?: Json
          policy_id?: string | null
          provider_mutation?: boolean
          requested_autonomy_level?: number | null
          resolved_autonomy_level?: number | null
          source_id?: string | null
          source_table?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_type?: string
          agent_key?: string | null
          allowed?: boolean
          blocked_reason?: string | null
          business_id?: string | null
          channel_key?: string | null
          created_at?: string
          credit_spend?: boolean
          email_sent?: boolean
          external_action?: boolean
          founder_approval_required?: boolean
          id?: string
          jurisdiction_code?: string | null
          language_code?: string | null
          metadata?: Json
          policy_id?: string | null
          provider_mutation?: boolean
          requested_autonomy_level?: number | null
          resolved_autonomy_level?: number | null
          source_id?: string | null
          source_table?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      autonomy_levels: {
        Row: {
          ai_draft_creation_allowed: boolean
          compliance_mutation_allowed: boolean
          created_at: string
          credit_spend_allowed: boolean
          description: string | null
          external_send_allowed: boolean
          founder_approval_required: boolean
          id: string
          internal_record_creation_allowed: boolean
          level_key: string
          level_label: string
          level_number: number
          max_risk_level: string
          metadata: Json
          money_movement_allowed: boolean
          provider_mutation_allowed: boolean
          updated_at: string
        }
        Insert: {
          ai_draft_creation_allowed?: boolean
          compliance_mutation_allowed?: boolean
          created_at?: string
          credit_spend_allowed?: boolean
          description?: string | null
          external_send_allowed?: boolean
          founder_approval_required?: boolean
          id?: string
          internal_record_creation_allowed?: boolean
          level_key: string
          level_label: string
          level_number: number
          max_risk_level?: string
          metadata?: Json
          money_movement_allowed?: boolean
          provider_mutation_allowed?: boolean
          updated_at?: string
        }
        Update: {
          ai_draft_creation_allowed?: boolean
          compliance_mutation_allowed?: boolean
          created_at?: string
          credit_spend_allowed?: boolean
          description?: string | null
          external_send_allowed?: boolean
          founder_approval_required?: boolean
          id?: string
          internal_record_creation_allowed?: boolean
          level_key?: string
          level_label?: string
          level_number?: number
          max_risk_level?: string
          metadata?: Json
          money_movement_allowed?: boolean
          provider_mutation_allowed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      autonomy_policies: {
        Row: {
          action_type: string
          agent_key: string | null
          allowed_countries: Json
          allowed_languages: Json
          autonomy_level: number
          blocked_countries: Json
          blocked_languages: Json
          business_id: string | null
          channel_key: string | null
          created_at: string
          enabled: boolean
          id: string
          jurisdiction_code: string | null
          max_batch_size: number
          max_daily_actions: number
          max_monthly_actions: number
          metadata: Json
          policy_notes: string | null
          requires_business_hours: boolean
          requires_compliance_pass: boolean
          requires_founder_approval: boolean
          requires_human_review_for_high_risk: boolean
          risk_level: string
          updated_at: string
        }
        Insert: {
          action_type: string
          agent_key?: string | null
          allowed_countries?: Json
          allowed_languages?: Json
          autonomy_level?: number
          blocked_countries?: Json
          blocked_languages?: Json
          business_id?: string | null
          channel_key?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          jurisdiction_code?: string | null
          max_batch_size?: number
          max_daily_actions?: number
          max_monthly_actions?: number
          metadata?: Json
          policy_notes?: string | null
          requires_business_hours?: boolean
          requires_compliance_pass?: boolean
          requires_founder_approval?: boolean
          requires_human_review_for_high_risk?: boolean
          risk_level?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          agent_key?: string | null
          allowed_countries?: Json
          allowed_languages?: Json
          autonomy_level?: number
          blocked_countries?: Json
          blocked_languages?: Json
          business_id?: string | null
          channel_key?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          jurisdiction_code?: string | null
          max_batch_size?: number
          max_daily_actions?: number
          max_monthly_actions?: number
          metadata?: Json
          policy_notes?: string | null
          requires_business_hours?: boolean
          requires_compliance_pass?: boolean
          requires_founder_approval?: boolean
          requires_human_review_for_high_risk?: boolean
          risk_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      autopilot_activation_gates: {
        Row: {
          action_type: string
          agent_key: string | null
          business_id: string | null
          created_at: string
          current_state: string
          enabled: boolean
          external_action: boolean
          gate_key: string
          gate_label: string
          id: string
          max_allowed_autonomy_level: number
          metadata: Json
          requested_autonomy_level: number
          required_readiness_score: number
          requires_compliance_pass: boolean
          requires_founder_final_approval: boolean
          requires_no_critical_findings: boolean
          requires_successful_test_runs: number
          updated_at: string
          workflow_key: string | null
        }
        Insert: {
          action_type: string
          agent_key?: string | null
          business_id?: string | null
          created_at?: string
          current_state?: string
          enabled?: boolean
          external_action?: boolean
          gate_key: string
          gate_label: string
          id?: string
          max_allowed_autonomy_level?: number
          metadata?: Json
          requested_autonomy_level?: number
          required_readiness_score?: number
          requires_compliance_pass?: boolean
          requires_founder_final_approval?: boolean
          requires_no_critical_findings?: boolean
          requires_successful_test_runs?: number
          updated_at?: string
          workflow_key?: string | null
        }
        Update: {
          action_type?: string
          agent_key?: string | null
          business_id?: string | null
          created_at?: string
          current_state?: string
          enabled?: boolean
          external_action?: boolean
          gate_key?: string
          gate_label?: string
          id?: string
          max_allowed_autonomy_level?: number
          metadata?: Json
          requested_autonomy_level?: number
          required_readiness_score?: number
          requires_compliance_pass?: boolean
          requires_founder_final_approval?: boolean
          requires_no_critical_findings?: boolean
          requires_successful_test_runs?: number
          updated_at?: string
          workflow_key?: string | null
        }
        Relationships: []
      }
      autopilot_runs: {
        Row: {
          already_in_crm_matched: number
          business_id: string | null
          created_at: string
          decisions_created: number
          details: Json
          duplicates_collapsed: number
          finished_at: string | null
          id: string
          missing_email_held: number
          next_recommended_action: string | null
          no_email_attempts_excluded: number
          poor_fit_archived: number
          safe_to_promote: number
          safe_to_queue: number
          safe_to_unlock: number
          scanned_count: number
          source_quality_score: number | null
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          already_in_crm_matched?: number
          business_id?: string | null
          created_at?: string
          decisions_created?: number
          details?: Json
          duplicates_collapsed?: number
          finished_at?: string | null
          id?: string
          missing_email_held?: number
          next_recommended_action?: string | null
          no_email_attempts_excluded?: number
          poor_fit_archived?: number
          safe_to_promote?: number
          safe_to_queue?: number
          safe_to_unlock?: number
          scanned_count?: number
          source_quality_score?: number | null
          started_at?: string
          status?: string
          trigger: string
        }
        Update: {
          already_in_crm_matched?: number
          business_id?: string | null
          created_at?: string
          decisions_created?: number
          details?: Json
          duplicates_collapsed?: number
          finished_at?: string | null
          id?: string
          missing_email_held?: number
          next_recommended_action?: string | null
          no_email_attempts_excluded?: number
          poor_fit_archived?: number
          safe_to_promote?: number
          safe_to_queue?: number
          safe_to_unlock?: number
          scanned_count?: number
          source_quality_score?: number | null
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      brain_insights: {
        Row: {
          created_at: string
          description: string | null
          id: string
          insight_type: string
          priority: string
          source_module: string | null
          status: string
          system_affected: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          insight_type?: string
          priority?: string
          source_module?: string | null
          status?: string
          system_affected?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          insight_type?: string
          priority?: string
          source_module?: string | null
          status?: string
          system_affected?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brain_learning_records: {
        Row: {
          category: string
          confidence_level: string
          created_at: string
          id: string
          pattern_description: string
          source_system: string | null
        }
        Insert: {
          category?: string
          confidence_level?: string
          created_at?: string
          id?: string
          pattern_description: string
          source_system?: string | null
        }
        Update: {
          category?: string
          confidence_level?: string
          created_at?: string
          id?: string
          pattern_description?: string
          source_system?: string | null
        }
        Relationships: []
      }
      brain_recommendations: {
        Row: {
          affected_system: string | null
          created_at: string
          description: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_system?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_system?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brief_audit_log: {
        Row: {
          brief_id: string
          changed_fields: Json
          created_at: string
          id: string
          previous_summary: string | null
          updated_by: string | null
        }
        Insert: {
          brief_id: string
          changed_fields?: Json
          created_at?: string
          id?: string
          previous_summary?: string | null
          updated_by?: string | null
        }
        Update: {
          brief_id?: string
          changed_fields?: Json
          created_at?: string
          id?: string
          previous_summary?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brief_audit_log_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "business_sourcing_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      build_log_entries: {
        Row: {
          author: string
          change_type: string
          created_at: string
          description: string | null
          id: string
          module_affected: string
          title: string
        }
        Insert: {
          author?: string
          change_type?: string
          created_at?: string
          description?: string | null
          id?: string
          module_affected?: string
          title: string
        }
        Update: {
          author?: string
          change_type?: string
          created_at?: string
          description?: string | null
          id?: string
          module_affected?: string
          title?: string
        }
        Relationships: []
      }
      business_agent_assignments_v2: {
        Row: {
          agent_key: string
          blockers: Json
          business_id: string
          can_call_provider_post: boolean
          can_create_internal_records: boolean
          can_send_external: boolean
          can_spend_credits: boolean
          created_at: string
          enabled: boolean
          founder_approval_required: boolean
          id: string
          metadata: Json
          operating_mode: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_key: string
          blockers?: Json
          business_id: string
          can_call_provider_post?: boolean
          can_create_internal_records?: boolean
          can_send_external?: boolean
          can_spend_credits?: boolean
          created_at?: string
          enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          operating_mode?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_key?: string
          blockers?: Json
          business_id?: string
          can_call_provider_post?: boolean
          can_create_internal_records?: boolean
          can_send_external?: boolean
          can_spend_credits?: boolean
          created_at?: string
          enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          operating_mode?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_agent_assignments_v2_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_autopilot_settings: {
        Row: {
          ai_classification_allowed: boolean
          apollo_candidate_pull_enabled: boolean
          apollo_email_reveal_autonomous: boolean
          apollo_reveal_daily_credit_budget: number
          apollo_reveal_exclude_duplicates: boolean
          apollo_reveal_exclude_existing_crm: boolean
          apollo_reveal_exclude_legacy_hold: boolean
          apollo_reveal_exclude_poor_fit: boolean
          apollo_reveal_exclude_previous_no_email: boolean
          apollo_reveal_max_domain_frequency: number
          apollo_reveal_min_quality_score: number
          apollo_reveal_monthly_credit_budget: number
          auto_archive_duplicates: boolean
          auto_archive_poor_fit: boolean
          auto_build_unlock_shortlist: boolean
          auto_crm_cross_check: boolean
          auto_dedupe_apollo_leads: boolean
          auto_enqueue_contacts: boolean
          auto_hold_missing_email_old_pool: boolean
          auto_lifecycle_classify: boolean
          auto_promote_after_valid_reveal: boolean
          auto_promote_only_campaign_fit: boolean
          auto_promote_only_crm_new: boolean
          auto_promote_only_verified_email: boolean
          auto_promote_verified_qualified_leads: boolean
          auto_queue_after_promotion: boolean
          auto_queue_campaign_id: string | null
          auto_queue_domain_cap: number
          auto_queue_step: number
          auto_scan_imported_leads: boolean
          auto_send_after_queue: boolean
          auto_send_live_batches: boolean
          auto_unlock_apollo_emails: boolean
          business_id: string
          created_at: string
          daily_send_budget: number
          founder_reveal_amount_next_run: number | null
          id: string
          max_apollo_unlock_credits_without_founder_approval: number
          sending_provider_mode: string
          stale_needs_verification_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_classification_allowed?: boolean
          apollo_candidate_pull_enabled?: boolean
          apollo_email_reveal_autonomous?: boolean
          apollo_reveal_daily_credit_budget?: number
          apollo_reveal_exclude_duplicates?: boolean
          apollo_reveal_exclude_existing_crm?: boolean
          apollo_reveal_exclude_legacy_hold?: boolean
          apollo_reveal_exclude_poor_fit?: boolean
          apollo_reveal_exclude_previous_no_email?: boolean
          apollo_reveal_max_domain_frequency?: number
          apollo_reveal_min_quality_score?: number
          apollo_reveal_monthly_credit_budget?: number
          auto_archive_duplicates?: boolean
          auto_archive_poor_fit?: boolean
          auto_build_unlock_shortlist?: boolean
          auto_crm_cross_check?: boolean
          auto_dedupe_apollo_leads?: boolean
          auto_enqueue_contacts?: boolean
          auto_hold_missing_email_old_pool?: boolean
          auto_lifecycle_classify?: boolean
          auto_promote_after_valid_reveal?: boolean
          auto_promote_only_campaign_fit?: boolean
          auto_promote_only_crm_new?: boolean
          auto_promote_only_verified_email?: boolean
          auto_promote_verified_qualified_leads?: boolean
          auto_queue_after_promotion?: boolean
          auto_queue_campaign_id?: string | null
          auto_queue_domain_cap?: number
          auto_queue_step?: number
          auto_scan_imported_leads?: boolean
          auto_send_after_queue?: boolean
          auto_send_live_batches?: boolean
          auto_unlock_apollo_emails?: boolean
          business_id: string
          created_at?: string
          daily_send_budget?: number
          founder_reveal_amount_next_run?: number | null
          id?: string
          max_apollo_unlock_credits_without_founder_approval?: number
          sending_provider_mode?: string
          stale_needs_verification_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_classification_allowed?: boolean
          apollo_candidate_pull_enabled?: boolean
          apollo_email_reveal_autonomous?: boolean
          apollo_reveal_daily_credit_budget?: number
          apollo_reveal_exclude_duplicates?: boolean
          apollo_reveal_exclude_existing_crm?: boolean
          apollo_reveal_exclude_legacy_hold?: boolean
          apollo_reveal_exclude_poor_fit?: boolean
          apollo_reveal_exclude_previous_no_email?: boolean
          apollo_reveal_max_domain_frequency?: number
          apollo_reveal_min_quality_score?: number
          apollo_reveal_monthly_credit_budget?: number
          auto_archive_duplicates?: boolean
          auto_archive_poor_fit?: boolean
          auto_build_unlock_shortlist?: boolean
          auto_crm_cross_check?: boolean
          auto_dedupe_apollo_leads?: boolean
          auto_enqueue_contacts?: boolean
          auto_hold_missing_email_old_pool?: boolean
          auto_lifecycle_classify?: boolean
          auto_promote_after_valid_reveal?: boolean
          auto_promote_only_campaign_fit?: boolean
          auto_promote_only_crm_new?: boolean
          auto_promote_only_verified_email?: boolean
          auto_promote_verified_qualified_leads?: boolean
          auto_queue_after_promotion?: boolean
          auto_queue_campaign_id?: string | null
          auto_queue_domain_cap?: number
          auto_queue_step?: number
          auto_scan_imported_leads?: boolean
          auto_send_after_queue?: boolean
          auto_send_live_batches?: boolean
          auto_unlock_apollo_emails?: boolean
          business_id?: string
          created_at?: string
          daily_send_budget?: number
          founder_reveal_amount_next_run?: number | null
          id?: string
          max_apollo_unlock_credits_without_founder_approval?: number
          sending_provider_mode?: string
          stale_needs_verification_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      business_contact_relationships: {
        Row: {
          business_id: string | null
          business_name: string
          campaign_eligible: boolean
          contact_id: string
          created_at: string
          current_stage: Database["public"]["Enums"]["bcr_stage"]
          do_not_contact: boolean
          do_not_contact_reason: string
          id: string
          last_campaign_id: string | null
          notes: string
          qualification: Database["public"]["Enums"]["bcr_qualification"]
          qualification_reason: string
          relevance_category: string | null
          source_segment_id: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          business_name: string
          campaign_eligible?: boolean
          contact_id: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["bcr_stage"]
          do_not_contact?: boolean
          do_not_contact_reason?: string
          id?: string
          last_campaign_id?: string | null
          notes?: string
          qualification?: Database["public"]["Enums"]["bcr_qualification"]
          qualification_reason?: string
          relevance_category?: string | null
          source_segment_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          business_name?: string
          campaign_eligible?: boolean
          contact_id?: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["bcr_stage"]
          do_not_contact?: boolean
          do_not_contact_reason?: string
          id?: string
          last_campaign_id?: string | null
          notes?: string
          qualification?: Database["public"]["Enums"]["bcr_qualification"]
          qualification_reason?: string
          relevance_category?: string | null
          source_segment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_contact_relationships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_contact_relationships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_contact_relationships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      business_knowledge_assets: {
        Row: {
          agent_visible: boolean
          asset_content: string | null
          asset_title: string
          asset_type: string
          business_id: string
          created_at: string
          id: string
          metadata: Json
          source_file_id: string | null
          source_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_visible?: boolean
          asset_content?: string | null
          asset_title: string
          asset_type: string
          business_id: string
          created_at?: string
          id?: string
          metadata?: Json
          source_file_id?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_visible?: boolean
          asset_content?: string | null
          asset_title?: string
          asset_type?: string
          business_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          source_file_id?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_knowledge_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_knowledge_profiles: {
        Row: {
          approved_tone: string | null
          business_id: string
          business_summary: string | null
          common_objections: Json
          compliance_notes: string | null
          created_at: string
          escalation_rules: Json
          forbidden_claims: Json
          id: string
          ideal_customer_profile: string | null
          metadata: Json
          offer_summary: string | null
          outreach_rules: Json
          pain_points: Json
          profile_status: string
          proof_points: Json
          proposal_rules: Json
          required_disclaimers: Json
          target_customer: string | null
          updated_at: string
          value_propositions: Json
        }
        Insert: {
          approved_tone?: string | null
          business_id: string
          business_summary?: string | null
          common_objections?: Json
          compliance_notes?: string | null
          created_at?: string
          escalation_rules?: Json
          forbidden_claims?: Json
          id?: string
          ideal_customer_profile?: string | null
          metadata?: Json
          offer_summary?: string | null
          outreach_rules?: Json
          pain_points?: Json
          profile_status?: string
          proof_points?: Json
          proposal_rules?: Json
          required_disclaimers?: Json
          target_customer?: string | null
          updated_at?: string
          value_propositions?: Json
        }
        Update: {
          approved_tone?: string | null
          business_id?: string
          business_summary?: string | null
          common_objections?: Json
          compliance_notes?: string | null
          created_at?: string
          escalation_rules?: Json
          forbidden_claims?: Json
          id?: string
          ideal_customer_profile?: string | null
          metadata?: Json
          offer_summary?: string | null
          outreach_rules?: Json
          pain_points?: Json
          profile_status?: string
          proof_points?: Json
          proposal_rules?: Json
          required_disclaimers?: Json
          target_customer?: string | null
          updated_at?: string
          value_propositions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "business_knowledge_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_launch_plans: {
        Row: {
          approved_at: string | null
          blockers: Json
          business_id: string | null
          created_at: string
          founder_approval_required: boolean
          founder_brief: string | null
          id: string
          launch_name: string
          launch_status: string
          metadata: Json
          readiness_score: number | null
          required_integrations: Json
          selected_agents: Json
          selected_modules: Json
          setup_steps: Json
          template_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          blockers?: Json
          business_id?: string | null
          created_at?: string
          founder_approval_required?: boolean
          founder_brief?: string | null
          id?: string
          launch_name: string
          launch_status?: string
          metadata?: Json
          readiness_score?: number | null
          required_integrations?: Json
          selected_agents?: Json
          selected_modules?: Json
          setup_steps?: Json
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          blockers?: Json
          business_id?: string | null
          created_at?: string
          founder_approval_required?: boolean
          founder_brief?: string | null
          id?: string
          launch_name?: string
          launch_status?: string
          metadata?: Json
          readiness_score?: number | null
          required_integrations?: Json
          selected_agents?: Json
          selected_modules?: Json
          setup_steps?: Json
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_launch_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_launch_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "business_launch_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      business_launch_templates: {
        Row: {
          active: boolean
          business_category: string | null
          created_at: string
          default_agents: Json
          default_campaign_structure: Json
          default_compliance_profile: Json
          default_crm_profile: Json
          default_finance_structure: Json
          default_modules: Json
          default_proposal_structure: Json
          default_provider_lanes: Json
          description: string | null
          id: string
          metadata: Json
          template_key: string
          template_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_category?: string | null
          created_at?: string
          default_agents?: Json
          default_campaign_structure?: Json
          default_compliance_profile?: Json
          default_crm_profile?: Json
          default_finance_structure?: Json
          default_modules?: Json
          default_proposal_structure?: Json
          default_provider_lanes?: Json
          description?: string | null
          id?: string
          metadata?: Json
          template_key: string
          template_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_category?: string | null
          created_at?: string
          default_agents?: Json
          default_campaign_structure?: Json
          default_compliance_profile?: Json
          default_crm_profile?: Json
          default_finance_structure?: Json
          default_modules?: Json
          default_proposal_structure?: Json
          default_provider_lanes?: Json
          description?: string | null
          id?: string
          metadata?: Json
          template_key?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_learning_signals: {
        Row: {
          agent_key: string | null
          business_id: string | null
          campaign_id: string | null
          captured_at: string
          contact_id: string | null
          created_at: string
          id: string
          metadata: Json
          negative_signal: boolean | null
          outcome: string | null
          positive_signal: boolean | null
          signal_label: string | null
          signal_type: string
          signal_value: number | null
          source_id: string | null
          source_table: string | null
        }
        Insert: {
          agent_key?: string | null
          business_id?: string | null
          campaign_id?: string | null
          captured_at?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          negative_signal?: boolean | null
          outcome?: string | null
          positive_signal?: boolean | null
          signal_label?: string | null
          signal_type: string
          signal_value?: number | null
          source_id?: string | null
          source_table?: string | null
        }
        Update: {
          agent_key?: string | null
          business_id?: string | null
          campaign_id?: string | null
          captured_at?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          negative_signal?: boolean | null
          outcome?: string | null
          positive_signal?: boolean | null
          signal_label?: string | null
          signal_type?: string
          signal_value?: number | null
          source_id?: string | null
          source_table?: string | null
        }
        Relationships: []
      }
      business_module_status: {
        Row: {
          blockers: Json
          business_id: string | null
          configured: boolean
          created_at: string
          enabled: boolean
          external_actions_enabled: boolean
          id: string
          last_checked_at: string | null
          live_internal: boolean
          metadata: Json
          module_key: string
          next_action: string | null
          readiness_score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          blockers?: Json
          business_id?: string | null
          configured?: boolean
          created_at?: string
          enabled?: boolean
          external_actions_enabled?: boolean
          id?: string
          last_checked_at?: string | null
          live_internal?: boolean
          metadata?: Json
          module_key: string
          next_action?: string | null
          readiness_score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          blockers?: Json
          business_id?: string | null
          configured?: boolean
          created_at?: string
          enabled?: boolean
          external_actions_enabled?: boolean
          id?: string
          last_checked_at?: string | null
          live_internal?: boolean
          metadata?: Json
          module_key?: string
          next_action?: string | null
          readiness_score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_module_status_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_operating_modules: {
        Row: {
          blockers: Json
          business_id: string
          created_at: string
          enabled: boolean
          id: string
          last_checked_at: string | null
          metadata: Json
          module_key: string
          module_label: string
          readiness_status: string
          setup_status: string
          updated_at: string
        }
        Insert: {
          blockers?: Json
          business_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_checked_at?: string | null
          metadata?: Json
          module_key: string
          module_label: string
          readiness_status?: string
          setup_status?: string
          updated_at?: string
        }
        Update: {
          blockers?: Json
          business_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_checked_at?: string | null
          metadata?: Json
          module_key?: string
          module_label?: string
          readiness_status?: string
          setup_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_operating_modules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_operating_profiles: {
        Row: {
          agents_enabled: boolean
          apollo_enabled: boolean
          auto_send_allowed: boolean
          business_id: string
          business_name: string
          business_type: string | null
          created_at: string
          crm_enabled: boolean
          default_outbound_lane: string | null
          default_provider_type: string | null
          external_provider_mutation_allowed: boolean
          finance_enabled: boolean
          founder_approval_required: boolean
          id: string
          metadata: Json
          native_email_enabled: boolean
          operating_status: string
          primary_channel: string | null
          primary_goal: string | null
          primary_offer: string | null
          proposals_enabled: boolean
          revenue_model: string | null
          smartlead_enabled: boolean
          suppliers_enabled: boolean
          target_market: string | null
          updated_at: string
        }
        Insert: {
          agents_enabled?: boolean
          apollo_enabled?: boolean
          auto_send_allowed?: boolean
          business_id: string
          business_name: string
          business_type?: string | null
          created_at?: string
          crm_enabled?: boolean
          default_outbound_lane?: string | null
          default_provider_type?: string | null
          external_provider_mutation_allowed?: boolean
          finance_enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          native_email_enabled?: boolean
          operating_status?: string
          primary_channel?: string | null
          primary_goal?: string | null
          primary_offer?: string | null
          proposals_enabled?: boolean
          revenue_model?: string | null
          smartlead_enabled?: boolean
          suppliers_enabled?: boolean
          target_market?: string | null
          updated_at?: string
        }
        Update: {
          agents_enabled?: boolean
          apollo_enabled?: boolean
          auto_send_allowed?: boolean
          business_id?: string
          business_name?: string
          business_type?: string | null
          created_at?: string
          crm_enabled?: boolean
          default_outbound_lane?: string | null
          default_provider_type?: string | null
          external_provider_mutation_allowed?: boolean
          finance_enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          native_email_enabled?: boolean
          operating_status?: string
          primary_channel?: string | null
          primary_goal?: string | null
          primary_offer?: string | null
          proposals_enabled?: boolean
          revenue_model?: string | null
          smartlead_enabled?: boolean
          suppliers_enabled?: boolean
          target_market?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_operating_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_operating_runbooks: {
        Row: {
          business_id: string | null
          created_at: string
          expected_outputs: Json
          id: string
          metadata: Json
          required_approvals: Json
          runbook_key: string
          runbook_name: string
          runbook_type: string
          safety_notes: Json
          status: string
          steps: Json
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          expected_outputs?: Json
          id?: string
          metadata?: Json
          required_approvals?: Json
          runbook_key: string
          runbook_name: string
          runbook_type: string
          safety_notes?: Json
          status?: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          expected_outputs?: Json
          id?: string
          metadata?: Json
          required_approvals?: Json
          runbook_key?: string
          runbook_name?: string
          runbook_type?: string
          safety_notes?: Json
          status?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      business_risk_scores: {
        Row: {
          business_name: string
          event_count: number
          high_risk: boolean
          id: string
          last_event_at: string | null
          previous_score: number
          risk_trend: string
          score: number
          updated_at: string
        }
        Insert: {
          business_name: string
          event_count?: number
          high_risk?: boolean
          id?: string
          last_event_at?: string | null
          previous_score?: number
          risk_trend?: string
          score?: number
          updated_at?: string
        }
        Update: {
          business_name?: string
          event_count?: number
          high_risk?: boolean
          id?: string
          last_event_at?: string | null
          previous_score?: number
          risk_trend?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
      business_sourcing_briefs: {
        Row: {
          apollo_credit_protection: Json
          apollo_search_keywords: string[]
          business_id: string
          campaign_id: string | null
          created_at: string
          crm_exclusion_rules: Json
          email_requirements: Json
          exclude_company_types: string[]
          exclude_titles: string[]
          geography_preferences: Json
          id: string
          include_company_types: string[]
          include_titles: string[]
          is_active: boolean
          last_updated_at: string
          name: string
          notes: string | null
          priority_segments: Json
          suggested_first_export_size: number | null
          suggested_first_search_size: number | null
          suggested_unlock_strategy: string | null
          target_audience: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          apollo_credit_protection?: Json
          apollo_search_keywords?: string[]
          business_id: string
          campaign_id?: string | null
          created_at?: string
          crm_exclusion_rules?: Json
          email_requirements?: Json
          exclude_company_types?: string[]
          exclude_titles?: string[]
          geography_preferences?: Json
          id?: string
          include_company_types?: string[]
          include_titles?: string[]
          is_active?: boolean
          last_updated_at?: string
          name: string
          notes?: string | null
          priority_segments?: Json
          suggested_first_export_size?: number | null
          suggested_first_search_size?: number | null
          suggested_unlock_strategy?: string | null
          target_audience?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          apollo_credit_protection?: Json
          apollo_search_keywords?: string[]
          business_id?: string
          campaign_id?: string | null
          created_at?: string
          crm_exclusion_rules?: Json
          email_requirements?: Json
          exclude_company_types?: string[]
          exclude_titles?: string[]
          geography_preferences?: Json
          id?: string
          include_company_types?: string[]
          include_titles?: string[]
          is_active?: boolean
          last_updated_at?: string
          name?: string
          notes?: string | null
          priority_segments?: Json
          suggested_first_export_size?: number | null
          suggested_first_search_size?: number | null
          suggested_unlock_strategy?: string | null
          target_audience?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_sourcing_briefs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          execution_mode_id: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          execution_mode_id?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          execution_mode_id?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_execution_mode_id_fkey"
            columns: ["execution_mode_id"]
            isOneToOne: false
            referencedRelation: "system_execution_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics: {
        Row: {
          bounce_rate: number
          campaign_id: string
          id: string
          reply_rate: number
          total_bounces: number
          total_opens: number
          total_replies: number
          total_sent: number
          updated_at: string
        }
        Insert: {
          bounce_rate?: number
          campaign_id: string
          id?: string
          reply_rate?: number
          total_bounces?: number
          total_opens?: number
          total_replies?: number
          total_sent?: number
          updated_at?: string
        }
        Update: {
          bounce_rate?: number
          campaign_id?: string
          id?: string
          reply_rate?: number
          total_bounces?: number
          total_opens?: number
          total_replies?: number
          total_sent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_archive: {
        Row: {
          archived_at: string
          business_name: string | null
          cleanup_batch_id: string
          cleanup_reason: string
          id: string
          payload: Json
          source_row_id: string | null
          source_table: string
        }
        Insert: {
          archived_at?: string
          business_name?: string | null
          cleanup_batch_id: string
          cleanup_reason: string
          id?: string
          payload: Json
          source_row_id?: string | null
          source_table: string
        }
        Update: {
          archived_at?: string
          business_name?: string | null
          cleanup_batch_id?: string
          cleanup_reason?: string
          id?: string
          payload?: Json
          source_row_id?: string | null
          source_table?: string
        }
        Relationships: []
      }
      cleanup_audit_log: {
        Row: {
          cleanup_batch_id: string
          id: string
          notes: string | null
          per_table_counts: Json
          preserved_summary: Json
          ran_at: string
          reason: string
        }
        Insert: {
          cleanup_batch_id: string
          id?: string
          notes?: string | null
          per_table_counts: Json
          preserved_summary: Json
          ran_at?: string
          reason: string
        }
        Update: {
          cleanup_batch_id?: string
          id?: string
          notes?: string | null
          per_table_counts?: Json
          preserved_summary?: Json
          ran_at?: string
          reason?: string
        }
        Relationships: []
      }
      client_system_packages: {
        Row: {
          active: boolean
          created_at: string
          delivery_notes: string | null
          description: string | null
          id: string
          included_modules: Json
          metadata: Json
          monthly_fee_max: number | null
          monthly_fee_min: number | null
          package_key: string
          package_name: string
          setup_fee_max: number | null
          setup_fee_min: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          delivery_notes?: string | null
          description?: string | null
          id?: string
          included_modules?: Json
          metadata?: Json
          monthly_fee_max?: number | null
          monthly_fee_min?: number | null
          package_key: string
          package_name: string
          setup_fee_max?: number | null
          setup_fee_min?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          delivery_notes?: string | null
          description?: string | null
          id?: string
          included_modules?: Json
          metadata?: Json
          monthly_fee_max?: number | null
          monthly_fee_min?: number | null
          package_key?: string
          package_name?: string
          setup_fee_max?: number | null
          setup_fee_min?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      command_centre_modules: {
        Row: {
          business_scoped: boolean
          command_centre_section: string | null
          component_name: string | null
          created_at: string
          enabled: boolean
          global_module: boolean
          id: string
          metadata: Json
          module_category: string
          module_key: string
          module_name: string
          primary_route: string | null
          readiness_function: string | null
          related_routes: Json
          required_for_25_business_scale: boolean
          required_for_core: boolean
          required_for_global_brain: boolean
          section_number: number | null
          status_source: string | null
          updated_at: string
        }
        Insert: {
          business_scoped?: boolean
          command_centre_section?: string | null
          component_name?: string | null
          created_at?: string
          enabled?: boolean
          global_module?: boolean
          id?: string
          metadata?: Json
          module_category: string
          module_key: string
          module_name: string
          primary_route?: string | null
          readiness_function?: string | null
          related_routes?: Json
          required_for_25_business_scale?: boolean
          required_for_core?: boolean
          required_for_global_brain?: boolean
          section_number?: number | null
          status_source?: string | null
          updated_at?: string
        }
        Update: {
          business_scoped?: boolean
          command_centre_section?: string | null
          component_name?: string | null
          created_at?: string
          enabled?: boolean
          global_module?: boolean
          id?: string
          metadata?: Json
          module_category?: string
          module_key?: string
          module_name?: string
          primary_route?: string | null
          readiness_function?: string | null
          related_routes?: Json
          required_for_25_business_scale?: boolean
          required_for_core?: boolean
          required_for_global_brain?: boolean
          section_number?: number | null
          status_source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commercial_handoff_reviews: {
        Row: {
          apply_status: string
          approval_item_id: string | null
          blockers: Json
          business_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          deal_allowed: boolean
          demo_allowed: boolean
          detected_need: string | null
          estimated_value_max: number | null
          estimated_value_min: number | null
          founder_review_required: boolean
          handoff_type: string
          id: string
          interaction_id: string | null
          metadata: Json
          proposal_allowed: boolean
          proposed_next_step: string | null
          proposed_offer: string | null
          qualification_summary: string | null
          updated_at: string
        }
        Insert: {
          apply_status?: string
          approval_item_id?: string | null
          blockers?: Json
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_allowed?: boolean
          demo_allowed?: boolean
          detected_need?: string | null
          estimated_value_max?: number | null
          estimated_value_min?: number | null
          founder_review_required?: boolean
          handoff_type: string
          id?: string
          interaction_id?: string | null
          metadata?: Json
          proposal_allowed?: boolean
          proposed_next_step?: string | null
          proposed_offer?: string | null
          qualification_summary?: string | null
          updated_at?: string
        }
        Update: {
          apply_status?: string
          approval_item_id?: string | null
          blockers?: Json
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_allowed?: boolean
          demo_allowed?: boolean
          detected_need?: string | null
          estimated_value_max?: number | null
          estimated_value_min?: number | null
          founder_review_required?: boolean
          handoff_type?: string
          id?: string
          interaction_id?: string | null
          metadata?: Json
          proposal_allowed?: boolean
          proposed_next_step?: string | null
          proposed_offer?: string | null
          qualification_summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      communication_channels: {
        Row: {
          auto_reply_allowed: boolean
          channel_key: string
          channel_label: string
          channel_type: string
          created_at: string
          credentials_present: boolean
          enabled: boolean
          founder_approval_required: boolean
          id: string
          inbound_supported: boolean
          live_connected: boolean
          metadata: Json
          notes: string | null
          outbound_supported: boolean
          provider_type: string | null
          requires_credentials: boolean
          updated_at: string
        }
        Insert: {
          auto_reply_allowed?: boolean
          channel_key: string
          channel_label: string
          channel_type: string
          created_at?: string
          credentials_present?: boolean
          enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          inbound_supported?: boolean
          live_connected?: boolean
          metadata?: Json
          notes?: string | null
          outbound_supported?: boolean
          provider_type?: string | null
          requires_credentials?: boolean
          updated_at?: string
        }
        Update: {
          auto_reply_allowed?: boolean
          channel_key?: string
          channel_label?: string
          channel_type?: string
          created_at?: string
          credentials_present?: boolean
          enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          inbound_supported?: boolean
          live_connected?: boolean
          metadata?: Json
          notes?: string | null
          outbound_supported?: boolean
          provider_type?: string | null
          requires_credentials?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          ai_generated: boolean
          channel: Database["public"]["Enums"]["communication_channel"]
          contact_id: string
          created_at: string
          direction: Database["public"]["Enums"]["communication_direction"]
          id: string
          ignored_for_send_check: boolean
          ignored_reason: string | null
          inbox_id: string | null
          message: string
          timestamp: string
        }
        Insert: {
          ai_generated?: boolean
          channel?: Database["public"]["Enums"]["communication_channel"]
          contact_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["communication_direction"]
          id?: string
          ignored_for_send_check?: boolean
          ignored_reason?: string | null
          inbox_id?: string | null
          message?: string
          timestamp?: string
        }
        Update: {
          ai_generated?: boolean
          channel?: Database["public"]["Enums"]["communication_channel"]
          contact_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["communication_direction"]
          id?: string
          ignored_for_send_check?: boolean
          ignored_reason?: string | null
          inbox_id?: string | null
          message?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "communications_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "command_centre_active_inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inbox_health_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "warmup_progress"
            referencedColumns: ["inbox_id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          category: string
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          name: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          name: string
          uploaded_by?: string
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          name?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      compliance_events: {
        Row: {
          business_name: string
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["compliance_entity_type"]
          flag_type: string
          id: string
          jurisdiction: string
          message: string
          metadata: Json
          resolution_note: string
          resolved: boolean
          resolved_at: string | null
          rule_id: string | null
          severity: Database["public"]["Enums"]["compliance_severity"]
        }
        Insert: {
          business_name?: string
          created_at?: string
          entity_id?: string | null
          entity_type: Database["public"]["Enums"]["compliance_entity_type"]
          flag_type?: string
          id?: string
          jurisdiction?: string
          message?: string
          metadata?: Json
          resolution_note?: string
          resolved?: boolean
          resolved_at?: string | null
          rule_id?: string | null
          severity?: Database["public"]["Enums"]["compliance_severity"]
        }
        Update: {
          business_name?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["compliance_entity_type"]
          flag_type?: string
          id?: string
          jurisdiction?: string
          message?: string
          metadata?: Json
          resolution_note?: string
          resolved?: boolean
          resolved_at?: string | null
          rule_id?: string | null
          severity?: Database["public"]["Enums"]["compliance_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "compliance_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "compliance_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          area: string
          created_at: string
          description: string | null
          id: string
          last_review_date: string | null
          next_review_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          description?: string | null
          id?: string
          last_review_date?: string | null
          next_review_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          description?: string | null
          id?: string
          last_review_date?: string | null
          next_review_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_rules: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["compliance_category"]
          conditions: Json
          created_at: string
          description: string
          enforcement_mode: Database["public"]["Enums"]["compliance_enforcement"]
          hit_count: number
          id: string
          jurisdiction: string
          last_hit_at: string | null
          name: string
          severity: Database["public"]["Enums"]["compliance_severity"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["compliance_category"]
          conditions?: Json
          created_at?: string
          description?: string
          enforcement_mode?: Database["public"]["Enums"]["compliance_enforcement"]
          hit_count?: number
          id?: string
          jurisdiction?: string
          last_hit_at?: string | null
          name: string
          severity?: Database["public"]["Enums"]["compliance_severity"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["compliance_category"]
          conditions?: Json
          created_at?: string
          description?: string
          enforcement_mode?: Database["public"]["Enums"]["compliance_enforcement"]
          hit_count?: number
          id?: string
          jurisdiction?: string
          last_hit_at?: string | null
          name?: string
          severity?: Database["public"]["Enums"]["compliance_severity"]
          updated_at?: string
        }
        Relationships: []
      }
      compliance_scores: {
        Row: {
          entity_id: string
          entity_type: Database["public"]["Enums"]["compliance_entity_type"]
          event_count: number
          high_risk: boolean
          id: string
          last_event_at: string | null
          previous_score: number
          risk_trend: string
          score: number
          updated_at: string
        }
        Insert: {
          entity_id: string
          entity_type: Database["public"]["Enums"]["compliance_entity_type"]
          event_count?: number
          high_risk?: boolean
          id?: string
          last_event_at?: string | null
          previous_score?: number
          risk_trend?: string
          score?: number
          updated_at?: string
        }
        Update: {
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["compliance_entity_type"]
          event_count?: number
          high_risk?: boolean
          id?: string
          last_event_at?: string | null
          previous_score?: number
          risk_trend?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
      contact_compliance_events: {
        Row: {
          actor: string
          business_id: string | null
          business_name: string
          contact_id: string | null
          created_at: string
          event_notes: string
          event_source: string
          event_type: string
          id: string
          new_value: Json
          old_value: Json
        }
        Insert: {
          actor?: string
          business_id?: string | null
          business_name?: string
          contact_id?: string | null
          created_at?: string
          event_notes?: string
          event_source?: string
          event_type: string
          id?: string
          new_value?: Json
          old_value?: Json
        }
        Update: {
          actor?: string
          business_id?: string | null
          business_name?: string
          contact_id?: string | null
          created_at?: string
          event_notes?: string
          event_source?: string
          event_type?: string
          id?: string
          new_value?: Json
          old_value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contact_compliance_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_compliance_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      contact_timezone_profiles: {
        Row: {
          best_contact_windows: Json
          business_id: string | null
          confidence: number
          contact_id: string | null
          created_at: string
          detected_country: string | null
          detected_region: string | null
          detected_timezone: string | null
          detection_source: string | null
          id: string
          last_resolved_at: string | null
          local_business_hours: Json
          metadata: Json
          updated_at: string
        }
        Insert: {
          best_contact_windows?: Json
          business_id?: string | null
          confidence?: number
          contact_id?: string | null
          created_at?: string
          detected_country?: string | null
          detected_region?: string | null
          detected_timezone?: string | null
          detection_source?: string | null
          id?: string
          last_resolved_at?: string | null
          local_business_hours?: Json
          metadata?: Json
          updated_at?: string
        }
        Update: {
          best_contact_windows?: Json
          business_id?: string | null
          confidence?: number
          contact_id?: string | null
          created_at?: string
          detected_country?: string | null
          detected_region?: string | null
          detected_timezone?: string | null
          detection_source?: string | null
          id?: string
          last_resolved_at?: string | null
          local_business_hours?: Json
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_timezone_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_timezone_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_timezone_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      contacts: {
        Row: {
          active_campaign_id: string | null
          apollo_enrichment_status: Database["public"]["Enums"]["apollo_enrichment_status"]
          apollo_last_enriched_at: string | null
          apollo_organization_id: string | null
          apollo_person_id: string | null
          archive_reason: string | null
          archived_at: string | null
          assigned_business: string
          assigned_inbox_id: string | null
          company: string
          company_size: Database["public"]["Enums"]["company_size_tier"] | null
          compliance_status: string
          conversation_active: boolean
          country: string | null
          created_at: string
          data_source: string | null
          do_not_contact_at: string | null
          do_not_contact_reason: string | null
          email: string
          email_verified_status: string
          enriched_at: string | null
          first_imported_business: string | null
          first_imported_campaign: string | null
          first_name: string | null
          founder_review_note: string
          founder_review_requested_at: string | null
          global_suppression_at: string | null
          global_suppression_reason: string | null
          hard_bounced: boolean
          id: string
          industry: string | null
          intent_score: number
          is_globally_suppressed: boolean
          is_internal: boolean
          last_compliance_review_at: string | null
          last_contacted_at: string | null
          last_name: string | null
          last_replied_at: string | null
          lawful_basis: string | null
          lawful_basis_notes: string | null
          lawful_basis_recorded_at: string | null
          linkedin_url: string | null
          name: string
          notes: string
          phone: string | null
          retention_policy: string | null
          retention_until: string | null
          role: string
          sendable_status: Database["public"]["Enums"]["contact_sendable_status"]
          seniority: Database["public"]["Enums"]["seniority_level"] | null
          source: string
          source_collected_at: string | null
          source_platform: string | null
          source_record_id: string | null
          status: Database["public"]["Enums"]["contact_status"]
          tags: string[]
          timezone: string | null
          timezone_confidence: Database["public"]["Enums"]["timezone_confidence_level"]
          unsubscribe_source: string | null
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          active_campaign_id?: string | null
          apollo_enrichment_status?: Database["public"]["Enums"]["apollo_enrichment_status"]
          apollo_last_enriched_at?: string | null
          apollo_organization_id?: string | null
          apollo_person_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          assigned_business?: string
          assigned_inbox_id?: string | null
          company?: string
          company_size?: Database["public"]["Enums"]["company_size_tier"] | null
          compliance_status?: string
          conversation_active?: boolean
          country?: string | null
          created_at?: string
          data_source?: string | null
          do_not_contact_at?: string | null
          do_not_contact_reason?: string | null
          email: string
          email_verified_status?: string
          enriched_at?: string | null
          first_imported_business?: string | null
          first_imported_campaign?: string | null
          first_name?: string | null
          founder_review_note?: string
          founder_review_requested_at?: string | null
          global_suppression_at?: string | null
          global_suppression_reason?: string | null
          hard_bounced?: boolean
          id?: string
          industry?: string | null
          intent_score?: number
          is_globally_suppressed?: boolean
          is_internal?: boolean
          last_compliance_review_at?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          last_replied_at?: string | null
          lawful_basis?: string | null
          lawful_basis_notes?: string | null
          lawful_basis_recorded_at?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string
          phone?: string | null
          retention_policy?: string | null
          retention_until?: string | null
          role?: string
          sendable_status?: Database["public"]["Enums"]["contact_sendable_status"]
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          source?: string
          source_collected_at?: string | null
          source_platform?: string | null
          source_record_id?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[]
          timezone?: string | null
          timezone_confidence?: Database["public"]["Enums"]["timezone_confidence_level"]
          unsubscribe_source?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          active_campaign_id?: string | null
          apollo_enrichment_status?: Database["public"]["Enums"]["apollo_enrichment_status"]
          apollo_last_enriched_at?: string | null
          apollo_organization_id?: string | null
          apollo_person_id?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          assigned_business?: string
          assigned_inbox_id?: string | null
          company?: string
          company_size?: Database["public"]["Enums"]["company_size_tier"] | null
          compliance_status?: string
          conversation_active?: boolean
          country?: string | null
          created_at?: string
          data_source?: string | null
          do_not_contact_at?: string | null
          do_not_contact_reason?: string | null
          email?: string
          email_verified_status?: string
          enriched_at?: string | null
          first_imported_business?: string | null
          first_imported_campaign?: string | null
          first_name?: string | null
          founder_review_note?: string
          founder_review_requested_at?: string | null
          global_suppression_at?: string | null
          global_suppression_reason?: string | null
          hard_bounced?: boolean
          id?: string
          industry?: string | null
          intent_score?: number
          is_globally_suppressed?: boolean
          is_internal?: boolean
          last_compliance_review_at?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          last_replied_at?: string | null
          lawful_basis?: string | null
          lawful_basis_notes?: string | null
          lawful_basis_recorded_at?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string
          phone?: string | null
          retention_policy?: string | null
          retention_until?: string | null
          role?: string
          sendable_status?: Database["public"]["Enums"]["contact_sendable_status"]
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          source?: string
          source_collected_at?: string | null
          source_platform?: string | null
          source_record_id?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[]
          timezone?: string | null
          timezone_confidence?: Database["public"]["Enums"]["timezone_confidence_level"]
          unsubscribe_source?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_inbox_id_fkey"
            columns: ["assigned_inbox_id"]
            isOneToOne: false
            referencedRelation: "command_centre_active_inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_assigned_inbox_id_fkey"
            columns: ["assigned_inbox_id"]
            isOneToOne: false
            referencedRelation: "inbox_health_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_assigned_inbox_id_fkey"
            columns: ["assigned_inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_assigned_inbox_id_fkey"
            columns: ["assigned_inbox_id"]
            isOneToOne: false
            referencedRelation: "warmup_progress"
            referencedColumns: ["inbox_id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          active: boolean
          business_name: string
          created_at: string
          id: string
          jurisdiction: string
          template_name: string
          template_text: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          business_name?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          template_name: string
          template_text?: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          business_name?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          template_name?: string
          template_text?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      conversations: {
        Row: {
          ai_last_used_at: string | null
          business_name: string
          contact_id: string
          created_at: string
          escalation_pending: boolean
          escalation_reason: string
          id: string
          intent_history: Json
          intent_score: number
          last_ai_reply_at: string | null
          last_intent: string
          last_message_at: string
          priority_boost: number
          status: Database["public"]["Enums"]["conversation_status"]
          updated_at: string
        }
        Insert: {
          ai_last_used_at?: string | null
          business_name?: string
          contact_id: string
          created_at?: string
          escalation_pending?: boolean
          escalation_reason?: string
          id?: string
          intent_history?: Json
          intent_score?: number
          last_ai_reply_at?: string | null
          last_intent?: string
          last_message_at?: string
          priority_boost?: number
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Update: {
          ai_last_used_at?: string | null
          business_name?: string
          contact_id?: string
          created_at?: string
          escalation_pending?: boolean
          escalation_reason?: string
          id?: string
          intent_history?: Json
          intent_score?: number
          last_ai_reply_at?: string | null
          last_intent?: string
          last_message_at?: string
          priority_boost?: number
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
        }
        Relationships: []
      }
      crm_conversation_bridge_reviews: {
        Row: {
          apply_blockers: Json
          apply_status: string
          business_id: string | null
          confidence: number | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          detected_intent: string | null
          founder_review_required: boolean
          id: string
          interaction_id: string | null
          metadata: Json
          proposed_body_preview: string | null
          proposed_communication_direction: string | null
          proposed_communication_type: string | null
          proposed_conversation_action: string
          proposed_subject: string | null
          updated_at: string
        }
        Insert: {
          apply_blockers?: Json
          apply_status?: string
          business_id?: string | null
          confidence?: number | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          detected_intent?: string | null
          founder_review_required?: boolean
          id?: string
          interaction_id?: string | null
          metadata?: Json
          proposed_body_preview?: string | null
          proposed_communication_direction?: string | null
          proposed_communication_type?: string | null
          proposed_conversation_action?: string
          proposed_subject?: string | null
          updated_at?: string
        }
        Update: {
          apply_blockers?: Json
          apply_status?: string
          business_id?: string | null
          confidence?: number | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          detected_intent?: string | null
          founder_review_required?: boolean
          id?: string
          interaction_id?: string | null
          metadata?: Json
          proposed_body_preview?: string | null
          proposed_communication_direction?: string | null
          proposed_communication_type?: string | null
          proposed_conversation_action?: string
          proposed_subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_conversation_bridge_reviews_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "crm_interaction_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_founder_review_queue: {
        Row: {
          business_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          current_stage: string | null
          decided_at: string | null
          founder_decision: string | null
          id: string
          interaction_id: string | null
          metadata: Json
          priority_level: string
          recommended_action: string | null
          recommended_stage: string | null
          review_type: string
          risk_flags: Json
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          current_stage?: string | null
          decided_at?: string | null
          founder_decision?: string | null
          id?: string
          interaction_id?: string | null
          metadata?: Json
          priority_level?: string
          recommended_action?: string | null
          recommended_stage?: string | null
          review_type: string
          risk_flags?: Json
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          current_stage?: string | null
          decided_at?: string | null
          founder_decision?: string | null
          id?: string
          interaction_id?: string | null
          metadata?: Json
          priority_level?: string
          recommended_action?: string | null
          recommended_stage?: string | null
          review_type?: string
          risk_flags?: Json
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_hardening_test_runs: {
        Row: {
          created_at: string
          details: Json
          finished_at: string | null
          id: string
          run_label: string
          started_at: string
          status: string
          summary: Json
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          finished_at?: string | null
          id?: string
          run_label: string
          started_at?: string
          status?: string
          summary?: Json
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          finished_at?: string | null
          id?: string
          run_label?: string
          started_at?: string
          status?: string
          summary?: Json
          triggered_by?: string | null
        }
        Relationships: []
      }
      crm_integrity_findings: {
        Row: {
          auto_fix_available: boolean
          business_id: string | null
          contact_id: string | null
          created_at: string
          description: string
          finding_type: string
          founder_review_required: boolean
          id: string
          metadata: Json
          recommended_fix: string | null
          related_id: string | null
          related_table: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_fix_available?: boolean
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          description: string
          finding_type: string
          founder_review_required?: boolean
          id?: string
          metadata?: Json
          recommended_fix?: string | null
          related_id?: string | null
          related_table?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_fix_available?: boolean
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string
          finding_type?: string
          founder_review_required?: boolean
          id?: string
          metadata?: Json
          recommended_fix?: string | null
          related_id?: string | null
          related_table?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_interaction_ledger: {
        Row: {
          ai_action_id: string | null
          ai_action_recommended: string | null
          ai_draft_id: string | null
          ai_relevant: boolean
          assignment_id: string | null
          bcr_stage_snapshot: string | null
          body_preview: string | null
          business_contact_relationship_id: string | null
          business_id: string | null
          captured_at: string
          communication_id: string | null
          compliance_relevant: boolean
          compliance_status_snapshot: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_status_snapshot: string | null
          conversation_id: string | null
          created_at: string
          deal_id: string | null
          deal_relevant: boolean
          dedupe_key: string | null
          demo_access_id: string | null
          demo_event_id: string | null
          direction: string | null
          email_event_id: string | null
          external_event_id: string | null
          external_thread_id: string | null
          founder_review_required: boolean
          id: string
          interaction_type: string
          internal_proposal_id: string | null
          invoice_id: string | null
          match_confidence: number | null
          matched_status: string
          metadata: Json
          next_step: string | null
          occurred_at: string
          payment_id: string | null
          priority_relevant: boolean
          processing_status: string
          proposal_relevant: boolean
          provider_campaign_id: string | null
          provider_event_id: string | null
          provider_lead_id: string | null
          provider_message_id: string | null
          provider_type: string | null
          raw_payload: Json
          risk_flags: Json
          source_channel: string
          source_system: string
          subject: string | null
          summary: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          ai_action_id?: string | null
          ai_action_recommended?: string | null
          ai_draft_id?: string | null
          ai_relevant?: boolean
          assignment_id?: string | null
          bcr_stage_snapshot?: string | null
          body_preview?: string | null
          business_contact_relationship_id?: string | null
          business_id?: string | null
          captured_at?: string
          communication_id?: string | null
          compliance_relevant?: boolean
          compliance_status_snapshot?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_status_snapshot?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          deal_relevant?: boolean
          dedupe_key?: string | null
          demo_access_id?: string | null
          demo_event_id?: string | null
          direction?: string | null
          email_event_id?: string | null
          external_event_id?: string | null
          external_thread_id?: string | null
          founder_review_required?: boolean
          id?: string
          interaction_type: string
          internal_proposal_id?: string | null
          invoice_id?: string | null
          match_confidence?: number | null
          matched_status?: string
          metadata?: Json
          next_step?: string | null
          occurred_at?: string
          payment_id?: string | null
          priority_relevant?: boolean
          processing_status?: string
          proposal_relevant?: boolean
          provider_campaign_id?: string | null
          provider_event_id?: string | null
          provider_lead_id?: string | null
          provider_message_id?: string | null
          provider_type?: string | null
          raw_payload?: Json
          risk_flags?: Json
          source_channel: string
          source_system: string
          subject?: string | null
          summary?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_action_id?: string | null
          ai_action_recommended?: string | null
          ai_draft_id?: string | null
          ai_relevant?: boolean
          assignment_id?: string | null
          bcr_stage_snapshot?: string | null
          body_preview?: string | null
          business_contact_relationship_id?: string | null
          business_id?: string | null
          captured_at?: string
          communication_id?: string | null
          compliance_relevant?: boolean
          compliance_status_snapshot?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_status_snapshot?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          deal_relevant?: boolean
          dedupe_key?: string | null
          demo_access_id?: string | null
          demo_event_id?: string | null
          direction?: string | null
          email_event_id?: string | null
          external_event_id?: string | null
          external_thread_id?: string | null
          founder_review_required?: boolean
          id?: string
          interaction_type?: string
          internal_proposal_id?: string | null
          invoice_id?: string | null
          match_confidence?: number | null
          matched_status?: string
          metadata?: Json
          next_step?: string | null
          occurred_at?: string
          payment_id?: string | null
          priority_relevant?: boolean
          processing_status?: string
          proposal_relevant?: boolean
          provider_campaign_id?: string | null
          provider_event_id?: string | null
          provider_lead_id?: string | null
          provider_message_id?: string | null
          provider_type?: string | null
          raw_payload?: Json
          risk_flags?: Json
          source_channel?: string
          source_system?: string
          subject?: string | null
          summary?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interaction_ledger_ai_action_id_fkey"
            columns: ["ai_action_id"]
            isOneToOne: false
            referencedRelation: "ai_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_ai_draft_id_fkey"
            columns: ["ai_draft_id"]
            isOneToOne: false
            referencedRelation: "ai_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_business_contact_relationship_id_fkey"
            columns: ["business_contact_relationship_id"]
            isOneToOne: false
            referencedRelation: "business_contact_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_demo_access_id_fkey"
            columns: ["demo_access_id"]
            isOneToOne: false
            referencedRelation: "demo_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_demo_event_id_fkey"
            columns: ["demo_event_id"]
            isOneToOne: false
            referencedRelation: "demo_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_email_event_id_fkey"
            columns: ["email_event_id"]
            isOneToOne: false
            referencedRelation: "email_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_internal_proposal_id_fkey"
            columns: ["internal_proposal_id"]
            isOneToOne: false
            referencedRelation: "internal_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_provider_event_id_fkey"
            columns: ["provider_event_id"]
            isOneToOne: false
            referencedRelation: "outbound_provider_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interaction_ledger_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interaction_source_adapters: {
        Row: {
          adapter_key: string
          capture_requires_feature_flag: boolean
          created_at: string
          enabled_for_capture: boolean
          enabled_for_preview: boolean
          feature_flag_name: string | null
          id: string
          metadata: Json
          notes: string | null
          source_channel: string
          source_system: string
          source_table: string | null
          supported_interaction_types: Json
          updated_at: string
        }
        Insert: {
          adapter_key: string
          capture_requires_feature_flag?: boolean
          created_at?: string
          enabled_for_capture?: boolean
          enabled_for_preview?: boolean
          feature_flag_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          source_channel: string
          source_system: string
          source_table?: string | null
          supported_interaction_types?: Json
          updated_at?: string
        }
        Update: {
          adapter_key?: string
          capture_requires_feature_flag?: boolean
          created_at?: string
          enabled_for_capture?: boolean
          enabled_for_preview?: boolean
          feature_flag_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          source_channel?: string
          source_system?: string
          source_table?: string | null
          supported_interaction_types?: Json
          updated_at?: string
        }
        Relationships: []
      }
      crm_interaction_types: {
        Row: {
          ai_relevant: boolean
          compliance_relevant: boolean
          created_at: string
          creates_conversation_candidate: boolean
          deal_relevant: boolean
          default_direction: string | null
          default_source_channel: string | null
          default_source_system: string | null
          description: string | null
          founder_review_required: boolean
          id: string
          interaction_type: string
          label: string
          metadata: Json
          priority_relevant: boolean
          proposal_relevant: boolean
          suppression_relevant: boolean
          unsubscribe_relevant: boolean
          updated_at: string
        }
        Insert: {
          ai_relevant?: boolean
          compliance_relevant?: boolean
          created_at?: string
          creates_conversation_candidate?: boolean
          deal_relevant?: boolean
          default_direction?: string | null
          default_source_channel?: string | null
          default_source_system?: string | null
          description?: string | null
          founder_review_required?: boolean
          id?: string
          interaction_type: string
          label: string
          metadata?: Json
          priority_relevant?: boolean
          proposal_relevant?: boolean
          suppression_relevant?: boolean
          unsubscribe_relevant?: boolean
          updated_at?: string
        }
        Update: {
          ai_relevant?: boolean
          compliance_relevant?: boolean
          created_at?: string
          creates_conversation_candidate?: boolean
          deal_relevant?: boolean
          default_direction?: string | null
          default_source_channel?: string | null
          default_source_system?: string | null
          description?: string | null
          founder_review_required?: boolean
          id?: string
          interaction_type?: string
          label?: string
          metadata?: Json
          priority_relevant?: boolean
          proposal_relevant?: boolean
          suppression_relevant?: boolean
          unsubscribe_relevant?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      crm_lifecycle_stages: {
        Row: {
          ai_draft_allowed: boolean
          applies_to: string
          auto_send_allowed: boolean
          closed_stage: boolean
          created_at: string
          deal_allowed: boolean
          demo_allowed: boolean
          description: string | null
          founder_review_required: boolean
          id: string
          metadata: Json
          proposal_allowed: boolean
          sort_order: number
          stage_key: string
          stage_label: string
          suppression_stage: boolean
          updated_at: string
        }
        Insert: {
          ai_draft_allowed?: boolean
          applies_to?: string
          auto_send_allowed?: boolean
          closed_stage?: boolean
          created_at?: string
          deal_allowed?: boolean
          demo_allowed?: boolean
          description?: string | null
          founder_review_required?: boolean
          id?: string
          metadata?: Json
          proposal_allowed?: boolean
          sort_order?: number
          stage_key: string
          stage_label: string
          suppression_stage?: boolean
          updated_at?: string
        }
        Update: {
          ai_draft_allowed?: boolean
          applies_to?: string
          auto_send_allowed?: boolean
          closed_stage?: boolean
          created_at?: string
          deal_allowed?: boolean
          demo_allowed?: boolean
          description?: string | null
          founder_review_required?: boolean
          id?: string
          metadata?: Json
          proposal_allowed?: boolean
          sort_order?: number
          stage_key?: string
          stage_label?: string
          suppression_stage?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      crm_match_candidates: {
        Row: {
          apply_status: string
          business_contact_relationship_id: string | null
          business_id: string | null
          campaign_id: string | null
          contact_email: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          id: string
          interaction_id: string | null
          match_confidence: number
          match_method: string
          match_rank: number | null
          metadata: Json
          provider_campaign_id: string | null
          provider_event_id: string | null
          recommended: boolean
          updated_at: string
          warnings: Json
        }
        Insert: {
          apply_status?: string
          business_contact_relationship_id?: string | null
          business_id?: string | null
          campaign_id?: string | null
          contact_email?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          interaction_id?: string | null
          match_confidence?: number
          match_method: string
          match_rank?: number | null
          metadata?: Json
          provider_campaign_id?: string | null
          provider_event_id?: string | null
          recommended?: boolean
          updated_at?: string
          warnings?: Json
        }
        Update: {
          apply_status?: string
          business_contact_relationship_id?: string | null
          business_id?: string | null
          campaign_id?: string | null
          contact_email?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          interaction_id?: string | null
          match_confidence?: number
          match_method?: string
          match_rank?: number | null
          metadata?: Json
          provider_campaign_id?: string | null
          provider_event_id?: string | null
          recommended?: boolean
          updated_at?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crm_match_candidates_business_contact_relationship_id_fkey"
            columns: ["business_contact_relationship_id"]
            isOneToOne: false
            referencedRelation: "business_contact_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_match_candidates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_match_candidates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_match_candidates_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_match_candidates_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "crm_match_candidates_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_match_candidates_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "crm_interaction_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_match_candidates_provider_event_id_fkey"
            columns: ["provider_event_id"]
            isOneToOne: false
            referencedRelation: "outbound_provider_events"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_next_action_rules: {
        Row: {
          ai_draft_allowed: boolean
          created_at: string
          deal_trigger_allowed: boolean
          demo_trigger_allowed: boolean
          detected_intent: string | null
          founder_review_required: boolean
          id: string
          interaction_type: string | null
          metadata: Json
          notes: string | null
          priority_level: string
          proposal_trigger_allowed: boolean
          recommended_action: string
          recommended_stage: string | null
          rule_key: string
          source_stage: string | null
          suppression_trigger_allowed: boolean
          updated_at: string
        }
        Insert: {
          ai_draft_allowed?: boolean
          created_at?: string
          deal_trigger_allowed?: boolean
          demo_trigger_allowed?: boolean
          detected_intent?: string | null
          founder_review_required?: boolean
          id?: string
          interaction_type?: string | null
          metadata?: Json
          notes?: string | null
          priority_level?: string
          proposal_trigger_allowed?: boolean
          recommended_action: string
          recommended_stage?: string | null
          rule_key: string
          source_stage?: string | null
          suppression_trigger_allowed?: boolean
          updated_at?: string
        }
        Update: {
          ai_draft_allowed?: boolean
          created_at?: string
          deal_trigger_allowed?: boolean
          demo_trigger_allowed?: boolean
          detected_intent?: string | null
          founder_review_required?: boolean
          id?: string
          interaction_type?: string | null
          metadata?: Json
          notes?: string | null
          priority_level?: string
          proposal_trigger_allowed?: boolean
          recommended_action?: string
          recommended_stage?: string | null
          rule_key?: string
          source_stage?: string | null
          suppression_trigger_allowed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      customer_stewardship_assignments: {
        Row: {
          business_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          current_owner_agent_key: string
          current_priority: string
          customer_stage: string | null
          detected_intent: string | null
          founder_review_required: boolean
          handover_summary: string | null
          id: string
          last_agent_handover_id: string | null
          last_interaction_at: string | null
          metadata: Json
          next_best_action: string | null
          next_due_at: string | null
          previous_owner_agent_key: string | null
          risk_flags: Json
          stewardship_status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          current_owner_agent_key: string
          current_priority?: string
          customer_stage?: string | null
          detected_intent?: string | null
          founder_review_required?: boolean
          handover_summary?: string | null
          id?: string
          last_agent_handover_id?: string | null
          last_interaction_at?: string | null
          metadata?: Json
          next_best_action?: string | null
          next_due_at?: string | null
          previous_owner_agent_key?: string | null
          risk_flags?: Json
          stewardship_status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          current_owner_agent_key?: string
          current_priority?: string
          customer_stage?: string | null
          detected_intent?: string | null
          founder_review_required?: boolean
          handover_summary?: string | null
          id?: string
          last_agent_handover_id?: string | null
          last_interaction_at?: string | null
          metadata?: Json
          next_best_action?: string | null
          next_due_at?: string | null
          previous_owner_agent_key?: string | null
          risk_flags?: Json
          stewardship_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          business_name: string
          compliance_score_at_close: number | null
          contact_id: string | null
          created_at: string
          currency: string
          deal_name: string
          estimated_value_max: number
          estimated_value_min: number
          id: string
          lost_at: string | null
          notes: string
          probability: number
          required_skills: string[]
          status: Database["public"]["Enums"]["deal_status"]
          updated_at: string
          won_at: string | null
        }
        Insert: {
          business_name?: string
          compliance_score_at_close?: number | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          deal_name: string
          estimated_value_max?: number
          estimated_value_min?: number
          id?: string
          lost_at?: string | null
          notes?: string
          probability?: number
          required_skills?: string[]
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          won_at?: string | null
        }
        Update: {
          business_name?: string
          compliance_score_at_close?: number | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          deal_name?: string
          estimated_value_max?: number
          estimated_value_min?: number
          id?: string
          lost_at?: string | null
          notes?: string
          probability?: number
          required_skills?: string[]
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      decision_recommendations: {
        Row: {
          affected_system: string | null
          category: string
          created_at: string
          decided_at: string | null
          decision_maker: string | null
          description: string | null
          id: string
          potential_benefits: string | null
          potential_risks: string | null
          priority: string
          status: string
          target_module: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affected_system?: string | null
          category?: string
          created_at?: string
          decided_at?: string | null
          decision_maker?: string | null
          description?: string | null
          id?: string
          potential_benefits?: string | null
          potential_risks?: string | null
          priority?: string
          status?: string
          target_module?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affected_system?: string | null
          category?: string
          created_at?: string
          decided_at?: string | null
          decision_maker?: string | null
          description?: string | null
          id?: string
          potential_benefits?: string | null
          potential_risks?: string | null
          priority?: string
          status?: string
          target_module?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      demo_access: {
        Row: {
          access_count: number
          business_name: string
          contact_id: string
          created_at: string
          demo_token: string
          expires_at: string
          high_intent: boolean
          id: string
          last_accessed_at: string | null
          proposal_id: string | null
          status: Database["public"]["Enums"]["demo_access_status"]
          updated_at: string
        }
        Insert: {
          access_count?: number
          business_name?: string
          contact_id: string
          created_at?: string
          demo_token?: string
          expires_at?: string
          high_intent?: boolean
          id?: string
          last_accessed_at?: string | null
          proposal_id?: string | null
          status?: Database["public"]["Enums"]["demo_access_status"]
          updated_at?: string
        }
        Update: {
          access_count?: number
          business_name?: string
          contact_id?: string
          created_at?: string
          demo_token?: string
          expires_at?: string
          high_intent?: boolean
          id?: string
          last_accessed_at?: string | null
          proposal_id?: string | null
          status?: Database["public"]["Enums"]["demo_access_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_access_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "internal_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_events: {
        Row: {
          demo_id: string
          event_type: Database["public"]["Enums"]["demo_event_type"]
          id: string
          metadata: Json
          session_duration_seconds: number
          timestamp: string
        }
        Insert: {
          demo_id: string
          event_type: Database["public"]["Enums"]["demo_event_type"]
          id?: string
          metadata?: Json
          session_duration_seconds?: number
          timestamp?: string
        }
        Update: {
          demo_id?: string
          event_type?: Database["public"]["Enums"]["demo_event_type"]
          id?: string
          metadata?: Json
          session_duration_seconds?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_events_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demo_access"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_checklist: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          deployment_id: string
          id: string
          item: string
          order_index: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deployment_id: string
          id?: string
          item: string
          order_index?: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deployment_id?: string
          id?: string
          item?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "deployment_checklist_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_logs: {
        Row: {
          created_at: string
          deployment_id: string
          details: string | null
          event: string
          id: string
        }
        Insert: {
          created_at?: string
          deployment_id: string
          details?: string | null
          event: string
          id?: string
        }
        Update: {
          created_at?: string
          deployment_id?: string
          details?: string | null
          event?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_logs_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_stages: {
        Row: {
          completed_at: string | null
          created_at: string
          deployment_id: string
          id: string
          name: string
          order_index: number
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deployment_id: string
          id?: string
          name: string
          order_index?: number
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deployment_id?: string
          id?: string
          name?: string
          order_index?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_stages_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          architecture_id: string | null
          client_organisation: string
          created_at: string
          expected_launch_date: string | null
          id: string
          launched_at: string | null
          status: string
          system_name: string
          updated_at: string
        }
        Insert: {
          architecture_id?: string | null
          client_organisation?: string
          created_at?: string
          expected_launch_date?: string | null
          id?: string
          launched_at?: string | null
          status?: string
          system_name: string
          updated_at?: string
        }
        Update: {
          architecture_id?: string | null
          client_organisation?: string
          created_at?: string
          expected_launch_date?: string | null
          id?: string
          launched_at?: string | null
          status?: string
          system_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_architecture_id_fkey"
            columns: ["architecture_id"]
            isOneToOne: false
            referencedRelation: "architectures"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_protection_alerts: {
        Row: {
          alert_type: string
          campaign_id: string | null
          created_at: string
          id: string
          inbox_id: string | null
          message: string
          metric_value: number
          resolved: boolean
          resolved_at: string | null
          sending_domain_id: string | null
          severity: Database["public"]["Enums"]["system_event_severity"]
          threshold_value: number
        }
        Insert: {
          alert_type: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          inbox_id?: string | null
          message?: string
          metric_value?: number
          resolved?: boolean
          resolved_at?: string | null
          sending_domain_id?: string | null
          severity?: Database["public"]["Enums"]["system_event_severity"]
          threshold_value?: number
        }
        Update: {
          alert_type?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          inbox_id?: string | null
          message?: string
          metric_value?: number
          resolved?: boolean
          resolved_at?: string | null
          sending_domain_id?: string | null
          severity?: Database["public"]["Enums"]["system_event_severity"]
          threshold_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "domain_protection_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_protection_alerts_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "command_centre_active_inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_protection_alerts_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inbox_health_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_protection_alerts_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_protection_alerts_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "warmup_progress"
            referencedColumns: ["inbox_id"]
          },
          {
            foreignKeyName: "domain_protection_alerts_sending_domain_id_fkey"
            columns: ["sending_domain_id"]
            isOneToOne: false
            referencedRelation: "domain_usage_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_protection_alerts_sending_domain_id_fkey"
            columns: ["sending_domain_id"]
            isOneToOne: false
            referencedRelation: "sending_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          contact_id: string
          created_at: string
          email_id: string
          event_type: Database["public"]["Enums"]["email_event_type"]
          id: string
          timestamp: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          email_id?: string
          event_type: Database["public"]["Enums"]["email_event_type"]
          id?: string
          timestamp?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          email_id?: string
          event_type?: Database["public"]["Enums"]["email_event_type"]
          id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      email_queue: {
        Row: {
          block_reason: string
          business_name: string
          campaign_id: string
          contact_id: string
          created_at: string
          delivery_kind: string | null
          id: string
          inbox_id: string | null
          last_attempt_at: string | null
          priority: number
          provider_message_id: string | null
          provider_response: string | null
          retry_count: number
          saved_to_sent_at: string | null
          scheduled_at: string
          send_error: string | null
          sent_at: string | null
          sequence_step: number
          smtp_accepted_at: string | null
          status: Database["public"]["Enums"]["email_queue_status"]
          tracking_pixel_id: string | null
          tracking_token: string | null
        }
        Insert: {
          block_reason?: string
          business_name?: string
          campaign_id: string
          contact_id: string
          created_at?: string
          delivery_kind?: string | null
          id?: string
          inbox_id?: string | null
          last_attempt_at?: string | null
          priority?: number
          provider_message_id?: string | null
          provider_response?: string | null
          retry_count?: number
          saved_to_sent_at?: string | null
          scheduled_at?: string
          send_error?: string | null
          sent_at?: string | null
          sequence_step: number
          smtp_accepted_at?: string | null
          status?: Database["public"]["Enums"]["email_queue_status"]
          tracking_pixel_id?: string | null
          tracking_token?: string | null
        }
        Update: {
          block_reason?: string
          business_name?: string
          campaign_id?: string
          contact_id?: string
          created_at?: string
          delivery_kind?: string | null
          id?: string
          inbox_id?: string | null
          last_attempt_at?: string | null
          priority?: number
          provider_message_id?: string | null
          provider_response?: string | null
          retry_count?: number
          saved_to_sent_at?: string | null
          scheduled_at?: string
          send_error?: string | null
          sent_at?: string | null
          sequence_step?: number
          smtp_accepted_at?: string | null
          status?: Database["public"]["Enums"]["email_queue_status"]
          tracking_pixel_id?: string | null
          tracking_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "email_queue_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "command_centre_active_inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inbox_health_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "warmup_progress"
            referencedColumns: ["inbox_id"]
          },
        ]
      }
      email_tracking_events: {
        Row: {
          business_name: string | null
          campaign_id: string | null
          contact_id: string | null
          created_at: string
          event_at: string
          event_type: string
          id: string
          ip_hash: string | null
          link_url: string | null
          metadata: Json
          queue_id: string | null
          source: string | null
          user_agent_hash: string | null
        }
        Insert: {
          business_name?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          event_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          link_url?: string | null
          metadata?: Json
          queue_id?: string | null
          source?: string | null
          user_agent_hash?: string | null
        }
        Update: {
          business_name?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string
          event_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          link_url?: string | null
          metadata?: Json
          queue_id?: string | null
          source?: string | null
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      execution_logs: {
        Row: {
          created_at: string
          details: string | null
          event: string
          execution_id: string
          id: string
          result: string | null
          step_name: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          event: string
          execution_id: string
          id?: string
          result?: string | null
          step_name?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          event?: string
          execution_id?: string
          id?: string
          result?: string | null
          step_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_result_log: {
        Row: {
          action_type: string
          apollo_called: boolean
          approved_action_id: string | null
          blocked_reason: string | null
          business_id: string | null
          created_at: string
          email_sent: boolean
          execution_status: string
          external_action_attempted: boolean
          id: string
          metadata: Json
          result_summary: string | null
          smartlead_post_called: boolean
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_type: string
          apollo_called?: boolean
          approved_action_id?: string | null
          blocked_reason?: string | null
          business_id?: string | null
          created_at?: string
          email_sent?: boolean
          execution_status: string
          external_action_attempted?: boolean
          id?: string
          metadata?: Json
          result_summary?: string | null
          smartlead_post_called?: boolean
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_type?: string
          apollo_called?: boolean
          approved_action_id?: string | null
          blocked_reason?: string | null
          business_id?: string | null
          created_at?: string
          email_sent?: boolean
          execution_status?: string
          external_action_attempted?: boolean
          id?: string
          metadata?: Json
          result_summary?: string | null
          smartlead_post_called?: boolean
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      execution_steps: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_id: string
          id: string
          order_index: number
          result: string | null
          started_at: string | null
          status: string
          step_id: string | null
          step_name: string
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id: string
          id?: string
          order_index: number
          result?: string | null
          started_at?: string | null
          status?: string
          step_id?: string | null
          step_name: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          order_index?: number
          result?: string | null
          started_at?: string | null
          status?: string
          step_id?: string | null
          step_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_steps_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      external_action_gates: {
        Row: {
          action_type: string
          confirmation_phrase: string
          created_at: string
          enabled: boolean
          gate_key: string
          gate_label: string
          id: string
          last_used_at: string | null
          max_batch_size: number
          metadata: Json
          provider_type: string | null
          requires_founder_confirmation: boolean
          risk_level: string
          updated_at: string
        }
        Insert: {
          action_type: string
          confirmation_phrase: string
          created_at?: string
          enabled?: boolean
          gate_key: string
          gate_label: string
          id?: string
          last_used_at?: string | null
          max_batch_size?: number
          metadata?: Json
          provider_type?: string | null
          requires_founder_confirmation?: boolean
          risk_level?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          confirmation_phrase?: string
          created_at?: string
          enabled?: boolean
          gate_key?: string
          gate_label?: string
          id?: string
          last_used_at?: string | null
          max_batch_size?: number
          metadata?: Json
          provider_type?: string | null
          requires_founder_confirmation?: boolean
          risk_level?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          business_impact: string | null
          created_at: string
          description: string
          id: string
          status: string
          subscription_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_impact?: string | null
          created_at?: string
          description?: string
          id?: string
          status?: string
          subscription_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_impact?: string | null
          created_at?: string
          description?: string
          id?: string
          status?: string
          subscription_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_approval_items: {
        Row: {
          agent_key: string | null
          approval_type: string
          auto_execute_allowed: boolean
          business_id: string | null
          compliance_flags: Json
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          deal_id: string | null
          decided_at: string | null
          draft_body: string | null
          draft_subject: string | null
          execution_enabled: boolean
          founder_decision: string | null
          founder_notes: string | null
          id: string
          invoice_id: string | null
          metadata: Json
          priority_level: string
          proposal_id: string | null
          recommended_action: string | null
          risk_flags: Json
          send_allowed: boolean
          source_id: string | null
          source_system: string | null
          source_table: string | null
          status: string
          summary: string | null
          supplier_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_key?: string | null
          approval_type: string
          auto_execute_allowed?: boolean
          business_id?: string | null
          compliance_flags?: Json
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          decided_at?: string | null
          draft_body?: string | null
          draft_subject?: string | null
          execution_enabled?: boolean
          founder_decision?: string | null
          founder_notes?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          priority_level?: string
          proposal_id?: string | null
          recommended_action?: string | null
          risk_flags?: Json
          send_allowed?: boolean
          source_id?: string | null
          source_system?: string | null
          source_table?: string | null
          status?: string
          summary?: string | null
          supplier_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_key?: string | null
          approval_type?: string
          auto_execute_allowed?: boolean
          business_id?: string | null
          compliance_flags?: Json
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          decided_at?: string | null
          draft_body?: string | null
          draft_subject?: string | null
          execution_enabled?: boolean
          founder_decision?: string | null
          founder_notes?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json
          priority_level?: string
          proposal_id?: string | null
          recommended_action?: string | null
          risk_flags?: Json
          send_allowed?: boolean
          source_id?: string | null
          source_system?: string | null
          source_table?: string | null
          status?: string
          summary?: string | null
          supplier_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      founder_approval_types: {
        Row: {
          active: boolean
          auto_execute_allowed: boolean
          created_at: string
          default_priority: string
          description: string | null
          execution_enabled: boolean
          id: string
          label: string
          type_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          auto_execute_allowed?: boolean
          created_at?: string
          default_priority?: string
          description?: string | null
          execution_enabled?: boolean
          id?: string
          label: string
          type_key: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          auto_execute_allowed?: boolean
          created_at?: string
          default_priority?: string
          description?: string | null
          execution_enabled?: boolean
          id?: string
          label?: string
          type_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      founder_brief_windows: {
        Row: {
          brief_key: string
          brief_label: string
          created_at: string
          enabled: boolean
          id: string
          metadata: Json
          scheduled_time: string
          scope: string
          timezone: string
          updated_at: string
        }
        Insert: {
          brief_key: string
          brief_label: string
          created_at?: string
          enabled?: boolean
          id?: string
          metadata?: Json
          scheduled_time: string
          scope?: string
          timezone: string
          updated_at?: string
        }
        Update: {
          brief_key?: string
          brief_label?: string
          created_at?: string
          enabled?: boolean
          id?: string
          metadata?: Json
          scheduled_time?: string
          scope?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      founder_decisions: {
        Row: {
          business_id: string | null
          cost_credit_impact: string | null
          created_at: string
          created_by_run: string | null
          decided_at: string | null
          decided_by: string | null
          decision_type: string
          finding: string | null
          id: string
          recommendation: string | null
          related_ids: Json
          resolution_note: string | null
          risk: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          cost_credit_impact?: string | null
          created_at?: string
          created_by_run?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_type: string
          finding?: string | null
          id?: string
          recommendation?: string | null
          related_ids?: Json
          resolution_note?: string | null
          risk?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          cost_credit_impact?: string | null
          created_at?: string
          created_by_run?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_type?: string
          finding?: string | null
          id?: string
          recommendation?: string | null
          related_ids?: Json
          resolution_note?: string | null
          risk?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_decisions_created_by_run_fkey"
            columns: ["created_by_run"]
            isOneToOne: false
            referencedRelation: "autopilot_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      global_brain_status_snapshots: {
        Row: {
          agent_tasks_pending: number
          agents_active: number
          autopilot_gates_enabled: number
          businesses_active: number
          businesses_total: number
          founder_approvals_pending: number
          high_risk_gates_locked: number
          id: string
          languages_detected: number
          markets_active: number
          metadata: Json
          open_self_healing_findings: number
          revenue_signals: Json
          snapshot_at: string
          top_blockers: Json
          top_opportunities: Json
        }
        Insert: {
          agent_tasks_pending?: number
          agents_active?: number
          autopilot_gates_enabled?: number
          businesses_active?: number
          businesses_total?: number
          founder_approvals_pending?: number
          high_risk_gates_locked?: number
          id?: string
          languages_detected?: number
          markets_active?: number
          metadata?: Json
          open_self_healing_findings?: number
          revenue_signals?: Json
          snapshot_at?: string
          top_blockers?: Json
          top_opportunities?: Json
        }
        Update: {
          agent_tasks_pending?: number
          agents_active?: number
          autopilot_gates_enabled?: number
          businesses_active?: number
          businesses_total?: number
          founder_approvals_pending?: number
          high_risk_gates_locked?: number
          id?: string
          languages_detected?: number
          markets_active?: number
          metadata?: Json
          open_self_healing_findings?: number
          revenue_signals?: Json
          snapshot_at?: string
          top_blockers?: Json
          top_opportunities?: Json
        }
        Relationships: []
      }
      global_market_profiles: {
        Row: {
          business_days: Json
          business_end_time: string
          business_start_time: string
          compliance_notes: string | null
          country_code: string | null
          created_at: string
          default_timezone: string
          id: string
          language_defaults: Json
          market_key: string
          market_name: string
          metadata: Json
          observes_public_holidays: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          region: string | null
          updated_at: string
        }
        Insert: {
          business_days?: Json
          business_end_time?: string
          business_start_time?: string
          compliance_notes?: string | null
          country_code?: string | null
          created_at?: string
          default_timezone: string
          id?: string
          language_defaults?: Json
          market_key: string
          market_name: string
          metadata?: Json
          observes_public_holidays?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          business_days?: Json
          business_end_time?: string
          business_start_time?: string
          compliance_notes?: string | null
          country_code?: string | null
          created_at?: string
          default_timezone?: string
          id?: string
          language_defaults?: Json
          market_key?: string
          market_name?: string
          metadata?: Json
          observes_public_holidays?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          business_name: string
          created_at: string
          duplicate_rows: number
          file_name: string
          id: string
          invalid_rows: number
          source_name: string
          total_rows: number
          valid_rows: number
        }
        Insert: {
          business_name?: string
          created_at?: string
          duplicate_rows?: number
          file_name?: string
          id?: string
          invalid_rows?: number
          source_name?: string
          total_rows?: number
          valid_rows?: number
        }
        Update: {
          business_name?: string
          created_at?: string
          duplicate_rows?: number
          file_name?: string
          id?: string
          invalid_rows?: number
          source_name?: string
          total_rows?: number
          valid_rows?: number
        }
        Relationships: []
      }
      imported_leads: {
        Row: {
          batch_id: string
          company: string
          contact_id: string | null
          country: string
          created_at: string
          email: string
          id: string
          name: string
          processed: boolean
          raw_data: Json
          role: string
          validation_status: Database["public"]["Enums"]["lead_validation_status"]
        }
        Insert: {
          batch_id: string
          company?: string
          contact_id?: string | null
          country?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          processed?: boolean
          raw_data?: Json
          role?: string
          validation_status?: Database["public"]["Enums"]["lead_validation_status"]
        }
        Update: {
          batch_id?: string
          company?: string
          contact_id?: string | null
          country?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          processed?: boolean
          raw_data?: Json
          role?: string
          validation_status?: Database["public"]["Enums"]["lead_validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "imported_leads_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          campaign_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          from_email: string
          id: string
          in_reply_to: string | null
          inbox_id: string
          is_bounce: boolean
          message_id: string
          processing_error: string | null
          processing_status: string
          received_at: string
          references_header: string | null
          subject: string | null
          to_email: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          from_email: string
          id?: string
          in_reply_to?: string | null
          inbox_id: string
          is_bounce?: boolean
          message_id: string
          processing_error?: string | null
          processing_status?: string
          received_at?: string
          references_header?: string | null
          subject?: string | null
          to_email?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          from_email?: string
          id?: string
          in_reply_to?: string | null
          inbox_id?: string
          is_bounce?: boolean
          message_id?: string
          processing_error?: string | null
          processing_status?: string
          received_at?: string
          references_header?: string | null
          subject?: string | null
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "inbound_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_messages_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "command_centre_active_inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_messages_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inbox_health_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_messages_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_messages_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "warmup_progress"
            referencedColumns: ["inbox_id"]
          },
        ]
      }
      inbox_credentials: {
        Row: {
          created_at: string
          imap_host: string | null
          imap_password_enc: string | null
          imap_password_set_at: string | null
          imap_port: number | null
          imap_ssl: boolean | null
          imap_username: string | null
          inbox_id: string
          password_set_at: string | null
          provider_type: Database["public"]["Enums"]["inbox_provider_type"]
          smtp_encryption: string | null
          smtp_host: string | null
          smtp_password_enc: string | null
          smtp_port: number | null
          smtp_username: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          imap_host?: string | null
          imap_password_enc?: string | null
          imap_password_set_at?: string | null
          imap_port?: number | null
          imap_ssl?: boolean | null
          imap_username?: string | null
          inbox_id: string
          password_set_at?: string | null
          provider_type: Database["public"]["Enums"]["inbox_provider_type"]
          smtp_encryption?: string | null
          smtp_host?: string | null
          smtp_password_enc?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          imap_host?: string | null
          imap_password_enc?: string | null
          imap_password_set_at?: string | null
          imap_port?: number | null
          imap_ssl?: boolean | null
          imap_username?: string | null
          inbox_id?: string
          password_set_at?: string | null
          provider_type?: Database["public"]["Enums"]["inbox_provider_type"]
          smtp_encryption?: string | null
          smtp_host?: string | null
          smtp_password_enc?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_credentials_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: true
            referencedRelation: "command_centre_active_inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_credentials_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: true
            referencedRelation: "inbox_health_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_credentials_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: true
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_credentials_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: true
            referencedRelation: "warmup_progress"
            referencedColumns: ["inbox_id"]
          },
        ]
      }
      inboxes: {
        Row: {
          active: boolean
          ai_prompt_instructions: string | null
          ai_prompt_updated_at: string | null
          ai_reply_mode: Database["public"]["Enums"]["ai_reply_mode"]
          bounce_rate_per_inbox: number
          business_name: string
          consecutive_failures: number
          created_at: string
          current_send_count: number
          daily_send_limit: number
          email_address: string
          emails_sent_today: number
          from_email: string | null
          from_name: string | null
          hourly_send_count: number
          hourly_send_limit: number
          hourly_window_start: string
          id: string
          inbound_polling_enabled: boolean
          inbound_provider: Database["public"]["Enums"]["inbound_provider_type"]
          inbound_status: Database["public"]["Enums"]["inbound_status_type"]
          inbound_webhook_url: string
          inbound_webhook_verified_at: string | null
          last_error_message: string | null
          last_inbound_error: string | null
          last_inbound_message_at: string | null
          last_poll_at: string | null
          last_sent_at: string | null
          last_test_send_at: string | null
          last_test_send_status: string | null
          last_test_send_to: string | null
          last_used_sequence_position: number
          live_readiness: Database["public"]["Enums"]["inbox_live_readiness"]
          monitored_mailbox: string | null
          paused_reason: string
          performance_score: number
          provider_blocked_reason: string | null
          provider_blocked_until: string | null
          provider_type: Database["public"]["Enums"]["inbox_provider_type"]
          reply_rate_per_inbox: number
          reply_to_email: string | null
          reputation_score: number
          sending_domain_id: string | null
          updated_at: string
          warmup_started_at: string
          warmup_status: Database["public"]["Enums"]["inbox_warmup_status"]
        }
        Insert: {
          active?: boolean
          ai_prompt_instructions?: string | null
          ai_prompt_updated_at?: string | null
          ai_reply_mode?: Database["public"]["Enums"]["ai_reply_mode"]
          bounce_rate_per_inbox?: number
          business_name?: string
          consecutive_failures?: number
          created_at?: string
          current_send_count?: number
          daily_send_limit?: number
          email_address: string
          emails_sent_today?: number
          from_email?: string | null
          from_name?: string | null
          hourly_send_count?: number
          hourly_send_limit?: number
          hourly_window_start?: string
          id?: string
          inbound_polling_enabled?: boolean
          inbound_provider?: Database["public"]["Enums"]["inbound_provider_type"]
          inbound_status?: Database["public"]["Enums"]["inbound_status_type"]
          inbound_webhook_url?: string
          inbound_webhook_verified_at?: string | null
          last_error_message?: string | null
          last_inbound_error?: string | null
          last_inbound_message_at?: string | null
          last_poll_at?: string | null
          last_sent_at?: string | null
          last_test_send_at?: string | null
          last_test_send_status?: string | null
          last_test_send_to?: string | null
          last_used_sequence_position?: number
          live_readiness?: Database["public"]["Enums"]["inbox_live_readiness"]
          monitored_mailbox?: string | null
          paused_reason?: string
          performance_score?: number
          provider_blocked_reason?: string | null
          provider_blocked_until?: string | null
          provider_type?: Database["public"]["Enums"]["inbox_provider_type"]
          reply_rate_per_inbox?: number
          reply_to_email?: string | null
          reputation_score?: number
          sending_domain_id?: string | null
          updated_at?: string
          warmup_started_at?: string
          warmup_status?: Database["public"]["Enums"]["inbox_warmup_status"]
        }
        Update: {
          active?: boolean
          ai_prompt_instructions?: string | null
          ai_prompt_updated_at?: string | null
          ai_reply_mode?: Database["public"]["Enums"]["ai_reply_mode"]
          bounce_rate_per_inbox?: number
          business_name?: string
          consecutive_failures?: number
          created_at?: string
          current_send_count?: number
          daily_send_limit?: number
          email_address?: string
          emails_sent_today?: number
          from_email?: string | null
          from_name?: string | null
          hourly_send_count?: number
          hourly_send_limit?: number
          hourly_window_start?: string
          id?: string
          inbound_polling_enabled?: boolean
          inbound_provider?: Database["public"]["Enums"]["inbound_provider_type"]
          inbound_status?: Database["public"]["Enums"]["inbound_status_type"]
          inbound_webhook_url?: string
          inbound_webhook_verified_at?: string | null
          last_error_message?: string | null
          last_inbound_error?: string | null
          last_inbound_message_at?: string | null
          last_poll_at?: string | null
          last_sent_at?: string | null
          last_test_send_at?: string | null
          last_test_send_status?: string | null
          last_test_send_to?: string | null
          last_used_sequence_position?: number
          live_readiness?: Database["public"]["Enums"]["inbox_live_readiness"]
          monitored_mailbox?: string | null
          paused_reason?: string
          performance_score?: number
          provider_blocked_reason?: string | null
          provider_blocked_until?: string | null
          provider_type?: Database["public"]["Enums"]["inbox_provider_type"]
          reply_rate_per_inbox?: number
          reply_to_email?: string | null
          reputation_score?: number
          sending_domain_id?: string | null
          updated_at?: string
          warmup_started_at?: string
          warmup_status?: Database["public"]["Enums"]["inbox_warmup_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inboxes_sending_domain_id_fkey"
            columns: ["sending_domain_id"]
            isOneToOne: false
            referencedRelation: "domain_usage_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inboxes_sending_domain_id_fkey"
            columns: ["sending_domain_id"]
            isOneToOne: false
            referencedRelation: "sending_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_activity_logs: {
        Row: {
          created_at: string
          details: string | null
          event_type: string
          id: string
          integration_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          event_type: string
          id?: string
          integration_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          event_type?: string
          id?: string
          integration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_activity_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_alerts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          integration_id: string
          resolved: boolean
          severity: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          integration_id: string
          resolved?: boolean
          severity?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          integration_id?: string
          resolved?: boolean
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_alerts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_linked_systems: {
        Row: {
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          integration_id: string
          linked_at: string
        }
        Insert: {
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          integration_id: string
          linked_at?: string
        }
        Update: {
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          integration_id?: string
          linked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_linked_systems_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          auth_method: string
          created_at: string
          description: string | null
          endpoint_url: string | null
          id: string
          last_sync: string | null
          name: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          auth_method?: string
          created_at?: string
          description?: string | null
          endpoint_url?: string | null
          id?: string
          last_sync?: string | null
          name: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth_method?: string
          created_at?: string
          description?: string | null
          endpoint_url?: string | null
          id?: string
          last_sync?: string | null
          name?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_email_identities: {
        Row: {
          created_at: string
          email: string
          id: string
          kind: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          kind?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          kind?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      internal_operating_schedules: {
        Row: {
          business_id: string | null
          created_at: string
          cron_expression: string | null
          enabled: boolean
          external_actions_allowed: boolean
          frequency_label: string | null
          id: string
          last_run_at: string | null
          metadata: Json
          next_run_at: string | null
          run_scope: string
          safe_internal_only: boolean
          schedule_key: string
          schedule_name: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          cron_expression?: string | null
          enabled?: boolean
          external_actions_allowed?: boolean
          frequency_label?: string | null
          id?: string
          last_run_at?: string | null
          metadata?: Json
          next_run_at?: string | null
          run_scope: string
          safe_internal_only?: boolean
          schedule_key: string
          schedule_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          cron_expression?: string | null
          enabled?: boolean
          external_actions_allowed?: boolean
          frequency_label?: string | null
          id?: string
          last_run_at?: string | null
          metadata?: Json
          next_run_at?: string | null
          run_scope?: string
          safe_internal_only?: boolean
          schedule_key?: string
          schedule_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_operating_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_proposal_versions: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          proposal_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          changed_by?: string
          created_at?: string
          id?: string
          proposal_id: string
          snapshot?: Json
          version: number
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          proposal_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "internal_proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "internal_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_proposals: {
        Row: {
          accept_token: string
          accepted_at: string | null
          architecture_components: Json
          business_name: string
          business_problem: string
          contact_id: string
          created_at: string
          deal_id: string | null
          estimated_annual_savings: string
          estimated_cost_breakdown: Json
          estimated_cost_range: string
          estimated_productivity_gain: string
          estimated_roi_period: string
          estimated_roi_summary: string
          estimated_scope: string
          estimated_timeline: string
          follow_up_completed_at: string | null
          follow_up_due_at: string | null
          id: string
          include_demo: boolean
          industry: string
          processes_to_automate: string[]
          project_scale: string
          project_types: string[]
          proposal_quality_score: number
          proposal_score: number
          quality_flags: Json
          rejected_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["internal_proposal_status"]
          suggested_solution: string
          timeline: string
          title: string
          updated_at: string
          version: number
          view_token: string
          viewed_at: string | null
        }
        Insert: {
          accept_token?: string
          accepted_at?: string | null
          architecture_components?: Json
          business_name?: string
          business_problem?: string
          contact_id: string
          created_at?: string
          deal_id?: string | null
          estimated_annual_savings?: string
          estimated_cost_breakdown?: Json
          estimated_cost_range?: string
          estimated_productivity_gain?: string
          estimated_roi_period?: string
          estimated_roi_summary?: string
          estimated_scope?: string
          estimated_timeline?: string
          follow_up_completed_at?: string | null
          follow_up_due_at?: string | null
          id?: string
          include_demo?: boolean
          industry?: string
          processes_to_automate?: string[]
          project_scale?: string
          project_types?: string[]
          proposal_quality_score?: number
          proposal_score?: number
          quality_flags?: Json
          rejected_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["internal_proposal_status"]
          suggested_solution?: string
          timeline?: string
          title?: string
          updated_at?: string
          version?: number
          view_token?: string
          viewed_at?: string | null
        }
        Update: {
          accept_token?: string
          accepted_at?: string | null
          architecture_components?: Json
          business_name?: string
          business_problem?: string
          contact_id?: string
          created_at?: string
          deal_id?: string | null
          estimated_annual_savings?: string
          estimated_cost_breakdown?: Json
          estimated_cost_range?: string
          estimated_productivity_gain?: string
          estimated_roi_period?: string
          estimated_roi_summary?: string
          estimated_scope?: string
          estimated_timeline?: string
          follow_up_completed_at?: string | null
          follow_up_due_at?: string | null
          id?: string
          include_demo?: boolean
          industry?: string
          processes_to_automate?: string[]
          project_scale?: string
          project_types?: string[]
          proposal_quality_score?: number
          proposal_score?: number
          quality_flags?: Json
          rejected_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["internal_proposal_status"]
          suggested_solution?: string
          timeline?: string
          title?: string
          updated_at?: string
          version?: number
          view_token?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_max: number
          amount_min: number
          business_name: string
          contact_id: string | null
          created_at: string
          currency: string
          deal_id: string | null
          due_date: string
          expected_amount: number | null
          id: string
          invoice_number: string
          issued_date: string
          notes: string
          payment_risk_flag: boolean
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          amount_max?: number
          amount_min?: number
          business_name?: string
          contact_id?: string | null
          created_at?: string
          currency?: string
          deal_id?: string | null
          due_date?: string
          expected_amount?: number | null
          id?: string
          invoice_number: string
          issued_date?: string
          notes?: string
          payment_risk_flag?: boolean
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          amount_max?: number
          amount_min?: number
          business_name?: string
          contact_id?: string | null
          created_at?: string
          currency?: string
          deal_id?: string | null
          due_date?: string
          expected_amount?: number | null
          id?: string
          invoice_number?: string
          issued_date?: string
          notes?: string
          payment_risk_flag?: boolean
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_policy_profiles: {
        Row: {
          action_type: string
          allowed: boolean
          business_type: string | null
          channel_key: string | null
          consent_notes: string | null
          contact_type: string | null
          created_at: string
          founder_review_required: boolean
          id: string
          jurisdiction_code: string
          jurisdiction_name: string
          legal_review_recommended: boolean
          metadata: Json
          policy_area: string
          policy_status: string
          region: string | null
          required_disclosures: Json
          required_suppression_checks: Json
          retention_notes: string | null
          risk_level: string
          source_notes: string | null
          updated_at: string
        }
        Insert: {
          action_type: string
          allowed?: boolean
          business_type?: string | null
          channel_key?: string | null
          consent_notes?: string | null
          contact_type?: string | null
          created_at?: string
          founder_review_required?: boolean
          id?: string
          jurisdiction_code: string
          jurisdiction_name: string
          legal_review_recommended?: boolean
          metadata?: Json
          policy_area: string
          policy_status?: string
          region?: string | null
          required_disclosures?: Json
          required_suppression_checks?: Json
          retention_notes?: string | null
          risk_level?: string
          source_notes?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          allowed?: boolean
          business_type?: string | null
          channel_key?: string | null
          consent_notes?: string | null
          contact_type?: string | null
          created_at?: string
          founder_review_required?: boolean
          id?: string
          jurisdiction_code?: string
          jurisdiction_name?: string
          legal_review_recommended?: boolean
          metadata?: Json
          policy_area?: string
          policy_status?: string
          region?: string | null
          required_disclosures?: Json
          required_suppression_checks?: Json
          retention_notes?: string | null
          risk_level?: string
          source_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jurisdiction_profiles: {
        Row: {
          consent_required: boolean
          country: string
          created_at: string
          data_transfer_restrictions: string
          email_marketing_allowed: boolean
          gdpr_applicable: boolean
          id: string
          notes: string
          region: string
          updated_at: string
        }
        Insert: {
          consent_required?: boolean
          country: string
          created_at?: string
          data_transfer_restrictions?: string
          email_marketing_allowed?: boolean
          gdpr_applicable?: boolean
          id?: string
          notes?: string
          region?: string
          updated_at?: string
        }
        Update: {
          consent_required?: boolean
          country?: string
          created_at?: string
          data_transfer_restrictions?: string
          email_marketing_allowed?: boolean
          gdpr_applicable?: boolean
          id?: string
          notes?: string
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      jurisdiction_review_queue: {
        Row: {
          action_type: string
          business_id: string | null
          channel_key: string | null
          contact_id: string | null
          created_at: string
          founder_review_required: boolean
          id: string
          jurisdiction_code: string | null
          legal_review_recommended: boolean
          metadata: Json
          review_reason: string
          risk_level: string
          status: string
          updated_at: string
        }
        Insert: {
          action_type: string
          business_id?: string | null
          channel_key?: string | null
          contact_id?: string | null
          created_at?: string
          founder_review_required?: boolean
          id?: string
          jurisdiction_code?: string | null
          legal_review_recommended?: boolean
          metadata?: Json
          review_reason: string
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          business_id?: string | null
          channel_key?: string | null
          contact_id?: string | null
          created_at?: string
          founder_review_required?: boolean
          id?: string
          jurisdiction_code?: string | null
          legal_review_recommended?: boolean
          metadata?: Json
          review_reason?: string
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_documents: {
        Row: {
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          knowledge_entry_id: string
          name: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          knowledge_entry_id: string
          name: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          knowledge_entry_id?: string
          name?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_knowledge_entry_id_fkey"
            columns: ["knowledge_entry_id"]
            isOneToOne: false
            referencedRelation: "knowledge_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          category: string
          content: string | null
          created_at: string
          description: string | null
          entry_type: string
          id: string
          linked_agent_ids: string[] | null
          linked_workflow_ids: string[] | null
          related_system_id: string | null
          related_system_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          entry_type?: string
          id?: string
          linked_agent_ids?: string[] | null
          linked_workflow_ids?: string[] | null
          related_system_id?: string | null
          related_system_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          description?: string | null
          entry_type?: string
          id?: string
          linked_agent_ids?: string[] | null
          linked_workflow_ids?: string[] | null
          related_system_id?: string | null
          related_system_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_related_system_id_fkey"
            columns: ["related_system_id"]
            isOneToOne: false
            referencedRelation: "monitored_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_checklist: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          item: string
          order_index: number
          platform_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item: string
          order_index?: number
          platform_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item?: string
          order_index?: number
          platform_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_checklist_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "launched_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      launched_platforms: {
        Row: {
          created_at: string
          id: string
          industry: string
          launched_at: string | null
          name: string
          organisation_name: string
          platform_purpose: string | null
          status: string
          template_id: string | null
          template_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string
          launched_at?: string | null
          name: string
          organisation_name?: string
          platform_purpose?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string
          launched_at?: string | null
          name?: string
          organisation_name?: string
          platform_purpose?: string | null
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launched_platforms_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "system_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_quality_profiles: {
        Row: {
          apollo_lead_id: string
          campaign_fit: Database["public"]["Enums"]["lead_campaign_fit"] | null
          classified_at: string | null
          created_at: string
          dup_of_contact_id: string | null
          dup_of_lead_id: string | null
          fit_confidence: number | null
          fit_method: string | null
          fit_reason: string | null
          founder_lifecycle_override: boolean
          founder_review_reason: string | null
          id: string
          lifecycle_classified_at: string | null
          lifecycle_reason: string | null
          lifecycle_stage: string | null
          needs_founder_review: boolean
          notes: string | null
          promoted_at: string | null
          promoted_contact_id: string | null
          quality_status: Database["public"]["Enums"]["lead_quality_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          risk_flags: string[]
          scanned_at: string | null
          unlock_recommendation: string | null
          unlock_shortlist_rank: number | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["lead_verification_status"]
        }
        Insert: {
          apollo_lead_id: string
          campaign_fit?: Database["public"]["Enums"]["lead_campaign_fit"] | null
          classified_at?: string | null
          created_at?: string
          dup_of_contact_id?: string | null
          dup_of_lead_id?: string | null
          fit_confidence?: number | null
          fit_method?: string | null
          fit_reason?: string | null
          founder_lifecycle_override?: boolean
          founder_review_reason?: string | null
          id?: string
          lifecycle_classified_at?: string | null
          lifecycle_reason?: string | null
          lifecycle_stage?: string | null
          needs_founder_review?: boolean
          notes?: string | null
          promoted_at?: string | null
          promoted_contact_id?: string | null
          quality_status?: Database["public"]["Enums"]["lead_quality_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: string[]
          scanned_at?: string | null
          unlock_recommendation?: string | null
          unlock_shortlist_rank?: number | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["lead_verification_status"]
        }
        Update: {
          apollo_lead_id?: string
          campaign_fit?: Database["public"]["Enums"]["lead_campaign_fit"] | null
          classified_at?: string | null
          created_at?: string
          dup_of_contact_id?: string | null
          dup_of_lead_id?: string | null
          fit_confidence?: number | null
          fit_method?: string | null
          fit_reason?: string | null
          founder_lifecycle_override?: boolean
          founder_review_reason?: string | null
          id?: string
          lifecycle_classified_at?: string | null
          lifecycle_reason?: string | null
          lifecycle_stage?: string | null
          needs_founder_review?: boolean
          notes?: string | null
          promoted_at?: string | null
          promoted_contact_id?: string | null
          quality_status?: Database["public"]["Enums"]["lead_quality_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: string[]
          scanned_at?: string | null
          unlock_recommendation?: string | null
          unlock_shortlist_rank?: number | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["lead_verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_quality_profiles_apollo_lead_id_fkey"
            columns: ["apollo_lead_id"]
            isOneToOne: true
            referencedRelation: "apollo_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_quality_profiles_apollo_lead_id_fkey"
            columns: ["apollo_lead_id"]
            isOneToOne: true
            referencedRelation: "apollo_raw_leads"
            referencedColumns: ["apollo_lead_id"]
          },
        ]
      }
      lead_scores: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          reason: string
          score: number
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          reason?: string
          score?: number
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          reason?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_scores_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      legal_document_versions: {
        Row: {
          change_summary: string | null
          document_name: string
          id: string
          published_at: string
          version: string
        }
        Insert: {
          change_summary?: string | null
          document_name: string
          id?: string
          published_at?: string
          version?: string
        }
        Update: {
          change_summary?: string | null
          document_name?: string
          id?: string
          published_at?: string
          version?: string
        }
        Relationships: []
      }
      liftor_live_readiness_gates: {
        Row: {
          blocker_reason: string | null
          created_at: string
          gate_area: string
          gate_key: string
          gate_label: string
          id: string
          last_checked_at: string | null
          metadata: Json
          required_for_live: boolean
          status: string
          updated_at: string
        }
        Insert: {
          blocker_reason?: string | null
          created_at?: string
          gate_area: string
          gate_key: string
          gate_label: string
          id?: string
          last_checked_at?: string | null
          metadata?: Json
          required_for_live?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          blocker_reason?: string | null
          created_at?: string
          gate_area?: string
          gate_key?: string
          gate_label?: string
          id?: string
          last_checked_at?: string | null
          metadata?: Json
          required_for_live?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      liftor_operating_test_runs: {
        Row: {
          blockers: Json
          completed_at: string | null
          created_at: string
          forbidden_operations_detected: Json
          id: string
          readiness_score: number | null
          run_scope: string
          scenario_results: Json
          started_at: string
          status: string
        }
        Insert: {
          blockers?: Json
          completed_at?: string | null
          created_at?: string
          forbidden_operations_detected?: Json
          id?: string
          readiness_score?: number | null
          run_scope: string
          scenario_results?: Json
          started_at?: string
          status?: string
        }
        Update: {
          blockers?: Json
          completed_at?: string | null
          created_at?: string
          forbidden_operations_detected?: Json
          id?: string
          readiness_score?: number | null
          run_scope?: string
          scenario_results?: Json
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      liftor_operating_test_scenarios: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          expected_outputs: Json
          forbidden_operations: Json
          id: string
          module_area: string
          required_objects: Json
          scenario_key: string
          scenario_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          expected_outputs?: Json
          forbidden_operations?: Json
          id?: string
          module_area: string
          required_objects?: Json
          scenario_key: string
          scenario_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          expected_outputs?: Json
          forbidden_operations?: Json
          id?: string
          module_area?: string
          required_objects?: Json
          scenario_key?: string
          scenario_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          scheduled_date: string
          status: string
          subscription_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          scheduled_date: string
          status?: string
          subscription_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          scheduled_date?: string
          status?: string
          subscription_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_pages: {
        Row: {
          connected_modules: string | null
          content: string | null
          core_functions: string | null
          created_at: string
          data_inputs: string | null
          data_outputs: string | null
          id: string
          module_name: string
          operational_notes: string | null
          order_index: number
          purpose: string | null
          section: string
          updated_at: string
          user_roles: string | null
          version: number
        }
        Insert: {
          connected_modules?: string | null
          content?: string | null
          core_functions?: string | null
          created_at?: string
          data_inputs?: string | null
          data_outputs?: string | null
          id?: string
          module_name: string
          operational_notes?: string | null
          order_index?: number
          purpose?: string | null
          section?: string
          updated_at?: string
          user_roles?: string | null
          version?: number
        }
        Update: {
          connected_modules?: string | null
          content?: string | null
          core_functions?: string | null
          created_at?: string
          data_inputs?: string | null
          data_outputs?: string | null
          id?: string
          module_name?: string
          operational_notes?: string | null
          order_index?: number
          purpose?: string | null
          section?: string
          updated_at?: string
          user_roles?: string | null
          version?: number
        }
        Relationships: []
      }
      manual_versions: {
        Row: {
          created_at: string
          id: string
          summary: string
          version_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          summary?: string
          version_number?: number
        }
        Update: {
          created_at?: string
          id?: string
          summary?: string
          version_number?: number
        }
        Relationships: []
      }
      manychat_flow_blueprints: {
        Row: {
          business_id: string
          button_text: string | null
          button_url: string | null
          created_at: string
          dm_opening: string | null
          flow_key: string
          flow_name: string
          followup_question: string | null
          founder_review_required: boolean
          id: string
          live_in_manychat: boolean
          metadata: Json
          platform_key: string
          public_reply: string | null
          qualification_tags: Json
          trigger_keyword: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          dm_opening?: string | null
          flow_key: string
          flow_name: string
          followup_question?: string | null
          founder_review_required?: boolean
          id?: string
          live_in_manychat?: boolean
          metadata?: Json
          platform_key?: string
          public_reply?: string | null
          qualification_tags?: Json
          trigger_keyword?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          dm_opening?: string | null
          flow_key?: string
          flow_name?: string
          followup_question?: string | null
          founder_review_required?: boolean
          id?: string
          live_in_manychat?: boolean
          metadata?: Json
          platform_key?: string
          public_reply?: string | null
          qualification_tags?: Json
          trigger_keyword?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manychat_flow_blueprints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaign_briefs: {
        Row: {
          approval_status: string
          budget_notes: string | null
          business_id: string | null
          campaign_goal: string | null
          campaign_name: string
          campaign_type: string
          channels: Json
          created_at: string
          creative_angles: Json
          funnel_steps: Json
          id: string
          launch_allowed: boolean
          metadata: Json
          offer: string | null
          required_assets: Json
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          budget_notes?: string | null
          business_id?: string | null
          campaign_goal?: string | null
          campaign_name: string
          campaign_type: string
          channels?: Json
          created_at?: string
          creative_angles?: Json
          funnel_steps?: Json
          id?: string
          launch_allowed?: boolean
          metadata?: Json
          offer?: string | null
          required_assets?: Json
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          budget_notes?: string | null
          business_id?: string | null
          campaign_goal?: string | null
          campaign_name?: string
          campaign_type?: string
          channels?: Json
          created_at?: string
          creative_angles?: Json
          funnel_steps?: Json
          id?: string
          launch_allowed?: boolean
          metadata?: Json
          offer?: string | null
          required_assets?: Json
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_briefs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content_assets: {
        Row: {
          approval_status: string
          asset_status: string
          asset_title: string
          asset_type: string
          business_id: string | null
          content_body: string | null
          created_at: string
          cta: string | null
          goal: string | null
          id: string
          metadata: Json
          outline: Json
          publish_allowed: boolean
          seo_keywords: Json
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          asset_status?: string
          asset_title: string
          asset_type: string
          business_id?: string | null
          content_body?: string | null
          created_at?: string
          cta?: string | null
          goal?: string | null
          id?: string
          metadata?: Json
          outline?: Json
          publish_allowed?: boolean
          seo_keywords?: Json
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          asset_status?: string
          asset_title?: string
          asset_type?: string
          business_id?: string | null
          content_body?: string | null
          created_at?: string
          cta?: string | null
          goal?: string | null
          id?: string
          metadata?: Json
          outline?: Json
          publish_allowed?: boolean
          seo_keywords?: Json
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_generated: boolean
          channel: Database["public"]["Enums"]["communication_channel"]
          contact_id: string
          content: string
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["communication_direction"]
          id: string
          inbox_id: string | null
        }
        Insert: {
          ai_generated?: boolean
          channel?: Database["public"]["Enums"]["communication_channel"]
          contact_id: string
          content?: string
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["communication_direction"]
          id?: string
          inbox_id?: string | null
        }
        Update: {
          ai_generated?: boolean
          channel?: Database["public"]["Enums"]["communication_channel"]
          contact_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["communication_direction"]
          id?: string
          inbox_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      metricool_export_batches: {
        Row: {
          batch_name: string
          batch_status: string
          business_id: string
          created_at: string
          export_format: string
          export_payload: Json
          exported_at: string | null
          founder_review_required: boolean
          id: string
          metadata: Json
          platforms: Json
          post_count: number
          updated_at: string
        }
        Insert: {
          batch_name: string
          batch_status?: string
          business_id: string
          created_at?: string
          export_format?: string
          export_payload?: Json
          exported_at?: string | null
          founder_review_required?: boolean
          id?: string
          metadata?: Json
          platforms?: Json
          post_count?: number
          updated_at?: string
        }
        Update: {
          batch_name?: string
          batch_status?: string
          business_id?: string
          created_at?: string
          export_format?: string
          export_payload?: Json
          exported_at?: string | null
          founder_review_required?: boolean
          id?: string
          metadata?: Json
          platforms?: Json
          post_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metricool_export_batches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_systems: {
        Row: {
          client_id: string
          created_at: string
          id: string
          organisation_id: string | null
          project_id: string
          status: string
          system_name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          organisation_id?: string | null
          project_id: string
          status?: string
          system_name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          organisation_id?: string | null
          project_id?: string
          status?: string
          system_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitored_systems_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_systems_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_channel_inbound_events: {
        Row: {
          business_id: string | null
          channel_key: string
          contact_email: string | null
          contact_handle: string | null
          contact_name: string | null
          created_at: string
          crm_interaction_id: string | null
          external_event_id: string | null
          external_thread_id: string | null
          founder_review_required: boolean
          id: string
          matched_contact_id: string | null
          matched_conversation_id: string | null
          message_language: string | null
          message_text: string | null
          metadata: Json
          processed_status: string
          provider_type: string | null
          raw_payload: Json
          received_at: string
          subject: string | null
        }
        Insert: {
          business_id?: string | null
          channel_key: string
          contact_email?: string | null
          contact_handle?: string | null
          contact_name?: string | null
          created_at?: string
          crm_interaction_id?: string | null
          external_event_id?: string | null
          external_thread_id?: string | null
          founder_review_required?: boolean
          id?: string
          matched_contact_id?: string | null
          matched_conversation_id?: string | null
          message_language?: string | null
          message_text?: string | null
          metadata?: Json
          processed_status?: string
          provider_type?: string | null
          raw_payload?: Json
          received_at?: string
          subject?: string | null
        }
        Update: {
          business_id?: string | null
          channel_key?: string
          contact_email?: string | null
          contact_handle?: string | null
          contact_name?: string | null
          created_at?: string
          crm_interaction_id?: string | null
          external_event_id?: string | null
          external_thread_id?: string | null
          founder_review_required?: boolean
          id?: string
          matched_contact_id?: string | null
          matched_conversation_id?: string | null
          message_language?: string | null
          message_text?: string | null
          metadata?: Json
          processed_status?: string
          provider_type?: string | null
          raw_payload?: Json
          received_at?: string
          subject?: string | null
        }
        Relationships: []
      }
      multilingual_interaction_reviews: {
        Row: {
          approval_status: string
          business_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          cultural_tone_notes: string | null
          detected_language_confidence: number | null
          draft_response_english_back_translation: string | null
          draft_response_original_language: string | null
          founder_review_required: boolean
          founder_summary_english: string | null
          id: string
          intent_detected: string | null
          interaction_id: string | null
          metadata: Json
          original_text: string | null
          recommended_response_language: string | null
          risk_flags: Json
          send_allowed: boolean
          source_language: string | null
          translated_text_english: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: string
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          cultural_tone_notes?: string | null
          detected_language_confidence?: number | null
          draft_response_english_back_translation?: string | null
          draft_response_original_language?: string | null
          founder_review_required?: boolean
          founder_summary_english?: string | null
          id?: string
          intent_detected?: string | null
          interaction_id?: string | null
          metadata?: Json
          original_text?: string | null
          recommended_response_language?: string | null
          risk_flags?: Json
          send_allowed?: boolean
          source_language?: string | null
          translated_text_english?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: string
          business_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          cultural_tone_notes?: string | null
          detected_language_confidence?: number | null
          draft_response_english_back_translation?: string | null
          draft_response_original_language?: string | null
          founder_review_required?: boolean
          founder_summary_english?: string | null
          id?: string
          intent_detected?: string | null
          interaction_id?: string | null
          metadata?: Json
          original_text?: string | null
          recommended_response_language?: string | null
          risk_flags?: Json
          send_allowed?: boolean
          source_language?: string | null
          translated_text_english?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      optimisation_insights: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          entity_name: string
          entity_type: string
          id: string
          insight_type: string
          priority: string
          recommended_action: string | null
          status: string
          system_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          insight_type?: string
          priority?: string
          recommended_action?: string | null
          status?: string
          system_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_name?: string
          entity_type?: string
          id?: string
          insight_type?: string
          priority?: string
          recommended_action?: string | null
          status?: string
          system_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "optimisation_insights_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "monitored_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      optimisation_recommendations: {
        Row: {
          business_id: string | null
          confidence: number | null
          created_at: string
          evidence: Json
          founder_approval_required: boolean
          id: string
          impact_estimate: string | null
          metadata: Json
          recommendation_type: string
          recommended_change: Json
          risk_level: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          founder_approval_required?: boolean
          id?: string
          impact_estimate?: string | null
          metadata?: Json
          recommendation_type: string
          recommended_change?: Json
          risk_level?: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          founder_approval_required?: boolean
          id?: string
          impact_estimate?: string | null
          metadata?: Json
          recommendation_type?: string
          recommended_change?: Json
          risk_level?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      organisation_documents: {
        Row: {
          category: string
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          name: string
          organisation_id: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          name: string
          organisation_id: string
          uploaded_by?: string
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          name?: string
          organisation_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_documents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          created_at: string
          id: string
          organisation_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organisation_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organisation_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          id: string
          industry: string
          name: string
          primary_contact: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string
          name: string
          primary_contact?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string
          name?: string
          primary_contact?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      outbound_channel_policies: {
        Row: {
          auto_send_allowed: boolean
          business_id: string | null
          communication_type: string
          created_at: string
          id: string
          metadata: Json
          native_allowed: boolean
          notes: string | null
          policy_key: string
          provider_type: string | null
          recommended_channel: string
          requires_founder_approval: boolean
          scale_allowed: boolean
          smartlead_allowed: boolean
          updated_at: string
        }
        Insert: {
          auto_send_allowed?: boolean
          business_id?: string | null
          communication_type: string
          created_at?: string
          id?: string
          metadata?: Json
          native_allowed?: boolean
          notes?: string | null
          policy_key: string
          provider_type?: string | null
          recommended_channel: string
          requires_founder_approval?: boolean
          scale_allowed?: boolean
          smartlead_allowed?: boolean
          updated_at?: string
        }
        Update: {
          auto_send_allowed?: boolean
          business_id?: string | null
          communication_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          native_allowed?: boolean
          notes?: string | null
          policy_key?: string
          provider_type?: string | null
          recommended_channel?: string
          requires_founder_approval?: boolean
          scale_allowed?: boolean
          smartlead_allowed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      outbound_provider_campaign_mappings: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          is_active: boolean
          last_error: string | null
          last_synced_at: string | null
          liftor_campaign_id: string | null
          mapping_status: string
          metadata: Json
          provider_campaign_id: string | null
          provider_campaign_name: string | null
          provider_campaign_status: string | null
          provider_id: string
          provider_type: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          liftor_campaign_id?: string | null
          mapping_status?: string
          metadata?: Json
          provider_campaign_id?: string | null
          provider_campaign_name?: string | null
          provider_campaign_status?: string | null
          provider_id: string
          provider_type?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          liftor_campaign_id?: string | null
          mapping_status?: string
          metadata?: Json
          provider_campaign_id?: string | null
          provider_campaign_name?: string | null
          provider_campaign_status?: string | null
          provider_id?: string
          provider_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_provider_campaign_mappings_liftor_campaign_id_fkey"
            columns: ["liftor_campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_provider_campaign_mappings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "outbound_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_provider_events: {
        Row: {
          contact_id: string | null
          created_at: string
          error: string | null
          id: string
          normalized_payload: Json
          operational_mutation_applied: boolean
          processing_status: string
          provider_campaign_id: string | null
          provider_event_id: string | null
          provider_event_type: string
          provider_id: string | null
          provider_lead_id: string | null
          provider_type: string
          queue_id: string | null
          raw_payload: Json
          received_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          normalized_payload?: Json
          operational_mutation_applied?: boolean
          processing_status?: string
          provider_campaign_id?: string | null
          provider_event_id?: string | null
          provider_event_type: string
          provider_id?: string | null
          provider_lead_id?: string | null
          provider_type?: string
          queue_id?: string | null
          raw_payload?: Json
          received_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          normalized_payload?: Json
          operational_mutation_applied?: boolean
          processing_status?: string
          provider_campaign_id?: string | null
          provider_event_id?: string | null
          provider_event_type?: string
          provider_id?: string | null
          provider_lead_id?: string | null
          provider_type?: string
          queue_id?: string | null
          raw_payload?: Json
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_provider_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_provider_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "outbound_provider_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "outbound_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_provider_events_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "blocked_sends_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_provider_events_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_provider_lead_mappings: {
        Row: {
          business_id: string
          campaign_mapping_id: string | null
          contact_email: string
          created_at: string
          id: string
          last_previewed_at: string | null
          liftor_campaign_id: string
          liftor_contact_id: string
          metadata: Json
          provider_campaign_id: string | null
          provider_lead_id: string | null
          provider_response: Json | null
          provider_type: string
          push_status: string
          pushed_at: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          campaign_mapping_id?: string | null
          contact_email: string
          created_at?: string
          id?: string
          last_previewed_at?: string | null
          liftor_campaign_id: string
          liftor_contact_id: string
          metadata?: Json
          provider_campaign_id?: string | null
          provider_lead_id?: string | null
          provider_response?: Json | null
          provider_type?: string
          push_status?: string
          pushed_at?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          campaign_mapping_id?: string | null
          contact_email?: string
          created_at?: string
          id?: string
          last_previewed_at?: string | null
          liftor_campaign_id?: string
          liftor_contact_id?: string
          metadata?: Json
          provider_campaign_id?: string | null
          provider_lead_id?: string | null
          provider_response?: Json | null
          provider_type?: string
          push_status?: string
          pushed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_provider_lead_mappings_campaign_mapping_id_fkey"
            columns: ["campaign_mapping_id"]
            isOneToOne: false
            referencedRelation: "outbound_provider_campaign_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_providers: {
        Row: {
          created_at: string
          credentials_present: boolean
          daily_send_cap: number | null
          from_email: string | null
          from_name: string | null
          hourly_send_cap: number | null
          id: string
          inbox_id: string | null
          last_error: string | null
          last_test_at: string | null
          mailbox_send_cap: number | null
          mode: string
          notes: string | null
          provider_health: string
          provider_name: string
          provider_type: string
          reply_to: string | null
          sending_domain: string | null
          status: string
          updated_at: string
          warmup_status: string | null
          webhook_configured: boolean
        }
        Insert: {
          created_at?: string
          credentials_present?: boolean
          daily_send_cap?: number | null
          from_email?: string | null
          from_name?: string | null
          hourly_send_cap?: number | null
          id?: string
          inbox_id?: string | null
          last_error?: string | null
          last_test_at?: string | null
          mailbox_send_cap?: number | null
          mode?: string
          notes?: string | null
          provider_health?: string
          provider_name: string
          provider_type: string
          reply_to?: string | null
          sending_domain?: string | null
          status?: string
          updated_at?: string
          warmup_status?: string | null
          webhook_configured?: boolean
        }
        Update: {
          created_at?: string
          credentials_present?: boolean
          daily_send_cap?: number | null
          from_email?: string | null
          from_name?: string | null
          hourly_send_cap?: number | null
          id?: string
          inbox_id?: string | null
          last_error?: string | null
          last_test_at?: string | null
          mailbox_send_cap?: number | null
          mode?: string
          notes?: string | null
          provider_health?: string
          provider_name?: string
          provider_type?: string
          reply_to?: string | null
          sending_domain?: string | null
          status?: string
          updated_at?: string
          warmup_status?: string | null
          webhook_configured?: boolean
        }
        Relationships: []
      }
      outreach_campaigns: {
        Row: {
          business_name: string
          campaign_name: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["outreach_campaign_status"]
          updated_at: string
        }
        Insert: {
          business_name?: string
          campaign_name: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["outreach_campaign_status"]
          updated_at?: string
        }
        Update: {
          business_name?: string
          campaign_name?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["outreach_campaign_status"]
          updated_at?: string
        }
        Relationships: []
      }
      outreach_sequences: {
        Row: {
          body: string
          campaign_id: string
          created_at: string
          delay_days: number
          id: string
          step_number: number
          subject: string
        }
        Insert: {
          body?: string
          campaign_id: string
          created_at?: string
          delay_days?: number
          id?: string
          step_number: number
          subject?: string
        }
        Update: {
          body?: string
          campaign_id?: string
          created_at?: string
          delay_days?: number
          id?: string
          step_number?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_sequences_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          company_name: string
          contact_email: string
          created_at: string
          id: string
          partner_type: string
          project_description: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_name: string
          contact_email: string
          created_at?: string
          id?: string
          partner_type?: string
          project_description?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string
          created_at?: string
          id?: string
          partner_type?: string
          project_description?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      partner_deals: {
        Row: {
          client_organisation: string
          created_at: string
          currency: string
          deal_status: string
          id: string
          opportunity_id: string | null
          partner_commission: number
          partner_name: string
          project_name: string
          project_value: number
          updated_at: string
        }
        Insert: {
          client_organisation?: string
          created_at?: string
          currency?: string
          deal_status?: string
          id?: string
          opportunity_id?: string | null
          partner_commission?: number
          partner_name?: string
          project_name?: string
          project_value?: number
          updated_at?: string
        }
        Update: {
          client_organisation?: string
          created_at?: string
          currency?: string
          deal_status?: string
          id?: string
          opportunity_id?: string | null
          partner_commission?: number
          partner_name?: string
          project_name?: string
          project_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_deals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_documents: {
        Row: {
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          name: string
          opportunity_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          name: string
          opportunity_id: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          name?: string
          opportunity_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_documents_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_messages_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "partner_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_opportunities: {
        Row: {
          company_name: string
          created_at: string
          estimated_scope: string | null
          id: string
          industry: string
          partner_id: string
          primary_contact: string | null
          project_description: string
          project_id: string | null
          status: string
          timeline: string | null
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          estimated_scope?: string | null
          id?: string
          industry?: string
          partner_id: string
          primary_contact?: string | null
          project_description?: string
          project_id?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          estimated_scope?: string | null
          id?: string
          industry?: string
          partner_id?: string
          primary_contact?: string | null
          project_description?: string
          project_id?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_opportunities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          business_name: string
          details: string
          event_type: Database["public"]["Enums"]["payment_event_type"]
          id: string
          invoice_id: string
          timestamp: string
        }
        Insert: {
          business_name?: string
          details?: string
          event_type: Database["public"]["Enums"]["payment_event_type"]
          id?: string
          invoice_id: string
          timestamp?: string
        }
        Update: {
          business_name?: string
          details?: string
          event_type?: Database["public"]["Enums"]["payment_event_type"]
          id?: string
          invoice_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_received: number
          business_name: string
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          received_date: string
          reference: string
        }
        Insert: {
          amount_received?: number
          business_name?: string
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          received_date?: string
          reference?: string
        }
        Update: {
          amount_received?: number
          business_name?: string
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          received_date?: string
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_diagnostic_runs: {
        Row: {
          created_at: string
          details: Json | null
          failures_detected: number
          id: string
          run_timestamp: string
          status: string
          systems_checked: number
          warnings: number
        }
        Insert: {
          created_at?: string
          details?: Json | null
          failures_detected?: number
          id?: string
          run_timestamp?: string
          status?: string
          systems_checked?: number
          warnings?: number
        }
        Update: {
          created_at?: string
          details?: Json | null
          failures_detected?: number
          id?: string
          run_timestamp?: string
          status?: string
          systems_checked?: number
          warnings?: number
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          access_level: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_test_results: {
        Row: {
          created_at: string
          details: string | null
          duration_ms: number | null
          id: string
          module: string
          run_id: string
          status: string
          test_name: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          duration_ms?: number | null
          id?: string
          module?: string
          run_id: string
          status?: string
          test_name: string
        }
        Update: {
          created_at?: string
          details?: string | null
          duration_ms?: number | null
          id?: string
          module?: string
          run_id?: string
          status?: string
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "platform_test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_test_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          failed: number
          id: string
          passed: number
          run_name: string
          started_at: string
          status: string
          total_tests: number
          warnings: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failed?: number
          id?: string
          passed?: number
          run_name?: string
          started_at?: string
          status?: string
          total_tests?: number
          warnings?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failed?: number
          id?: string
          passed?: number
          run_name?: string
          started_at?: string
          status?: string
          total_tests?: number
          warnings?: number
        }
        Relationships: []
      }
      portfolio_intelligence_scores: {
        Row: {
          attention_score: number
          business_id: string | null
          created_at: string
          evidence: Json
          growth_score: number
          id: string
          metadata: Json
          opportunity_score: number
          overall_priority_score: number
          readiness_score: number
          recommended_action: string | null
          recommended_status: string | null
          revenue_score: number
          risk_score: number
          score_date: string
        }
        Insert: {
          attention_score?: number
          business_id?: string | null
          created_at?: string
          evidence?: Json
          growth_score?: number
          id?: string
          metadata?: Json
          opportunity_score?: number
          overall_priority_score?: number
          readiness_score?: number
          recommended_action?: string | null
          recommended_status?: string | null
          revenue_score?: number
          risk_score?: number
          score_date?: string
        }
        Update: {
          attention_score?: number
          business_id?: string | null
          created_at?: string
          evidence?: Json
          growth_score?: number
          id?: string
          metadata?: Json
          opportunity_score?: number
          overall_priority_score?: number
          readiness_score?: number
          recommended_action?: string | null
          recommended_status?: string | null
          revenue_score?: number
          risk_score?: number
          score_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_intelligence_scores_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_operating_snapshots: {
        Row: {
          active_businesses: number
          agent_tasks_pending: number
          approvals_pending: number
          blocked_businesses: number
          created_at: string
          critical_blockers: Json
          id: string
          invoices_outstanding: number
          metadata: Json
          open_deals: number
          proposals_pending: number
          revenue_last_30_days: number
          setup_businesses: number
          snapshot_date: string
          total_businesses: number
        }
        Insert: {
          active_businesses?: number
          agent_tasks_pending?: number
          approvals_pending?: number
          blocked_businesses?: number
          created_at?: string
          critical_blockers?: Json
          id?: string
          invoices_outstanding?: number
          metadata?: Json
          open_deals?: number
          proposals_pending?: number
          revenue_last_30_days?: number
          setup_businesses?: number
          snapshot_date?: string
          total_businesses?: number
        }
        Update: {
          active_businesses?: number
          agent_tasks_pending?: number
          approvals_pending?: number
          blocked_businesses?: number
          created_at?: string
          critical_blockers?: Json
          id?: string
          invoices_outstanding?: number
          metadata?: Json
          open_deals?: number
          proposals_pending?: number
          revenue_last_30_days?: number
          setup_businesses?: number
          snapshot_date?: string
          total_businesses?: number
        }
        Relationships: []
      }
      portfolio_strategy_recommendations: {
        Row: {
          business_id: string | null
          confidence: number | null
          created_at: string
          evidence: Json
          expected_impact: string | null
          founder_approval_required: boolean
          id: string
          metadata: Json
          priority_level: string
          recommendation_key: string
          recommendation_summary: string | null
          recommendation_title: string
          recommendation_type: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          expected_impact?: string | null
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          priority_level?: string
          recommendation_key: string
          recommendation_summary?: string | null
          recommendation_title: string
          recommendation_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          expected_impact?: string | null
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          priority_level?: string
          recommendation_key?: string
          recommendation_summary?: string | null
          recommendation_title?: string
          recommendation_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      priority_scores: {
        Row: {
          business_name: string
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["priority_entity_type"]
          factors: Json
          id: string
          last_updated: string
          priority_level: Database["public"]["Enums"]["priority_level"]
          score: number
        }
        Insert: {
          business_name?: string
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["priority_entity_type"]
          factors?: Json
          id?: string
          last_updated?: string
          priority_level?: Database["public"]["Enums"]["priority_level"]
          score?: number
        }
        Update: {
          business_name?: string
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["priority_entity_type"]
          factors?: Json
          id?: string
          last_updated?: string
          priority_level?: Database["public"]["Enums"]["priority_level"]
          score?: number
        }
        Relationships: []
      }
      process_documents: {
        Row: {
          category: string
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          name: string
          process_id: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          name: string
          process_id: string
          uploaded_by?: string
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          name?: string
          process_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_steps: {
        Row: {
          agent_id: string | null
          classification: string
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          process_id: string
          responsible_role: string | null
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          agent_id?: string | null
          classification?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          process_id: string
          responsible_role?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          agent_id?: string | null
          classification?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          process_id?: string
          responsible_role?: string | null
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_steps_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          automation_status: string
          client_organisation: string
          created_at: string
          department: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          automation_status?: string
          client_organisation?: string
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          automation_status?: string
          client_organisation?: string
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          organisation_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organisation_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organisation_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          category: string
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          name: string
          project_id: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          name: string
          project_id: string
          uploaded_by?: string
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          name?: string
          project_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          id: string
          order_index: number
          project_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index: number
          project_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          project_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          project_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index: number
          project_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          author_name?: string
          content: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          current_stage: string
          expected_timeline: string | null
          id: string
          name: string
          project_type: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_stage?: string
          expected_timeline?: string | null
          id?: string
          name: string
          project_type: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_stage?: string
          expected_timeline?: string | null
          id?: string
          name?: string
          project_type?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_rate_limits: {
        Row: {
          blocked: boolean
          created_at: string
          id: string
          ip_address: string
          last_request_at: string
          request_count: number
          user_id: string | null
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          id?: string
          ip_address: string
          last_request_at?: string
          request_count?: number
          user_id?: string | null
        }
        Update: {
          blocked?: boolean
          created_at?: string
          id?: string
          ip_address?: string
          last_request_at?: string
          request_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          ai_estimated_annual_savings: string | null
          ai_estimated_cost_breakdown: Json | null
          ai_estimated_cost_range: string | null
          ai_estimated_productivity_gain: string | null
          ai_estimated_roi_period: string | null
          ai_estimated_roi_summary: string | null
          ai_estimated_scope: string | null
          ai_estimated_timeline: string | null
          ai_suggested_solution: string | null
          business_id: string | null
          business_problem: string
          company_name: string
          company_size: string
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          crm_reconciliation_status: string
          id: string
          industry: string
          lead_status: string
          processes_to_automate: string[]
          project_scale: string
          project_types: string[]
          status: string
          timeline: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          ai_estimated_annual_savings?: string | null
          ai_estimated_cost_breakdown?: Json | null
          ai_estimated_cost_range?: string | null
          ai_estimated_productivity_gain?: string | null
          ai_estimated_roi_period?: string | null
          ai_estimated_roi_summary?: string | null
          ai_estimated_scope?: string | null
          ai_estimated_timeline?: string | null
          ai_suggested_solution?: string | null
          business_id?: string | null
          business_problem: string
          company_name: string
          company_size: string
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          crm_reconciliation_status?: string
          id?: string
          industry: string
          lead_status?: string
          processes_to_automate: string[]
          project_scale: string
          project_types: string[]
          status?: string
          timeline: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          ai_estimated_annual_savings?: string | null
          ai_estimated_cost_breakdown?: Json | null
          ai_estimated_cost_range?: string | null
          ai_estimated_productivity_gain?: string | null
          ai_estimated_roi_period?: string | null
          ai_estimated_roi_summary?: string | null
          ai_estimated_scope?: string | null
          ai_estimated_timeline?: string | null
          ai_suggested_solution?: string | null
          business_id?: string | null
          business_problem?: string
          company_name?: string
          company_size?: string
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          crm_reconciliation_status?: string
          id?: string
          industry?: string
          lead_status?: string
          processes_to_automate?: string[]
          project_scale?: string
          project_types?: string[]
          status?: string
          timeline?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      provider_event_intake_reviews: {
        Row: {
          ai_draft_allowed: boolean
          apply_status: string
          business_id: string | null
          campaign_id: string | null
          confidence: number | null
          contact_email: string | null
          contact_id: string | null
          created_at: string
          detected_intent: string | null
          founder_review_required: boolean
          id: string
          metadata: Json
          normalized_event_type: string | null
          outbound_send_allowed: boolean
          provider_campaign_id: string | null
          provider_event_id: string | null
          provider_type: string
          recommended_action: string | null
          updated_at: string
        }
        Insert: {
          ai_draft_allowed?: boolean
          apply_status?: string
          business_id?: string | null
          campaign_id?: string | null
          confidence?: number | null
          contact_email?: string | null
          contact_id?: string | null
          created_at?: string
          detected_intent?: string | null
          founder_review_required?: boolean
          id?: string
          metadata?: Json
          normalized_event_type?: string | null
          outbound_send_allowed?: boolean
          provider_campaign_id?: string | null
          provider_event_id?: string | null
          provider_type?: string
          recommended_action?: string | null
          updated_at?: string
        }
        Update: {
          ai_draft_allowed?: boolean
          apply_status?: string
          business_id?: string | null
          campaign_id?: string | null
          confidence?: number | null
          contact_email?: string | null
          contact_id?: string | null
          created_at?: string
          detected_intent?: string | null
          founder_review_required?: boolean
          id?: string
          metadata?: Json
          normalized_event_type?: string | null
          outbound_send_allowed?: boolean
          provider_campaign_id?: string | null
          provider_event_id?: string | null
          provider_type?: string
          recommended_action?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_event_intake_reviews_provider_event_id_fkey"
            columns: ["provider_event_id"]
            isOneToOne: false
            referencedRelation: "outbound_provider_events"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_secret_registry: {
        Row: {
          business_id: string | null
          created_at: string
          display_label: string | null
          id: string
          last_verified_at: string | null
          metadata: Json
          never_display_value: boolean
          provider_key: string
          secret_name: string
          secret_present: boolean
          updated_at: string
          usage_scope: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          display_label?: string | null
          id?: string
          last_verified_at?: string | null
          metadata?: Json
          never_display_value?: boolean
          provider_key: string
          secret_name: string
          secret_present?: boolean
          updated_at?: string
          usage_scope?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          display_label?: string | null
          id?: string
          last_verified_at?: string | null
          metadata?: Json
          never_display_value?: boolean
          provider_key?: string
          secret_name?: string
          secret_present?: boolean
          updated_at?: string
          usage_scope?: string | null
        }
        Relationships: []
      }
      reputation_events: {
        Row: {
          contact_id: string | null
          created_at: string
          details: string
          domain_id: string | null
          event_type: Database["public"]["Enums"]["reputation_event_type"]
          id: string
          impact_score: number
          inbox_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          details?: string
          domain_id?: string | null
          event_type: Database["public"]["Enums"]["reputation_event_type"]
          id?: string
          impact_score?: number
          inbox_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          details?: string
          domain_id?: string | null
          event_type?: Database["public"]["Enums"]["reputation_event_type"]
          id?: string
          impact_score?: number
          inbox_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "reputation_events_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domain_usage_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_events_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "sending_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_events_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "command_centre_active_inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_events_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inbox_health_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_events_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_events_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "warmup_progress"
            referencedColumns: ["inbox_id"]
          },
        ]
      }
      retry_queue: {
        Row: {
          action_type: Database["public"]["Enums"]["retry_action_type"]
          business_name: string
          created_at: string
          entity_id: string
          entity_type: string
          escalated: boolean
          id: string
          last_error: string
          last_error_message: string
          next_retry_at: string
          retry_count: number
          retry_reason: string
          status: Database["public"]["Enums"]["retry_status"]
          updated_at: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["retry_action_type"]
          business_name?: string
          created_at?: string
          entity_id: string
          entity_type: string
          escalated?: boolean
          id?: string
          last_error?: string
          last_error_message?: string
          next_retry_at?: string
          retry_count?: number
          retry_reason?: string
          status?: Database["public"]["Enums"]["retry_status"]
          updated_at?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["retry_action_type"]
          business_name?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          escalated?: boolean
          id?: string
          last_error?: string
          last_error_message?: string
          next_retry_at?: string
          retry_count?: number
          retry_reason?: string
          status?: Database["public"]["Enums"]["retry_status"]
          updated_at?: string
        }
        Relationships: []
      }
      revenue_operations_reviews: {
        Row: {
          apply_status: string
          assignment_id: string | null
          blockers: Json
          business_id: string | null
          contact_id: string | null
          created_at: string
          current_state: string | null
          deal_id: string | null
          estimated_value: number | null
          founder_review_required: boolean
          id: string
          invoice_id: string | null
          metadata: Json
          payment_id: string | null
          priority_level: string
          recommended_action: string | null
          review_type: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          apply_status?: string
          assignment_id?: string | null
          blockers?: Json
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          current_state?: string | null
          deal_id?: string | null
          estimated_value?: number | null
          founder_review_required?: boolean
          id?: string
          invoice_id?: string | null
          metadata?: Json
          payment_id?: string | null
          priority_level?: string
          recommended_action?: string | null
          review_type: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          apply_status?: string
          assignment_id?: string | null
          blockers?: Json
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          current_state?: string | null
          deal_id?: string | null
          estimated_value?: number | null
          founder_review_required?: boolean
          id?: string
          invoice_id?: string | null
          metadata?: Json
          payment_id?: string | null
          priority_level?: string
          recommended_action?: string | null
          review_type?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      revenue_records: {
        Row: {
          client_organisation: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          revenue_value: number
          source_id: string | null
          source_name: string
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          client_organisation?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          revenue_value?: number
          source_id?: string | null
          source_name?: string
          source_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_organisation?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          revenue_value?: number
          source_id?: string | null
          source_name?: string
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_targets: {
        Row: {
          business_name: string
          conversion_assumption: number
          created_at: string
          currency: string
          id: string
          month: string
          monthly_target: number
          pipeline_target: number
          updated_at: string
        }
        Insert: {
          business_name?: string
          conversion_assumption?: number
          created_at?: string
          currency?: string
          id?: string
          month: string
          monthly_target?: number
          pipeline_target?: number
          updated_at?: string
        }
        Update: {
          business_name?: string
          conversion_assumption?: number
          created_at?: string
          currency?: string
          id?: string
          month?: string
          monthly_target?: number
          pipeline_target?: number
          updated_at?: string
        }
        Relationships: []
      }
      risk_indicators: {
        Row: {
          created_at: string
          id: string
          risk_description: string
          severity: string
          status: string
          system_id: string | null
          system_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          risk_description: string
          severity?: string
          status?: string
          system_id?: string | null
          system_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          risk_description?: string
          severity?: string
          status?: string
          system_id?: string | null
          system_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_indicators_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "monitored_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission: string
          role_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission: string
          role_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string | null
          id: string
          resolved: boolean
          resolved_at: string | null
          severity: string
          system_id: string | null
          system_name: string | null
          title: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          system_id?: string | null
          system_name?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: string
          system_id?: string | null
          system_name?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "monitored_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          affected_system: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          affected_system?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          affected_system?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      self_healing_findings: {
        Row: {
          business_id: string | null
          created_at: string
          finding_summary: string | null
          finding_title: string
          founder_approval_required: boolean
          id: string
          metadata: Json
          recommended_repair: string | null
          repair_safe: boolean
          repair_status: string
          rule_key: string
          severity: string
          source_id: string | null
          source_table: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          finding_summary?: string | null
          finding_title: string
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          recommended_repair?: string | null
          repair_safe?: boolean
          repair_status?: string
          rule_key: string
          severity?: string
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          finding_summary?: string | null
          finding_title?: string
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          recommended_repair?: string | null
          repair_safe?: boolean
          repair_status?: string
          rule_key?: string
          severity?: string
          source_id?: string | null
          source_table?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      self_healing_rules: {
        Row: {
          created_at: string
          detection_query_description: string | null
          enabled: boolean
          founder_approval_required: boolean
          id: string
          metadata: Json
          monitored_area: string
          repair_action_type: string | null
          rule_key: string
          rule_label: string
          safe_auto_repair_allowed: boolean
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detection_query_description?: string | null
          enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          monitored_area: string
          repair_action_type?: string | null
          rule_key: string
          rule_label: string
          safe_auto_repair_allowed?: boolean
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detection_query_description?: string | null
          enabled?: boolean
          founder_approval_required?: boolean
          id?: string
          metadata?: Json
          monitored_area?: string
          repair_action_type?: string | null
          rule_key?: string
          rule_label?: string
          safe_auto_repair_allowed?: boolean
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      send_windows: {
        Row: {
          created_at: string
          end_hour: number
          id: string
          region: string
          start_hour: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_hour?: number
          id?: string
          region: string
          start_hour?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_hour?: number
          id?: string
          region?: string
          start_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      sending_domains: {
        Row: {
          created_at: string
          current_usage: number
          daily_limit: number
          domain_name: string
          domain_reputation_score: number
          id: string
          reputation_score: number
          reputation_updated_at: string
          updated_at: string
          usage_window_start: string
          warmup_stage: Database["public"]["Enums"]["warmup_stage"]
          warmup_started_at: string
        }
        Insert: {
          created_at?: string
          current_usage?: number
          daily_limit?: number
          domain_name: string
          domain_reputation_score?: number
          id?: string
          reputation_score?: number
          reputation_updated_at?: string
          updated_at?: string
          usage_window_start?: string
          warmup_stage?: Database["public"]["Enums"]["warmup_stage"]
          warmup_started_at?: string
        }
        Update: {
          created_at?: string
          current_usage?: number
          daily_limit?: number
          domain_name?: string
          domain_reputation_score?: number
          id?: string
          reputation_score?: number
          reputation_updated_at?: string
          updated_at?: string
          usage_window_start?: string
          warmup_stage?: Database["public"]["Enums"]["warmup_stage"]
          warmup_started_at?: string
        }
        Relationships: []
      }
      smartlead_activation_checklist: {
        Row: {
          blocker_reason: string | null
          business_id: string | null
          checklist_key: string
          checklist_label: string
          created_at: string
          id: string
          last_checked_at: string | null
          liftor_campaign_id: string | null
          metadata: Json
          provider_campaign_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          blocker_reason?: string | null
          business_id?: string | null
          checklist_key: string
          checklist_label: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          liftor_campaign_id?: string | null
          metadata?: Json
          provider_campaign_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          blocker_reason?: string | null
          business_id?: string | null
          checklist_key?: string
          checklist_label?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          liftor_campaign_id?: string | null
          metadata?: Json
          provider_campaign_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_business_profiles: {
        Row: {
          approval_required: boolean
          audience_profile: string | null
          auto_publish_allowed: boolean
          brand_voice: string | null
          business_id: string
          content_pillars: Json
          created_at: string
          id: string
          influencer_outreach_enabled: boolean
          manychat_enabled: boolean
          metadata: Json
          metricool_enabled: boolean
          multilingual_social_enabled: boolean
          offer_focus: string | null
          posting_frequency: string | null
          primary_cta: string | null
          primary_platforms: Json
          secondary_platforms: Json
          social_inbox_enabled: boolean
          social_status: string
          updated_at: string
        }
        Insert: {
          approval_required?: boolean
          audience_profile?: string | null
          auto_publish_allowed?: boolean
          brand_voice?: string | null
          business_id: string
          content_pillars?: Json
          created_at?: string
          id?: string
          influencer_outreach_enabled?: boolean
          manychat_enabled?: boolean
          metadata?: Json
          metricool_enabled?: boolean
          multilingual_social_enabled?: boolean
          offer_focus?: string | null
          posting_frequency?: string | null
          primary_cta?: string | null
          primary_platforms?: Json
          secondary_platforms?: Json
          social_inbox_enabled?: boolean
          social_status?: string
          updated_at?: string
        }
        Update: {
          approval_required?: boolean
          audience_profile?: string | null
          auto_publish_allowed?: boolean
          brand_voice?: string | null
          business_id?: string
          content_pillars?: Json
          created_at?: string
          id?: string
          influencer_outreach_enabled?: boolean
          manychat_enabled?: boolean
          metadata?: Json
          metricool_enabled?: boolean
          multilingual_social_enabled?: boolean
          offer_focus?: string | null
          posting_frequency?: string | null
          primary_cta?: string | null
          primary_platforms?: Json
          secondary_platforms?: Json
          social_inbox_enabled?: boolean
          social_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_business_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      social_competitor_profiles: {
        Row: {
          business_id: string
          competitor_name: string
          content_pillars: Json
          created_at: string
          handle: string | null
          id: string
          notes: string | null
          observed_content_patterns: Json
          platform_key: string | null
          profile_url: string | null
          status: string
          strong_hooks: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          competitor_name: string
          content_pillars?: Json
          created_at?: string
          handle?: string | null
          id?: string
          notes?: string | null
          observed_content_patterns?: Json
          platform_key?: string | null
          profile_url?: string | null
          status?: string
          strong_hooks?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          competitor_name?: string
          content_pillars?: Json
          created_at?: string
          handle?: string | null
          id?: string
          notes?: string | null
          observed_content_patterns?: Json
          platform_key?: string | null
          profile_url?: string | null
          status?: string
          strong_hooks?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_competitor_profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      social_content_calendars: {
        Row: {
          approval_status: string
          approved_at: string | null
          business_id: string
          calendar_name: string
          calendar_period_end: string | null
          calendar_period_start: string | null
          calendar_status: string
          content_pillars: Json
          created_at: string
          id: string
          metadata: Json
          posting_frequency: Json
          strategy_summary: string | null
          target_platforms: Json
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          business_id: string
          calendar_name: string
          calendar_period_end?: string | null
          calendar_period_start?: string | null
          calendar_status?: string
          content_pillars?: Json
          created_at?: string
          id?: string
          metadata?: Json
          posting_frequency?: Json
          strategy_summary?: string | null
          target_platforms?: Json
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          business_id?: string
          calendar_name?: string
          calendar_period_end?: string | null
          calendar_period_start?: string | null
          calendar_status?: string
          content_pillars?: Json
          created_at?: string
          id?: string
          metadata?: Json
          posting_frequency?: Json
          strategy_summary?: string | null
          target_platforms?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_content_calendars_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      social_engagement_events: {
        Row: {
          business_id: string
          contact_email: string | null
          contact_handle: string | null
          contact_name: string | null
          conversation_id: string | null
          created_at: string
          creator_signal: boolean
          crm_contact_id: string | null
          customer_signal: boolean
          detected_intent: string | null
          event_type: string
          external_event_id: string | null
          fan_signal: boolean
          founder_review_required: boolean
          id: string
          keyword_detected: string | null
          message_text: string | null
          platform_key: string
          raw_payload: Json
          received_at: string
          requires_response: boolean
          sentiment: string | null
          spam_signal: boolean
        }
        Insert: {
          business_id: string
          contact_email?: string | null
          contact_handle?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
          creator_signal?: boolean
          crm_contact_id?: string | null
          customer_signal?: boolean
          detected_intent?: string | null
          event_type: string
          external_event_id?: string | null
          fan_signal?: boolean
          founder_review_required?: boolean
          id?: string
          keyword_detected?: string | null
          message_text?: string | null
          platform_key: string
          raw_payload?: Json
          received_at?: string
          requires_response?: boolean
          sentiment?: string | null
          spam_signal?: boolean
        }
        Update: {
          business_id?: string
          contact_email?: string | null
          contact_handle?: string | null
          contact_name?: string | null
          conversation_id?: string | null
          created_at?: string
          creator_signal?: boolean
          crm_contact_id?: string | null
          customer_signal?: boolean
          detected_intent?: string | null
          event_type?: string
          external_event_id?: string | null
          fan_signal?: boolean
          founder_review_required?: boolean
          id?: string
          keyword_detected?: string | null
          message_text?: string | null
          platform_key?: string
          raw_payload?: Json
          received_at?: string
          requires_response?: boolean
          sentiment?: string | null
          spam_signal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "social_engagement_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      social_performance_metrics: {
        Row: {
          business_id: string
          clicks: number
          comments: number
          completion_rate: number | null
          created_at: string
          engagement_rate: number | null
          external_post_id: string | null
          follows: number
          id: string
          impressions: number
          likes: number
          metadata: Json
          metric_date: string
          platform_key: string
          post_draft_id: string | null
          reach: number
          saves: number
          shares: number
          source_system: string
          views: number
          watch_time_seconds: number | null
        }
        Insert: {
          business_id: string
          clicks?: number
          comments?: number
          completion_rate?: number | null
          created_at?: string
          engagement_rate?: number | null
          external_post_id?: string | null
          follows?: number
          id?: string
          impressions?: number
          likes?: number
          metadata?: Json
          metric_date?: string
          platform_key: string
          post_draft_id?: string | null
          reach?: number
          saves?: number
          shares?: number
          source_system?: string
          views?: number
          watch_time_seconds?: number | null
        }
        Update: {
          business_id?: string
          clicks?: number
          comments?: number
          completion_rate?: number | null
          created_at?: string
          engagement_rate?: number | null
          external_post_id?: string | null
          follows?: number
          id?: string
          impressions?: number
          likes?: number
          metadata?: Json
          metric_date?: string
          platform_key?: string
          post_draft_id?: string | null
          reach?: number
          saves?: number
          shares?: number
          source_system?: string
          views?: number
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_performance_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_performance_metrics_post_draft_id_fkey"
            columns: ["post_draft_id"]
            isOneToOne: false
            referencedRelation: "social_post_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_platform_accounts: {
        Row: {
          account_status: string
          analytics_enabled: boolean
          approval_required: boolean
          auto_reply_allowed: boolean
          business_id: string
          connected_via: string | null
          created_at: string
          external_account_id: string | null
          handle: string | null
          id: string
          inbox_enabled: boolean
          metadata: Json
          platform_key: string
          platform_label: string
          posting_enabled: boolean
          profile_url: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          analytics_enabled?: boolean
          approval_required?: boolean
          auto_reply_allowed?: boolean
          business_id: string
          connected_via?: string | null
          created_at?: string
          external_account_id?: string | null
          handle?: string | null
          id?: string
          inbox_enabled?: boolean
          metadata?: Json
          platform_key: string
          platform_label: string
          posting_enabled?: boolean
          profile_url?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          analytics_enabled?: boolean
          approval_required?: boolean
          auto_reply_allowed?: boolean
          business_id?: string
          connected_via?: string | null
          created_at?: string
          external_account_id?: string | null
          handle?: string | null
          id?: string
          inbox_enabled?: boolean
          metadata?: Json
          platform_key?: string
          platform_label?: string
          posting_enabled?: boolean
          profile_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_platform_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_drafts: {
        Row: {
          approval_status: string
          asset_requirements: Json
          business_id: string
          calendar_id: string | null
          caption: string | null
          carousel_slides: Json
          content_pillar: string | null
          created_at: string
          cta: string | null
          external_scheduler: string | null
          founder_review_required: boolean
          hashtags: Json
          hook: string | null
          id: string
          metadata: Json
          platform_key: string
          post_date: string | null
          post_type: string
          publish_allowed: boolean
          repurposed_from_post_id: string | null
          scheduled_externally: boolean
          source_asset_id: string | null
          suggested_time: string | null
          updated_at: string
          video_script: string | null
          visual_direction: string | null
        }
        Insert: {
          approval_status?: string
          asset_requirements?: Json
          business_id: string
          calendar_id?: string | null
          caption?: string | null
          carousel_slides?: Json
          content_pillar?: string | null
          created_at?: string
          cta?: string | null
          external_scheduler?: string | null
          founder_review_required?: boolean
          hashtags?: Json
          hook?: string | null
          id?: string
          metadata?: Json
          platform_key: string
          post_date?: string | null
          post_type: string
          publish_allowed?: boolean
          repurposed_from_post_id?: string | null
          scheduled_externally?: boolean
          source_asset_id?: string | null
          suggested_time?: string | null
          updated_at?: string
          video_script?: string | null
          visual_direction?: string | null
        }
        Update: {
          approval_status?: string
          asset_requirements?: Json
          business_id?: string
          calendar_id?: string | null
          caption?: string | null
          carousel_slides?: Json
          content_pillar?: string | null
          created_at?: string
          cta?: string | null
          external_scheduler?: string | null
          founder_review_required?: boolean
          hashtags?: Json
          hook?: string | null
          id?: string
          metadata?: Json
          platform_key?: string
          post_date?: string | null
          post_type?: string
          publish_allowed?: boolean
          repurposed_from_post_id?: string | null
          scheduled_externally?: boolean
          source_asset_id?: string | null
          suggested_time?: string | null
          updated_at?: string
          video_script?: string | null
          visual_direction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_drafts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_drafts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "social_content_calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      social_repurposing_jobs: {
        Row: {
          business_id: string
          created_at: string
          founder_review_required: boolean
          id: string
          job_name: string
          job_status: string
          metadata: Json
          output_types: Json
          outputs_created: number
          source_asset_id: string
          target_platforms: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          founder_review_required?: boolean
          id?: string
          job_name: string
          job_status?: string
          metadata?: Json
          output_types?: Json
          outputs_created?: number
          source_asset_id: string
          target_platforms?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          founder_review_required?: boolean
          id?: string
          job_name?: string
          job_status?: string
          metadata?: Json
          output_types?: Json
          outputs_created?: number
          source_asset_id?: string
          target_platforms?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_repurposing_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_repurposing_jobs_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "social_source_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      social_scheduling_queue: {
        Row: {
          business_id: string
          created_at: string
          exported_at: string | null
          external_scheduler_id: string | null
          id: string
          metadata: Json
          platform_key: string
          post_draft_id: string
          publish_allowed: boolean
          scheduled_date: string | null
          scheduled_externally_at: string | null
          scheduled_time: string | null
          scheduler_provider: string
          scheduler_status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          exported_at?: string | null
          external_scheduler_id?: string | null
          id?: string
          metadata?: Json
          platform_key: string
          post_draft_id: string
          publish_allowed?: boolean
          scheduled_date?: string | null
          scheduled_externally_at?: string | null
          scheduled_time?: string | null
          scheduler_provider?: string
          scheduler_status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          exported_at?: string | null
          external_scheduler_id?: string | null
          id?: string
          metadata?: Json
          platform_key?: string
          post_draft_id?: string
          publish_allowed?: boolean
          scheduled_date?: string | null
          scheduled_externally_at?: string | null
          scheduled_time?: string | null
          scheduler_provider?: string
          scheduler_status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_scheduling_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_scheduling_queue_post_draft_id_fkey"
            columns: ["post_draft_id"]
            isOneToOne: false
            referencedRelation: "social_post_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_source_assets: {
        Row: {
          asset_notes: string | null
          asset_title: string
          asset_type: string
          asset_url: string | null
          business_id: string
          campaign_name: string | null
          created_at: string
          id: string
          metadata: Json
          release_date: string | null
          source_platform: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          asset_notes?: string | null
          asset_title: string
          asset_type: string
          asset_url?: string | null
          business_id: string
          campaign_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          release_date?: string | null
          source_platform?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          asset_notes?: string | null
          asset_title?: string
          asset_type?: string
          asset_url?: string | null
          business_id?: string
          campaign_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          release_date?: string | null
          source_platform?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_source_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      social_trend_watch_items: {
        Row: {
          business_id: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          platform_key: string | null
          relevance_score: number | null
          source_notes: string | null
          status: string
          suggested_content_angle: string | null
          trend_key: string | null
          trend_title: string
          trend_type: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          platform_key?: string | null
          relevance_score?: number | null
          source_notes?: string | null
          status?: string
          suggested_content_angle?: string | null
          trend_key?: string | null
          trend_title: string
          trend_type?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          platform_key?: string | null
          relevance_score?: number | null
          source_notes?: string | null
          status?: string
          suggested_content_angle?: string | null
          trend_key?: string | null
          trend_title?: string
          trend_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_trend_watch_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_insights: {
        Row: {
          category: string
          confidence_level: string
          created_at: string
          description: string | null
          id: string
          status: string
          target_industry: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          confidence_level?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          target_industry?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          confidence_level?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          target_industry?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          client_id: string
          coverage_type: string
          created_at: string
          id: string
          last_renewal_date: string | null
          next_renewal_date: string | null
          plan_name: string
          project_id: string
          start_date: string
          status: string
          support_level: string
          updated_at: string
        }
        Insert: {
          client_id: string
          coverage_type?: string
          created_at?: string
          id?: string
          last_renewal_date?: string | null
          next_renewal_date?: string | null
          plan_name?: string
          project_id: string
          start_date?: string
          status?: string
          support_level?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          coverage_type?: string
          created_at?: string
          id?: string
          last_renewal_date?: string | null
          next_renewal_date?: string | null
          plan_name?: string
          project_id?: string
          start_date?: string
          status?: string
          support_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_availability: {
        Row: {
          capacity: number | null
          id: string
          manual_override: boolean
          notes: string
          status: Database["public"]["Enums"]["supplier_availability_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          id?: string
          manual_override?: boolean
          notes?: string
          status?: Database["public"]["Enums"]["supplier_availability_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          id?: string
          manual_override?: boolean
          notes?: string
          status?: Database["public"]["Enums"]["supplier_availability_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_availability_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_pipeline: {
        Row: {
          created_at: string
          id: string
          notes: string
          stage: Database["public"]["Enums"]["supplier_pipeline_stage"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string
          stage?: Database["public"]["Enums"]["supplier_pipeline_stage"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string
          stage?: Database["public"]["Enums"]["supplier_pipeline_stage"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_pipeline_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_users: {
        Row: {
          access_token: string
          active: boolean
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          last_login_at: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          active?: boolean
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          last_login_at?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          active?: boolean
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          last_login_at?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active_assignment_count: number
          approved_at: string | null
          business_name: string
          company: string
          created_at: string
          email: string
          id: string
          last_activity_at: string | null
          max_concurrent_assignments: number
          name: string
          notes: string
          rejected_at: string | null
          role: string
          skills: string[]
          source: string
          status: Database["public"]["Enums"]["supplier_status"]
          supplier_score: number
          tags: string[]
          updated_at: string
        }
        Insert: {
          active_assignment_count?: number
          approved_at?: string | null
          business_name?: string
          company?: string
          created_at?: string
          email: string
          id?: string
          last_activity_at?: string | null
          max_concurrent_assignments?: number
          name?: string
          notes?: string
          rejected_at?: string | null
          role?: string
          skills?: string[]
          source?: string
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_score?: number
          tags?: string[]
          updated_at?: string
        }
        Update: {
          active_assignment_count?: number
          approved_at?: string | null
          business_name?: string
          company?: string
          created_at?: string
          email?: string
          id?: string
          last_activity_at?: string | null
          max_concurrent_assignments?: number
          name?: string
          notes?: string
          rejected_at?: string | null
          role?: string
          skills?: string[]
          source?: string
          status?: Database["public"]["Enums"]["supplier_status"]
          supplier_score?: number
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          created_at: string
          description: string
          id: string
          priority: string
          project_id: string
          request_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          priority?: string
          project_id: string
          request_type?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          priority?: string
          project_id?: string
          request_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      supported_languages: {
        Row: {
          auto_draft_allowed: boolean
          auto_send_allowed: boolean
          created_at: string
          enabled: boolean
          founder_review_required: boolean
          id: string
          language_code: string
          language_name: string
          metadata: Json
          native_name: string | null
          risk_notes: string | null
          rtl: boolean
          script: string | null
          updated_at: string
        }
        Insert: {
          auto_draft_allowed?: boolean
          auto_send_allowed?: boolean
          created_at?: string
          enabled?: boolean
          founder_review_required?: boolean
          id?: string
          language_code: string
          language_name: string
          metadata?: Json
          native_name?: string | null
          risk_notes?: string | null
          rtl?: boolean
          script?: string | null
          updated_at?: string
        }
        Update: {
          auto_draft_allowed?: boolean
          auto_send_allowed?: boolean
          created_at?: string
          enabled?: boolean
          founder_review_required?: boolean
          id?: string
          language_code?: string
          language_name?: string
          metadata?: Json
          native_name?: string | null
          risk_notes?: string | null
          rtl?: boolean
          script?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          affected_system: string | null
          created_at: string
          description: string | null
          id: string
          resolved: boolean
          severity: string
          system_id: string
          title: string
        }
        Insert: {
          affected_system?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolved?: boolean
          severity?: string
          system_id: string
          title: string
        }
        Update: {
          affected_system?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resolved?: boolean
          severity?: string
          system_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "monitored_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      system_backend_objects: {
        Row: {
          dependencies: string | null
          documented: boolean
          id: string
          inputs: string | null
          object_kind: string
          object_name: string
          outputs: string | null
          purpose: string | null
          schema_name: string
          updated_at: string
        }
        Insert: {
          dependencies?: string | null
          documented?: boolean
          id?: string
          inputs?: string | null
          object_kind: string
          object_name: string
          outputs?: string | null
          purpose?: string | null
          schema_name?: string
          updated_at?: string
        }
        Update: {
          dependencies?: string | null
          documented?: boolean
          id?: string
          inputs?: string | null
          object_kind?: string
          object_name?: string
          outputs?: string | null
          purpose?: string | null
          schema_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_changes: {
        Row: {
          change_type: string
          created_at: string
          entity_id: string | null
          entity_key: string | null
          entity_type: string
          id: string
          manual_version: number | null
          summary: string | null
        }
        Insert: {
          change_type?: string
          created_at?: string
          entity_id?: string | null
          entity_key?: string | null
          entity_type: string
          id?: string
          manual_version?: number | null
          summary?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          entity_id?: string | null
          entity_key?: string | null
          entity_type?: string
          id?: string
          manual_version?: number | null
          summary?: string | null
        }
        Relationships: []
      }
      system_content: {
        Row: {
          content_type: string
          created_at: string
          id: string
          last_updated: string
          linked_feature: string | null
          page: string
          source_path: string | null
          text_value: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          id?: string
          last_updated?: string
          linked_feature?: string | null
          page: string
          source_path?: string | null
          text_value: string
        }
        Update: {
          content_type?: string
          created_at?: string
          id?: string
          last_updated?: string
          linked_feature?: string | null
          page?: string
          source_path?: string | null
          text_value?: string
        }
        Relationships: []
      }
      system_coverage_reports: {
        Row: {
          coverage_score: number
          created_at: string
          details: Json
          documented_functions: number
          documented_pages: number
          documented_rules: number
          documented_tables: number
          documented_workflows: number
          gaps_found: number
          id: string
          total_functions: number
          total_pages: number
          total_rules: number
          total_tables: number
          total_workflows: number
        }
        Insert: {
          coverage_score?: number
          created_at?: string
          details?: Json
          documented_functions?: number
          documented_pages?: number
          documented_rules?: number
          documented_tables?: number
          documented_workflows?: number
          gaps_found?: number
          id?: string
          total_functions?: number
          total_pages?: number
          total_rules?: number
          total_tables?: number
          total_workflows?: number
        }
        Update: {
          coverage_score?: number
          created_at?: string
          details?: Json
          documented_functions?: number
          documented_pages?: number
          documented_rules?: number
          documented_tables?: number
          documented_workflows?: number
          gaps_found?: number
          id?: string
          total_functions?: number
          total_pages?: number
          total_rules?: number
          total_tables?: number
          total_workflows?: number
        }
        Relationships: []
      }
      system_data_flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          relationship: string
          source_entity: string
          target_entity: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          relationship?: string
          source_entity: string
          target_entity: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          relationship?: string
          source_entity?: string
          target_entity?: string
        }
        Relationships: []
      }
      system_events: {
        Row: {
          business_name: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          message: string
          metadata: Json
          resolution_note: string
          resolved: boolean
          resolved_at: string | null
          severity: Database["public"]["Enums"]["system_event_severity"]
        }
        Insert: {
          business_name?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          message?: string
          metadata?: Json
          resolution_note?: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["system_event_severity"]
        }
        Update: {
          business_name?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json
          resolution_note?: string
          resolved?: boolean
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["system_event_severity"]
        }
        Relationships: []
      }
      system_execution_modes: {
        Row: {
          created_at: string
          description: string
          id: string
          is_default: boolean
          mode_name: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_default?: boolean
          mode_name: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_default?: boolean
          mode_name?: string
        }
        Relationships: []
      }
      system_feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          execution_mode_id: string
          feature_name: string
          id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          execution_mode_id: string
          feature_name: string
          id?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          execution_mode_id?: string
          feature_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_feature_flags_execution_mode_id_fkey"
            columns: ["execution_mode_id"]
            isOneToOne: false
            referencedRelation: "system_execution_modes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          id: string
          metadata: Json
          metric_name: string
          timestamp: string
          value: number
        }
        Insert: {
          id?: string
          metadata?: Json
          metric_name: string
          timestamp?: string
          value?: number
        }
        Update: {
          id?: string
          metadata?: Json
          metric_name?: string
          timestamp?: string
          value?: number
        }
        Relationships: []
      }
      system_integrations_full: {
        Row: {
          description: string | null
          documented: boolean
          endpoint: string | null
          id: string
          integration_key: string
          integration_name: string
          layer: string
          related_objects: string | null
          updated_at: string
        }
        Insert: {
          description?: string | null
          documented?: boolean
          endpoint?: string | null
          id?: string
          integration_key: string
          integration_name: string
          layer: string
          related_objects?: string | null
          updated_at?: string
        }
        Update: {
          description?: string | null
          documented?: boolean
          endpoint?: string | null
          id?: string
          integration_key?: string
          integration_name?: string
          layer?: string
          related_objects?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_pages_index: {
        Row: {
          actions: string | null
          area: string
          data_sources: string | null
          documented: boolean
          id: string
          linked_backend: string | null
          manual_page_id: string | null
          page_name: string
          purpose: string | null
          route_path: string
          ui_elements: string | null
          updated_at: string
        }
        Insert: {
          actions?: string | null
          area?: string
          data_sources?: string | null
          documented?: boolean
          id?: string
          linked_backend?: string | null
          manual_page_id?: string | null
          page_name: string
          purpose?: string | null
          route_path: string
          ui_elements?: string | null
          updated_at?: string
        }
        Update: {
          actions?: string | null
          area?: string
          data_sources?: string | null
          documented?: boolean
          id?: string
          linked_backend?: string | null
          manual_page_id?: string | null
          page_name?: string
          purpose?: string | null
          route_path?: string
          ui_elements?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_pages_index_manual_page_id_fkey"
            columns: ["manual_page_id"]
            isOneToOne: false
            referencedRelation: "manual_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      system_rules: {
        Row: {
          action_text: string
          condition_text: string
          documented: boolean
          id: string
          module: string
          rule_key: string
          rule_name: string
          severity: string
          source_function: string | null
          updated_at: string
        }
        Insert: {
          action_text?: string
          condition_text?: string
          documented?: boolean
          id?: string
          module: string
          rule_key: string
          rule_name: string
          severity?: string
          source_function?: string | null
          updated_at?: string
        }
        Update: {
          action_text?: string
          condition_text?: string
          documented?: boolean
          id?: string
          module?: string
          rule_key?: string
          rule_name?: string
          severity?: string
          source_function?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      system_status: {
        Row: {
          created_at: string
          id: string
          last_checked: string
          service_name: string
          status: string
          subscription_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked?: string
          service_name: string
          status?: string
          subscription_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_checked?: string
          service_name?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_status_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_tasks: {
        Row: {
          business_name: string
          completed_at: string | null
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["priority_entity_type"]
          id: string
          priority_score: number
          reason: string
          status: Database["public"]["Enums"]["system_task_status"]
          task_type: Database["public"]["Enums"]["system_task_type"]
          updated_at: string
        }
        Insert: {
          business_name?: string
          completed_at?: string | null
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["priority_entity_type"]
          id?: string
          priority_score?: number
          reason?: string
          status?: Database["public"]["Enums"]["system_task_status"]
          task_type: Database["public"]["Enums"]["system_task_type"]
          updated_at?: string
        }
        Update: {
          business_name?: string
          completed_at?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["priority_entity_type"]
          id?: string
          priority_score?: number
          reason?: string
          status?: Database["public"]["Enums"]["system_task_status"]
          task_type?: Database["public"]["Enums"]["system_task_type"]
          updated_at?: string
        }
        Relationships: []
      }
      system_templates: {
        Row: {
          architecture_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          template_type: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          architecture_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          template_type?: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          architecture_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          template_type?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "system_templates_architecture_id_fkey"
            columns: ["architecture_id"]
            isOneToOne: false
            referencedRelation: "architectures"
            referencedColumns: ["id"]
          },
        ]
      }
      system_version_diffs: {
        Row: {
          added_count: number
          created_at: string
          diff_summary: Json
          id: string
          modified_count: number
          removed_count: number
          version_a: number
          version_b: number
        }
        Insert: {
          added_count?: number
          created_at?: string
          diff_summary?: Json
          id?: string
          modified_count?: number
          removed_count?: number
          version_a: number
          version_b: number
        }
        Update: {
          added_count?: number
          created_at?: string
          diff_summary?: Json
          id?: string
          modified_count?: number
          removed_count?: number
          version_a?: number
          version_b?: number
        }
        Relationships: []
      }
      system_versions: {
        Row: {
          backend_count: number
          content_count: number
          coverage_score: number
          created_at: string
          data_flow_count: number
          id: string
          integration_count: number
          notes: string | null
          pages_count: number
          rule_count: number
          version_number: number
          workflow_count: number
        }
        Insert: {
          backend_count?: number
          content_count?: number
          coverage_score?: number
          created_at?: string
          data_flow_count?: number
          id?: string
          integration_count?: number
          notes?: string | null
          pages_count?: number
          rule_count?: number
          version_number: number
          workflow_count?: number
        }
        Update: {
          backend_count?: number
          content_count?: number
          coverage_score?: number
          created_at?: string
          data_flow_count?: number
          id?: string
          integration_count?: number
          notes?: string | null
          pages_count?: number
          rule_count?: number
          version_number?: number
          workflow_count?: number
        }
        Relationships: []
      }
      system_workflow_steps: {
        Row: {
          created_at: string
          data_input: string | null
          data_output: string | null
          failure_points: string | null
          id: string
          linked_tables: string | null
          step_index: number
          step_name: string
          trigger_source: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          data_input?: string | null
          data_output?: string | null
          failure_points?: string | null
          id?: string
          linked_tables?: string | null
          step_index: number
          step_name: string
          trigger_source?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          data_input?: string | null
          data_output?: string | null
          failure_points?: string | null
          id?: string
          linked_tables?: string | null
          step_index?: number
          step_name?: string
          trigger_source?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "system_workflows_full"
            referencedColumns: ["id"]
          },
        ]
      }
      system_workflows_full: {
        Row: {
          description: string | null
          documented: boolean
          end_module: string | null
          id: string
          start_module: string | null
          step_count: number
          updated_at: string
          workflow_key: string
          workflow_name: string
        }
        Insert: {
          description?: string | null
          documented?: boolean
          end_module?: string | null
          id?: string
          start_module?: string | null
          step_count?: number
          updated_at?: string
          workflow_key: string
          workflow_name: string
        }
        Update: {
          description?: string | null
          documented?: boolean
          end_module?: string | null
          id?: string
          start_module?: string | null
          step_count?: number
          updated_at?: string
          workflow_key?: string
          workflow_name?: string
        }
        Relationships: []
      }
      template_components: {
        Row: {
          agent_id: string | null
          component_type: string
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          template_id: string
          workflow_id: string | null
        }
        Insert: {
          agent_id?: string | null
          component_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          template_id: string
          workflow_id?: string | null
        }
        Update: {
          agent_id?: string | null
          component_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          template_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_components_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_components_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "system_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_components_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      update_logs: {
        Row: {
          affected_system: string | null
          created_at: string
          description: string | null
          id: string
          performed_at: string
          subscription_id: string
          title: string
        }
        Insert: {
          affected_system?: string | null
          created_at?: string
          description?: string | null
          id?: string
          performed_at?: string
          subscription_id: string
          title: string
        }
        Update: {
          affected_system?: string | null
          created_at?: string
          description?: string | null
          id?: string
          performed_at?: string
          subscription_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_legal_acceptance: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          privacy_version: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_platform_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          organisation_id: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          organisation_id?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          organisation_id?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_platform_roles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_platform_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "platform_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          workflow_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          workflow_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_activity_logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_alerts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          resolved: boolean
          severity: string
          title: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          resolved?: boolean
          severity?: string
          title: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          resolved?: boolean
          severity?: string
          title?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_alerts_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          priority: string
          result: string | null
          started_at: string | null
          status: string
          system_id: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          priority?: string
          result?: string | null
          started_at?: string | null
          status?: string
          system_id: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          priority?: string
          result?: string | null
          started_at?: string | null
          status?: string
          system_id?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "monitored_systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          agent_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index: number
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      apollo_raw_leads: {
        Row: {
          apollo_lead_id: string | null
          apollo_org_id: string | null
          apollo_person_id: string | null
          apollo_qualification:
            | Database["public"]["Enums"]["bcr_qualification"]
            | null
          apollo_status:
            | Database["public"]["Enums"]["apollo_lead_status"]
            | null
          business_name: string | null
          campaign_fit: Database["public"]["Enums"]["lead_campaign_fit"] | null
          classified_at: string | null
          company: string | null
          contact_id: string | null
          country: string | null
          dup_of_contact_id: string | null
          dup_of_lead_id: string | null
          email: string | null
          email_domain: string | null
          first_name: string | null
          fit_confidence: number | null
          fit_method: string | null
          fit_reason: string | null
          founder_review_reason: string | null
          last_name: string | null
          lead_created_at: string | null
          linkedin_url: string | null
          needs_founder_review: boolean | null
          profile_updated_at: string | null
          promoted_at: string | null
          promoted_contact_id: string | null
          quality_profile_id: string | null
          quality_status:
            | Database["public"]["Enums"]["lead_quality_status"]
            | null
          risk_flags: string[] | null
          scanned_at: string | null
          title: string | null
          verification_status:
            | Database["public"]["Enums"]["lead_verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "apollo_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apollo_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      at_risk_assignments: {
        Row: {
          assignment_status:
            | Database["public"]["Enums"]["assignment_status"]
            | null
          business_name: string | null
          created_at: string | null
          deal_id: string | null
          entity_id: string | null
          entity_type:
            | Database["public"]["Enums"]["priority_entity_type"]
            | null
          expected_completion_date: string | null
          factors: Json | null
          id: string | null
          last_updated: string | null
          priority_level: Database["public"]["Enums"]["priority_level"] | null
          score: number | null
          sla_status:
            | Database["public"]["Enums"]["assignment_sla_status"]
            | null
          supplier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_sends_24h: {
        Row: {
          block_reason: string | null
          business_name: string | null
          campaign_id: string | null
          contact_email: string | null
          contact_id: string | null
          created_at: string | null
          id: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["email_queue_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      cadence_status: {
        Row: {
          blocked_rows: number | null
          campaign_id: string | null
          cancelled_rows: number | null
          contact_id: string | null
          current_step: number | null
          delayed_rows: number | null
          last_valid_sent_step: number | null
          next_eligible_send_at: string | null
          next_eligible_step: number | null
          next_status: Database["public"]["Enums"]["email_queue_status"] | null
          paused_reason: string | null
          pending_rows: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      command_centre_active_inboxes: {
        Row: {
          active: boolean | null
          business_name: string | null
          email_address: string | null
          from_email: string | null
          from_name: string | null
          id: string | null
          live_readiness:
            | Database["public"]["Enums"]["inbox_live_readiness"]
            | null
          provider_blocked_reason: string | null
          provider_blocked_until: string | null
          reply_to_email: string | null
          status_label: string | null
        }
        Insert: {
          active?: boolean | null
          business_name?: string | null
          email_address?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string | null
          live_readiness?:
            | Database["public"]["Enums"]["inbox_live_readiness"]
            | null
          provider_blocked_reason?: string | null
          provider_blocked_until?: string | null
          reply_to_email?: string | null
          status_label?: never
        }
        Update: {
          active?: boolean | null
          business_name?: string | null
          email_address?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string | null
          live_readiness?:
            | Database["public"]["Enums"]["inbox_live_readiness"]
            | null
          provider_blocked_reason?: string | null
          provider_blocked_until?: string | null
          reply_to_email?: string | null
          status_label?: never
        }
        Relationships: []
      }
      crm_spine_summary: {
        Row: {
          apollo_duplicates_collapsed: number | null
          apollo_needs_verification: number | null
          apollo_promoted: number | null
          bcr_missing_business_id: number | null
          bcr_with_business_id: number | null
          contacts_missing_bcr: number | null
          contacts_total: number | null
          contacts_with_bcr: number | null
          internal_contacts: number | null
          internal_identities: number | null
          proposals_needing_reconciliation: number | null
          safe_to_unlock_count: number | null
          suppressed_contacts: number | null
        }
        Relationships: []
      }
      domain_usage_summary: {
        Row: {
          current_usage: number | null
          daily_limit: number | null
          domain_name: string | null
          id: string | null
          reputation_score: number | null
          updated_at: string | null
          usage_pct: number | null
          usage_window_start: string | null
          warmup_stage: Database["public"]["Enums"]["warmup_stage"] | null
        }
        Insert: {
          current_usage?: number | null
          daily_limit?: number | null
          domain_name?: string | null
          id?: string | null
          reputation_score?: number | null
          updated_at?: string | null
          usage_pct?: never
          usage_window_start?: string | null
          warmup_stage?: Database["public"]["Enums"]["warmup_stage"] | null
        }
        Update: {
          current_usage?: number | null
          daily_limit?: number | null
          domain_name?: string | null
          id?: string | null
          reputation_score?: number | null
          updated_at?: string | null
          usage_pct?: never
          usage_window_start?: string | null
          warmup_stage?: Database["public"]["Enums"]["warmup_stage"] | null
        }
        Relationships: []
      }
      high_intent_review_queue: {
        Row: {
          assigned_business: string | null
          company: string | null
          contact_id: string | null
          demo_views: number | null
          email: string | null
          founder_review_requested_at: string | null
          intent_score: number | null
          last_reply_at: string | null
          name: string | null
          proposal_viewed: boolean | null
          status: Database["public"]["Enums"]["contact_status"] | null
          updated_at: string | null
        }
        Insert: {
          assigned_business?: string | null
          company?: string | null
          contact_id?: string | null
          demo_views?: never
          email?: string | null
          founder_review_requested_at?: string | null
          intent_score?: number | null
          last_reply_at?: never
          name?: string | null
          proposal_viewed?: never
          status?: Database["public"]["Enums"]["contact_status"] | null
          updated_at?: string | null
        }
        Update: {
          assigned_business?: string | null
          company?: string | null
          contact_id?: string | null
          demo_views?: never
          email?: string | null
          founder_review_requested_at?: string | null
          intent_score?: number | null
          last_reply_at?: never
          name?: string | null
          proposal_viewed?: never
          status?: Database["public"]["Enums"]["contact_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      high_priority_contacts: {
        Row: {
          business_name: string | null
          company: string | null
          contact_name: string | null
          contact_status: Database["public"]["Enums"]["contact_status"] | null
          created_at: string | null
          email: string | null
          entity_id: string | null
          entity_type:
            | Database["public"]["Enums"]["priority_entity_type"]
            | null
          factors: Json | null
          id: string | null
          last_updated: string | null
          priority_level: Database["public"]["Enums"]["priority_level"] | null
          score: number | null
        }
        Relationships: []
      }
      high_priority_deals: {
        Row: {
          business_name: string | null
          contact_id: string | null
          created_at: string | null
          deal_name: string | null
          deal_status: Database["public"]["Enums"]["deal_status"] | null
          entity_id: string | null
          entity_type:
            | Database["public"]["Enums"]["priority_entity_type"]
            | null
          estimated_value_max: number | null
          estimated_value_min: number | null
          factors: Json | null
          id: string | null
          last_updated: string | null
          priority_level: Database["public"]["Enums"]["priority_level"] | null
          score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      hot_conversations: {
        Row: {
          business_name: string | null
          contact_id: string | null
          conv_status: Database["public"]["Enums"]["conversation_status"] | null
          created_at: string | null
          entity_id: string | null
          entity_type:
            | Database["public"]["Enums"]["priority_entity_type"]
            | null
          factors: Json | null
          id: string | null
          last_intent: string | null
          last_message_at: string | null
          last_updated: string | null
          priority_level: Database["public"]["Enums"]["priority_level"] | null
          score: number | null
        }
        Relationships: []
      }
      inbox_health_summary: {
        Row: {
          active: boolean | null
          business_name: string | null
          current_send_count: number | null
          daily_send_limit: number | null
          effective_daily_cap: number | null
          email_address: string | null
          health_status: string | null
          hourly_send_count: number | null
          hourly_send_limit: number | null
          id: string | null
          last_sent_at: string | null
          reputation_score: number | null
          warmup_days: number | null
        }
        Insert: {
          active?: boolean | null
          business_name?: string | null
          current_send_count?: number | null
          daily_send_limit?: number | null
          effective_daily_cap?: never
          email_address?: string | null
          health_status?: never
          hourly_send_count?: number | null
          hourly_send_limit?: number | null
          id?: string | null
          last_sent_at?: string | null
          reputation_score?: number | null
          warmup_days?: never
        }
        Update: {
          active?: boolean | null
          business_name?: string | null
          current_send_count?: number | null
          daily_send_limit?: number | null
          effective_daily_cap?: never
          email_address?: string | null
          health_status?: never
          hourly_send_count?: number | null
          hourly_send_limit?: number | null
          id?: string | null
          last_sent_at?: string | null
          reputation_score?: number | null
          warmup_days?: never
        }
        Relationships: []
      }
      lead_lifecycle_summary: {
        Row: {
          active_candidate: number | null
          active_working_leads: number | null
          already_in_crm: number | null
          already_in_crm_after_reveal: number | null
          archived_learning_only: number | null
          archived_not_working: number | null
          attempted_no_email: number | null
          duplicate_collapsed: number | null
          email_reveal_required: number | null
          founder_review_required: number | null
          legacy_optional_unlock_candidates: number | null
          needs_founder_review: number | null
          needs_verification: number | null
          promoted_to_contact: number | null
          qualified_for_promotion: number | null
          rejected_missing_contact_details: number | null
          rejected_poor_fit: number | null
          reveal_attempted_no_email: number | null
          reveal_invalid_email: number | null
          reveal_shortlisted: number | null
          safe_to_promote: number | null
          safe_to_promote_after_reveal: number | null
          safe_to_queue: number | null
          safe_to_unlock: number | null
          unlock_required: number | null
          verified_email_available_locked: number | null
          verified_ready_for_review: number | null
        }
        Relationships: []
      }
      lead_quality_overview: {
        Row: {
          duplicate_or_risky: number | null
          needs_founder_review: number | null
          needs_verification: number | null
          promoted_contacts: number | null
          qualified_leads: number | null
          raw_leads: number | null
          rejected_leads: number | null
          reviewed_leads: number | null
          safe_to_queue: number | null
          terminal_blocked: number | null
          total_leads: number | null
        }
        Relationships: []
      }
      proposal_crm_reconciliation: {
        Row: {
          business_id: string | null
          business_name: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          crm_reconciliation_status: string | null
          proposal_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "high_intent_review_queue"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      system_health_score: {
        Row: {
          assignment_completion_rate: number | null
          conversion_rate: number | null
          emails_sent_per_hour: number | null
          health_score: number | null
          open_critical_events: number | null
          payment_collection_rate: number | null
          reply_rate: number | null
        }
        Relationships: []
      }
      warmup_progress: {
        Row: {
          business_name: string | null
          current_cap: number | null
          days_in_warmup: number | null
          email_address: string | null
          inbox_id: string | null
          progress_pct: number | null
          target_cap: number | null
          warmup_started_at: string | null
        }
        Insert: {
          business_name?: string | null
          current_cap?: never
          days_in_warmup?: never
          email_address?: string | null
          inbox_id?: string | null
          progress_pct?: never
          target_cap?: number | null
          warmup_started_at?: string | null
        }
        Update: {
          business_name?: string | null
          current_cap?: never
          days_in_warmup?: never
          email_address?: string | null
          inbox_id?: string | null
          progress_pct?: never
          target_cap?: number | null
          warmup_started_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_proposal_by_token: { Args: { _token: string }; Returns: Json }
      activate_outreach_campaign: {
        Args: { _campaign_id: string }
        Returns: Json
      }
      ai_actions_today: { Args: { _conversation_id: string }; Returns: number }
      apollo_decrypt_key: {
        Args: { cipher: string; enc_key: string }
        Returns: string
      }
      apollo_encrypt_key: {
        Args: { enc_key: string; plain: string }
        Returns: string
      }
      apply_reply_stop_suppression: {
        Args: {
          p_contact_id: string
          p_message_body: string
          p_source?: string
        }
        Returns: boolean
      }
      apply_reputation_event: {
        Args: {
          _contact_id: string
          _details?: string
          _event: Database["public"]["Enums"]["reputation_event_type"]
          _inbox_id: string
        }
        Returns: undefined
      }
      assign_inbox_for_contact: {
        Args: { _contact_id: string }
        Returns: string
      }
      auto_resolve_system_events: { Args: never; Returns: number }
      check_outreach_allowed:
        | { Args: { _contact_id: string }; Returns: Json }
        | {
            Args: { p_business_id?: string; p_contact_id: string }
            Returns: Json
          }
      check_send_throttle: {
        Args: { _contact_id: string; _inbox_id: string }
        Returns: Json
      }
      compare_system_versions: {
        Args: { _version_a: number; _version_b: number }
        Returns: Json
      }
      compliance_check_assignment: {
        Args: { _assignment_id: string }
        Returns: undefined
      }
      compliance_check_contact: {
        Args: { _contact_id: string }
        Returns: undefined
      }
      compliance_check_demo: { Args: { _demo_id: string }; Returns: undefined }
      compliance_check_invoice: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      compliance_check_outbound_communication: {
        Args: { _comm_id: string }
        Returns: undefined
      }
      compliance_check_payment: {
        Args: { _payment_id: string }
        Returns: undefined
      }
      compliance_check_proposal: {
        Args: { _proposal_id: string }
        Returns: undefined
      }
      compliance_score_for: {
        Args: { _eid: string; _etype: string }
        Returns: number
      }
      compute_assignment_sla: {
        Args: {
          _expected: string
          _status: Database["public"]["Enums"]["assignment_status"]
        }
        Returns: Database["public"]["Enums"]["assignment_sla_status"]
      }
      compute_intent_score: { Args: { _contact_id: string }; Returns: number }
      compute_system_health: { Args: never; Returns: undefined }
      country_to_timezone: { Args: { _country: string }; Returns: string }
      crm_match_interaction_preview: {
        Args: {
          p_business_id?: string
          p_contact_email?: string
          p_interaction_id?: string
          p_provider_campaign_id?: string
          p_provider_event_id?: string
          p_provider_message_id?: string
        }
        Returns: Json
      }
      detect_anomalies: { Args: never; Returns: Json }
      detect_orphan_content: { Args: never; Returns: Json }
      domain_for_inbox: { Args: { _inbox_id: string }; Returns: string }
      eligible_suppliers_for_deal: {
        Args: { _deal_id: string }
        Returns: {
          active_assignment_count: number
          approved_at: string | null
          business_name: string
          company: string
          created_at: string
          email: string
          id: string
          last_activity_at: string | null
          max_concurrent_assignments: number
          name: string
          notes: string
          rejected_at: string | null
          role: string
          skills: string[]
          source: string
          status: Database["public"]["Enums"]["supplier_status"]
          supplier_score: number
          tags: string[]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "suppliers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      enforce_inbox_ramp: { Args: { _inbox_id: string }; Returns: Json }
      enrich_all_contacts: { Args: never; Returns: number }
      enrich_contact: { Args: { _contact_id: string }; Returns: Json }
      escalate_retry_failure: {
        Args: { _retry_id: string }
        Returns: undefined
      }
      evaluate_ai_reply: { Args: { _text: string }; Returns: Json }
      expire_demos: { Args: never; Returns: number }
      expire_inactive_conversations: { Args: never; Returns: number }
      export_full_system_snapshot: { Args: never; Returns: Json }
      finance_mark_overdue_invoices: { Args: never; Returns: number }
      finance_target_vs_actual: {
        Args: { _business_name?: string; _month?: string }
        Returns: {
          business_name: string
          closed_value: number
          collected_value: number
          monthly_target: number
          outstanding_value: number
          overdue_value: number
          pipeline_target: number
          pipeline_value: number
          progress_pct: number
        }[]
      }
      flag_idle_assignments: { Args: never; Returns: number }
      founder_confirm_assignment: {
        Args: { _assignment_id: string }
        Returns: Json
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_system_tasks_from_priority: {
        Args: {
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["priority_entity_type"]
        }
        Returns: undefined
      }
      get_active_execution_mode: {
        Args: { _business_name?: string }
        Returns: string
      }
      get_business_outbound_status: {
        Args: { _business_name: string }
        Returns: Json
      }
      get_crm_contact_360_summary: {
        Args: { p_business_id?: string; p_contact_id: string }
        Returns: Json
      }
      get_crm_contact_timeline: {
        Args: { p_business_id?: string; p_contact_id: string; p_limit?: number }
        Returns: {
          ai_relevant: boolean
          business_id: string
          compliance_status: string
          contact_id: string
          conversation_id: string
          deal_id: string
          demo_access_id: string
          direction: string
          founder_review_required: boolean
          interaction_type: string
          invoice_id: string
          metadata: Json
          next_step: string
          occurred_at: string
          payment_id: string
          proposal_id: string
          risk_flags: Json
          source_channel: string
          source_id: string
          source_system: string
          source_table: string
          status: string
          subject: string
          summary: string
          timeline_id: string
        }[]
      }
      get_crm_interaction_ledger_summary: {
        Args: { p_business_id?: string }
        Returns: Json
      }
      get_crm_relationship_timeline: {
        Args: { p_business_contact_relationship_id: string; p_limit?: number }
        Returns: Json
      }
      get_inbox_credentials_for_send: {
        Args: { _enc_key: string; _inbox_id: string }
        Returns: Json
      }
      get_inbox_imap_credentials: {
        Args: { _enc_key: string; _inbox_id: string }
        Returns: Json
      }
      get_outbound_status: { Args: never; Returns: Json }
      get_outreach_send_cron_status: { Args: never; Returns: Json }
      get_proposal_by_token: {
        Args: { _token: string }
        Returns: {
          accept_token: string
          accepted_at: string | null
          architecture_components: Json
          business_name: string
          business_problem: string
          contact_id: string
          created_at: string
          deal_id: string | null
          estimated_annual_savings: string
          estimated_cost_breakdown: Json
          estimated_cost_range: string
          estimated_productivity_gain: string
          estimated_roi_period: string
          estimated_roi_summary: string
          estimated_scope: string
          estimated_timeline: string
          follow_up_completed_at: string | null
          follow_up_due_at: string | null
          id: string
          include_demo: boolean
          industry: string
          processes_to_automate: string[]
          project_scale: string
          project_types: string[]
          proposal_quality_score: number
          proposal_score: number
          quality_flags: Json
          rejected_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["internal_proposal_status"]
          suggested_solution: string
          timeline: string
          title: string
          updated_at: string
          version: number
          view_token: string
          viewed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "internal_proposals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_system_mode: { Args: never; Returns: string }
      has_live_ready_inbox: {
        Args: { _business_name: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inbox_is_live_ready: { Args: { _inbox_id: string }; Returns: boolean }
      inbox_set_provider_blocked: {
        Args: { _blocked_until: string; _inbox_id: string; _reason: string }
        Returns: undefined
      }
      inbox_warmup_limit: { Args: { _inbox_id: string }; Returns: number }
      is_agent_live_setting_enabled: {
        Args: { _setting_key: string }
        Returns: boolean
      }
      is_feature_enabled: {
        Args: { _business_name?: string; _feature_name: string }
        Returns: boolean
      }
      is_internal_email: { Args: { _email: string }; Returns: boolean }
      is_internal_identity: { Args: { _email: string }; Returns: boolean }
      list_inbox_credentials_public: {
        Args: { _inbox_id: string }
        Returns: {
          imap_host: string
          imap_password_is_set: boolean
          imap_password_set_at: string
          imap_port: number
          imap_ssl: boolean
          imap_username: string
          inbox_id: string
          password_is_set: boolean
          password_set_at: string
          provider_type: string
          smtp_encryption: string
          smtp_host: string
          smtp_port: number
          smtp_username: string
        }[]
      }
      log_activity: {
        Args: {
          _business_name?: string
          _description: string
          _entity_id?: string
          _entity_type?: string
          _event_type: string
        }
        Returns: string
      }
      log_compliance_event: {
        Args: {
          _business_name: string
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["compliance_entity_type"]
          _flag_type: string
          _jurisdiction: string
          _message: string
          _metadata?: Json
          _rule_name: string
        }
        Returns: string
      }
      log_demo_event: {
        Args: { _event_type: string; _metadata?: Json; _token: string }
        Returns: Json
      }
      log_feature_skip: {
        Args: {
          _business_name: string
          _entity_id?: string
          _entity_type?: string
          _feature_name: string
        }
        Returns: undefined
      }
      log_system_event: {
        Args: {
          _business_name: string
          _entity_id: string
          _entity_type: string
          _event_type: string
          _message: string
          _metadata?: Json
          _severity: Database["public"]["Enums"]["system_event_severity"]
        }
        Returns: string
      }
      mark_contact_for_founder_review: {
        Args: { _contact_id: string; _note?: string }
        Returns: string
      }
      mark_send_failure: {
        Args: { _error: string; _queue_id: string }
        Returns: Json
      }
      next_valid_send_time: {
        Args: { _contact_id: string; _from?: string }
        Returns: string
      }
      pick_inbox_for_business: {
        Args: { _business_name: string }
        Returns: string
      }
      pick_supplier_for_deal: { Args: { _deal_id: string }; Returns: string }
      priority_level_from_score: {
        Args: { _s: number }
        Returns: Database["public"]["Enums"]["priority_level"]
      }
      priority_score_assignment: {
        Args: { _assignment_id: string }
        Returns: undefined
      }
      priority_score_contact: {
        Args: { _contact_id: string }
        Returns: undefined
      }
      priority_score_conversation: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      priority_score_deal: { Args: { _deal_id: string }; Returns: undefined }
      priority_score_invoice: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      process_retry_queue: { Args: never; Returns: Json }
      proposals_needing_followup: {
        Args: never
        Returns: {
          accept_token: string
          accepted_at: string | null
          architecture_components: Json
          business_name: string
          business_problem: string
          contact_id: string
          created_at: string
          deal_id: string | null
          estimated_annual_savings: string
          estimated_cost_breakdown: Json
          estimated_cost_range: string
          estimated_productivity_gain: string
          estimated_roi_period: string
          estimated_roi_summary: string
          estimated_scope: string
          estimated_timeline: string
          follow_up_completed_at: string | null
          follow_up_due_at: string | null
          id: string
          include_demo: boolean
          industry: string
          processes_to_automate: string[]
          project_scale: string
          project_types: string[]
          proposal_quality_score: number
          proposal_score: number
          quality_flags: Json
          rejected_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["internal_proposal_status"]
          suggested_solution: string
          timeline: string
          title: string
          updated_at: string
          version: number
          view_token: string
          viewed_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "internal_proposals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      rebuild_full_manual: { Args: never; Returns: Json }
      recalculate_priority: {
        Args: {
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["priority_entity_type"]
        }
        Returns: undefined
      }
      recompute_all_inbox_performance: { Args: never; Returns: number }
      recompute_all_intent_scores: { Args: never; Returns: number }
      recompute_all_supplier_scores: { Args: never; Returns: number }
      recompute_business_risk_score: {
        Args: { _business_name: string }
        Returns: number
      }
      recompute_campaign_metrics: {
        Args: { _campaign_id: string }
        Returns: undefined
      }
      recompute_compliance_score: {
        Args: {
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["compliance_entity_type"]
        }
        Returns: number
      }
      recompute_domain_reputation: {
        Args: { _domain_name: string }
        Returns: undefined
      }
      recompute_inbox_performance: {
        Args: { _inbox_id: string }
        Returns: undefined
      }
      recompute_proposal_score: {
        Args: { _proposal_id: string }
        Returns: number
      }
      recompute_supplier_load: {
        Args: { _supplier_id: string }
        Returns: undefined
      }
      recompute_supplier_score: {
        Args: { _supplier_id: string }
        Returns: number
      }
      record_inbound_poll: {
        Args: {
          _error: string
          _inbox_id: string
          _new_messages: number
          _ok: boolean
        }
        Returns: undefined
      }
      record_inbox_test_send: {
        Args: {
          _error: string
          _inbox_id: string
          _success: boolean
          _to: string
        }
        Returns: undefined
      }
      record_system_change: {
        Args: {
          _change_type: string
          _entity_id: string
          _entity_key: string
          _entity_type: string
          _manual_version?: number
          _summary: string
        }
        Returns: string
      }
      refresh_all_assignment_sla: { Args: never; Returns: number }
      refresh_all_business_risk_scores: { Args: never; Returns: number }
      reset_inbox_hourly_counts: { Args: never; Returns: number }
      reset_inbox_send_counts: { Args: never; Returns: number }
      resolve_contact_by_email: { Args: { _email: string }; Returns: string }
      resolve_contact_timezone: {
        Args: { _contact_id: string }
        Returns: string
      }
      resolve_entity_country: {
        Args: { _business?: string; _contact_id: string }
        Returns: string
      }
      run_compliance_checks: {
        Args: {
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["compliance_entity_type"]
        }
        Returns: undefined
      }
      run_domain_protection_check: { Args: never; Returns: Json }
      save_inbox_credentials: {
        Args: {
          _enc_key: string
          _from_email: string
          _from_name: string
          _inbox_id: string
          _provider_type: string
          _reply_to_email: string
          _smtp_encryption: string
          _smtp_host: string
          _smtp_password: string
          _smtp_port: number
          _smtp_username: string
        }
        Returns: Json
      }
      save_inbox_inbound_config: {
        Args: {
          _enc_key: string
          _imap_host: string
          _imap_password: string
          _imap_port: number
          _imap_ssl: boolean
          _imap_username: string
          _inbound_provider: string
          _inbox_id: string
          _monitored_mailbox: string
          _polling_enabled: boolean
          _reuse_smtp_password: boolean
        }
        Returns: Json
      }
      score_contact: {
        Args: { _business_name?: string; _contact_id: string }
        Returns: {
          contact_id: string
          created_at: string
          id: string
          reason: string
          score: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lead_scores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      score_proposal_quality: { Args: { _proposal_id: string }; Returns: Json }
      set_system_mode: { Args: { _mode: string }; Returns: string }
      severity_weight: {
        Args: { _s: Database["public"]["Enums"]["compliance_severity"] }
        Returns: number
      }
      suggest_replacement_supplier: {
        Args: { _assignment_id: string }
        Returns: {
          active_assignment_count: number
          approved_at: string | null
          business_name: string
          company: string
          created_at: string
          email: string
          id: string
          last_activity_at: string | null
          max_concurrent_assignments: number
          name: string
          notes: string
          rejected_at: string | null
          role: string
          skills: string[]
          source: string
          status: Database["public"]["Enums"]["supplier_status"]
          supplier_score: number
          tags: string[]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "suppliers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      supplier_list_assignments: {
        Args: { _token: string }
        Returns: {
          assigned_at: string
          business_name: string
          completed_at: string
          contact_company: string
          contact_email: string
          contact_name: string
          deal_id: string
          deal_name: string
          id: string
          notes: string
          share_contact_details: boolean
          started_at: string
          status: Database["public"]["Enums"]["assignment_status"]
          supplier_note: string
        }[]
      }
      supplier_login_with_token: { Args: { _token: string }; Returns: Json }
      supplier_portal_stats: { Args: never; Returns: Json }
      supplier_update_assignment_status: {
        Args: {
          _assignment_id: string
          _new_status: string
          _note?: string
          _token: string
        }
        Returns: Json
      }
      upsert_contact: {
        Args: {
          _assigned_business?: string
          _assigned_inbox_id?: string
          _company?: string
          _email: string
          _name?: string
          _role?: string
          _source?: string
        }
        Returns: {
          active_campaign_id: string | null
          apollo_enrichment_status: Database["public"]["Enums"]["apollo_enrichment_status"]
          apollo_last_enriched_at: string | null
          apollo_organization_id: string | null
          apollo_person_id: string | null
          archive_reason: string | null
          archived_at: string | null
          assigned_business: string
          assigned_inbox_id: string | null
          company: string
          company_size: Database["public"]["Enums"]["company_size_tier"] | null
          compliance_status: string
          conversation_active: boolean
          country: string | null
          created_at: string
          data_source: string | null
          do_not_contact_at: string | null
          do_not_contact_reason: string | null
          email: string
          email_verified_status: string
          enriched_at: string | null
          first_imported_business: string | null
          first_imported_campaign: string | null
          first_name: string | null
          founder_review_note: string
          founder_review_requested_at: string | null
          global_suppression_at: string | null
          global_suppression_reason: string | null
          hard_bounced: boolean
          id: string
          industry: string | null
          intent_score: number
          is_globally_suppressed: boolean
          is_internal: boolean
          last_compliance_review_at: string | null
          last_contacted_at: string | null
          last_name: string | null
          last_replied_at: string | null
          lawful_basis: string | null
          lawful_basis_notes: string | null
          lawful_basis_recorded_at: string | null
          linkedin_url: string | null
          name: string
          notes: string
          phone: string | null
          retention_policy: string | null
          retention_until: string | null
          role: string
          sendable_status: Database["public"]["Enums"]["contact_sendable_status"]
          seniority: Database["public"]["Enums"]["seniority_level"] | null
          source: string
          source_collected_at: string | null
          source_platform: string | null
          source_record_id: string | null
          status: Database["public"]["Enums"]["contact_status"]
          tags: string[]
          timezone: string | null
          timezone_confidence: Database["public"]["Enums"]["timezone_confidence_level"]
          unsubscribe_source: string | null
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contacts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_campaign_activation: {
        Args: { _campaign_id: string }
        Returns: Json
      }
      validate_full_system_coverage: { Args: never; Returns: Json }
      validate_go_live_readiness: { Args: never; Returns: Json }
      validate_inbox_mapping: { Args: { _inbox_id: string }; Returns: Json }
      validate_runtime_vs_documentation: { Args: never; Returns: Json }
      validate_system_integrity: { Args: never; Returns: Json }
    }
    Enums: {
      ai_action_status: "success" | "failed"
      ai_action_type: "classify" | "reply" | "escalate"
      ai_draft_status:
        | "pending"
        | "approved"
        | "rejected"
        | "sent"
        | "superseded"
      ai_quality_flag: "pass" | "fail" | "regenerated"
      ai_reply_mode:
        | "disabled"
        | "draft_only"
        | "approval_required"
        | "auto_send"
      apollo_enrichment_status:
        | "pending"
        | "attempted"
        | "succeeded"
        | "failed"
        | "no_email"
        | "skipped"
      apollo_lead_status:
        | "found"
        | "has_email"
        | "enrichment_pending"
        | "enriched"
        | "imported"
        | "skipped_no_email"
        | "duplicate"
        | "suppressed"
        | "error"
        | "not_qualified"
        | "maybe"
        | "qualified"
      apollo_run_status:
        | "pending"
        | "search_running"
        | "awaiting_enrichment_approval"
        | "enriching"
        | "importing"
        | "completed"
        | "failed"
        | "cancelled"
      apollo_segment_mode: "saved_list" | "people_search"
      app_role: "admin" | "founder" | "client" | "partner"
      assignment_sla_status: "on_track" | "at_risk" | "overdue" | "n_a"
      assignment_status: "assigned" | "in_progress" | "completed" | "failed"
      bcr_qualification:
        | "qualified"
        | "maybe"
        | "not_qualified"
        | "needs_review"
      bcr_stage:
        | "ready_to_stage"
        | "staged"
        | "contacted"
        | "engaged"
        | "client"
        | "do_not_contact"
        | "archived"
      communication_channel: "email" | "whatsapp" | "linkedin"
      communication_direction: "outbound" | "inbound"
      company_size_tier: "small" | "medium" | "large"
      compliance_category:
        | "outreach"
        | "data_privacy"
        | "contracts"
        | "delivery"
        | "payments"
      compliance_enforcement: "log_only" | "warn" | "block"
      compliance_entity_type:
        | "contact"
        | "campaign"
        | "message"
        | "proposal"
        | "demo"
        | "deal"
        | "assignment"
        | "supplier"
        | "invoice"
        | "payment"
      compliance_severity: "low" | "medium" | "high" | "critical"
      contact_sendable_status:
        | "sendable"
        | "not_sendable"
        | "needs_review"
        | "suppressed"
        | "duplicate"
        | "enrichment_failed"
        | "no_email"
      contact_status:
        | "NEW"
        | "CONTACTED"
        | "ENGAGED"
        | "QUALIFIED"
        | "CLIENT"
        | "SUPPLIER"
        | "DO_NOT_CONTACT"
        | "INTERNAL"
      conversation_status: "OPEN" | "QUALIFIED" | "CLOSED"
      deal_status: "NEW" | "QUALIFIED" | "PROPOSAL_SENT" | "WON" | "LOST"
      demo_access_status: "active" | "expired" | "revoked"
      demo_event_type:
        | "view"
        | "login"
        | "feature_used"
        | "session_start"
        | "session_end"
      email_event_type:
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "replied"
        | "bounced"
      email_queue_status:
        | "pending"
        | "sent"
        | "failed"
        | "blocked"
        | "delayed"
        | "throttled"
        | "cancelled"
      inbound_provider_type: "none" | "ionos_imap"
      inbound_status_type:
        | "not_configured"
        | "forwarding_required"
        | "configured_not_tested"
        | "inbound_test_passed"
        | "live_ready"
        | "error"
      inbox_live_readiness:
        | "simulated_only"
        | "not_configured"
        | "configured_not_tested"
        | "test_failed"
        | "test_passed"
        | "live_ready"
        | "paused"
        | "error"
      inbox_provider_type: "simulated" | "ionos_smtp"
      inbox_warmup_status: "new" | "warming" | "active"
      internal_proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
      invoice_status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "PARTIALLY_PAID"
      lead_campaign_fit:
        | "dj"
        | "playlist_curator"
        | "music_blog"
        | "radio"
        | "event_promoter"
        | "creator_influencer"
        | "poor_fit"
      lead_quality_status:
        | "raw"
        | "reviewed"
        | "qualified"
        | "needs_verification"
        | "needs_founder_review"
        | "promoted_to_contact"
        | "rejected"
        | "suppressed"
        | "bounced"
        | "already_contacted"
      lead_validation_status: "valid" | "invalid" | "duplicate"
      lead_verification_status:
        | "unknown"
        | "valid"
        | "risky"
        | "invalid"
        | "catch_all"
      outreach_campaign_status: "active" | "paused"
      payment_event_type:
        | "reminder_sent"
        | "escalation_sent"
        | "critical_flagged"
        | "payment_received"
      payment_method: "bank" | "stripe" | "cash" | "other"
      priority_entity_type:
        | "contact"
        | "conversation"
        | "deal"
        | "assignment"
        | "invoice"
      priority_level: "low" | "medium" | "high" | "critical"
      reputation_event_type:
        | "bounce"
        | "spam"
        | "reply"
        | "open"
        | "sent"
        | "delivered"
      retry_action_type: "send_email" | "ai_reply" | "assignment_retry"
      retry_status: "pending" | "completed" | "failed"
      seniority_level: "junior" | "manager" | "director" | "c-level"
      supplier_availability_status: "available" | "busy" | "unavailable"
      supplier_pipeline_stage:
        | "sourced"
        | "contacted"
        | "responded"
        | "evaluated"
        | "approved"
        | "rejected"
      supplier_status:
        | "NEW"
        | "CONTACTED"
        | "QUALIFIED"
        | "APPROVED"
        | "REJECTED"
        | "INACTIVE"
      system_event_severity: "low" | "medium" | "high" | "critical"
      system_task_status: "pending" | "in_progress" | "completed" | "dismissed"
      system_task_type: "follow_up" | "review" | "escalate"
      timezone_confidence_level: "high" | "medium" | "low"
      warmup_stage: "new" | "warming" | "stable"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_action_status: ["success", "failed"],
      ai_action_type: ["classify", "reply", "escalate"],
      ai_draft_status: [
        "pending",
        "approved",
        "rejected",
        "sent",
        "superseded",
      ],
      ai_quality_flag: ["pass", "fail", "regenerated"],
      ai_reply_mode: [
        "disabled",
        "draft_only",
        "approval_required",
        "auto_send",
      ],
      apollo_enrichment_status: [
        "pending",
        "attempted",
        "succeeded",
        "failed",
        "no_email",
        "skipped",
      ],
      apollo_lead_status: [
        "found",
        "has_email",
        "enrichment_pending",
        "enriched",
        "imported",
        "skipped_no_email",
        "duplicate",
        "suppressed",
        "error",
        "not_qualified",
        "maybe",
        "qualified",
      ],
      apollo_run_status: [
        "pending",
        "search_running",
        "awaiting_enrichment_approval",
        "enriching",
        "importing",
        "completed",
        "failed",
        "cancelled",
      ],
      apollo_segment_mode: ["saved_list", "people_search"],
      app_role: ["admin", "founder", "client", "partner"],
      assignment_sla_status: ["on_track", "at_risk", "overdue", "n_a"],
      assignment_status: ["assigned", "in_progress", "completed", "failed"],
      bcr_qualification: [
        "qualified",
        "maybe",
        "not_qualified",
        "needs_review",
      ],
      bcr_stage: [
        "ready_to_stage",
        "staged",
        "contacted",
        "engaged",
        "client",
        "do_not_contact",
        "archived",
      ],
      communication_channel: ["email", "whatsapp", "linkedin"],
      communication_direction: ["outbound", "inbound"],
      company_size_tier: ["small", "medium", "large"],
      compliance_category: [
        "outreach",
        "data_privacy",
        "contracts",
        "delivery",
        "payments",
      ],
      compliance_enforcement: ["log_only", "warn", "block"],
      compliance_entity_type: [
        "contact",
        "campaign",
        "message",
        "proposal",
        "demo",
        "deal",
        "assignment",
        "supplier",
        "invoice",
        "payment",
      ],
      compliance_severity: ["low", "medium", "high", "critical"],
      contact_sendable_status: [
        "sendable",
        "not_sendable",
        "needs_review",
        "suppressed",
        "duplicate",
        "enrichment_failed",
        "no_email",
      ],
      contact_status: [
        "NEW",
        "CONTACTED",
        "ENGAGED",
        "QUALIFIED",
        "CLIENT",
        "SUPPLIER",
        "DO_NOT_CONTACT",
        "INTERNAL",
      ],
      conversation_status: ["OPEN", "QUALIFIED", "CLOSED"],
      deal_status: ["NEW", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"],
      demo_access_status: ["active", "expired", "revoked"],
      demo_event_type: [
        "view",
        "login",
        "feature_used",
        "session_start",
        "session_end",
      ],
      email_event_type: [
        "sent",
        "delivered",
        "opened",
        "clicked",
        "replied",
        "bounced",
      ],
      email_queue_status: [
        "pending",
        "sent",
        "failed",
        "blocked",
        "delayed",
        "throttled",
        "cancelled",
      ],
      inbound_provider_type: ["none", "ionos_imap"],
      inbound_status_type: [
        "not_configured",
        "forwarding_required",
        "configured_not_tested",
        "inbound_test_passed",
        "live_ready",
        "error",
      ],
      inbox_live_readiness: [
        "simulated_only",
        "not_configured",
        "configured_not_tested",
        "test_failed",
        "test_passed",
        "live_ready",
        "paused",
        "error",
      ],
      inbox_provider_type: ["simulated", "ionos_smtp"],
      inbox_warmup_status: ["new", "warming", "active"],
      internal_proposal_status: [
        "draft",
        "sent",
        "viewed",
        "accepted",
        "rejected",
        "expired",
      ],
      invoice_status: ["DRAFT", "SENT", "PAID", "OVERDUE", "PARTIALLY_PAID"],
      lead_campaign_fit: [
        "dj",
        "playlist_curator",
        "music_blog",
        "radio",
        "event_promoter",
        "creator_influencer",
        "poor_fit",
      ],
      lead_quality_status: [
        "raw",
        "reviewed",
        "qualified",
        "needs_verification",
        "needs_founder_review",
        "promoted_to_contact",
        "rejected",
        "suppressed",
        "bounced",
        "already_contacted",
      ],
      lead_validation_status: ["valid", "invalid", "duplicate"],
      lead_verification_status: [
        "unknown",
        "valid",
        "risky",
        "invalid",
        "catch_all",
      ],
      outreach_campaign_status: ["active", "paused"],
      payment_event_type: [
        "reminder_sent",
        "escalation_sent",
        "critical_flagged",
        "payment_received",
      ],
      payment_method: ["bank", "stripe", "cash", "other"],
      priority_entity_type: [
        "contact",
        "conversation",
        "deal",
        "assignment",
        "invoice",
      ],
      priority_level: ["low", "medium", "high", "critical"],
      reputation_event_type: [
        "bounce",
        "spam",
        "reply",
        "open",
        "sent",
        "delivered",
      ],
      retry_action_type: ["send_email", "ai_reply", "assignment_retry"],
      retry_status: ["pending", "completed", "failed"],
      seniority_level: ["junior", "manager", "director", "c-level"],
      supplier_availability_status: ["available", "busy", "unavailable"],
      supplier_pipeline_stage: [
        "sourced",
        "contacted",
        "responded",
        "evaluated",
        "approved",
        "rejected",
      ],
      supplier_status: [
        "NEW",
        "CONTACTED",
        "QUALIFIED",
        "APPROVED",
        "REJECTED",
        "INACTIVE",
      ],
      system_event_severity: ["low", "medium", "high", "critical"],
      system_task_status: ["pending", "in_progress", "completed", "dismissed"],
      system_task_type: ["follow_up", "review", "escalate"],
      timezone_confidence_level: ["high", "medium", "low"],
      warmup_stage: ["new", "warming", "stable"],
    },
  },
} as const
