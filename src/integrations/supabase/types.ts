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
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          active: boolean
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at: string
          id: string
          key: string
          name: string
          payout_formula: string
          payout_frequency: Database["public"]["Enums"]["payout_frequency"]
          sort_order: number
          trigger_condition: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          id?: string
          key: string
          name: string
          payout_formula: string
          payout_frequency?: Database["public"]["Enums"]["payout_frequency"]
          sort_order?: number
          trigger_condition?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          commission_type?: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          id?: string
          key?: string
          name?: string
          payout_formula?: string
          payout_frequency?: Database["public"]["Enums"]["payout_frequency"]
          sort_order?: number
          trigger_condition?: Json
          updated_at?: string
        }
        Relationships: []
      }
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
      kyc_submissions: {
        Row: {
          address_proof_path: string | null
          created_at: string
          document_type: string
          id: string
          id_document_path: string
          rejection_reason: string | null
          reviewed_at: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_proof_path?: string | null
          created_at?: string
          document_type?: string
          id?: string
          id_document_path: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          selfie_path: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_proof_path?: string | null
          created_at?: string
          document_type?: string
          id?: string
          id_document_path?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          selfie_path?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
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
      notifications: {
        Row: {
          audience: string
          body: string
          created_at: string
          id: string
          kind: string
          read: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image: string | null
          name: string
          order_id: string
          product_id: string | null
          pv: number
          quantity: number
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          name: string
          order_id: string
          product_id?: string | null
          pv?: number
          quantity?: number
          unit_price_cents?: number
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          order_id?: string
          product_id?: string | null
          pv?: number
          quantity?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          delivered_at: string | null
          full_name: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string | null
          payment_state: Database["public"]["Enums"]["payment_state"]
          phone: string
          postal_code: string
          reference: string
          shipped_at: string | null
          shipping_cents: number
          state: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          total_pv: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          delivered_at?: string | null
          full_name?: string
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          payment_state?: Database["public"]["Enums"]["payment_state"]
          phone?: string
          postal_code?: string
          reference?: string
          shipped_at?: string | null
          shipping_cents?: number
          state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          total_pv?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          delivered_at?: string | null
          full_name?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          payment_state?: Database["public"]["Enums"]["payment_state"]
          phone?: string
          postal_code?: string
          reference?: string
          shipped_at?: string | null
          shipping_cents?: number
          state?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          total_pv?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          images: string[]
          name: string
          price_cents: number
          pv: number
          retail_price_cents: number
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          name: string
          price_cents?: number
          pv?: number
          retail_price_cents?: number
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          name?: string
          price_cents?: number
          pv?: number
          retail_price_cents?: number
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
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
      pv_totals: {
        Row: {
          created_at: string
          group_pv: number
          id: string
          period_month: string
          personal_pv: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_pv?: number
          id?: string
          period_month: string
          personal_pv?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_pv?: number
          id?: string
          period_month?: string
          personal_pv?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rank_history: {
        Row: {
          created_at: string
          from_rank: string | null
          id: string
          reason: string
          to_rank: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_rank?: string | null
          id?: string
          reason?: string
          to_rank: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_rank?: string | null
          id?: string
          reason?: string
          to_rank?: string
          user_id?: string
        }
        Relationships: []
      }
      ranks: {
        Row: {
          created_at: string
          id: number
          key: string
          leadership_qualified: boolean
          leadership_share: number
          level: number
          min_active_directs: number
          min_group_pv: number
          min_personal_pv: number
          name: string
          required_directs: number
          unlocked_levels: number
        }
        Insert: {
          created_at?: string
          id?: number
          key: string
          leadership_qualified?: boolean
          leadership_share?: number
          level: number
          min_active_directs?: number
          min_group_pv?: number
          min_personal_pv?: number
          name: string
          required_directs?: number
          unlocked_levels?: number
        }
        Update: {
          created_at?: string
          id?: number
          key?: string
          leadership_qualified?: boolean
          leadership_share?: number
          level?: number
          min_active_directs?: number
          min_group_pv?: number
          min_personal_pv?: number
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
      confirm_order_received: {
        Args: { _order_id: string }
        Returns: undefined
      }
      is_in_downline: {
        Args: { _position: string; _root: string }
        Returns: boolean
      }
      pay_license: { Args: { _user_id: string }; Returns: undefined }
      place_in_matrix: { Args: { _user_id: string }; Returns: string }
      process_leadership_bonus: { Args: never; Returns: Json }
      process_license_grace: { Args: never; Returns: Json }
      process_matrix_commissions: { Args: never; Returns: Json }
      process_monthly_cycle: { Args: never; Returns: Json }
      process_pv_totals: { Args: never; Returns: Json }
      process_rank_advancement: { Args: never; Returns: Json }
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
      kyc_status: "not_submitted" | "pending" | "approved" | "rejected"
      license_status: "active" | "inactive" | "grace_period"
      matrix_slot: "left" | "right"
      member_status: "pending" | "active" | "inactive"
      order_status:
        | "pending_payment"
        | "awaiting_approval"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_kind:
        | "membership_package"
        | "license_activation"
        | "license_renewal"
      payment_method:
        | "visa"
        | "mastercard"
        | "usdt"
        | "mobile_money"
        | "bank_transfer"
        | "manual"
      payment_state:
        | "unpaid"
        | "pending_review"
        | "paid"
        | "failed"
        | "refunded"
      payout_frequency: "weekly" | "monthly"
      product_status: "active" | "inactive"
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
      kyc_status: ["not_submitted", "pending", "approved", "rejected"],
      license_status: ["active", "inactive", "grace_period"],
      matrix_slot: ["left", "right"],
      member_status: ["pending", "active", "inactive"],
      order_status: [
        "pending_payment",
        "awaiting_approval",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_kind: [
        "membership_package",
        "license_activation",
        "license_renewal",
      ],
      payment_method: [
        "visa",
        "mastercard",
        "usdt",
        "mobile_money",
        "bank_transfer",
        "manual",
      ],
      payment_state: ["unpaid", "pending_review", "paid", "failed", "refunded"],
      payout_frequency: ["weekly", "monthly"],
      product_status: ["active", "inactive"],
    },
  },
} as const
