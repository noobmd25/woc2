"use client";

import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";

import {
  type PendingEntry,
  type ScheduleEntry,
  toLocalISODate,
} from "@/lib/schedule-utils";
import { getBrowserClient } from "@/lib/supabase/client";

const supabase = getBrowserClient();

export const useScheduleEntries = (specialty: string, plan: string | null) => {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Internal reload function - stable with dependencies
  const reloadCurrentEntries = useCallback(async () => {
    if (!specialty) {
      return; // Don't call setEntries to avoid unnecessary re-renders
    }

    // For Internal Medicine, require a plan to be selected
    if (specialty === "Internal Medicine" && !plan) {
      return; // Don't call setEntries to avoid unnecessary re-renders
    }

    setLoading(true);
    try {
      let query = supabase
        .from("schedules")
        .select("*")
        .eq("specialty", specialty);

      // Add plan filter for Internal Medicine
      if (specialty === "Internal Medicine" && plan) {
        query = query.eq("healthcare_plan", plan);
      }

      const { data, error } = await query.order("on_call_date", {
        ascending: true,
      });

      if (error) {
        console.error("Error fetching schedule entries:", error);
        toast.error("Failed to load schedule entries");
        setEntries([]);
      } else {
        setEntries(data || []);
      }
    } catch (error) {
      console.error("Error in reloadCurrentEntries:", error);
      toast.error("Failed to load schedule entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [specialty, plan]);

  // Load schedule entries from database with optional date range
  // Takes specialty and plan as parameters to avoid recreating the callback
  const loadEntries = useCallback(
    async (startDate: Date, endDate: Date, spec: string, hp: string | null) => {
      if (!spec) {
        return; // Don't call setEntries to avoid unnecessary re-renders
      }

      // For Internal Medicine, require a plan to be selected
      if (spec === "Internal Medicine" && !hp) {
        return; // Don't call setEntries to avoid unnecessary re-renders
      }

      setLoading(true);
      try {
        let query = supabase
          .from("schedules")
          .select("*")
          .eq("specialty", spec);

        // Add plan filter for Internal Medicine
        if (spec === "Internal Medicine" && hp) {
          query = query.eq("healthcare_plan", hp);
        }

        // Add date range
        query = query
          .gte("on_call_date", toLocalISODate(startDate))
          .lte("on_call_date", toLocalISODate(endDate));

        const { data, error } = await query.order("on_call_date", {
          ascending: true,
        });

        if (error) {
          console.error("Error fetching schedule entries:", error);
          toast.error("Failed to load schedule entries");
          setEntries([]);
        } else {
          setEntries(data || []);
        }
      } catch (error) {
        console.error("Error in loadEntries:", error);
        toast.error("Failed to load schedule entries");
        setEntries([]);
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
        const { error } = await supabase.from("schedules").insert([entry]);

        if (error) {
          console.error("Failed to add schedule entry:", error);
          toast.error("Failed to add schedule entry");
          return false;
        } else {
          toast.success("Schedule entry added successfully");
          await reloadCurrentEntries(); // Reload entries
          return true;
        }
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
        const { error } = await supabase
          .from("schedules")
          .update(updates)
          .eq("id", id);

        if (error) {
          console.error("Failed to update schedule entry:", error);
          toast.error("Failed to update schedule entry");
          return false;
        } else {
          toast.success("Schedule entry updated successfully");
          await reloadCurrentEntries(); // Reload entries
          return true;
        }
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
        const { error } = await supabase
          .from("schedules")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Failed to delete schedule entry:", error);
          toast.error("Failed to delete schedule entry");
          return false;
        } else {
          toast.success("Schedule entry deleted successfully");
          await reloadCurrentEntries(); // Reload entries
          return true;
        }
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
        let deleteQuery = supabase
          .from("schedules")
          .delete()
          .eq("on_call_date", date)
          .eq("specialty", spec)
          .eq("provider_name", providerName.replace(/^Dr\. /, "").trim());

        if (spec === "Internal Medicine") {
          if (hp) {
            deleteQuery = deleteQuery.eq("healthcare_plan", hp);
          } else {
            deleteQuery = deleteQuery.is("healthcare_plan", null);
          }
        }

        const { error } = await deleteQuery;

        if (error) {
          console.error("Failed to delete schedule entry:", error);
          toast.error("Failed to delete entry");
          return false;
        } else {
          toast.success("Entry deleted successfully");
          return true;
        }
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
    async (startOfMonth: string, startOfNextMonth: string, spec: string, hp: string | null) => {
      try {
        let deleteQuery = supabase
          .from("schedules")
          .delete({ count: "exact" })
          .eq("specialty", spec)
          .gte("on_call_date", startOfMonth)
          .lt("on_call_date", startOfNextMonth);

        if (spec === "Internal Medicine" && hp) {
          deleteQuery = deleteQuery.eq("healthcare_plan", hp);
        }

        const { error, count } = await deleteQuery;

        if (error) {
          console.error("Error clearing month:", error);
          toast.error("Failed to clear the month.");
          return { success: false, count: 0 };
        } else {
          return { success: true, count: count ?? 0 };
        }
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
        const { error } = await supabase.from("schedules").insert(entries);

        if (error) {
          console.error("Failed to add multiple schedule entries:", error);
          toast.error("Failed to add schedule entries");
          return false;
        } else {
          toast.success(
            `${entries.length} schedule entries added successfully`,
          );
          await reloadCurrentEntries(); // Reload entries
          return true;
        }
      } catch (error) {
        console.error("Error in addMultipleEntries:", error);
        toast.error("Failed to add schedule entries");
        return false;
      }
    },
    [reloadCurrentEntries],
  );

  // Manage pending entries (local state)
  const addPendingEntry = useCallback((entry: PendingEntry) => {
    setPendingEntries((prev) => {
      // Remove any existing entry for the same date/specialty/plan
      const filtered = prev.filter(
        (e) =>
          !(
            e.on_call_date === entry.on_call_date &&
            e.specialty === entry.specialty &&
            (e.healthcare_plan ?? "") === (entry.healthcare_plan ?? "")
          ),
      );
      return [...filtered, entry];
    });
  }, []);

  const removePendingEntry = useCallback((date: string) => {
    setPendingEntries((prev) => prev.filter((e) => e.on_call_date !== date));
  }, []);

  const clearPendingEntries = useCallback(() => {
    setPendingEntries([]);
  }, []);

  // Commit pending entries to database
  const commitPendingEntries = useCallback(async () => {
    if (pendingEntries.length === 0) return true;

    const entriesWithoutId = pendingEntries.map(
      ({ id: _id, ...entry }) => entry,
    );
    const success = await addMultipleEntries(entriesWithoutId);

    if (success) {
      clearPendingEntries();
    }

    return success;
  }, [pendingEntries, addMultipleEntries, clearPendingEntries]);

  return {
    entries,
    pendingEntries,
    loading,
    loadEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteEntryByDateAndProvider,
    clearMonth,
    addMultipleEntries,
    addPendingEntry,
    removePendingEntry,
    clearPendingEntries,
    commitPendingEntries,
  };
};
