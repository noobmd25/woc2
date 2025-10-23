"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { SPECIALTIES } from "@/lib/constants";
import { type ScheduleEntry } from "@/lib/types/schedule";

export const useScheduleEntries = (specialty: string, plan: string | null) => {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Internal reload function - stable with dependencies
  const reloadCurrentEntries = useCallback(async () => {
    if (!specialty) {
      return; // Don't call setEntries to avoid unnecessary re-renders
    }

    // For Internal Medicine, require a plan to be selected
    if (specialty === SPECIALTIES.INTERNAL_MEDICINE && !plan) {
      return; // Don't call setEntries to avoid unnecessary re-renders
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ specialty });

      // Add plan filter for Internal Medicine
      if (specialty === SPECIALTIES.INTERNAL_MEDICINE && plan) {
        params.append('plan', plan);
      }

      const response = await fetch(`/api/schedules?${params.toString()}`);

      if (!response.ok) {
        console.error("Error fetching schedule entries:", response.statusText);
        toast.error("Failed to load schedule entries");
        setEntries([]);
        return;
      }

      const { data } = await response.json();

      // Map camelCase to snake_case for ScheduleEntry interface
      const mappedData = data?.map((item: any) => ({
        id: item.id,
        on_call_date: item.onCallDate,
        specialty: item.specialty,
        provider_name: item.providerName,
        show_second_phone: item.showSecondPhone,
        healthcare_plan: item.healthcarePlan,
        second_phone_pref: item.secondPhonePref,
        cover: item.cover,
        covering_provider: item.coveringProvider,
      })) || [];

      setEntries(mappedData);
    } catch (error) {
      console.error("Error in reloadCurrentEntries:", error);
      toast.error("Failed to load schedule entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [specialty, plan]);

  // Load entries for a specific date range
  const loadEntries = useCallback(
    async (startDate: string, endDate: string, specialty: string, plan: string | null) => {

      if (!specialty) {
        return; // Don't call setEntries to avoid unnecessary re-renders
      }

      // For Internal Medicine, require a plan to be selected
      if (specialty === SPECIALTIES.INTERNAL_MEDICINE && !plan) {
        return; // Don't call setEntries to avoid unnecessary re-renders
      }

      setLoading(true);

      try {
        // Build query parameters
        const params = new URLSearchParams({
          startDate,
          endDate,
          specialty,
          plan: plan ?? "",
        });

        const response = await fetch(`/api/schedules?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to load schedule entries");
        }

        const { data } = await response.json();

        // Map from camelCase API response to snake_case interface
        // Only mapping fields that exist in ScheduleEntry interface
        const mappedData = data.map((entry: any) => ({
          id: entry.id,
          on_call_date: entry.onCallDate,
          provider_name: entry.providerName,
          specialty: entry.specialty,
          healthcare_plan: entry.healthcarePlan,
          show_second_phone: entry.showSecondPhone,
          second_phone_pref: entry.secondPhonePref,
          cover: entry.cover,
          covering_provider: entry.coveringProvider,
        }));

        setEntries(mappedData);
      } catch (error) {
        console.error("Failed to load entries:", error);
        toast.error("Failed to load schedule entries");
      } finally {
        setLoading(false);
      }
    },
    [], // Empty dependencies - function never recreates!
  );

  // Add new schedule entry
  const addEntry = useCallback(
    async (entry: Omit<ScheduleEntry, "id">) => {
      try {
        // Map from snake_case interface to camelCase API
        // Only include fields that exist in both ScheduleEntry interface and schedules schema
        const apiEntry = {
          onCallDate: entry.on_call_date,
          providerName: entry.provider_name,
          specialty: entry.specialty,
          healthcarePlan: entry.healthcare_plan,
          showSecondPhone: entry.show_second_phone,
          secondPhonePref: entry.second_phone_pref,
          cover: entry.cover,
          coveringProvider: entry.covering_provider,
        };

        const response = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiEntry),
        });

        if (!response.ok) {
          throw new Error("Failed to add schedule entry");
        }

        toast.success("Schedule entry added successfully");
        await reloadCurrentEntries(); // Reload entries
        return true;
      } catch (error) {
        console.error("Error in addEntry:", error);
        toast.error("Failed to add schedule entry");
        return false;
      }
    },
    [reloadCurrentEntries],
  );

  // Update existing schedule entry
  const updateEntry = useCallback(
    async (id: string, updates: Partial<ScheduleEntry>) => {
      try {
        // Map from snake_case interface to camelCase API
        const apiUpdates: any = {};
        if (updates.on_call_date !== undefined) apiUpdates.onCallDate = updates.on_call_date;
        if (updates.provider_name !== undefined) apiUpdates.providerName = updates.provider_name;
        if (updates.specialty !== undefined) apiUpdates.specialty = updates.specialty;
        if (updates.healthcare_plan !== undefined) apiUpdates.healthcarePlan = updates.healthcare_plan;
        if (updates.show_second_phone !== undefined) apiUpdates.showSecondPhone = updates.show_second_phone;
        if (updates.second_phone_pref !== undefined) apiUpdates.secondPhonePref = updates.second_phone_pref;
        if (updates.cover !== undefined) apiUpdates.cover = updates.cover;
        if (updates.covering_provider !== undefined) apiUpdates.coveringProvider = updates.covering_provider;

        const response = await fetch("/api/schedules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...apiUpdates }),
        });

        if (!response.ok) {
          throw new Error("Failed to update schedule entry");
        }

        toast.success("Schedule entry updated successfully");
        await reloadCurrentEntries(); // Reload entries
        return true;
      } catch (error) {
        console.error("Error in updateEntry:", error);
        toast.error("Failed to update schedule entry");
        return false;
      }
    },
    [reloadCurrentEntries],
  );

  // Delete schedule entry by ID
  const deleteEntry = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/schedules?id=${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete schedule entry");
        }

        toast.success("Schedule entry deleted successfully");
        await reloadCurrentEntries(); // Reload entries
        return true;
      } catch (error) {
        console.error("Error in deleteEntry:", error);
        toast.error("Failed to delete schedule entry");
        return false;
      }
    },
    [reloadCurrentEntries],
  );

  // Delete schedule entry by date and provider name
  const deleteEntryByDateAndProvider = useCallback(
    async (date: string, providerName: string, spec: string, hp: string | null) => {
      try {
        // Build query parameters for complex delete
        const params = new URLSearchParams({
          date,
          specialty: spec,
          providerName: providerName.replace(/^Dr\. /, "").trim(),
        });

        // Add healthcare plan condition for Internal Medicine
        if (spec === SPECIALTIES.INTERNAL_MEDICINE) {
          if (hp) {
            params.append("plan", hp);
          } else {
            params.append("plan", ""); // Empty string means null
          }
        }

        const response = await fetch(`/api/schedules?${params.toString()}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete schedule entry");
        }

        toast.success("Entry deleted successfully");
        return true;
      } catch (error) {
        console.error("Error in deleteEntryByDateAndProvider:", error);
        toast.error("Failed to delete entry");
        return false;
      }
    },
    [],
  );

  // Clear all entries for a specific month
  const clearMonth = useCallback(
    async (startOfMonth: string, startOfNextMonth: string, spec: string, plan: string | null) => {
      try {
        // Build query parameters for bulk delete
        const params = new URLSearchParams({
          startDate: startOfMonth,
          endDate: startOfNextMonth,
          specialty: spec,
        });

        // Add plan filter for Internal Medicine
        if (spec === SPECIALTIES.INTERNAL_MEDICINE && plan) {
          params.append("plan", plan);
        }

        const response = await fetch(`/api/schedules?${params.toString()}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to clear the month");
        }

        const { count } = await response.json();

        return { success: true, count: count ?? 0 };
      } catch (error) {
        console.error("Error in clearMonth:", error);
        toast.error("Failed to clear the month.");
        return { success: false, count: 0 };
      }
    },
    [],
  );

  // Add multiple entries at once
  const addMultipleEntries = useCallback(
    async (entries: Omit<ScheduleEntry, "id">[]) => {
      if (entries.length === 0) return true;

      try {
        // Map from snake_case interface to camelCase API
        const apiEntries = entries.map((entry) => ({
          onCallDate: entry.on_call_date,
          providerName: entry.provider_name,
          specialty: entry.specialty,
          healthcarePlan: entry.healthcare_plan,
          showSecondPhone: entry.show_second_phone,
          secondPhonePref: entry.second_phone_pref,
          cover: entry.cover,
          coveringProvider: entry.covering_provider,
        }));

        const response = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiEntries),
        });

        if (!response.ok) {
          throw new Error("Failed to add schedule entries");
        }

        toast.success(
          `${entries.length} schedule entries added successfully`,
        );
        await reloadCurrentEntries(); // Reload entries
        return true;
      } catch (error) {
        console.error("Error in addMultipleEntries:", error);
        toast.error("Failed to add schedule entries");
        return false;
      }
    },
    [reloadCurrentEntries],
  );


  return {
    entries,
    loading,
    loadEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteEntryByDateAndProvider,
    clearMonth,
    addMultipleEntries,
  };
};
