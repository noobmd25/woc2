"use client";

import { memo, useCallback, useState } from "react";
import { toast } from "react-hot-toast";

import { getBrowserClient } from "@/lib/supabase/client";

const supabase = getBrowserClient();

interface Specialty {
    id: string;
    name: string;
    show_oncall: boolean;
}

interface SpecialtyManagementModalProps {
    isOpen: boolean;
    specialtyEditList: Specialty[];
    currentSpecialty: string;
    onClose: () => void;
    onSpecialtyChange: (newSpecialty: string) => void;
    onReloadSpecialties: () => Promise<void>;
}

const SpecialtyManagementModal = memo(
    ({
        isOpen,
        specialtyEditList,
        currentSpecialty,
        onClose,
        onSpecialtyChange,
        onReloadSpecialties,
    }: SpecialtyManagementModalProps) => {
        const [newSpecName, setNewSpecName] = useState("");
        const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
        const [specEditName, setSpecEditName] = useState("");

        const handleAddSpecialty = useCallback(
            async (e: React.FormEvent) => {
                e.preventDefault();
                const name = newSpecName.trim();
                if (!name) return;

                // Check for duplicates
                const { data: allSpecs } = await supabase.from("specialties").select("name");

                const dup = (allSpecs || []).some(
                    (s: any) => s.name?.toLowerCase() === name.toLowerCase()
                );
                if (dup) {
                    toast.error("Specialty already exists.");
                    return;
                }

                const { error } = await supabase
                    .from("specialties")
                    .insert({ name, show_oncall: true });

                if (error) {
                    console.error("Failed to add specialty:", error);
                    toast.error("Failed to add specialty.");
                } else {
                    toast.success("Specialty added.");
                    setNewSpecName("");
                    await onReloadSpecialties();
                }
            },
            [newSpecName, onReloadSpecialties]
        );

        const handleStartEditSpecialty = useCallback((id: string, currentName: string) => {
            setEditingSpecId(id);
            setSpecEditName(currentName);
        }, []);

        const handleCancelEditSpecialty = useCallback(() => {
            setEditingSpecId(null);
            setSpecEditName("");
        }, []);

        const handleSaveSpecialty = useCallback(
            async (id: string, oldName: string) => {
                const newName = specEditName.trim();
                if (!newName) {
                    toast.error("Name cannot be empty.");
                    return;
                }

                const { data: allSpecs } = await supabase
                    .from("specialties")
                    .select("id, name");

                const dup = (allSpecs || []).some(
                    (s) => s.id !== id && s.name?.toLowerCase() === newName.toLowerCase()
                );
                if (dup) {
                    toast.error("Another specialty with this name exists.");
                    return;
                }

                const { error } = await supabase
                    .from("specialties")
                    .update({ name: newName })
                    .eq("id", id);

                if (error) {
                    console.error("Failed to save specialty:", error);
                    toast.error("Failed to save.");
                } else {
                    toast.success("Specialty updated.");
                    setEditingSpecId(null);
                    setSpecEditName("");
                    if (oldName === currentSpecialty) {
                        onSpecialtyChange(newName);
                    }
                    await onReloadSpecialties();
                }
            },
            [specEditName, currentSpecialty, onSpecialtyChange, onReloadSpecialties]
        );

        const handleDeleteSpecialty = useCallback(
            async (id: string, name: string) => {
                const confirmed = window.confirm(
                    `Delete specialty "${name}"? This cannot be undone.`
                );
                if (!confirmed) return;

                const { error } = await supabase.from("specialties").delete().eq("id", id);

                if (error) {
                    console.error("Failed to delete specialty:", error);
                    toast.error("Failed to delete.");
                } else {
                    toast.success("Specialty deleted.");

                    // If the currently selected specialty was deleted, switch to another
                    if (currentSpecialty === name) {
                        const { data } = await supabase
                            .from("specialties")
                            .select("name")
                            .eq("show_oncall", true)
                            .order("name", { ascending: true });
                        const nextName = (data ?? [])
                            .map((d) => d.name)
                            .find((n) => n && n !== name) as string | undefined;
                        if (nextName) onSpecialtyChange(nextName);
                    }

                    await onReloadSpecialties();
                }
            },
            [currentSpecialty, onSpecialtyChange, onReloadSpecialties]
        );

        if (!isOpen) return null;

        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-lg shadow-xl max-h-[80vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-6 pt-5 pb-3 border-b dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Manage Specialties
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                            aria-label="Close modal"
                        >
                            ×
                        </button>
                    </div>

                    <div className="px-6 py-4 space-y-4">
                        {/* Add New Specialty Form */}
                        <form onSubmit={handleAddSpecialty} className="flex gap-2">
                            <input
                                type="text"
                                value={newSpecName}
                                onChange={(e) => setNewSpecName(e.target.value)}
                                placeholder="New specialty name..."
                                className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-900 dark:text-white dark:border-gray-700"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                            >
                                Add
                            </button>
                        </form>

                        {/* Specialty List */}
                        <div className="space-y-2">
                            {specialtyEditList.map((spec) => (
                                <div
                                    key={spec.id}
                                    className="flex items-center justify-between p-3 border rounded-md dark:border-gray-700"
                                >
                                    {editingSpecId === spec.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={specEditName}
                                                onChange={(e) => setSpecEditName(e.target.value)}
                                                className="flex-1 px-2 py-1 border rounded dark:bg-gray-900 dark:text-white dark:border-gray-700"
                                                autoFocus
                                            />
                                            <div className="flex gap-2 ml-2">
                                                <button
                                                    onClick={() => handleSaveSpecialty(spec.id, spec.name)}
                                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleCancelEditSpecialty}
                                                    className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded text-sm transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-900 dark:text-white font-medium">
                                                    {spec.name}
                                                </span>
                                                {spec.show_oncall && (
                                                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleStartEditSpecialty(spec.id, spec.name)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSpecialty(spec.id, spec.name)}
                                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

SpecialtyManagementModal.displayName = "SpecialtyManagementModal";

export default SpecialtyManagementModal;
