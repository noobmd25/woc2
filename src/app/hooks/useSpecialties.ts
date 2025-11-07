"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { type Specialty } from "@/lib/types/specialty";

export function useSpecialties(
	initialPage = 1,
	initialPageSize = 10,
	initialSearch = "",
	initialShowOnCall?: boolean
) {
	const [specialties, setSpecialties] = useState<Specialty[]>([]);
	const [loading, setLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState<{
		[key: string]: boolean;
	}>({});
	const [page, setPage] = useState(initialPage);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState(initialSearch);
	const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

	// Debounce search
	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearch(search);
		}, 350);
		return () => clearTimeout(handler);
	}, [search]);

	const fetchSpecialties = useCallback(async () => {
		setLoading(true);
		try {
			const queryParams = new URLSearchParams({
				page: String(page),
				pageSize: String(pageSize),
			});
			if (debouncedSearch) queryParams.append("search", debouncedSearch);
			if (initialShowOnCall !== undefined)
				queryParams.append("showOncall", initialShowOnCall.toString());

			const url = `/api/specialties?${queryParams.toString()}`;
			const response = await fetch(url);

			if (!response.ok) {
				console.error(
					"Error fetching specialties:",
					response.statusText
				);
				setSpecialties([]);
				setTotal(0);
				toast.error("Failed to load specialties");
				return;
			}

			const { data, total: totalCount } = await response.json();
			setSpecialties((data as Specialty[]) || []);
			setTotal(totalCount || 0);
		} catch (error) {
			console.error("Error in fetchSpecialties:", error);
			toast.error("Failed to load specialties");
			setSpecialties([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	}, [page, pageSize, debouncedSearch, initialShowOnCall]);

	// Automatically load specialties on hook initialization and when dependencies change
	useEffect(() => {
		fetchSpecialties();
	}, [fetchSpecialties]);

	const addSpecialty = useCallback(
		async (
			name: string,
			showOnCall: boolean = true,
			hasResidency: boolean = false
		) => {
			const trimmedName = name.trim();
			if (!trimmedName) return false;

			// Check for duplicates in current list
			const duplicate = specialties.some(
				(s) => s.name.toLowerCase() === trimmedName.toLowerCase()
			);
			if (duplicate) {
				toast.error("Specialty already exists.");
				return false;
			}

			setActionLoading((prev) => ({ ...prev, add: true }));
			try {
				const response = await fetch("/api/specialties", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: trimmedName,
						showOncall: showOnCall,
						hasResidency,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json();
					console.error("Failed to add specialty:", errorData.error);
					toast.error("Failed to add specialty.");
					return false;
				}

				toast.success("Specialty added.");
				await fetchSpecialties();
				return true;
			} catch (error) {
				console.error("Error in addSpecialty:", error);
				toast.error("Failed to add specialty.");
				return false;
			} finally {
				setActionLoading((prev) => ({ ...prev, add: false }));
			}
		},
		[specialties, fetchSpecialties]
	);

	const updateSpecialty = useCallback(
		async (
			id: string,
			newName: string,
			showOncall?: boolean,
			hasResidency?: boolean
		) => {
			const trimmedName = newName.trim();
			if (!trimmedName) {
				toast.error("Name cannot be empty.");
				return false;
			}

			const duplicate = specialties.some(
				(s) =>
					s.id !== id &&
					s.name.toLowerCase() === trimmedName.toLowerCase()
			);
			if (duplicate) {
				toast.error("A specialty with this name already exists.");
				return false;
			}

			setActionLoading((prev) => ({ ...prev, [id]: true }));
			try {
				const updates: any = { id, name: trimmedName };
				if (showOncall !== undefined) {
					updates.showOncall = showOncall;
				}
				if (hasResidency !== undefined) {
					updates.hasResidency = hasResidency;
				}

				const response = await fetch("/api/specialties", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(updates),
				});

				if (!response.ok) {
					const errorData = await response.json();
					console.error(
						"Failed to update specialty:",
						errorData.error
					);
					toast.error("Failed to update specialty.");
					return false;
				}

				toast.success("Specialty updated.");
				// Optimistically update local state instead of reloading
				setSpecialties((prev) =>
					prev.map((s) =>
						s.id === id
							? {
									...s,
									name: trimmedName,
									...(showOncall !== undefined && {
										showOncall: showOncall,
									}),
									...(hasResidency !== undefined && {
										hasResidency: hasResidency,
									}),
								}
							: s
					)
				);
				// Update active specialties list if showOncall changed
				if (showOncall !== undefined) {
					setSpecialties((prev) => {
						const updated = specialties.find((s) => s.id === id);
						if (!updated) return prev;
						if (showOncall && !prev.some((s) => s.id === id)) {
							return [
								...prev,
								{
									...updated,
									name: trimmedName,
									showOncall: showOncall,
								},
							].sort((a, b) => a.name.localeCompare(b.name));
						} else if (
							!showOncall &&
							prev.some((s) => s.id === id)
						) {
							return prev.filter((s) => s.id !== id);
						}
						return prev;
					});
				}
				return true;
			} catch (error) {
				console.error("Error in updateSpecialty:", error);
				toast.error("Failed to update specialty.");
				return false;
			} finally {
				setActionLoading((prev) => ({ ...prev, [id]: false }));
			}
		},
		[specialties]
	);

	const deleteSpecialty = useCallback(
		async (id: string) => {
			setActionLoading((prev) => ({ ...prev, [`delete-${id}`]: true }));
			try {
				const response = await fetch(`/api/specialties?id=${id}`, {
					method: "DELETE",
				});

				if (!response.ok) {
					const errorData = await response.json();
					console.error(
						"Failed to delete specialty:",
						errorData.error
					);
					toast.error("Failed to delete specialty.");
					return false;
				}

				toast.success("Specialty deleted.");
				await fetchSpecialties();
				return true;
			} catch (error) {
				console.error("Error in deleteSpecialty:", error);
				toast.error("Failed to delete specialty.");
				return false;
			} finally {
				setActionLoading((prev) => ({
					...prev,
					[`delete-${id}`]: false,
				}));
			}
		},
		[fetchSpecialties]
	);

	// Toggle showOncall
	const toggleShowOnCall = useCallback(
		async (id: string, currentValue: boolean) => {
			setActionLoading((prev) => ({ ...prev, [`toggle-${id}`]: true }));
			try {
				const response = await fetch("/api/specialties", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ id, showOncall: !currentValue }),
				});

				if (!response.ok) {
					const errorData = await response.json();
					console.error(
						"Failed to toggle showOncall:",
						errorData.error
					);
					toast.error("Failed to update specialty.");
					return;
				}

				toast.success("Specialty updated.");
				// Optimistically update local state
				const specialty = specialties.find((s) => s.id === id);
				if (specialty) {
					setSpecialties((prev) =>
						prev.map((s) =>
							s.id === id
								? { ...s, showOncall: !currentValue }
								: s
						)
					);
					// Update active specialties list
					if (
						!currentValue &&
						!specialties.some((s) => s.id === id)
					) {
						setSpecialties((prev) =>
							[...prev, specialty].sort((a, b) =>
								a.name.localeCompare(b.name)
							)
						);
					} else if (currentValue) {
						setSpecialties((prev) =>
							prev.filter((s) => s.id !== id)
						);
					}
				}
			} catch (error) {
				console.error("Error in toggleShowOnCall:", error);
				toast.error("Failed to update specialty.");
			} finally {
				setActionLoading((prev) => ({
					...prev,
					[`toggle-${id}`]: false,
				}));
			}
		},
		[specialties]
	);

	return {
		specialties,
		loading,
		actionLoading,
		page,
		setPage,
		pageSize,
		setPageSize,
		total,
		search,
		setSearch,
		refetch: fetchSpecialties,
		addSpecialty,
		updateSpecialty,
		deleteSpecialty,
		toggleShowOnCall,
	};
}

export function useAllSpecialties(
	initialPage = 1,
	initialPageSize = 10,
	initialSearch = ""
) {
	return useSpecialties(
		initialPage,
		initialPageSize,
		initialSearch,
		undefined
	);
}

export function useOnCallSpecialties(
	initialPage = 1,
	initialPageSize = 10,
	initialSearch = ""
) {
	return useSpecialties(initialPage, initialPageSize, initialSearch, true);
}

export function useResidencySpecialties(
	initialPage = 1,
	initialPageSize = 10,
	initialSearch = ""
) {
	return useSpecialties(
		initialPage,
		initialPageSize,
		initialSearch,
		undefined
	);
}
