"use client";

import { getBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface SignupData {
    full_name: string;
    email: string;
    phone: string;
    position: "Resident" | "Attending";
    specialty_attending?: string;
    specialty_resident?: string;
    pgy_year?: string;
    password: string;
}

interface LoginData {
    email: string;
    password: string;
}

export const useAuthActions = () => {
    const [isLoading, setIsLoading] = useState(false);

    const login = async (data: LoginData) => {
        setIsLoading(true);
        try {

            // Check if user has approved role request
            const email = data.email;
            if (!email) {
                throw new Error("Authentication failed - no email provided");
            }
            // Check role request status using the API route
            const roleRequestRes = await fetch(`/api/role-requests?email=${email}&status=approved`);
            if (!roleRequestRes.ok) {
                throw new Error("Failed to verify account status");
            }

            const roleRequestData = await roleRequestRes.json();
            if (!roleRequestData.data || roleRequestData.data.length === 0) {
                toast.warning("Your account is pending approval. Please contact an administrator.");
                return { success: false, error: "Account pending approval" };
            }

            // Authenticate with Supabase
            const supabase = getBrowserClient();
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password: data.password,
            });

            if (error) {
                console.error("Login error:", error);
                throw new Error(error.message);
            }

            toast.success("Signed in successfully");
            return { success: true };
        } catch (error: any) {
            toast.error(error.message || "Login failed");
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (data: SignupData) => {
        setIsLoading(true);
        try {
            const { specialty_attending, specialty_resident } = data;

            // Determine department based on position
            let department = "";
            let year_of_training = "";
            if (data.position === "Attending") {
                department = specialty_attending || "";
            } else if (data.position === "Resident") {
                department = specialty_resident || "";
                year_of_training = `PGY-${data.pgy_year}`;
            }

            const payload = {
                email: data.email,
                password: data.password,
                full_name: data.full_name,
                department,
                provider_type: data.position,
                phone: data.phone,
                year_of_training,
            };

            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error("Signup API error:", result);
                throw new Error(result.error || "Signup failed");
            }

            toast.success("Account created. Check your email to confirm.");
            return { success: true };
        } catch (error: any) {
            toast.error(error.message || "Signup failed");
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        signup,
        login,
        isLoading,
    };
};