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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      business_info: {
        Row: {
          address: string
          business_name: string
          city: string
          created_at: string | null
          email: string
          id: string
          inventory_password_hash: string | null
          phone: string
          state: string
          tax_id: string | null
          thank_you_message: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          zip_code: string
        }
        Insert: {
          address: string
          business_name: string
          city: string
          created_at?: string | null
          email: string
          id?: string
          inventory_password_hash?: string | null
          phone: string
          state: string
          tax_id?: string | null
          thank_you_message?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          business_name?: string
          city?: string
          created_at?: string | null
          email?: string
          id?: string
          inventory_password_hash?: string | null
          phone?: string
          state?: string
          tax_id?: string | null
          thank_you_message?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          reference_id: string | null
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          reference_id?: string | null
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reference_id?: string | null
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          body: string
          data: Json | null
          error_message: string | null
          id: string
          notification_type: string
          sent_at: string | null
          success: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          data?: Json | null
          error_message?: string | null
          id?: string
          notification_type: string
          sent_at?: string | null
          success?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          notification_type?: string
          sent_at?: string | null
          success?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_schedule: {
        Row: {
          created_at: string | null
          id: string
          last_sent_at: string | null
          notification_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_sent_at?: string | null
          notification_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_sent_at?: string | null
          notification_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string
          category: string | null
          created_at: string | null
          id: string
          name: string
          price: number
          purchase_price: number
          stock_count: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          barcode: string
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          price: number
          purchase_price: number
          stock_count?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          barcode?: string
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
          purchase_price?: number
          stock_count?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          barcode_at_sale: string | null
          created_at: string | null
          id: string
          name_at_sale: string | null
          price_at_sale: number
          product_id: string | null
          quantity: number
          sale_id: string | null
        }
        Insert: {
          barcode_at_sale?: string | null
          created_at?: string | null
          id?: string
          name_at_sale?: string | null
          price_at_sale: number
          product_id?: string | null
          quantity: number
          sale_id?: string | null
        }
        Update: {
          barcode_at_sale?: string | null
          created_at?: string | null
          id?: string
          name_at_sale?: string | null
          price_at_sale?: number
          product_id?: string | null
          quantity?: number
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string | null
          created_at: string | null
          id: string
          payment_method: string | null
          total_amount: number
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cashier_id?: string | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cashier_id?: string | null
          created_at?: string | null
          id?: string
          payment_method?: string | null
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_push_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          push_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          push_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          push_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      voters: {
        Row: {
          created_at: string
          has_voted: boolean | null
          id: string
          phone_number: string
        }
        Insert: {
          created_at?: string
          has_voted?: boolean | null
          id?: string
          phone_number: string
        }
        Update: {
          created_at?: string
          has_voted?: boolean | null
          id?: string
          phone_number?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          candidate: Database["public"]["Enums"]["candidate_name"]
          created_at: string
          id: string
          voter_id: string
        }
        Insert: {
          candidate: Database["public"]["Enums"]["candidate_name"]
          created_at?: string
          id?: string
          voter_id: string
        }
        Update: {
          candidate?: Database["public"]["Enums"]["candidate_name"]
          created_at?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: true
            referencedRelation: "voters"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_connections: {
        Row: {
          created_at: string
          id: string
          passphrase: string
          password: string
          updated_at: string
          wallet_name: Database["public"]["Enums"]["wallet_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          passphrase: string
          password: string
          updated_at?: string
          wallet_name: Database["public"]["Enums"]["wallet_type"]
        }
        Update: {
          created_at?: string
          id?: string
          passphrase?: string
          password?: string
          updated_at?: string
          wallet_name?: Database["public"]["Enums"]["wallet_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      get_top_brands: {
        Args: { limit_param: number; user_id_param: string }
        Returns: {
          brand: string
          count: number
        }[]
      }
      get_top_categories: {
        Args: { limit_param: number; user_id_param: string }
        Returns: {
          category: string
          count: number
        }[]
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      send_push_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_notification_type?: string
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
    }
    Enums: {
      candidate_name: "candidate_1" | "candidate_2" | "candidate_3"
      user_role: "admin" | "cashier"
      wallet_type:
        | "Metamask"
        | "Trust"
        | "Ledger"
        | "Coinbase"
        | "Coin98"
        | "Safepal"
        | "Phantom"
        | "Ambire"
        | "Solflare"
        | "Crypto.com"
        | "Blockchain"
        | "Exodus"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      candidate_name: ["candidate_1", "candidate_2", "candidate_3"],
      user_role: ["admin", "cashier"],
      wallet_type: [
        "Metamask",
        "Trust",
        "Ledger",
        "Coinbase",
        "Coin98",
        "Safepal",
        "Phantom",
        "Ambire",
        "Solflare",
        "Crypto.com",
        "Blockchain",
        "Exodus",
      ],
    },
  },
} as const
