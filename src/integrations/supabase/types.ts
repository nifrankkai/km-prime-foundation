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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      commissions: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          note: string | null
          period_month: string
          status: Database["public"]["Enums"]["commission_status"]
          type: Database["public"]["Enums"]["commission_type"]
          updated_at: string
          user_id: string
          volume: number
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          id?: string
          note?: string | null
          period_month: string
          status?: Database["public"]["Enums"]["commission_status"]
          type: Database["public"]["Enums"]["commission_type"]
          updated_at?: string
          user_id: string
          volume?: number
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          note?: string | null
          period_month?: string
          status?: Database["public"]["Enums"]["commission_status"]
          type?: Database["public"]["Enums"]["commission_type"]
          updated_at?: string
          user_id?: string
          volume?: number
        }
        Relationships: []
      }
      license_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          paid_at: string
          period_end: string | null
          period_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          paid_at?: string
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          paid_at?: string
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      license_reminders: {
        Row: {
          channel: string
          created_at: string
          day_of_grace: number
          id: string
          reminder_date: string
          sent: boolean
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          day_of_grace: number
          id?: string
          reminder_date?: string
          sent?: boolean
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          day_of_grace?: number
          id?: string
          reminder_date?: string
          sent?: boolean
          user_id?: string
        }
        Relationships: []
      }
      matrix_positions: {
        Row: {
          created_at: string
          id: string
          level: number
          parent_position_id: string | null
          slot: Database["public"]["Enums"]["matrix_slot"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          parent_position_id?: string | null
          slot?: Database["public"]["Enums"]["matrix_slot"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          parent_position_id?: string | null
          slot?: Database["public"]["Enums"]["matrix_slot"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matrix_positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "matrix_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          activated_at: string | null
          created_at: string
          grace_started_at: string | null
          id: string
          license_expiry_date: string | null
          license_status: Database["public"]["Enums"]["license_status"]
          rank_key: string
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          grace_started_at?: string | null
          id: string
          license_expiry_date?: string | null
          license_status?: Database["public"]["Enums"]["license_status"]
          rank_key?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          grace_started_at?: string | null
          id?: string
          license_expiry_date?: string | null
          license_status?: Database["public"]["Enums"]["license_status"]
          rank_key?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_rank_key_fkey"
            columns: ["rank_key"]
            isOneToOne: false
            referencedRelation: "ranks"
            referencedColumns: ["key"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          referrer_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          referrer_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          referrer_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ranks: {
        Row: {
          created_at: string
          id: number
          key: string
          level: number
          name: string
          required_directs: number
          unlocked_levels: number
        }
        Insert: {
          created_at?: string
          id?: number
          key: string
          level: number
          name: string
          required_directs?: number
          unlocked_levels?: number
        }
        Update: {
          created_at?: string
          id?: number
          key?: string
          level?: number
          name?: string
          required_directs?: number
          unlocked_levels?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_member: { Args: { _user_id: string }; Returns: undefined }
      is_in_downline: {
        Args: { _position: string; _root: string }
        Returns: boolean
      }
      pay_license: { Args: { _user_id: string }; Returns: undefined }
      place_in_matrix: { Args: { _user_id: string }; Returns: string }
      process_license_grace: { Args: never; Returns: Json }
      process_matrix_commissions: { Args: never; Returns: Json }
      username_exists: { Args: { _username: string }; Returns: boolean }
    }
    Enums: {
      commission_status: "paid" | "held"
      commission_type:
        | "matrix"
        | "direct_referral"
        | "matching"
        | "product"
        | "leadership"
        | "rank"
      license_status: "active" | "inactive" | "grace_period"
      matrix_slot: "left" | "right"
      member_status: "pending" | "active" | "inactive"
      payment_kind:
        | "membership_package"
        | "license_activation"
        | "license_renewal"
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
      commission_status: ["paid", "held"],
      commission_type: [
        "matrix",
        "direct_referral",
        "matching",
        "product",
        "leadership",
        "rank",
      ],
      license_status: ["active", "inactive", "grace_period"],
      matrix_slot: ["left", "right"],
      member_status: ["pending", "active", "inactive"],
      payment_kind: [
        "membership_package",
        "license_activation",
        "license_renewal",
      ],
    },
  },
} as const
