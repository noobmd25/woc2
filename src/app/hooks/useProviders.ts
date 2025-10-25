"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { resolveDirectorySpecialty } from "@/lib/specialtyMapping";
import { type Provider } from "@/lib/types/provider";

export const useProviders = (specialty: string) => {
  // Providers are the filtered list excluding Residency and PA Phone
  const [providers, setProviders] = useState<Provider[]>([]);
  // All providers include all specialties
  const [allProviders, setAllProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProviders = useCallback(async () => {
    if (!specialty) {
      setProviders([]);
      setAllProviders([]);
      return;
    }

    setLoading(true);
    try {
      const spec = resolveDirectorySpecialty(specialty);

      // Fetch all providers for this specialty using API route
      const response = await fetch(`/api/directory?specialty=${encodeURIComponent(spec)}`);

      if (!response.ok) {
        throw new Error("Failed to fetch providers");
      }

      const { data } = await response.json();

      // Map from camelCase API response to DirectoryProvider format
      const mappedProviders: Provider[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.providerName,
        phone_1: item.phoneNumber,
        phone_2: null,
        second_phone_source: null,
        specialty: item.specialty,
      }));

      // Store all providers
      setAllProviders(mappedProviders);

      // Filter out Residency and PA Phone for the main provider list
      const filteredProviders = mappedProviders.filter(
        (p) =>
          !p.name.toLowerCase().includes("residency") &&
          !p.name.toLowerCase().includes("pa phone")
      );
      setProviders(filteredProviders);
    } catch (error) {
      console.error("Error in loadProviders:", error);
      toast.error("Failed to load providers");
      setProviders([]);
      setAllProviders([]);
    } finally {
      setLoading(false);
    }
  }, [specialty]);

  // Load providers when specialty changes
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    providers,
    allProviders,
    loading,
    reloadProviders: loadProviders,
  };
};
