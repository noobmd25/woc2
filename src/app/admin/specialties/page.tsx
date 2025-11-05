"use client";

import { useSpecialties } from "@/app/hooks/useSpecialties";
import SpecialtyDialogForm from "@/components/admin/SpecialtyDialogForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function SpecialtiesPage() {
    const {
        specialties,
        loading,
        actionLoading,
        page,
        setPage,
        pageSize,
        setPageSize,
        total,
        setSearch,
        addSpecialty,
        updateSpecialty,
        deleteSpecialty,
        toggleShowOnCall,
    } = useSpecialties();

    const [searchValue, setSearchValue] = useState("");
    const [editId, setEditId] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogDefaultValues, setDialogDefaultValues] = useState<{ name: string; showOnCall?: boolean; hasResidency?: boolean } | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [specialtyToDelete, setSpecialtyToDelete] = useState<{ id: string; name: string } | null>(null);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const canPrev = page > 1;
    const canNext = page < totalPages;

    // Dialog handlers
    const handleAddClick = () => {
        setDialogDefaultValues(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (id: string, name: string, showOnCall: boolean, hasResidency: boolean) => {
        setEditId(id);
        setDialogDefaultValues({ name, showOnCall, hasResidency });
        setIsDialogOpen(true);
    };

    const handleDialogSubmit = async (data: { name: string; showOnCall?: boolean; hasResidency?: boolean }) => {
        if (editId) {
            const success = await updateSpecialty(editId, data.name, data.showOnCall, data.hasResidency);
            if (success) {
                setEditId(null);
                setDialogDefaultValues(null);
            }
        } else {
            const success = await addSpecialty(data.name, data.showOnCall ?? true, data.hasResidency ?? false);
            if (success) {
                setDialogDefaultValues(null);
            }
        }
    };

    const handleDeleteClick = (id: string, name: string) => {
        setSpecialtyToDelete({ id, name });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!specialtyToDelete) return;

        const success = await deleteSpecialty(specialtyToDelete.id);
        if (success) {
            setDeleteDialogOpen(false);
            setSpecialtyToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setSpecialtyToDelete(null);
    };

    const handleToggleShowOnCall = async (id: string, currentValue: boolean) => {
        try {
            await toggleShowOnCall(id, currentValue);
        } catch (error) {
            toast.error(`Failed to update specialty.`);
        }
    };

    return (
        <div className="container mx-auto px-2 py-6 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                            Manage Specialties
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                            Add, edit, or remove specialties for schedule management
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handleAddClick}
                    className="self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Specialty
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                {/* Search */}
                <div className="flex-1">
                    <div className="space-y-2">
                        <Label htmlFor="search">Search Specialties</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                id="search"
                                placeholder="Search by name..."
                                value={searchValue}
                                onChange={(e) => {
                                    setSearchValue(e.target.value);
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>

                {/* Page Size */}
                <div className="space-y-2">
                    <Label htmlFor="page-size">Items per page</Label>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => setPageSize(Number(value))}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Items per page" />
                        </SelectTrigger>
                        <SelectContent>
                            {[10, 20, 50, 100].map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Show on Call</TableHead>
                                <TableHead>Has Residency</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        Loading specialties...
                                    </TableCell>
                                </TableRow>
                            ) : specialties.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        No specialties found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                specialties.map((spec, idx) => (
                                    <TableRow key={spec.id}>
                                        <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                                        <TableCell>{spec.name}</TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={spec.showOncall}
                                                onCheckedChange={() => handleToggleShowOnCall(spec.id, spec.showOncall)}
                                                disabled={actionLoading[`toggle-${spec.id}`]}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={spec.hasResidency}
                                                onCheckedChange={(checked) => {
                                                    updateSpecialty(spec.id, spec.name, undefined, checked);
                                                }}
                                                disabled={actionLoading[spec.id]}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditClick(spec.id, spec.name, spec.showOncall, spec.hasResidency)}
                                                    disabled={actionLoading[spec.id]}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(spec.id, spec.name)}
                                                    disabled={actionLoading[spec.id]}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card List */}
                <div className="block md:hidden">
                    {loading ? (
                        <div className="flex flex-col items-center py-8">
                            <p className="mt-3 text-gray-600 dark:text-gray-400">Loading specialties...</p>
                        </div>
                    ) : specialties.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>No specialties found</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 p-2">
                            {specialties.map((spec, idx) => (
                                <div key={spec.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="font-bold text-gray-900 dark:text-white text-base">
                                            {spec.name}
                                        </div>
                                        <span className="text-sm text-gray-600 dark:text-gray-300">
                                            #{(page - 1) * pageSize + idx + 1}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">Show on Call</span>
                                            <Switch
                                                checked={spec.showOncall}
                                                onCheckedChange={() => handleToggleShowOnCall(spec.id, spec.showOncall)}
                                                disabled={actionLoading[`toggle-${spec.id}`]}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">Has Residency</span>
                                            <Switch
                                                checked={spec.hasResidency}
                                                onCheckedChange={(checked) => {
                                                    updateSpecialty(spec.id, spec.name, undefined, checked);
                                                }}
                                                disabled={actionLoading[spec.id]}
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditClick(spec.id, spec.name, spec.showOncall, spec.hasResidency)}
                                                disabled={actionLoading[spec.id]}
                                                className="flex-1"
                                            >
                                                <Edit className="h-4 w-4 mr-1" />
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDeleteClick(spec.id, spec.name)}
                                                disabled={actionLoading[spec.id]}
                                                className="flex-1"
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages} ({total} total)
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={!canPrev}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={!canNext}
                    >
                        Next
                    </Button>
                </div>
            </div>

            <SpecialtyDialogForm
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={handleDialogSubmit}
                defaultValues={dialogDefaultValues || undefined}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Specialty</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <span className="font-semibold">"{specialtyToDelete?.name}"</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}