"use client";

import { MEDICAL_GROUP, MedicalGroup } from "@/lib/constants";
import { useCallback, useEffect, useState } from "react";

export interface MedicalGroupResult {
    name: string;
    medicalGroup: string;
}

export function useMedicalGroup(type: MedicalGroup = MEDICAL_GROUP.MMM, initialPage = 1, initialPageSize = 50, initialSearch = "") {
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
    };
}
