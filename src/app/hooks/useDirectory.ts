"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { DIRECTORY_SORT_FIELDS, SORT_DIRECTIONS, type SortDirection, type SortField } from "@/lib/constants";
import {
    filterProvidersBySpecialty,
    paginateArray,
    searchProviders,
    sortProviders,
    validateProvider
} from "@/lib/directory-utils";
import { getBrowserClient } from "@/lib/supabase/client";
import type { DirectoryProvider, DirectorySpecialty } from "@/lib/types/directory";

const supabase = getBrowserClient();

interface UseDirectoryState {
    // Data
    providers: DirectoryProvider[];
    specialties: DirectorySpecialty[];
    filteredProviders: DirectoryProvider[];
    paginatedProviders: DirectoryProvider[];

    // Pagination
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;

    // Filters and sorting
    searchTerm: string;
    selectedSpecialty: string;
    sortField: SortField;
    sortDirection: SortDirection;

    // Loading states
    loading: boolean;
    actionLoading: Record<string, boolean>;
}

export const useDirectory = (initialPageSize = 10) => {
    const [state, setState] = useState<UseDirectoryState>({
        providers: [],
        specialties: [],
        filteredProviders: [],
        paginatedProviders: [],
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        pageSize: initialPageSize,
        searchTerm: "",
        selectedSpecialty: "all",
        sortField: DIRECTORY_SORT_FIELDS.NAME,
        sortDirection: SORT_DIRECTIONS.ASC,
        loading: false,
        actionLoading: {},
    });

    // Load providers from database
    const loadProviders = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true }));
        try {
            const { data, error } = await supabase
                .from("directory")
                .select("id, provider_name, specialty, phone_number")
                .order("provider_name", { ascending: true });

            if (error) {
                console.error("Error fetching providers:", error);
                toast.error("Failed to load providers");
                setState(prev => ({ ...prev, providers: [], loading: false }));
                return;
            }

            setState(prev => ({ ...prev, providers: data || [], loading: false }));
        } catch (error) {
            console.error("Error in loadProviders:", error);
            toast.error("Failed to load providers");
            setState(prev => ({ ...prev, providers: [], loading: false }));
        }
    }, []);

    // Load specialties from database
    const loadSpecialties = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("specialties")
                .select("id, name")
                .order("name", { ascending: true });

            if (error) {
                console.error("Error fetching specialties:", error);
                toast.error("Failed to load specialties");
                return;
            }

            setState(prev => ({ ...prev, specialties: data || [] }));
        } catch (error) {
            console.error("Error in loadSpecialties:", error);
            toast.error("Failed to load specialties");
        }
    }, []);

    // Add new provider
    const addProvider = useCallback(async (providerData: Omit<DirectoryProvider, "id">) => {
        const validation = validateProvider(providerData);
        if (!validation.isValid) {
            toast.error(validation.errors.join(", "));
            return false;
        }

        setState(prev => ({ ...prev, actionLoading: { ...prev.actionLoading, add: true } }));

        try {
            // TODO: review the policies
            const { error } = await supabase
                .from("directory")
                .insert(providerData);

            if (error) {
                console.error("Error adding provider:", error.message);
                toast.error("Failed to add provider");
                return false;
            }

            toast.success("Provider added successfully");
            await loadProviders();
            return true;
        } catch (error) {
            console.error("Error in addProvider:", error);
            toast.error("Failed to add provider");
            return false;
        } finally {
            setState(prev => ({
                ...prev,
                actionLoading: { ...prev.actionLoading, add: false }
            }));
        }
    }, [loadProviders]);

    // Update provider
    const updateProvider = useCallback(async (
        id: string,
        providerData: Omit<DirectoryProvider, "id">
    ) => {
        const validation = validateProvider(providerData);
        if (!validation.isValid) {
            toast.error(validation.errors.join(", "));
            return false;
        }

        setState(prev => ({
            ...prev,
            actionLoading: { ...prev.actionLoading, [id]: true }
        }));

        try {
            const { error } = await supabase
                .from("directory")
                .update(providerData)
                .eq("id", id);

            if (error) {
                console.error("Error updating provider:", error);
                toast.error("Failed to update provider");
                return false;
            }

            toast.success("Provider updated successfully");
            await loadProviders();
            return true;
        } catch (error) {
            console.error("Error in updateProvider:", error);
            toast.error("Failed to update provider");
            return false;
        } finally {
            setState(prev => ({
                ...prev,
                actionLoading: { ...prev.actionLoading, [id]: false }
            }));
        }
    }, [loadProviders]);

    // Delete provider
    const deleteProvider = useCallback(async (id: string) => {
        setState(prev => ({
            ...prev,
            actionLoading: { ...prev.actionLoading, [`delete-${id}`]: true }
        }));

        try {
            const { error } = await supabase
                .from("directory")
                .delete()
                .eq("id", id);

            if (error) {
                console.error("Error deleting provider:", error);
                toast.error("Failed to delete provider");
                return false;
            }

            toast.success("Provider deleted successfully");
            await loadProviders();
            return true;
        } catch (error) {
            console.error("Error in deleteProvider:", error);
            toast.error("Failed to delete provider");
            return false;
        } finally {
            setState(prev => ({
                ...prev,
                actionLoading: { ...prev.actionLoading, [`delete-${id}`]: false }
            }));
        }
    }, [loadProviders]);

    // Filter and sort providers
    const processProviders = useCallback(() => {
        let processed = [...state.providers];

        // Apply search
        processed = searchProviders(processed, state.searchTerm);

        // Apply specialty filter
        processed = filterProvidersBySpecialty(processed, state.selectedSpecialty);

        // Apply sorting
        processed = sortProviders(processed, state.sortField, state.sortDirection);

        // Apply pagination
        const paginated = paginateArray(processed, state.currentPage, state.pageSize);

        setState(prev => ({
            ...prev,
            filteredProviders: processed,
            paginatedProviders: paginated.data,
            totalPages: paginated.totalPages,
            totalItems: paginated.totalItems,
        }));
    }, [
        state.providers,
        state.searchTerm,
        state.selectedSpecialty,
        state.sortField,
        state.sortDirection,
        state.currentPage,
        state.pageSize,
    ]);

    // Update search term
    const setSearchTerm = useCallback((term: string) => {
        setState(prev => ({ ...prev, searchTerm: term, currentPage: 1 }));
    }, []);

    // Update specialty filter
    const setSelectedSpecialty = useCallback((specialty: string) => {
        setState(prev => ({ ...prev, selectedSpecialty: specialty, currentPage: 1 }));
    }, []);

    // Update sorting
    const setSorting = useCallback((field: SortField, direction?: SortDirection) => {
        setState(prev => {
            const newDirection = direction ||
                (prev.sortField === field && prev.sortDirection === SORT_DIRECTIONS.ASC
                    ? SORT_DIRECTIONS.DESC
                    : SORT_DIRECTIONS.ASC);

            return {
                ...prev,
                sortField: field,
                sortDirection: newDirection,
                currentPage: 1,
            };
        });
    }, []);

    // Update pagination
    const setCurrentPage = useCallback((page: number) => {
        setState(prev => ({ ...prev, currentPage: page }));
    }, []);

    const setPageSize = useCallback((size: number) => {
        setState(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
    }, []);

    // Process providers when dependencies change
    useEffect(() => {
        processProviders();
    }, [processProviders]);

    // Load initial data
    useEffect(() => {
        loadProviders();
        loadSpecialties();
    }, [loadProviders, loadSpecialties]);

    return {
        // Data
        providers: state.paginatedProviders,
        allProviders: state.providers,
        specialties: state.specialties,

        // Pagination
        currentPage: state.currentPage,
        totalPages: state.totalPages,
        totalItems: state.totalItems,
        pageSize: state.pageSize,

        // Filters and sorting
        searchTerm: state.searchTerm,
        selectedSpecialty: state.selectedSpecialty,
        sortField: state.sortField,
        sortDirection: state.sortDirection,

        // Loading states
        loading: state.loading,
        actionLoading: state.actionLoading,

        // Actions
        addProvider,
        updateProvider,
        deleteProvider,
        reloadProviders: loadProviders,

        // Filter and pagination controls
        setSearchTerm,
        setSelectedSpecialty,
        setSorting,
        setCurrentPage,
        setPageSize,
    };
};