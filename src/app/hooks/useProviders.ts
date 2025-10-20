"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { resolveDirectorySpecialty } from "@/lib/specialtyMapping";
import { getBrowserClient } from "@/lib/supabase/client";
import { type DirectoryProvider } from "@/lib/types/directory";
import { type Provider } from "@/lib/types/provider";

const supabase = getBrowserClient();

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

      // Fetch all providers for this specialty (including Residency and PA Phone)
      const { data, error } = await supabase
        .from("directory")
        .select("id, provider_name, specialty, phone_number")
        .eq("specialty", spec)
        .order("provider_name", { ascending: true });

      if (error) {
        console.error("Error fetching providers:", error);
        toast.error("Failed to load providers");
        setProviders([]);
        setAllProviders([]);
      } else {

        const mappedProviders: Provider[] = (data as DirectoryProvider[] || []).map((item: DirectoryProvider) => ({
          id: item.id,
          name: item.provider_name,
          phone_1: item.phone_number,
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
      }
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
