"use client";

import { getBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";

interface UserProfile {
    status: "pending" | "approved" | "denied" | "revoked" | null;
    role: "viewer" | "scheduler" | "admin" | null;
    fullName: string | null;
}

export interface AuthUser extends User {
    profile: UserProfile | null;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({
    children,
    initialUser,
}: {
    children: ReactNode;
    initialUser: User | null;
}) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = getBrowserClient();
    const mountedRef = useRef(true);

    const fetchProfile = async (u: User) => {
        try {
            const res = await fetch(`/api/profiles?id=${u.id}`);
            const { data } = await res.json();
            return (data?.[0] as UserProfile) || null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        (async () => {
            setIsLoading(true);
            if (initialUser) {
                const profile = await fetchProfile(initialUser);
                if (mountedRef.current) setUser({ ...initialUser, profile });
            } else {
                if (mountedRef.current) setUser(null);
            }
            if (mountedRef.current) setIsLoading(false);
        })();
        return () => {
            mountedRef.current = false;
        };
    }, [initialUser]);

    useEffect(() => {
        const { data } = supabase.auth.onAuthStateChange(
            async (_event: AuthChangeEvent, session: Session | null) => {
                const sessionUser = session?.user || null;
                if (sessionUser) {
                    const profile = await fetchProfile(sessionUser);
                    if (mountedRef.current) setUser({ ...sessionUser, profile });
                } else {
                    if (mountedRef.current) setUser(null);
                }
            }
        );
        const subscription = data.subscription;

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase.auth]);

    return <AuthContext.Provider value={{ user, isLoading }}>{children}</AuthContext.Provider>;
}