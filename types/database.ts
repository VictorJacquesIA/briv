export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "adm_geral" | "compras" | "gestor_obra";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          cliente_id: string | null;
          nome: string;
          role: UserRole;
          telefone: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          cliente_id?: string | null;
          nome: string;
          role?: UserRole;
          telefone?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      user_permissions: {
        Row: {
          id: string;
          user_id: string;
          permission_key: string;
          allowed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          permission_key: string;
          allowed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["user_permissions"]["Insert"]
        >;
      };
      obra_usuarios: {
        Row: {
          id: string;
          obra_id: string;
          user_id: string;
          papel_na_obra: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          obra_id: string;
          user_id: string;
          papel_na_obra?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["obra_usuarios"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
