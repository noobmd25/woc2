"use client";

import { MEDICAL_GROUP, MedicalGroup } from "@/lib/constants";
import { useCallback, useEffect, useState } from "react";

export interface MedicalGroupResult {
    id: number;
    name: string;
    medicalGroup: string;
}

export function useMedicalGroup(type: MedicalGroup = MEDICAL_GROUP.MMM, initialPage = 1, initialPageSize = 25, initialSearch = "") {
    const [results, setResults] = useState<MedicalGroupResult[]>([]);
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
            let url = type === MEDICAL_GROUP.VITAL ? '/api/vital-medical-groups' : '/api/mmm-medical-groups';
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
            });
            if (debouncedSearch) params.append('search', debouncedSearch);
            url += `?${params.toString()}`;
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

    // Add group (MMM only)
    const addGroup = useCallback(async (group: { name: string; medicalGroup: string }) => {
        if (type !== MEDICAL_GROUP.MMM) return false;
        try {
            const res = await fetch('/api/mmm-medical-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    // Delete group (MMM only)
    const deleteGroup = useCallback(async (id: number) => {
        if (type !== MEDICAL_GROUP.MMM) return false;
        try {
            const res = await fetch(`/api/mmm-medical-groups?id=${id}`, {
                method: 'DELETE',
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

    // Update group (MMM only)
    const updateGroup = useCallback(async (id: number, group: { name: string; medicalGroup: string }) => {
        if (type !== MEDICAL_GROUP.MMM) return false;
        try {
            const res = await fetch(`/api/mmm-medical-groups?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
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
