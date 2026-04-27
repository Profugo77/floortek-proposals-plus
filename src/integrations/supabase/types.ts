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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      presupuesto_alternativas: {
        Row: {
          created_at: string
          id: string
          iva: number
          nombre: string
          orden: number
          presupuesto_id: string
          subtotal_mano_obra: number
          subtotal_materiales: number
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          iva?: number
          nombre?: string
          orden?: number
          presupuesto_id: string
          subtotal_mano_obra?: number
          subtotal_materiales?: number
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          iva?: number
          nombre?: string
          orden?: number
          presupuesto_id?: string
          subtotal_mano_obra?: number
          subtotal_materiales?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_alternativas_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuesto_items: {
        Row: {
          alternativa_id: string | null
          cantidad: number
          created_at: string
          descuento: number
          id: string
          precio_unitario: number
          presupuesto_id: string
          producto_imagen: string | null
          producto_nombre: string
          subtotal: number
          tipo: string
          unidad: string | null
        }
        Insert: {
          alternativa_id?: string | null
          cantidad?: number
          created_at?: string
          descuento?: number
          id?: string
          precio_unitario: number
          presupuesto_id: string
          producto_imagen?: string | null
          producto_nombre: string
          subtotal?: number
          tipo?: string
          unidad?: string | null
        }
        Update: {
          alternativa_id?: string | null
          cantidad?: number
          created_at?: string
          descuento?: number
          id?: string
          precio_unitario?: number
          presupuesto_id?: string
          producto_imagen?: string | null
          producto_nombre?: string
          subtotal?: number
          tipo?: string
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuesto_items_alternativa_id_fkey"
            columns: ["alternativa_id"]
            isOneToOne: false
            referencedRelation: "presupuesto_alternativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuesto_items_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          cliente_direccion: string
          cliente_nombre: string
          cliente_telefono: string
          comentarios: string
          created_at: string
          fecha: string
          id: string
          iva: number
          numero: number
          subtotal_mano_obra: number
          subtotal_materiales: number
          total: number
        }
        Insert: {
          cliente_direccion?: string
          cliente_nombre?: string
          cliente_telefono?: string
          comentarios?: string
          created_at?: string
          fecha?: string
          id?: string
          iva?: number
          numero: number
          subtotal_mano_obra?: number
          subtotal_materiales?: number
          total?: number
        }
        Update: {
          cliente_direccion?: string
          cliente_nombre?: string
          cliente_telefono?: string
          comentarios?: string
          created_at?: string
          fecha?: string
          id?: string
          iva?: number
          numero?: number
          subtotal_mano_obra?: number
          subtotal_materiales?: number
          total?: number
        }
        Relationships: []
      }
      productos: {
        Row: {
          categoria: string
          created_at: string
          id: string
          imagen_url: string | null
          nombre: string
          precio: number
          tipo: string
          unidad: string | null
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          imagen_url?: string | null
          nombre: string
          precio: number
          tipo?: string
          unidad?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          imagen_url?: string | null
          nombre?: string
          precio?: number
          tipo?: string
          unidad?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email?: string
          id?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_presupuesto_numero: { Args: never; Returns: number }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
