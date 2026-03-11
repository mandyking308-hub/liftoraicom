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
      proposals: {
        Row: {
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "founder" | "client" | "partner"
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
      app_role: ["admin", "founder", "client", "partner"],
    },
  },
} as const
