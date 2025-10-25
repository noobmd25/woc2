"use client";

import { useMedicalGroup } from "@/app/hooks/useMedicalGroup";
import DialogForm from "@/components/mmm-medical-groups/DialogForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MEDICAL_GROUP } from "@/lib/constants";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MMMGroupsTab() {
  // Use the medical group hook for MMM
  const {
    results,
    loading,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    addGroup,
    deleteGroup,
    updateGroup,
  } = useMedicalGroup(MEDICAL_GROUP.MMM);

  const [searchValue, setSearchValue] = useState("");
  const [sortByGroup, setSortByGroup] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogDefaultValues, setDialogDefaultValues] = useState<{ name: string; medicalGroup: string } | null>(null);

  // Color palette for group chips
  const palette = [
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
    "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
    "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  ];
  const uniqueGroups = Array.from(new Set(results.map((r: any) => r.medicalGroup))).sort((a, b) => a.localeCompare(b));
  const groupColors: Record<string, string> = {};
  uniqueGroups.forEach((g, idx) => {
    groupColors[g] = palette[idx % palette.length];
  });

  // Sorting
  const sorted = [...results].sort((a, b) => {
    const key = sortByGroup ? "medicalGroup" : "name";
    return (a[key] || "").localeCompare(b[key] || "");
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Add new provider
  const handleAdd = async (data: { name: string; medicalGroup: string }) => {
    const ok = await addGroup({ name: data.name, medicalGroup: data.medicalGroup });
    if (ok) {
      toast.success("Provider added");
      setSearch("");
    } else {
      toast.error("Error adding provider");
    }
  };
  // Edit provider
  const handleEdit = (id: number) => async () => {
    const entry = results.find((item) => item.id === id);
    if (entry) {
      setDialogDefaultValues({ name: entry.name, medicalGroup: entry.medicalGroup });
      setEditId(entry.id);
      setIsDialogOpen(true);
    }
  };

  // Delete provider
  // TODO: add confirmation dialog
  const handleDelete = async (id: number) => {
    const ok = await deleteGroup(id);
    if (ok) toast.success("Provider deleted");
    else toast.error("Error deleting provider");
  };

  // Edit provider
  const handleUpdate = async (data: { name: string; medicalGroup: string }) => {
    if (!editId) return;
    const ok = await updateGroup(editId, { name: data.name, medicalGroup: data.medicalGroup });
    if (ok) {
      toast.success("Provider updated");
      setEditId(null);
    } else {
      toast.error("Error updating provider");
    }
  };

  return (
    <div className="container mx-auto px-2 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            MMM Medical Groups
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
            Manage MMM medical group information
          </p>
        </div>

        <Button
          onClick={() => {
            setDialogDefaultValues(null);
            setIsDialogOpen(true);
          }}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="space-y-2">
            <Label htmlFor="search">Search Groups</Label>
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

        {/* Sort and Page Size */}
        <div className="flex flex-row gap-4 flex-1 md:justify-end sm:flex-row sm:gap-2 w-full">
          {/* Sort */}
          <div className="space-y-2">
            <Label htmlFor="sort">Sort By</Label>
            <Select
              value={sortByGroup ? "group" : "name"}
              onValueChange={(value) => setSortByGroup(value === "group")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">By Name</SelectItem>
                <SelectItem value="group">By Group</SelectItem>
              </SelectContent>
            </Select>
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
                <TableHead>Group</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <p className="mt-3 text-gray-600 dark:text-gray-400">Loading groups...</p>
                  </TableCell>
                </TableRow>
              ) : results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No groups found</p>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((r, idx) => (
                  <TableRow key={r.id || idx}>
                    <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.medicalGroup}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const entry = results.find((item) => item.id === r.id);
                            if (entry) {
                              setDialogDefaultValues({ name: entry.name, medicalGroup: entry.medicalGroup });
                              setEditId(r.id);
                              setIsDialogOpen(true);
                            }
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
              <p className="mt-3 text-gray-600 dark:text-gray-400">Loading groups...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No groups found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-2">
              {sorted.map((r, idx) => (
                <div key={r.id || idx} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-gray-900 dark:text-white text-base">
                      {r.name}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{r.medicalGroup}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEdit(r.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      {/* Dialog Form */}
      <DialogForm
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={dialogDefaultValues ? handleUpdate : handleAdd}
        defaultValues={dialogDefaultValues || undefined}
      />
    </div>
  );
}
