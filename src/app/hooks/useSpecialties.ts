"use client";

import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";

import { getBrowserClient } from "@/lib/supabase/client";
import { type Specialty } from "@/lib/types/specialty";

const supabase = getBrowserClient();

export const useSpecialties = () => {
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyEditList, setSpecialtyEditList] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const reloadSpecialties = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("specialties")
        .select("id, name, show_oncall")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching specialties:", error);
        setSpecialties([]);
        setSpecialtyEditList([]);
        toast.error("Failed to load specialties");
      } else {

        const activeNames = (data as Specialty[] | null)
          ?.filter((s: Specialty) => s.show_oncall)
          .map((s: Specialty) => s.name ?? "")
          .filter(Boolean) as string[];
        setSpecialties(activeNames);
        setSpecialtyEditList(
          (data ?? []).map((s: Specialty) => ({
            id: s.id as string,
            name: (s.name ?? "") as string,
            show_oncall: !!s.show_oncall,
          })),
        );
      }
    } catch (error) {
      console.error("Error in reloadSpecialties:", error);
      toast.error("Failed to load specialties");
    } finally {
      setLoading(false);
    }
  }, []);

  const addSpecialty = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return false;

      // Check for duplicates in current list
      const duplicate = specialtyEditList.some(
        (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        toast.error("Specialty already exists.");
        return false;
      }

      setActionLoading(prev => ({ ...prev, add: true }));
      try {
        const { error } = await supabase
          .from("specialties")
          .insert({ name: trimmedName, show_oncall: true });

        if (error) {
          console.error("Failed to add specialty:", error);
          toast.error("Failed to add specialty.");
          return false;
        } else {
          toast.success("Specialty added.");
          await reloadSpecialties();
          return true;
        }
      } catch (error) {
        console.error("Error in addSpecialty:", error);
        toast.error("Failed to add specialty.");
        return false;
      } finally {
        setActionLoading(prev => ({ ...prev, add: false }));
      }
    },
    [specialtyEditList, reloadSpecialties],
  );

  const updateSpecialty = useCallback(
    async (id: string, newName: string, showOncall?: boolean) => {
      const trimmedName = newName.trim();
      if (!trimmedName) {
        toast.error("Name cannot be empty.");
        return false;
      }

      const duplicate = specialtyEditList.some(
        (s) =>
          s.id !== id && s.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (duplicate) {
        toast.error("A specialty with this name already exists.");
        return false;
      }

      setActionLoading(prev => ({ ...prev, [id]: true }));
      try {
        const updates: any = { name: trimmedName };
        if (showOncall !== undefined) {
          updates.show_oncall = showOncall;
        }

        const { error } = await supabase
          .from("specialties")
          .update(updates)
          .eq("id", id);

        if (error) {
          console.error("Failed to update specialty:", error);
          toast.error("Failed to update specialty.");
          return false;
        } else {
          toast.success("Specialty updated.");
          // Optimistically update local state instead of reloading
          setSpecialtyEditList(prev =>
            prev.map(s => s.id === id ? { ...s, name: trimmedName, ...(showOncall !== undefined && { show_oncall: showOncall }) } : s)
          );
          // Update active specialties list if show_oncall changed
          if (showOncall !== undefined) {
            setSpecialties(prev => {
              const updated = specialtyEditList.find(s => s.id === id);
              if (!updated) return prev;
              if (showOncall && !prev.includes(trimmedName)) {
                return [...prev, trimmedName].sort();
              } else if (!showOncall && prev.includes(updated.name)) {
                return prev.filter(name => name !== updated.name);
              }
              return prev;
            });
          }
          return true;
        }
      } catch (error) {
        console.error("Error in updateSpecialty:", error);
        toast.error("Failed to update specialty.");
        return false;
      } finally {
        setActionLoading(prev => ({ ...prev, [id]: false }));
      }
    },
    [specialtyEditList],
  );

  const deleteSpecialty = useCallback(
    async (id: string) => {
      setActionLoading(prev => ({ ...prev, [`delete-${id}`]: true }));
      try {
        const { error } = await supabase
          .from("specialties")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Failed to delete specialty:", error);
          toast.error("Failed to delete specialty.");
          return false;
        } else {
          toast.success("Specialty deleted.");
          await reloadSpecialties();
          return true;
        }
      } catch (error) {
        console.error("Error in deleteSpecialty:", error);
        toast.error("Failed to delete specialty.");
        return false;
      } finally {
        setActionLoading(prev => ({ ...prev, [`delete-${id}`]: false }));
      }
    },
    [reloadSpecialties],
  );

  // Toggle show_oncall
  const toggleShowOnCall = useCallback(
    async (id: string, currentValue: boolean) => {
      setActionLoading(prev => ({ ...prev, [`toggle-${id}`]: true }));
      try {
        const { error } = await supabase
          .from("specialties")
          .update({ show_oncall: !currentValue })
          .eq("id", id);

        if (error) {
          console.error("Failed to toggle show_oncall:", error);
          toast.error("Failed to update specialty.");
        } else {
          toast.success("Specialty updated.");
          // Optimistically update local state
          const specialty = specialtyEditList.find(s => s.id === id);
          if (specialty) {
            setSpecialtyEditList(prev =>
              prev.map(s => s.id === id ? { ...s, show_oncall: !currentValue } : s)
            );
            // Update active specialties list
            if (!currentValue && !specialties.includes(specialty.name)) {
              setSpecialties(prev => [...prev, specialty.name].sort());
            } else if (currentValue) {
              setSpecialties(prev => prev.filter(name => name !== specialty.name));
            }
          }
        }
      } catch (error) {
        console.error("Error in toggleShowOnCall:", error);
        toast.error("Failed to update specialty.");
      } finally {
        setActionLoading(prev => ({ ...prev, [`toggle-${id}`]: false }));
      }
    },
    [specialtyEditList, specialties],
  );

  return {
    specialties,
    specialtyEditList,
    loading,
    actionLoading,
    reloadSpecialties,
    addSpecialty,
    updateSpecialty,
    deleteSpecialty,
    toggleShowOnCall,
  };
};
