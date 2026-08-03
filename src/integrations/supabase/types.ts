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
      announcements: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          credited_at: string | null
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
          credited_at?: string | null
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
          credited_at?: string | null
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
      deposit_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          id: string
          method_key: string
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_path: string
          status: Database["public"]["Enums"]["deposit_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          created_at?: string
          id?: string
          method_key: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path: string
          status?: Database["public"]["Enums"]["deposit_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          id?: string
          method_key?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string
          status?: Database["public"]["Enums"]["deposit_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          action_emails_enabled: boolean
          created_at: string
          from_email: string
          from_name: string
          id: boolean
          notification_emails_enabled: boolean
          reply_to: string | null
          smtp_encryption: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_username: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action_emails_enabled?: boolean
          created_at?: string
          from_email?: string
          from_name?: string
          id?: boolean
          notification_emails_enabled?: boolean
          reply_to?: string | null
          smtp_encryption?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action_emails_enabled?: boolean
          created_at?: string
          from_email?: string
          from_name?: string
          id?: boolean
          notification_emails_enabled?: boolean
          reply_to?: string | null
          smtp_encryption?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          enabled: boolean
          id: string
          key: string
          name: string
          sort_order: number
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key: string
          name: string
          sort_order?: number
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          sort_order?: number
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_features: {
        Row: {
          caption: string | null
          created_at: string
          display_name: string
          id: string
          member_id: string | null
          photo_url: string
          rank_key: string | null
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_name: string
          id?: string
          member_id?: string | null
          photo_url: string
          rank_key?: string | null
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_name?: string
          id?: string
          member_id?: string | null
          photo_url?: string
          rank_key?: string | null
          sort_order?: number
          updated_at?: string
          visible?: boolean
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
          pin_set_at: string | null
          rank_key: string
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          withdrawal_pin_hash: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          grace_started_at?: string | null
          id: string
          license_expiry_date?: string | null
          license_status?: Database["public"]["Enums"]["license_status"]
          pin_set_at?: string | null
          rank_key?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          withdrawal_pin_hash?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          grace_started_at?: string | null
          id?: string
          license_expiry_date?: string | null
          license_status?: Database["public"]["Enums"]["license_status"]
          pin_set_at?: string | null
          rank_key?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          withdrawal_pin_hash?: string | null
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
      payment_methods: {
        Row: {
          created_at: string
          fee_percent: number
          id: string
          instructions_text: string
          is_enabled: boolean
          key: string
          method_name: string
          min_deposit_cents: number
          min_withdrawal_cents: number
          network_label: string
          receiving_address: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_percent?: number
          id?: string
          instructions_text?: string
          is_enabled?: boolean
          key: string
          method_name: string
          min_deposit_cents?: number
          min_withdrawal_cents?: number
          network_label?: string
          receiving_address?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_percent?: number
          id?: string
          instructions_text?: string
          is_enabled?: boolean
          key?: string
          method_name?: string
          min_deposit_cents?: number
          min_withdrawal_cents?: number
          network_label?: string
          receiving_address?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_reset_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: boolean
          password_hash: string | null
          password_set_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: boolean
          password_hash?: string | null
          password_set_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: boolean
          password_hash?: string | null
          password_set_at?: string | null
          updated_at?: string
          updated_by?: string | null
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
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          mobile_money_number: string | null
          phone: string | null
          referrer_id: string | null
          updated_at: string
          usdt_address: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          mobile_money_number?: string | null
          phone?: string | null
          referrer_id?: string | null
          updated_at?: string
          usdt_address?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          mobile_money_number?: string | null
          phone?: string | null
          referrer_id?: string | null
          updated_at?: string
          usdt_address?: string | null
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
      pv_period_history: {
        Row: {
          created_at: string
          group_pv: number
          id: string
          period_month: string
          personal_pv: number
          rank_key: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          group_pv?: number
          id?: string
          period_month: string
          personal_pv?: number
          rank_key?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          group_pv?: number
          id?: string
          period_month?: string
          personal_pv?: number
          rank_key?: string | null
          user_id?: string
        }
        Relationships: []
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
      pv_transactions: {
        Row: {
          created_at: string
          id: string
          level: number
          order_id: string | null
          period_month: string
          product_id: string | null
          pv_amount: number
          source_user_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          order_id?: string | null
          period_month: string
          product_id?: string | null
          pv_amount: number
          source_user_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          order_id?: string | null
          period_month?: string
          product_id?: string | null
          pv_amount?: number
          source_user_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pv_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pv_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_history: {
        Row: {
          created_at: string
          direction: string
          from_rank: string | null
          id: string
          period_month: string | null
          reason: string
          snapshot: Json
          to_rank: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          from_rank?: string | null
          id?: string
          period_month?: string | null
          reason?: string
          snapshot?: Json
          to_rank: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          from_rank?: string | null
          id?: string
          period_month?: string | null
          reason?: string
          snapshot?: Json
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
      role_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      site_branding: {
        Row: {
          favicon_url: string | null
          id: boolean
          logo_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          favicon_url?: string | null
          id?: boolean
          logo_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          favicon_url?: string | null
          id?: boolean
          logo_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: string
          created_at: string
          key: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          key: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          key?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachment_path: string | null
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_staff: boolean
          ticket_id: string
        }
        Insert: {
          attachment_path?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_staff?: boolean
          ticket_id: string
        }
        Update: {
          attachment_path?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_staff?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          id: string
          last_reply_at: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          last_reply_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: string
          last_reply_at?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          detail: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          note: string | null
          reference: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          reference?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          reference?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_cents: number
          created_at: string
          frozen: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          frozen?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          frozen?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          destination: string
          fee_cents: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          net_cents: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          created_at?: string
          destination: string
          fee_cents?: number
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          net_cents?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          destination?: string
          fee_cents?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          net_cents?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_member: { Args: { _user_id: string }; Returns: undefined }
      add_ticket_reply: {
        Args: { _attachment_path: string; _body: string; _ticket_id: string }
        Returns: undefined
      }
      admin_adjust_wallet: {
        Args: { _amount_cents: number; _note: string; _user_id: string }
        Returns: number
      }
      admin_assign_role: {
        Args: {
          _enabled: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_report_stats: { Args: never; Returns: Json }
      admin_reset_withdrawal_pin: {
        Args: { _user_id: string }
        Returns: undefined
      }
      admin_review_deposit: {
        Args: { _approve: boolean; _id: string; _note: string }
        Returns: undefined
      }
      admin_review_kyc: {
        Args: { _approve: boolean; _reason: string; _user_id: string }
        Returns: undefined
      }
      admin_review_withdrawal: {
        Args: { _approve: boolean; _id: string; _note: string }
        Returns: undefined
      }
      admin_set_commission_status: {
        Args: {
          _amount_cents: number
          _commission_id: string
          _note: string
          _status: Database["public"]["Enums"]["commission_status"]
        }
        Returns: undefined
      }
      admin_set_member_status: {
        Args: {
          _status: Database["public"]["Enums"]["member_status"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_set_order_status: {
        Args: {
          _order_id: string
          _status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      admin_set_payment_method:
        | {
            Args: { _instructions: string; _is_enabled: boolean; _key: string }
            Returns: undefined
          }
        | {
            Args: {
              _fee_percent?: number
              _instructions: string
              _is_enabled: boolean
              _key: string
              _min_deposit_cents?: number
              _min_withdrawal_cents?: number
              _network_label?: string
              _receiving_address?: string
            }
            Returns: undefined
          }
      admin_set_role_permission: {
        Args: {
          _granted: boolean
          _key: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      admin_set_stock: {
        Args: { _product_id: string; _stock_quantity: number }
        Returns: undefined
      }
      admin_set_ticket_status: {
        Args: {
          _status: Database["public"]["Enums"]["ticket_status"]
          _ticket_id: string
        }
        Returns: undefined
      }
      admin_set_user_permission: {
        Args: { _granted: boolean; _key: string; _user_id: string }
        Returns: undefined
      }
      admin_set_wallet_frozen: {
        Args: { _frozen: boolean; _user_id: string }
        Returns: undefined
      }
      admin_update_member_profile: {
        Args: {
          _avatar_url: string
          _full_name: string
          _mobile_money_number: string
          _usdt_address: string
          _user_id: string
          _username: string
        }
        Returns: undefined
      }
      admin_update_rank:
        | {
            Args: {
              _key: string
              _leadership_share: number
              _min_active_directs: number
              _min_group_pv: number
              _min_personal_pv: number
              _unlocked_levels: number
            }
            Returns: undefined
          }
        | {
            Args: {
              _key: string
              _leadership_qualified: boolean
              _leadership_share: number
              _min_active_directs: number
              _min_group_pv: number
              _min_personal_pv: number
              _unlocked_levels: number
            }
            Returns: undefined
          }
      admin_upsert_announcement: {
        Args: {
          _body: string
          _id: string
          _published: boolean
          _title: string
        }
        Returns: string
      }
      admin_upsert_gallery_feature: {
        Args: {
          _caption: string
          _display_name: string
          _id: string
          _photo_url: string
          _rank_key: string
          _visible: boolean
        }
        Returns: string
      }
      admin_upsert_product: {
        Args: {
          _category: string
          _description: string
          _id: string
          _images: string[]
          _name: string
          _price_cents: number
          _pv: number
          _retail_price_cents: number
          _slug: string
          _status: Database["public"]["Enums"]["product_status"]
          _stock_quantity: number
        }
        Returns: string
      }
      apply_order_pv: { Args: { _order_id: string }; Returns: undefined }
      archive_pv_period: { Args: { _period: string }; Returns: Json }
      confirm_order_received: {
        Args: { _order_id: string }
        Returns: undefined
      }
      create_support_ticket: {
        Args: {
          _attachment_path: string
          _category: Database["public"]["Enums"]["ticket_category"]
          _message: string
          _subject: string
        }
        Returns: string
      }
      credit_paid_commissions: { Args: never; Returns: Json }
      evaluate_rank_promotion: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: { _key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_withdrawal_pin: { Args: { _user_id: string }; Returns: boolean }
      is_in_downline: {
        Args: { _position: string; _root: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_system_event: {
        Args: {
          _action: string
          _actor: string
          _detail: string
          _metadata: Json
        }
        Returns: undefined
      }
      my_wallet_balance: { Args: never; Returns: number }
      pay_license: { Args: { _user_id: string }; Returns: undefined }
      pay_order_from_wallet: { Args: { _order_id: string }; Returns: undefined }
      place_in_matrix: { Args: { _user_id: string }; Returns: string }
      process_leadership_bonus: { Args: never; Returns: Json }
      process_license_grace: { Args: never; Returns: Json }
      process_matrix_commissions: { Args: never; Returns: Json }
      process_monthly_cycle: { Args: never; Returns: Json }
      process_pv_totals: { Args: never; Returns: Json }
      process_rank_advancement: { Args: never; Returns: Json }
      process_weekly_cycle: { Args: never; Returns: Json }
      request_withdrawal: {
        Args: {
          _amount_cents: number
          _destination: string
          _method: Database["public"]["Enums"]["payment_method"]
          _pin: string
        }
        Returns: string
      }
      reset_platform_data: { Args: { _password: string }; Returns: Json }
      set_platform_reset_enabled: {
        Args: { _enabled: boolean }
        Returns: undefined
      }
      set_platform_reset_password: {
        Args: { _password: string }
        Returns: undefined
      }
      set_withdrawal_pin: { Args: { _pin: string }; Returns: undefined }
      submit_deposit: {
        Args: {
          _amount_cents: number
          _method_key: string
          _screenshot_path: string
        }
        Returns: string
      }
      username_exists: { Args: { _username: string }; Returns: boolean }
      wallet_apply: {
        Args: {
          _actor: string
          _amount_cents: number
          _note: string
          _reference: string
          _type: Database["public"]["Enums"]["transaction_type"]
          _user_id: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "super_admin" | "manager" | "mini_admin" | "stockist"
      commission_status: "paid" | "held"
      commission_type:
        | "matrix"
        | "direct_referral"
        | "matching"
        | "product"
        | "leadership"
        | "rank"
      deposit_status: "pending" | "approved" | "rejected"
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
      ticket_category:
        | "withdrawal_pin_reset"
        | "deposit_issue"
        | "withdrawal_issue"
        | "account_issue"
        | "general_question"
        | "other"
        | "account_info_change"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      transaction_type:
        | "commission_credit"
        | "withdrawal_debit"
        | "withdrawal_refund"
        | "admin_credit"
        | "admin_debit"
        | "order_payment"
        | "license_payment"
        | "deposit_credit"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid"
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
      app_role: ["super_admin", "manager", "mini_admin", "stockist"],
      commission_status: ["paid", "held"],
      commission_type: [
        "matrix",
        "direct_referral",
        "matching",
        "product",
        "leadership",
        "rank",
      ],
      deposit_status: ["pending", "approved", "rejected"],
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
      ticket_category: [
        "withdrawal_pin_reset",
        "deposit_issue",
        "withdrawal_issue",
        "account_issue",
        "general_question",
        "other",
        "account_info_change",
      ],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      transaction_type: [
        "commission_credit",
        "withdrawal_debit",
        "withdrawal_refund",
        "admin_credit",
        "admin_debit",
        "order_payment",
        "license_payment",
        "deposit_credit",
      ],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
