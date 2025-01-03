export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: number
          user_id: string | null
          created_at: string | null
          nome: string
          cpf: string
          rg: string
          data_nasc: string
          celular: string
          email: string
          ano_conclusao_ensino_medio: number
          responsavel_financeiro: string | null
          foto_perfil: string | null
          tipo: string | null
          status: string | null
        }
        Insert: {
          id?: number
          user_id?: string | null
          created_at?: string | null
          nome: string
          cpf: string
          rg: string
          data_nasc: string
          celular: string
          email: string
          ano_conclusao_ensino_medio: number
          responsavel_financeiro?: string | null
          foto_perfil?: string | null
          tipo?: string | null
          status?: string | null
        }
        Update: {
          id?: number
          user_id?: string | null
          created_at?: string | null
          nome?: string
          cpf?: string
          rg?: string
          data_nasc?: string
          celular?: string
          email?: string
          ano_conclusao_ensino_medio?: number
          responsavel_financeiro?: string | null
          foto_perfil?: string | null
          tipo?: string | null
          status?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
