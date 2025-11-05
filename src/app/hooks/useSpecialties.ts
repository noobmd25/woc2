"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { type Specialty } from "@/lib/types/specialty";

export const useSpecialties = () => {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialtyEditList, setSpecialtyEditList] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const reloadSpecialties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/specialties');

      if (!response.ok) {
        console.error("Error fetching specialties:", response.statusText);
        setSpecialties([]);
        setSpecialtyEditList([]);
        toast.error("Failed to load specialties");
        return;
      }

      const { data } = await response.json();

      const activeSpecialties = (data as Specialty[] | null)
        ?.filter((s: Specialty) => s.showOncall) as Specialty[];
      setSpecialties(activeSpecialties || []);
      setSpecialtyEditList(
        (data ?? []).map((s: Specialty) => ({
          id: s.id as string,
          name: (s.name ?? "") as string,
          showOncall: s.showOncall,
        })),
      );
    } catch (error) {
      console.error("Error in reloadSpecialties:", error);
      toast.error("Failed to load specialties");
    } finally {
      setLoading(false);
    }
  }, []);

  // Automatically load specialties on hook initialization
  useEffect(() => {
    reloadSpecialties();
  }, [reloadSpecialties]);

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
        const response = await fetch('/api/specialties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, showOncall: true }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to add specialty:", errorData.error);
          toast.error("Failed to add specialty.");
          return false;
        }

        toast.success("Specialty added.");
        await reloadSpecialties();
        return true;
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
        const updates: any = { id, name: trimmedName };
        if (showOncall !== undefined) {
          updates.showOncall = showOncall;
        }

        const response = await fetch('/api/specialties', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to update specialty:", errorData.error);
          toast.error("Failed to update specialty.");
          return false;
        }

        toast.success("Specialty updated.");
        // Optimistically update local state instead of reloading
        setSpecialtyEditList(prev =>
          prev.map(s => s.id === id ? { ...s, name: trimmedName, ...(showOncall !== undefined && { showOncall: showOncall }) } : s)
        );
        // Update active specialties list if showOncall changed
        if (showOncall !== undefined) {
          setSpecialties(prev => {
            const updated = specialtyEditList.find(s => s.id === id);
            if (!updated) return prev;
            if (showOncall && !prev.some(s => s.id === id)) {
              return [...prev, { ...updated, name: trimmedName, showOncall: showOncall }].sort((a, b) => a.name.localeCompare(b.name));
            } else if (!showOncall && prev.some(s => s.id === id)) {
              return prev.filter(s => s.id !== id);
            }
            return prev;
          });
        }
        return true;
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
        const response = await fetch(`/api/specialties?id=${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to delete specialty:", errorData.error);
          toast.error("Failed to delete specialty.");
          return false;
        }

        toast.success("Specialty deleted.");
        await reloadSpecialties();
        return true;
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

  // Toggle showOncall
  const toggleShowOnCall = useCallback(
    async (id: string, currentValue: boolean) => {
      setActionLoading(prev => ({ ...prev, [`toggle-${id}`]: true }));
      try {
        const response = await fetch('/api/specialties', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, showOncall: !currentValue }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to toggle showOncall:", errorData.error);
          toast.error("Failed to update specialty.");
          return;
        }

        toast.success("Specialty updated.");
        // Optimistically update local state
        const specialty = specialtyEditList.find(s => s.id === id);
        if (specialty) {
          setSpecialtyEditList(prev =>
            prev.map(s => s.id === id ? { ...s, showOncall: !currentValue } : s)
          );
          // Update active specialties list
          if (!currentValue && !specialties.some(s => s.id === id)) {
            setSpecialties(prev => [...prev, specialty].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (currentValue) {
            setSpecialties(prev => prev.filter(s => s.id !== id));
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
