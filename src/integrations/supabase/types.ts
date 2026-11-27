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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_name: string
          id: boolean
          notifications: boolean
        }
        Insert: {
          company_name?: string
          id?: boolean
          notifications?: boolean
        }
        Update: {
          company_name?: string
          id?: boolean
          notifications?: boolean
        }
        Relationships: []
      }
      gps_records: {
        Row: {
          accuracy: number | null
          created_at: string
          created_by: string
          id: string
          kind: string
          latitude: number
          longitude: number
          product_id: string | null
          supplier_id: string | null
          visit_id: string | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          created_by?: string
          id?: string
          kind: string
          latitude: number
          longitude: number
          product_id?: string | null
          supplier_id?: string | null
          visit_id?: string | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          latitude?: number
          longitude?: number
          product_id?: string | null
          supplier_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_records_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_records_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "sourcing_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_colors: {
        Row: {
          availability: string
          code: string | null
          id: string
          name: string
          photos: string[]
          product_id: string
          remarks: string
        }
        Insert: {
          availability?: string
          code?: string | null
          id?: string
          name: string
          photos: string[]
          product_id: string
          remarks?: string
        }
        Update: {
          availability?: string
          code?: string | null
          id?: string
          name?: string
          photos?: string[]
          product_id?: string
          remarks?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_evaluations: {
        Row: {
          favorite: boolean
          notes: string
          product_id: string
          score: number | null
          status: string
          updated_by: string
        }
        Insert: {
          favorite?: boolean
          notes?: string
          product_id: string
          score?: number | null
          status?: string
          updated_by?: string
        }
        Update: {
          favorite?: boolean
          notes?: string
          product_id?: string
          score?: number | null
          status?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_evaluations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_photos: {
        Row: {
          created_by: string
          id: string
          path: string
          product_id: string
          view: string
        }
        Insert: {
          created_by?: string
          id?: string
          path: string
          product_id: string
          view?: string
        }
        Update: {
          created_by?: string
          id?: string
          path?: string
          product_id?: string
          view?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_photos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_tiers: {
        Row: {
          id: string
          product_id: string
          quantity: number
          unavailable: boolean
          unit_price: number | null
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          unavailable?: boolean
          unit_price?: number | null
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          unavailable?: boolean
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          availability: string
          id: string
          name: string
          product_id: string
          remarks: string
        }
        Insert: {
          availability?: string
          id?: string
          name: string
          product_id: string
          remarks?: string
        }
        Update: {
          availability?: string
          id?: string
          name?: string
          product_id?: string
          remarks?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          id: string
          kind: string
          name: string
          photos: string[]
          product_id: string
        }
        Insert: {
          id?: string
          kind: string
          name: string
          photos?: string[]
          product_id: string
        }
        Update: {
          id?: string
          kind?: string
          name?: string
          photos?: string[]
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          color_mode: string
          created_at: string
          created_by: string
          description: string
          details: Json
          id: string
          latitude: number
          longitude: number
          material: string
          moq: number
          name: string
          quality: string
          size_mode: string
          status: string
          stock: number | null
          supplier_id: string
          visit_id: string | null
        }
        Insert: {
          category_id: string
          color_mode?: string
          created_at?: string
          created_by?: string
          description: string
          details?: Json
          id?: string
          latitude: number
          longitude: number
          material?: string
          moq?: number
          name: string
          quality: string
          size_mode?: string
          status?: string
          stock?: number | null
          supplier_id: string
          visit_id?: string | null
        }
        Update: {
          category_id?: string
          color_mode?: string
          created_at?: string
          created_by?: string
          description?: string
          details?: Json
          id?: string
          latitude?: number
          longitude?: number
          material?: string
          moq?: number
          name?: string
          quality?: string
          size_mode?: string
          status?: string
          stock?: number | null
          supplier_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "sourcing_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          preferences: Json
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          preferences?: Json
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          preferences?: Json
        }
        Relationships: []
      }
      sourcing_visits: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          market: string
          notes: string
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          market: string
          notes?: string
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          market?: string
          notes?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      supplier_photos: {
        Row: {
          created_at: string
          created_by: string
          id: string
          path: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          path: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          path?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_photos_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ratings: {
        Row: {
          notes: string
          rating: number
          supplier_id: string
          updated_by: string
        }
        Insert: {
          notes?: string
          rating: number
          supplier_id: string
          updated_by?: string
        }
        Update: {
          notes?: string
          rating?: number
          supplier_id?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ratings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string
          contact_person: string
          created_at: string
          created_by: string
          details: Json
          id: string
          latitude: number
          longitude: number
          market: string
          mobile: string
          name: string
          notes: string
          relationship: string
          shop_number: string
          status: string
          type: string
          visit_date: string
        }
        Insert: {
          address: string
          contact_person: string
          created_at?: string
          created_by?: string
          details?: Json
          id?: string
          latitude: number
          longitude: number
          market: string
          mobile: string
          name: string
          notes?: string
          relationship?: string
          shop_number: string
          status?: string
          type?: string
          visit_date: string
        }
        Update: {
          address?: string
          contact_person?: string
          created_at?: string
          created_by?: string
          details?: Json
          id?: string
          latitude?: number
          longitude?: number
          market?: string
          mobile?: string
          name?: string
          notes?: string
          relationship?: string
          shop_number?: string
          status?: string
          type?: string
          visit_date?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          invited_user_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_user_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          invited_user_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: []
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
      visit_suppliers: {
        Row: {
          supplier_id: string
          visit_id: string
        }
        Insert: {
          supplier_id: string
          visit_id: string
        }
        Update: {
          supplier_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_suppliers_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "sourcing_visits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_source: { Args: never; Returns: boolean }
      check_photo_paths: { Args: { paths: string[] }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_team: { Args: never; Returns: boolean }
      record_visit: { Args: { payload: Json }; Returns: string }
      submit_product: { Args: { payload: Json }; Returns: string }
      submit_supplier: { Args: { payload: Json }; Returns: string }
      workspace_stats: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "agent" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin", "admin", "agent", "viewer"],
    },
  },
} as const
