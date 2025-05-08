export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      get_top_brands: {
        Args: { user_id_param: string; limit_param: number }
        Returns: {
          brand: string
          count: number
        }[]
      }
      get_top_categories: {
        Args: { user_id_param: string; limit_param: number }
        Returns: {
          category: string
          count: number
        }[]
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
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
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
