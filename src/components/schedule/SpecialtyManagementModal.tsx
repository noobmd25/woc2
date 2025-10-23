"use client";

import { AlertTriangle, Edit2, Plus, Power, Save, Trash2, X } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useSpecialties } from "@/app/hooks/useSpecialties";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import LoadingSpinner from "../ui/LoadingSpinner";


type SpecialtyManagementModalProps = {
    isOpen: boolean;
    currentSpecialty: string;
    onClose: () => void;
    onSpecialtyChange: (newSpecialty: string) => void;
}

const SpecialtyManagementModal = memo(
    ({
        isOpen,
        currentSpecialty,
        onClose,
        onSpecialtyChange,
    }: SpecialtyManagementModalProps) => {

        const [newSpecName, setNewSpecName] = useState("");
        const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
        const [specEditName, setSpecEditName] = useState("");
        const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
        const [specialtyToDelete, setSpecialtyToDelete] = useState<{ id: string; name: string } | null>(null);
        const {
            specialtyEditList,
            loading,
            actionLoading,
            addSpecialty,
            updateSpecialty,
            deleteSpecialty,
            toggleShowOnCall,
            reloadSpecialties,
        } = useSpecialties();

        // Load specialties when modal opens
        useEffect(() => {
            if (isOpen) {
                reloadSpecialties();
            }
        }, [isOpen, reloadSpecialties]);

        const handleAddSpecialty = useCallback(
            async (e: React.FormEvent) => {
                e.preventDefault();
                const success = await addSpecialty(newSpecName);
                if (!success) return;
                setNewSpecName("");
            },
            [newSpecName, addSpecialty]
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
            async (id: string, oldName: string, showOncall?: boolean) => {
                const success = await updateSpecialty(id, specEditName, showOncall);
                if (!success) return;
                setEditingSpecId(null);
                setSpecEditName("");
                if (oldName === currentSpecialty) {
                    onSpecialtyChange(specEditName);
                }
            },
            [specEditName, currentSpecialty, onSpecialtyChange, updateSpecialty]
        );

        const handleDeleteSpecialty = useCallback(
            async (id: string, name: string) => {
                setSpecialtyToDelete({ id, name });
                setDeleteConfirmOpen(true);
            },
            []
        );

        const handleConfirmDelete = useCallback(
            async () => {
                if (!specialtyToDelete) return;

                const { id, name } = specialtyToDelete;
                const success = await deleteSpecialty(id);
                if (!success) return;

                // If the currently selected specialty was deleted, switch to another
                if (currentSpecialty === name) {
                    const next = specialtyEditList.find(
                        (s) => s.showOncall && s.name !== name
                    );
                    if (next) onSpecialtyChange(next.name);
                }

                setDeleteConfirmOpen(false);
                setSpecialtyToDelete(null);
            },
            [specialtyToDelete, deleteSpecialty, currentSpecialty, specialtyEditList, onSpecialtyChange]
        );

        const handleCancelDelete = useCallback(() => {
            setDeleteConfirmOpen(false);
            setSpecialtyToDelete(null);
        }, []);

        const handleToggleShowOnCall = useCallback(
            async (id: string, currentValue: boolean) => {
                try {
                    await toggleShowOnCall(id, currentValue);
                } catch (error) {
                    toast.error(`Failed to update specialty.`);
                }
            },
            [toggleShowOnCall]
        );

        if (!isOpen) return null;

        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                            Manage Specialties
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            Add, edit, or remove specialties for schedule management. Toggle on-call status to show/hide from schedule.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-1 space-y-6 pb-2">
                        {/* Add New Specialty Form */}
                        <div className="sticky top-0 bg-white dark:bg-gray-950 pb-4 border-b border-gray-200 dark:border-gray-800 z-10">
                            <form onSubmit={handleAddSpecialty} className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    type="text"
                                    value={newSpecName}
                                    onChange={(e) => setNewSpecName(e.target.value)}
                                    placeholder="Enter new specialty name..."
                                    className="flex-1"
                                />
                                <Button
                                    type="submit"
                                    disabled={actionLoading.add || !newSpecName.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-sm whitespace-nowrap"
                                >
                                    {actionLoading.add ? (
                                        <>
                                            <LoadingSpinner size="sm" />
                                            <span className="ml-2">Adding...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Specialty
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>

                        {/* Specialty List */}
                        <div className="space-y-3">
                            {loading && specialtyEditList.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                                    <LoadingSpinner size="lg" />
                                    <span className="mt-4 text-sm">Loading specialties...</span>
                                </div>
                            )}

                            {!loading && specialtyEditList.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                                    <Power className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No specialties yet</p>
                                    <p className="text-sm mt-1">Add your first specialty to get started</p>
                                </div>
                            )}

                            {specialtyEditList.map((spec) => (
                                <div
                                    key={spec.id}
                                    className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/50 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
                                >
                                    {editingSpecId === spec.id ? (
                                        <>
                                            <Input
                                                type="text"
                                                value={specEditName}
                                                onChange={(e) => setSpecEditName(e.target.value)}
                                                className="flex-1"
                                                autoFocus
                                            />
                                            <div className="flex gap-2 sm:ml-auto">
                                                <Button
                                                    onClick={() => handleSaveSpecialty(spec.id, spec.name)}
                                                    size="sm"
                                                    disabled={actionLoading[spec.id] || !specEditName.trim()}
                                                    className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white flex-1 sm:flex-initial"
                                                >
                                                    {actionLoading[spec.id] ? (
                                                        <>
                                                            <LoadingSpinner size="sm" />
                                                            <span className="ml-2">Saving...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="w-3.5 h-3.5 mr-1" />
                                                            Save
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    onClick={handleCancelEditSpecialty}
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={actionLoading[spec.id]}
                                                    className="flex-1 sm:flex-initial"
                                                >
                                                    <X className="w-3.5 h-3.5 mr-1" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex flex-row justify-between sm:items-center gap-3 flex-1 min-w-0">
                                                <span className="text-gray-900 dark:text-white font-semibold text-base truncate">
                                                    {spec.name}
                                                </span>
                                                <div className="flex items-center gap-2.5">
                                                    <Switch
                                                        checked={spec.showOncall}
                                                        disabled={actionLoading[`toggle-${spec.id}`]}
                                                        onCheckedChange={() => handleToggleShowOnCall(spec.id, spec.showOncall)}
                                                        aria-label="Toggle show on-call"
                                                    />
                                                    {actionLoading[`toggle-${spec.id}`] ? (
                                                        <LoadingSpinner size="sm" />
                                                    ) : (
                                                        <span className={
                                                            `text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ` +
                                                            (spec.showOncall
                                                                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                                                                : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400")
                                                        }>
                                                            {spec.showOncall ? "Active" : "Inactive"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 sm:ml-auto">
                                                <Button
                                                    onClick={() => handleStartEditSpecialty(spec.id, spec.name)}
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={actionLoading[`delete-${spec.id}`]}
                                                    className="flex-1 sm:flex-initial hover:bg-blue-50 dark:hover:bg-blue-950 hover:border-blue-300 dark:hover:border-blue-700"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    onClick={() => handleDeleteSpecialty(spec.id, spec.name)}
                                                    size="sm"
                                                    variant="destructive"
                                                    disabled={actionLoading[`delete-${spec.id}`]}
                                                    className="flex-1 sm:flex-initial"
                                                >
                                                    {actionLoading[`delete-${spec.id}`] ? (
                                                        <>
                                                            <LoadingSpinner size="sm" />
                                                            <span className="ml-2">Deleting...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                            Delete
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <AlertDialogTitle>Delete Specialty</AlertDialogTitle>
                            </div>
                            <AlertDialogDescription className="pt-3">
                                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">&quot;{specialtyToDelete?.name}&quot;</span>?
                                <br />
                                <span className="text-red-600 dark:text-red-400">This action cannot be undone.</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleCancelDelete}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmDelete}
                                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 focus:ring-red-600"
                            >
                                {actionLoading[`delete-${specialtyToDelete?.id}`] ? (
                                    <>
                                        <LoadingSpinner size="sm" />
                                        <span className="ml-2">Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Specialty
                                    </>
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </Dialog>
        );
    }
);

SpecialtyManagementModal.displayName = "SpecialtyManagementModal";

export default SpecialtyManagementModal;
