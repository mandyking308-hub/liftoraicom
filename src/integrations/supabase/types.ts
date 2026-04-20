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
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
        }
        Insert: {
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
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
          classification: string
          contact_id: string
          conversation_id: string
          created_at: string
          error_message: string
          id: string
          reply_latency_seconds: number | null
          reply_preview: string
          status: Database["public"]["Enums"]["ai_action_status"]
          tokens_used: number
        }
        Insert: {
          action_type: Database["public"]["Enums"]["ai_action_type"]
          classification?: string
          contact_id: string
          conversation_id: string
          created_at?: string
          error_message?: string
          id?: string
          reply_latency_seconds?: number | null
          reply_preview?: string
          status?: Database["public"]["Enums"]["ai_action_status"]
          tokens_used?: number
        }
        Update: {
          action_type?: Database["public"]["Enums"]["ai_action_type"]
          classification?: string
          contact_id?: string
          conversation_id?: string
          created_at?: string
          error_message?: string
          id?: string
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
      communications: {
        Row: {
          ai_generated: boolean
          channel: Database["public"]["Enums"]["communication_channel"]
          contact_id: string
          created_at: string
          direction: Database["public"]["Enums"]["communication_direction"]
          id: string
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
            foreignKeyName: "communications_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
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
      contacts: {
        Row: {
          active_campaign_id: string | null
          assigned_business: string
          assigned_inbox_id: string | null
          company: string
          conversation_active: boolean
          created_at: string
          email: string
          id: string
          last_contacted_at: string | null
          last_replied_at: string | null
          name: string
          role: string
          source: string
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
        }
        Insert: {
          active_campaign_id?: string | null
          assigned_business?: string
          assigned_inbox_id?: string | null
          company?: string
          conversation_active?: boolean
          created_at?: string
          email: string
          id?: string
          last_contacted_at?: string | null
          last_replied_at?: string | null
          name?: string
          role?: string
          source?: string
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Update: {
          active_campaign_id?: string | null
          assigned_business?: string
          assigned_inbox_id?: string | null
          company?: string
          conversation_active?: boolean
          created_at?: string
          email?: string
          id?: string
          last_contacted_at?: string | null
          last_replied_at?: string | null
          name?: string
          role?: string
          source?: string
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_inbox_id_fkey"
            columns: ["assigned_inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
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
          last_ai_reply_at?: string | null
          last_intent?: string
          last_message_at?: string
          priority_boost?: number
          status?: Database["public"]["Enums"]["conversation_status"]
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
        ]
      }
      email_queue: {
        Row: {
          block_reason: string
          business_name: string
          campaign_id: string
          contact_id: string
          created_at: string
          id: string
          inbox_id: string | null
          scheduled_at: string
          sent_at: string | null
          sequence_step: number
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
          id?: string
          inbox_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          sequence_step: number
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
          id?: string
          inbox_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          sequence_step?: number
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
            foreignKeyName: "email_queue_inbox_id_fkey"
            columns: ["inbox_id"]
            isOneToOne: false
            referencedRelation: "inboxes"
            referencedColumns: ["id"]
          },
        ]
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
      inboxes: {
        Row: {
          active: boolean
          business_name: string
          created_at: string
          current_send_count: number
          daily_send_limit: number
          email_address: string
          id: string
          updated_at: string
          warmup_status: Database["public"]["Enums"]["inbox_warmup_status"]
        }
        Insert: {
          active?: boolean
          business_name?: string
          created_at?: string
          current_send_count?: number
          daily_send_limit?: number
          email_address: string
          id?: string
          updated_at?: string
          warmup_status?: Database["public"]["Enums"]["inbox_warmup_status"]
        }
        Update: {
          active?: boolean
          business_name?: string
          created_at?: string
          current_send_count?: number
          daily_send_limit?: number
          email_address?: string
          id?: string
          updated_at?: string
          warmup_status?: Database["public"]["Enums"]["inbox_warmup_status"]
        }
        Relationships: []
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
          proposal_score: number
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
          proposal_score?: number
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
          proposal_score?: number
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
            foreignKeyName: "invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
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
          business_problem: string
          company_name: string
          company_size: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
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
          business_problem: string
          company_name: string
          company_size: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
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
          business_problem?: string
          company_name?: string
          company_size?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
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
          approved_at: string | null
          business_name: string
          company: string
          created_at: string
          email: string
          id: string
          last_activity_at: string | null
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
          approved_at?: string | null
          business_name?: string
          company?: string
          created_at?: string
          email: string
          id?: string
          last_activity_at?: string | null
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
          approved_at?: string | null
          business_name?: string
          company?: string
          created_at?: string
          email?: string
          id?: string
          last_activity_at?: string | null
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
    }
    Functions: {
      accept_proposal_by_token: { Args: { _token: string }; Returns: Json }
      ai_actions_today: { Args: { _conversation_id: string }; Returns: number }
      assign_inbox_for_contact: {
        Args: { _contact_id: string }
        Returns: string
      }
      check_outreach_allowed: { Args: { _contact_id: string }; Returns: Json }
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
      eligible_suppliers_for_deal: {
        Args: { _deal_id: string }
        Returns: {
          approved_at: string | null
          business_name: string
          company: string
          created_at: string
          email: string
          id: string
          last_activity_at: string | null
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
      expire_demos: { Args: never; Returns: number }
      expire_inactive_conversations: { Args: never; Returns: number }
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
          proposal_score: number
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
          proposal_score: number
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
      recalculate_priority: {
        Args: {
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["priority_entity_type"]
        }
        Returns: undefined
      }
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
      recompute_proposal_score: {
        Args: { _proposal_id: string }
        Returns: number
      }
      recompute_supplier_score: {
        Args: { _supplier_id: string }
        Returns: number
      }
      refresh_all_assignment_sla: { Args: never; Returns: number }
      refresh_all_business_risk_scores: { Args: never; Returns: number }
      reset_inbox_send_counts: { Args: never; Returns: number }
      run_compliance_checks: {
        Args: {
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["compliance_entity_type"]
        }
        Returns: undefined
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
      severity_weight: {
        Args: { _s: Database["public"]["Enums"]["compliance_severity"] }
        Returns: number
      }
      suggest_replacement_supplier: {
        Args: { _assignment_id: string }
        Returns: {
          approved_at: string | null
          business_name: string
          company: string
          created_at: string
          email: string
          id: string
          last_activity_at: string | null
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
          assigned_business: string
          assigned_inbox_id: string | null
          company: string
          conversation_active: boolean
          created_at: string
          email: string
          id: string
          last_contacted_at: string | null
          last_replied_at: string | null
          name: string
          role: string
          source: string
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contacts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      ai_action_status: "success" | "failed"
      ai_action_type: "classify" | "reply" | "escalate"
      app_role: "admin" | "founder" | "client" | "partner"
      assignment_sla_status: "on_track" | "at_risk" | "overdue" | "n_a"
      assignment_status: "assigned" | "in_progress" | "completed" | "failed"
      communication_channel: "email" | "whatsapp" | "linkedin"
      communication_direction: "outbound" | "inbound"
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
      contact_status:
        | "NEW"
        | "CONTACTED"
        | "ENGAGED"
        | "QUALIFIED"
        | "CLIENT"
        | "SUPPLIER"
        | "DO_NOT_CONTACT"
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
      email_queue_status: "pending" | "sent" | "failed" | "blocked"
      inbox_warmup_status: "new" | "warming" | "active"
      internal_proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "accepted"
        | "rejected"
        | "expired"
      invoice_status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "PARTIALLY_PAID"
      lead_validation_status: "valid" | "invalid" | "duplicate"
      outreach_campaign_status: "active" | "paused"
      payment_event_type:
        | "reminder_sent"
        | "escalation_sent"
        | "critical_flagged"
        | "payment_received"
      payment_method: "bank" | "stripe" | "cash" | "other"
      priority_entity_type: "contact" | "conversation" | "deal" | "assignment"
      priority_level: "low" | "medium" | "high" | "critical"
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
      system_task_status: "pending" | "in_progress" | "completed" | "dismissed"
      system_task_type: "follow_up" | "review" | "escalate"
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
      app_role: ["admin", "founder", "client", "partner"],
      assignment_sla_status: ["on_track", "at_risk", "overdue", "n_a"],
      assignment_status: ["assigned", "in_progress", "completed", "failed"],
      communication_channel: ["email", "whatsapp", "linkedin"],
      communication_direction: ["outbound", "inbound"],
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
      contact_status: [
        "NEW",
        "CONTACTED",
        "ENGAGED",
        "QUALIFIED",
        "CLIENT",
        "SUPPLIER",
        "DO_NOT_CONTACT",
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
      email_queue_status: ["pending", "sent", "failed", "blocked"],
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
      lead_validation_status: ["valid", "invalid", "duplicate"],
      outreach_campaign_status: ["active", "paused"],
      payment_event_type: [
        "reminder_sent",
        "escalation_sent",
        "critical_flagged",
        "payment_received",
      ],
      payment_method: ["bank", "stripe", "cash", "other"],
      priority_entity_type: ["contact", "conversation", "deal", "assignment"],
      priority_level: ["low", "medium", "high", "critical"],
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
      system_task_status: ["pending", "in_progress", "completed", "dismissed"],
      system_task_type: ["follow_up", "review", "escalate"],
    },
  },
} as const
