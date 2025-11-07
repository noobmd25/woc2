"use client";

import { useCallback, useState } from "react";

export type Profile = {
	id: string;
	email: string | null;
	full_name: string | null;
	department: string | null;
	provider_type: string | null;
	phone: string | null;
	year_of_training: string | null;
	role: "viewer" | "scheduler" | "admin" | null;
	status: "pending" | "approved" | "denied" | "revoked" | null;
	denial_reason?: string | null;
	created_at: string;
	updated_at: string;
};

export function useProfiles() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchProfiles = useCallback(
		async (params?: {
			id?: string;
			email?: string;
			status?: "pending" | "approved" | "denied" | "revoked";
		}) => {
			setLoading(true);
			setError(null);

			try {
				const searchParams = new URLSearchParams();
				if (params?.id) searchParams.set("id", params.id);
				if (params?.email) searchParams.set("email", params.email);
				if (params?.status) searchParams.set("status", params.status);

				const response = await fetch(
					`/api/profiles?${searchParams.toString()}`,
					{
						credentials: "include",
					}
				);

				if (!response.ok) {
					throw new Error(`Failed to fetch profiles: ${response.status}`);
				}

				const data = await response.json();
				return data.data as Profile[];
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				setError(errorMessage);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	const updateProfile = useCallback(
		async (
			id: string,
			updates: Partial<Omit<Profile, "id" | "created_at">>
		) => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetch("/api/profiles", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ id, ...updates }),
				});

				if (!response.ok) {
					throw new Error(`Failed to update profile: ${response.status}`);
				}

				const data = await response.json();
				return data.data as Profile;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				setError(errorMessage);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	const createProfile = useCallback(
		async (profile: Omit<Profile, "id" | "created_at" | "updated_at">) => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetch("/api/profiles", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify(profile),
				});

				if (!response.ok) {
					throw new Error(`Failed to create profile: ${response.status}`);
				}

				const data = await response.json();
				return data.data as Profile;
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				setError(errorMessage);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	const deleteProfile = useCallback(async (id: string) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/profiles?id=${id}`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error(`Failed to delete profile: ${response.status}`);
			}

			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			setError(errorMessage);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const denyUser = useCallback(async (userId: string, reason?: string) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/admin/deny-user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ userId, reason }),
			});

			if (!response.ok) {
				throw new Error(`Failed to deny user: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			setError(errorMessage);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const approveUser = useCallback(async (userId: string) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/admin/approve-user", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ userId }),
			});

			if (!response.ok) {
				throw new Error(`Failed to approve user: ${response.status}`);
			}

			const data = await response.json();
			return data;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			setError(errorMessage);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	return {
		loading,
		error,
		fetchProfiles,
		updateProfile,
		createProfile,
		deleteProfile,
		denyUser,
		approveUser,
	};
}
