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
      profiles: {
        Row: {
          id: string
          status: string | null
          role: string | null
          full_name: string | null
          denial_reason: string | null
          email: string | null
        }
        Insert: {
          id?: string
          status?: string | null
          role?: string | null
          full_name?: string | null
          denial_reason?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          status?: string | null
          role?: string | null
          full_name?: string | null
          denial_reason?: string | null
          email?: string | null
        }
        Relationships: []
      }
      directory: {
        Row: {
          id: string
          provider_name: string | null
          specialty: string | null
          phone_number: string | null
        }
        Insert: {
          id?: string
          provider_name?: string | null
          specialty?: string | null
          phone_number?: string | null
        }
        Update: {
          id?: string
          provider_name?: string | null
          specialty?: string | null
          phone_number?: string | null
        }
        Relationships: []
      }
      specialties: {
        Row: {
          id: string
          name: string | null
        }
        Insert: {
          id?: string
          name?: string | null
        }
        Update: {
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      role_requests: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
        Relationships: []
      }
      signup_errors: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
        Relationships: []
      }
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
        Relationships: any[]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
