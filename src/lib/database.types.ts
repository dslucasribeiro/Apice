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
      aulas: {
        Row: {
          id: number
          titulo: string
          assunto: string
          created_at: string
          // adicione outros campos conforme necessário
        }
        Insert: {
          id?: number
          titulo: string
          assunto: string
          created_at?: string
        }
        Update: {
          id?: number
          titulo?: string
          assunto?: string
          created_at?: string
        }
      }
      avisos: {
        Row: {
          id: number
          titulo: string
          created_at: string
          // adicione outros campos conforme necessário
        }
        Insert: {
          id?: number
          titulo: string
          created_at?: string
        }
        Update: {
          id?: number
          titulo?: string
          created_at?: string
        }
      }
      comentarios: {
        Row: {
          id: number
          texto: string
          created_at: string
          // adicione outros campos conforme necessário
        }
        Insert: {
          id?: number
          texto: string
          created_at?: string
        }
        Update: {
          id?: number
          texto?: string
          created_at?: string
        }
      }
      materiais_didaticos: {
        Row: {
          id: number
          titulo: string
          tipo: string
          acessos: number
          created_at: string
          // adicione outros campos conforme necessário
        }
        Insert: {
          id?: number
          titulo: string
          tipo: string
          acessos?: number
          created_at?: string
        }
        Update: {
          id?: number
          titulo?: string
          tipo?: string
          acessos?: number
          created_at?: string
        }
      }
      simulados: {
        Row: {
          id: number
          titulo: string
          created_at: string
          // adicione outros campos conforme necessário
        }
        Insert: {
          id?: number
          titulo: string
          created_at?: string
        }
        Update: {
          id?: number
          titulo?: string
          created_at?: string
        }
      }
      topicos_duvidas: {
        Row: {
          id: number
          titulo: string
          status: string
          created_at: string
          // adicione outros campos conforme necessário
        }
        Insert: {
          id?: number
          titulo: string
          status: string
          created_at?: string
        }
        Update: {
          id?: number
          titulo?: string
          status?: string
          created_at?: string
        }
      }
      usuarios: {
        Row: {
          id: number
          tipo: string
          created_at: string
          // adicione outros campos conforme necessário
        }
        Insert: {
          id?: number
          tipo: string
          created_at?: string
        }
        Update: {
          id?: number
          tipo?: string
          created_at?: string
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
