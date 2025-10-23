import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
    status: "pending" | "approved" | "denied" | "revoked" | null;
    role: "viewer" | "scheduler" | "admin" | null;
    full_name: string | null;
}

export interface AuthUser extends SupabaseUser {
    profile?: UserProfile | null; // Optional if not always present
}