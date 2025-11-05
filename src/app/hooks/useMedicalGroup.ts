"use client";

import { MEDICAL_GROUP, MedicalGroup } from "@/lib/constants";
import { useCallback, useEffect, useState } from "react";

export interface MedicalGroupResult {
    id: number;
    name: string;
    medicalGroup: string;
}
export interface MMMMedicalGroup {
    id: number;
    name: string;
    medicalGroup: string;
}

export interface VitalMedicalGroup {
    id: number;
    vitalGroupName: string;
    groupCode: string;
}

export function useMedicalGroup<T>(
    type: MedicalGroup,
    initialPage = 1,
    initialPageSize = 10,
    initialSearch = ""
) {
    const [results, setResults] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
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

    const fetchMedicalGroups = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
            });
            if (debouncedSearch) params.append("search", debouncedSearch);

            const endpoint =
                type === MEDICAL_GROUP.VITAL
                    ? "/api/vital-medical-groups"
                    : "/api/mmm-medical-groups";

            const url = `${endpoint}?${params.toString()}`;
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                setResults(json.data || []);
                setTotal(json.total || 0);
            } else {
                setResults([]);
                setTotal(0);
            }
        } catch {
            setResults([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [type, page, pageSize, debouncedSearch]);

    useEffect(() => {
        fetchMedicalGroups();
    }, [fetchMedicalGroups]);

    // Add group
    const addGroup = useCallback(async (group: { name: string; medicalGroup: string }) => {
        const endpoint =
            type === MEDICAL_GROUP.VITAL
                ? "/api/vital-medical-groups"
                : "/api/mmm-medical-groups";
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(group),
            });
            if (res.ok) {
                await fetchMedicalGroups();
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }, [type, fetchMedicalGroups]);

    // Delete group
    const deleteGroup = useCallback(async (id: number) => {
        const endpoint =
            type === MEDICAL_GROUP.VITAL
                ? `/api/vital-medical-groups?id=${id}`
                : `/api/mmm-medical-groups?id=${id}`;
        try {
            const res = await fetch(endpoint, {
                method: "DELETE",
            });
            if (res.ok) {
                await fetchMedicalGroups();
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }, [type, fetchMedicalGroups]);

    // Update group
    const updateGroup = useCallback(async (id: number, group: { name: string; medicalGroup: string }) => {
        const endpoint =
            type === MEDICAL_GROUP.VITAL
                ? `/api/vital-medical-groups?id=${id}`
                : `/api/mmm-medical-groups?id=${id}`;
        try {
            const res = await fetch(endpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(group),
            });
            if (res.ok) {
                await fetchMedicalGroups();
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }, [type, fetchMedicalGroups]);

    return {
        results,
        loading,
        setResults,
        page,
        setPage,
        pageSize,
        setPageSize,
        total,
        search,
        setSearch,
        refetch: fetchMedicalGroups,
        addGroup,
        deleteGroup,
        updateGroup,
    };
}
