"use client";

import { getBrowserClient } from "@/lib/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface SignupData {
	full_name: string;
	email: string;
	phone: string;
	position: "Resident" | "Attending" | "Non-Clinical";
	specialty_attending?: string;
	specialty_resident?: string;
	specialty_non_clinical?: string;
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
			// Check if user has approved profile status
			const email = data.email;
			if (!email) {
				throw new Error("Authentication failed - no email provided");
			}

			// Authenticate with Supabase first to get user
			const supabase = getBrowserClient();
			const { data: authData, error: authError } =
				await supabase.auth.signInWithPassword({
					email,
					password: data.password,
				});

			if (authError) {
				console.error("Login error:", authError);
				throw new Error(authError.message);
			}

			if (!authData.user) {
				throw new Error("Authentication failed");
			}

			// Check profile status
			const { data: profile, error: profileError } = await supabase
				.from("profiles")
				.select("status, denial_reason")
				.eq("id", authData.user.id)
				.single();

			if (profileError) {
				console.error("Profile fetch error:", profileError);
				throw new Error("Failed to verify account status");
			}

			if (!profile) {
				throw new Error("Profile not found");
			}

			if (profile.status === "pending") {
				toast.warning(
					"Your account is pending approval. Please contact an administrator."
				);
				return { success: false, error: "Account pending approval" };
			}

			if (profile.status === "denied") {
				const reason = profile.denial_reason
					? ` Reason: ${profile.denial_reason}`
					: "";
				toast.error(`Your account has been denied.${reason}`);
				return { success: false, error: "Account denied" };
			}

			if (profile.status === "revoked") {
				toast.error(
					"Your account has been revoked. Please contact an administrator."
				);
				return { success: false, error: "Account revoked" };
			}

			if (profile.status !== "approved") {
				toast.error("Account status unknown. Please contact an administrator.");
				return { success: false, error: "Account status unknown" };
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
			const provider_type = data.position;

			if (data.position === "Attending") {
				department = specialty_attending || "";
			} else if (data.position === "Resident") {
				department = specialty_resident || "";
				year_of_training = `PGY-${data.pgy_year}`;
			} else if (data.position === "Non-Clinical") {
				department = data.specialty_non_clinical || "Non Clinical";
			}

			const payload = {
				email: data.email,
				password: data.password,
				full_name: data.full_name,
				department,
				provider_type,
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
