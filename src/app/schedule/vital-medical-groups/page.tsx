"use client";

import { type VitalMedicalGroup, useMedicalGroup } from "@/app/hooks/useMedicalGroup";
import DialogForm from "@/components/medical-groups/VitalDialogForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MEDICAL_GROUP } from "@/lib/constants";
import { ArrowLeft, Edit, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";


export default function VitalGroupsTab() {
  // Use the medical group hook for VITAL
  const {
    results,
    loading,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    setSearch,
    addGroup,
    deleteGroup,
    updateGroup,
  } = useMedicalGroup<VitalMedicalGroup>(MEDICAL_GROUP.VITAL);

  const [searchValue, setSearchValue] = useState("");
  const [sortByGroup, setSortByGroup] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogDefaultValues, setDialogDefaultValues] = useState<{ name: string; medicalGroup: string } | null>(null);

  // Sorting
  const sorted = [...results].sort((a, b) => {
    const key = sortByGroup ? "groupCode" : "vitalGroupName";
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
      setDialogDefaultValues({ name: entry.vitalGroupName, medicalGroup: entry.groupCode });
      setEditId(entry.id);
      setIsDialogOpen(true);
    }
  };

  // Delete provider
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
        <div className="flex items-center gap-4">
          <Link href="/schedule">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Vital Medical Groups
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
              Manage Vital medical group information
            </p>
          </div>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
              onValueChange={(value: string) => setSortByGroup(value === "group")}
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
              onValueChange={(value: string) => setPageSize(Number(value))}
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
                    Loading groups...
                  </TableCell>
                </TableRow>
              ) : results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    No groups found
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((r, idx) => (
                  <TableRow key={r.id || idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{r.vitalGroupName}</TableCell>
                    <TableCell>{r.groupCode}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleEdit(r.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(r.id)}
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
              <p className="mt-3 text-gray-600 dark:text-gray-400">Loading groups...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No groups found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-2">
              {sorted.map((r, idx) => (
                <div
                  key={r.id || idx}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-gray-900 dark:text-white text-base">
                      {r.vitalGroupName}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {r.groupCode}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={handleEdit(r.id)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)}>
                      Delete
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
