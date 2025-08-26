// src/types/database.ts
// Minimal Database type for Supabase. Extend with generated types if available.
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: 'viewer' | 'scheduler' | 'admin' | null;
          status: 'pending' | 'approved' | 'denied' | 'revoked' | null;
          provider_type: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id?: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      role_requests: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          provider_type: string | null;
          requested_role: 'viewer' | 'scheduler' | 'admin';
          justification: string | null;
          metadata: Json | null;
          status: 'pending' | 'approved' | 'denied' | 'withdrawn';
          decided_by: string | null;
          decided_at: string | null;
          decision_reason: string | null;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['role_requests']['Row']> & { id?: string };
        Update: Partial<Database['public']['Tables']['role_requests']['Row']>;
      };
      specialties: {
        Row: { name: string; show_oncall: boolean };
        Insert: { name: string; show_oncall?: boolean };
        Update: Partial<{ name: string; show_oncall: boolean }>;
      };
      schedules: {
        Row: {
          provider_name: string;
          on_call_date: string;
          specialty: string;
          healthcare_plan: string | null;
          show_second_phone: boolean | null;
          second_phone_pref: 'auto' | 'pa' | 'residency' | null;
        };
        Insert: Partial<Database['public']['Tables']['schedules']['Row']>;
        Update: Partial<Database['public']['Tables']['schedules']['Row']>;
      };
      directory: {
        Row: { provider_name: string; phone_number: string | null };
        Insert: { provider_name: string; phone_number?: string | null };
        Update: Partial<{ provider_name: string; phone_number: string | null }>;
      };
      mmm_medical_groups: {
        Row: { id: number; name: string; medical_group: string };
        Insert: { id?: number; name: string; medical_group: string };
        Update: Partial<{ name: string; medical_group: string }>;
      };
      vital_medical_groups: {
        Row: { id: number; vital_group_name: string; group_code: string };
        Insert: { id?: number; vital_group_name: string; group_code: string };
        Update: Partial<{ vital_group_name: string; group_code: string }>;
      };
      signup_errors: {
        Row: { id: number; email: string; error_text: string; context: Json | null; created_at: string };
        Insert: { id?: number; email: string; error_text: string; context?: Json | null };
        Update: Partial<{ email: string; error_text: string; context: Json | null }>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

export type SupabaseTables = Database['public']['Tables'];
