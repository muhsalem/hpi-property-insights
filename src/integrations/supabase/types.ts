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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          base_price: number
          buildings_count: number | null
          created_at: string
          district_id: string
          growth: number
          hood_desc: string | null
          housing_units: number | null
          id: string
          infra_rating: number | null
          issues: Json | null
          land_own: string | null
          land_psqm: number
          lat: number
          lng: number
          name: string
          nearby: Json | null
          note: string | null
          population: number | null
          safety_rating: number | null
          services_rating: number | null
          transport_rating: number | null
        }
        Insert: {
          base_price: number
          buildings_count?: number | null
          created_at?: string
          district_id: string
          growth?: number
          hood_desc?: string | null
          housing_units?: number | null
          id: string
          infra_rating?: number | null
          issues?: Json | null
          land_own?: string | null
          land_psqm?: number
          lat: number
          lng: number
          name: string
          nearby?: Json | null
          note?: string | null
          population?: number | null
          safety_rating?: number | null
          services_rating?: number | null
          transport_rating?: number | null
        }
        Update: {
          base_price?: number
          buildings_count?: number | null
          created_at?: string
          district_id?: string
          growth?: number
          hood_desc?: string | null
          housing_units?: number | null
          id?: string
          infra_rating?: number | null
          issues?: Json | null
          land_own?: string | null
          land_psqm?: number
          lat?: number
          lng?: number
          name?: string
          nearby?: Json | null
          note?: string | null
          population?: number | null
          safety_rating?: number | null
          services_rating?: number | null
          transport_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          area_sqm: number | null
          created_at: string
          district: string | null
          email: string | null
          full_name: string
          id: string
          message: string | null
          phone: string
          property_type: string
          status: string
        }
        Insert: {
          area_sqm?: number | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name: string
          id?: string
          message?: string | null
          phone: string
          property_type: string
          status?: string
        }
        Update: {
          area_sqm?: number | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          property_type?: string
          status?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          color: string | null
          created_at: string
          governorate: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          governorate?: string
          id: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          governorate?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      districts: {
        Row: {
          area_km2: number | null
          buildings_count: number | null
          census_year: number | null
          city_id: string
          city_name: string
          city_ref: string | null
          color: string | null
          created_at: string
          density: number | null
          founded_year: number | null
          growth_rate: number | null
          households: number | null
          housing_units: number | null
          id: string
          name: string
          net_migration: number | null
          population: number | null
        }
        Insert: {
          area_km2?: number | null
          buildings_count?: number | null
          census_year?: number | null
          city_id?: string
          city_name?: string
          city_ref?: string | null
          color?: string | null
          created_at?: string
          density?: number | null
          founded_year?: number | null
          growth_rate?: number | null
          households?: number | null
          housing_units?: number | null
          id: string
          name: string
          net_migration?: number | null
          population?: number | null
        }
        Update: {
          area_km2?: number | null
          buildings_count?: number | null
          census_year?: number | null
          city_id?: string
          city_name?: string
          city_ref?: string | null
          color?: string | null
          created_at?: string
          density?: number | null
          founded_year?: number | null
          growth_rate?: number | null
          households?: number | null
          housing_units?: number | null
          id?: string
          name?: string
          net_migration?: number | null
          population?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "districts_city_ref_fkey"
            columns: ["city_ref"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          license_authority: string | null
          license_no: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          license_authority?: string | null
          license_no?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          license_authority?: string | null
          license_no?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          area_id: string
          area_sqm: number
          base_price: number
          baths: number | null
          building_permit_no: string | null
          building_type: Database["public"]["Enums"]["building_type"]
          category: Database["public"]["Enums"]["property_category"]
          created_at: string
          encumbrances: Json | null
          finish: string | null
          floor: number | null
          id: string
          legal_status: string | null
          profile: Json | null
          purchase_date: string | null
          purchase_price: number | null
          reconciliation_status: string | null
          registration_office: string | null
          renovations: Json | null
          rooms: number | null
          subcategory: string | null
          title_deed_no: string | null
          type_label: string
          view: string | null
          year_built: number | null
        }
        Insert: {
          area_id: string
          area_sqm: number
          base_price: number
          baths?: number | null
          building_permit_no?: string | null
          building_type: Database["public"]["Enums"]["building_type"]
          category: Database["public"]["Enums"]["property_category"]
          created_at?: string
          encumbrances?: Json | null
          finish?: string | null
          floor?: number | null
          id: string
          legal_status?: string | null
          profile?: Json | null
          purchase_date?: string | null
          purchase_price?: number | null
          reconciliation_status?: string | null
          registration_office?: string | null
          renovations?: Json | null
          rooms?: number | null
          subcategory?: string | null
          title_deed_no?: string | null
          type_label: string
          view?: string | null
          year_built?: number | null
        }
        Update: {
          area_id?: string
          area_sqm?: number
          base_price?: number
          baths?: number | null
          building_permit_no?: string | null
          building_type?: Database["public"]["Enums"]["building_type"]
          category?: Database["public"]["Enums"]["property_category"]
          created_at?: string
          encumbrances?: Json | null
          finish?: string | null
          floor?: number | null
          id?: string
          legal_status?: string | null
          profile?: Json | null
          purchase_date?: string | null
          purchase_price?: number | null
          reconciliation_status?: string | null
          registration_office?: string | null
          renovations?: Json | null
          rooms?: number | null
          subcategory?: string | null
          title_deed_no?: string | null
          type_label?: string
          view?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          price: number
          property_id: string
          source: string | null
          txn_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          price: number
          property_id: string
          source?: string | null
          txn_date: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          price?: number
          property_id?: string
          source?: string | null
          txn_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      valuations: {
        Row: {
          adjustment_grid: Json | null
          appraiser_id: string
          confidence_interval: number | null
          cost_value: number | null
          created_at: string
          final_value: number | null
          id: string
          income_value: number | null
          notes: string | null
          profit_value: number | null
          property_id: string | null
          residual_value: number | null
          sales_value: number | null
          standard: string
          status: Database["public"]["Enums"]["valuation_status"]
          subject_snapshot: Json
          updated_at: string
          weights: Json | null
        }
        Insert: {
          adjustment_grid?: Json | null
          appraiser_id: string
          confidence_interval?: number | null
          cost_value?: number | null
          created_at?: string
          final_value?: number | null
          id?: string
          income_value?: number | null
          notes?: string | null
          profit_value?: number | null
          property_id?: string | null
          residual_value?: number | null
          sales_value?: number | null
          standard?: string
          status?: Database["public"]["Enums"]["valuation_status"]
          subject_snapshot?: Json
          updated_at?: string
          weights?: Json | null
        }
        Update: {
          adjustment_grid?: Json | null
          appraiser_id?: string
          confidence_interval?: number | null
          cost_value?: number | null
          created_at?: string
          final_value?: number | null
          id?: string
          income_value?: number | null
          notes?: string | null
          profit_value?: number | null
          property_id?: string | null
          residual_value?: number | null
          sales_value?: number | null
          standard?: string
          status?: Database["public"]["Enums"]["valuation_status"]
          subject_snapshot?: Json
          updated_at?: string
          weights?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "valuations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      app_role: "admin" | "appraiser"
      building_type: "APT" | "TWR" | "VIL" | "DPX" | "COM" | "LND" | "IND"
      property_category: "res" | "com" | "ind"
      valuation_status: "draft" | "finalized" | "submitted"
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
      app_role: ["admin", "appraiser"],
      building_type: ["APT", "TWR", "VIL", "DPX", "COM", "LND", "IND"],
      property_category: ["res", "com", "ind"],
      valuation_status: ["draft", "finalized", "submitted"],
    },
  },
} as const
