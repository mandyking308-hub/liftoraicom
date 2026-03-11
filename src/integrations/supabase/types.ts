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
      ai_agents: {
        Row: {
          agent_function: string
          created_at: string
          id: string
          last_activity: string | null
          name: string
          status: string
          system_id: string
          updated_at: string
        }
        Insert: {
          agent_function?: string
          created_at?: string
          id?: string
          last_activity?: string | null
          name: string
          status?: string
          system_id: string
          updated_at?: string
        }
        Update: {
          agent_function?: string
          created_at?: string
          id?: string
          last_activity?: string | null
          name?: string
          status?: string
          system_id?: string
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
      automation_workflows: {
        Row: {
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          project_id: string
          status: string
          system_name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          project_id: string
          status?: string
          system_name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
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
            foreignKeyName: "monitored_systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
