"use client";

import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";

import { type Specialty } from "@/lib/schedule-utils";
import { getBrowserClient } from "@/lib/supabase/client";

const supabase = getBrowserClient();

export const useSpecialties = () => {
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyEditList, setSpecialtyEditList] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(false);

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
        const activeNames = data
          ?.filter((s) => s.show_oncall)
          .map((s) => s.name ?? "")
          .filter(Boolean) as string[];
        setSpecialties(activeNames);
        setSpecialtyEditList(
          (data ?? []).map((s) => ({
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

      const duplicate = specialtyEditList.some(
        (s) => s.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (duplicate) {
        toast.error("Specialty already exists.");
        return false;
      }

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
          await reloadSpecialties();
          return true;
        }
      } catch (error) {
        console.error("Error in updateSpecialty:", error);
        toast.error("Failed to update specialty.");
        return false;
      }
    },
    [specialtyEditList, reloadSpecialties],
  );

  const deleteSpecialty = useCallback(
    async (id: string) => {
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
      }
    },
    [reloadSpecialties],
  );

  return {
    specialties,
    specialtyEditList,
    loading,
    reloadSpecialties,
    addSpecialty,
    updateSpecialty,
    deleteSpecialty,
  };
};
