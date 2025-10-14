"use client";

import { memo, useCallback, useState } from "react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                            Manage Specialties
                        </DialogTitle>
                        <DialogDescription>
                            Add, edit, or remove specialties for schedule management
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-1 space-y-6">
                        {/* Add New Specialty Form */}
                        <form onSubmit={handleAddSpecialty} className="flex gap-2">
                            <Input
                                type="text"
                                value={newSpecName}
                                onChange={(e) => setNewSpecName(e.target.value)}
                                placeholder="New specialty name..."
                                className="flex-1"
                            />
                            <Button
                                type="submit"
                                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-sm"
                            >
                                Add
                            </Button>
                        </form>

                        {/* Specialty List */}
                        <div className="space-y-3">
                            {specialtyEditList.map((spec) => (
                                <div
                                    key={spec.id}
                                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:shadow-md transition-shadow"
                                >
                                    {editingSpecId === spec.id ? (
                                        <>
                                            <Input
                                                type="text"
                                                value={specEditName}
                                                onChange={(e) => setSpecEditName(e.target.value)}
                                                className="flex-1 mr-3"
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleSaveSpecialty(spec.id, spec.name)}
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    onClick={handleCancelEditSpecialty}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 flex-1">
                                                <span className="text-gray-900 dark:text-white font-semibold text-base">
                                                    {spec.name}
                                                </span>
                                                {spec.show_oncall && (
                                                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full font-medium">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleStartEditSpecialty(spec.id, spec.name)}
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeleteSpecialty(spec.id, spec.name)}
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }
);

SpecialtyManagementModal.displayName = "SpecialtyManagementModal";

export default SpecialtyManagementModal;
