"use client";

import { useCallback, useEffect, useState } from "react";

export type User = {
	id: string;
	email: string | null;
	full_name: string | null;
	role: "viewer" | "scheduler" | "admin" | null;
	status: "pending" | "approved" | "denied" | "revoked" | null;
	created_at?: string | null;
	updated_at?: string | null;
};

export function useUsers(
	initialPage = 1,
	initialPageSize = 20,
	initialSearch = "",
	initialSortBy: "full_name" | "email" | "role" | "created_at" = "full_name",
	initialSortDir: "asc" | "desc" = "asc",
	initialStatus?: "pending" | "approved" | "denied" | "revoked",
	initialExcludeStatus?: "pending" | "approved" | "denied" | "revoked"
) {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [actingId, setActingId] = useState<string | null>(null);

	// Pagination state
	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [total, setTotal] = useState(0);

	// Search and sorting state
	const [search, setSearch] = useState(initialSearch);
	const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
	const [sortBy, setSortBy] = useState(initialSortBy);
	const [sortDir, setSortDir] = useState(initialSortDir);
	const [status, setStatus] = useState(initialStatus);
	const [excludeStatus, setExcludeStatus] = useState(initialExcludeStatus);

	// Debounce search
	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearch(search);
		}, 350);
		return () => clearTimeout(handler);
	}, [search]);

	const fetchUsers = useCallback(async () => {
		setLoading(true);
		try {
			const queryParams = new URLSearchParams({
				page: String(page),
				pageSize: String(pageSize),
				sortBy,
				sortDir,
			});
			if (debouncedSearch) queryParams.append("search", debouncedSearch);
			if (status) queryParams.append("status", status);
			if (excludeStatus) queryParams.append("excludeStatus", excludeStatus);

			const url = `/api/users?${queryParams.toString()}`;
			const response = await fetch(url, {
				cache: "no-store",
				credentials: "include",
			});

			if (!response.ok) {
				console.error("Error fetching users:", response.statusText);
				setUsers([]);
				setTotal(0);
				setError("Failed to load users");
				return;
			}

			const { rows, count } = await response.json();
			setUsers((rows ?? []) as User[]);
			setTotal(count || 0);
			setError(null);
		} catch (error) {
			console.error("Error in fetchUsers:", error);
			setError("Failed to load users");
			setUsers([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	}, [page, pageSize, debouncedSearch, sortBy, sortDir, status, excludeStatus]);

	// Automatically load users on hook initialization and when dependencies change
	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	const updateUserRole = useCallback(
		async (userId: string, role: "viewer" | "scheduler" | "admin") => {
			setActingId(userId);
			setError(null);

			try {
				const response = await fetch("/api/profiles", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ id: userId, role }),
				});

				if (!response.ok) {
					throw new Error(`Failed to update user role: ${response.status}`);
				}

				// Refresh the users list
				await fetchUsers();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to update user role";
				setError(errorMessage);
				throw err;
			} finally {
				setActingId(null);
			}
		},
		[fetchUsers]
	);

	const revokeUserAccess = useCallback(
		async (userId: string) => {
			setActingId(userId);
			setError(null);

			try {
				const response = await fetch("/api/profiles", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ id: userId, status: "revoked", role: null }),
				});

				if (!response.ok) {
					throw new Error(`Failed to revoke user access: ${response.status}`);
				}

				// Refresh the users list
				await fetchUsers();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to revoke user access";
				setError(errorMessage);
				throw err;
			} finally {
				setActingId(null);
			}
		},
		[fetchUsers]
	);

	const forcePasswordReset = useCallback(async (email: string) => {
		setActingId(email); // Using email as actingId for this operation
		setError(null);

		try {
			const res = await fetch("/api/admin/force-password-reset", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error || `Reset failed (${res.status})`);
			}

			return { success: true };
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to send reset email";
			setError(errorMessage);
			throw err;
		} finally {
			setActingId(null);
		}
	}, []);

	// Helper: toggle sorting for column
	const handleSort = useCallback(
		(col: "full_name" | "email" | "role" | "created_at") => {
			setSortBy((prevCol) => {
				if (prevCol === col) {
					// toggle direction
					setSortDir((d) => (d === "asc" ? "desc" : "asc"));
					return prevCol;
				}
				// default directions per column (created_at defaults to desc)
				setSortDir(col === "created_at" ? "desc" : "asc");
				return col;
			});
		},
		[]
	);

	// Reset search
	const clearSearch = useCallback(() => {
		setSearch("");
		setPage(1);
	}, []);

	// Refresh users
	const refreshUsers = useCallback(() => {
		fetchUsers();
	}, [fetchUsers]);

	return {
		users,
		loading,
		error,
		actingId,
		page,
		setPage,
		pageSize,
		setPageSize,
		total,
		search,
		setSearch,
		status,
		setStatus,
		sortBy,
		setSortBy,
		sortDir,
		setSortDir,
		refetch: fetchUsers,
		handleSort,
		clearSearch,
		refreshUsers,
		updateUserRole,
		revokeUserAccess,
		forcePasswordReset,
	};
}

export function usePendingUsers(
	initialPage = 1,
	initialPageSize = 20,
	initialSearch = "",
	initialSortBy: "full_name" | "email" | "role" | "created_at" = "full_name",
	initialSortDir: "asc" | "desc" = "asc"
) {
	return useUsers(
		initialPage,
		initialPageSize,
		initialSearch,
		initialSortBy,
		initialSortDir,
		"pending"
	);
}

export function useManagedUsers(
	initialPage = 1,
	initialPageSize = 20,
	initialSearch = "",
	initialSortBy: "full_name" | "email" | "role" | "created_at" = "full_name",
	initialSortDir: "asc" | "desc" = "asc"
) {
	// For managed users, we exclude pending users from the API query
	return useUsers(
		initialPage,
		initialPageSize,
		initialSearch,
		initialSortBy,
		initialSortDir,
		undefined, // status
		"pending" // excludeStatus
	);
}
