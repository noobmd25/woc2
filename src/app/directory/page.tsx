"use client";

import { ChevronDown, ChevronUp, Edit, Eye, Phone, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useDirectory } from "@/app/hooks/useDirectory";
import useUserRole from "@/app/hooks/useUserRole";
import AddEditProviderModal from "@/components/directory/AddEditProviderModal";
import PhoneActionsModal from "@/components/directory/PhoneActionsModal";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DIRECTORY_SORT_FIELDS, ROLES, SORT_DIRECTIONS } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/directory-utils";
import type { DirectoryProvider } from "@/lib/types/directory";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function DirectoryPage() {
  const role = useUserRole();

  const {
    providers,
    specialties,
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    searchTerm,
    selectedSpecialty,
    sortField,
    sortDirection,
    loading,
    actionLoading,
    addProvider,
    updateProvider,
    deleteProvider,
    setSearchTerm,
    setSelectedSpecialty,
    setSorting,
    setCurrentPage,
    setPageSize,
  } = useDirectory();

  // Modal states
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<DirectoryProvider | null>(null);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [selectedPhoneProvider, setSelectedPhoneProvider] = useState<DirectoryProvider | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<DirectoryProvider | null>(null);

  // Permission checks
  const canEdit = useMemo(() => role === ROLES.ADMIN, [role]);
  const canView = useMemo(() => role ? [ROLES.ADMIN, ROLES.SCHEDULER, ROLES.VIEWER].includes(role) : false, [role]);

  // Modal handlers
  const handleAddProvider = useCallback(() => {
    setEditingProvider(null);
    setAddEditModalOpen(true);
  }, []);

  const handleEditProvider = useCallback((provider: DirectoryProvider) => {
    setEditingProvider(provider);
    setAddEditModalOpen(true);
  }, []);

  const handleDeleteProvider = useCallback((provider: DirectoryProvider) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!providerToDelete) return;

    const success = await deleteProvider(providerToDelete.id);
    if (success) {
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    }
  }, [providerToDelete, deleteProvider]);

  const handlePhoneAction = useCallback((provider: DirectoryProvider) => {
    setSelectedPhoneProvider(provider);
    setPhoneModalOpen(true);
  }, []);

  const handleSubmitProvider = useCallback(
    async (data: Omit<DirectoryProvider, "id">) => {
      if (editingProvider) {
        return await updateProvider(editingProvider.id, data);
      } else {
        return await addProvider(data);
      }
    },
    [editingProvider, updateProvider, addProvider]
  );

  // Sorting handler
  const handleSort = useCallback(
    (field: typeof DIRECTORY_SORT_FIELDS[keyof typeof DIRECTORY_SORT_FIELDS]) => {
      setSorting(field);
    },
    [setSorting]
  );

  // Render sort icon
  const renderSortIcon = useCallback(
    (field: string) => {
      if (sortField !== field) return null;
      return sortDirection === SORT_DIRECTIONS.ASC ?
        <ChevronUp className="ml-1 h-4 w-4 inline" /> :
        <ChevronDown className="ml-1 h-4 w-4 inline" />;
    },
    [sortField, sortDirection]
  );

  // Loading state
  if (role === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3">Loading...</span>
      </div>
    );
  }

  // Permission check
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-red-600 mb-4">
          <Eye className="h-12 w-12 mx-auto mb-2" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          You don't have permission to view the provider directory.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Provider Directory
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
            Manage healthcare provider contact information
          </p>
        </div>

        {canEdit && (
          <Button onClick={handleAddProvider} className="self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Providers</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Specialty Filter */}
        <div className="space-y-2">
          <Label htmlFor="specialty-filter">Filter by Specialty</Label>
          <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
            <SelectTrigger>
              <SelectValue placeholder="All specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {specialties.map((spec) => (
                <SelectItem key={spec.id} value={spec.name || ""}>
                  {spec.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page Size */}
        <div className="space-y-2">
          <Label htmlFor="page-size">Items per page</Label>
          <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort(DIRECTORY_SORT_FIELDS.NAME)}
              >
                Provider Name
                {renderSortIcon(DIRECTORY_SORT_FIELDS.NAME)}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort(DIRECTORY_SORT_FIELDS.SPECIALTY)}
              >
                Specialty
                {renderSortIcon(DIRECTORY_SORT_FIELDS.SPECIALTY)}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => handleSort(DIRECTORY_SORT_FIELDS.PHONE)}
              >
                Phone Number
                {renderSortIcon(DIRECTORY_SORT_FIELDS.PHONE)}
              </TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <LoadingSpinner size="lg" />
                  <p className="mt-3 text-gray-600 dark:text-gray-400">Loading providers...</p>
                </TableCell>
              </TableRow>
            ) : providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="text-gray-500 dark:text-gray-400">
                    {searchTerm || selectedSpecialty !== "all" ? (
                      <>
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No providers found</p>
                        <p>Try adjusting your search or filters.</p>
                      </>
                    ) : (
                      <>
                        <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No providers yet</p>
                        <p>Get started by adding your first provider.</p>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => (
                <TableRow key={provider.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableCell className="font-medium">
                    {provider.provider_name}
                  </TableCell>
                  <TableCell>
                    {provider.specialty}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handlePhoneAction(provider)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-mono"
                    >
                      {formatPhoneDisplay(provider.phone_number)}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Phone Actions */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePhoneAction(provider)}
                        title="Phone actions"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>

                      {/* Edit (Admin only) */}
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProvider(provider)}
                            disabled={actionLoading[provider.id]}
                            title="Edit provider"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {/* Delete (Admin only) */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProvider(provider)}
                            disabled={actionLoading[`delete-${provider.id}`]}
                            title="Delete provider"
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            {actionLoading[`delete-${provider.id}`] ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} providers
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddEditProviderModal
        isOpen={addEditModalOpen}
        onClose={() => {
          setAddEditModalOpen(false);
          setEditingProvider(null);
        }}
        onSubmit={handleSubmitProvider}
        provider={editingProvider}
        specialties={specialties}
        loading={!!actionLoading.add || (editingProvider ? !!actionLoading[editingProvider.id] : false)}
      />

      <PhoneActionsModal
        isOpen={phoneModalOpen}
        onClose={() => {
          setPhoneModalOpen(false);
          setSelectedPhoneProvider(null);
        }}
        providerName={selectedPhoneProvider?.provider_name || ""}
        phoneNumber={selectedPhoneProvider?.phone_number || ""}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{providerToDelete?.provider_name}</strong>?
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProviderToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white"
            >
              Delete Provider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}