"use client";
import { useMedicalGroup } from "@/app/hooks/useMedicalGroup";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPlanColors } from "@/lib/colorUtils";
import { MEDICAL_GROUP, type MedicalGroup, PLANS } from "@/lib/constants";
import { X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";


export default function MMGLookupModal(
    {
        isOpen,
        onClose,
        medicalGroup,
        setPlan
    }: {
        isOpen: boolean;
        onClose: () => void;
        medicalGroup: MedicalGroup;
        setPlan: (plan: string) => void;
    }) {
    // For MMM: search by PCP name, show name + medical group
    // For Vital: search by group name or code, show name + code
    const [searchValue, setSearchValue] = useState("");
    const [sortByGroup, setSortByGroup] = useState(false);
    const {
        results,
        loading,
        setSearch,
        page,
        setPage,
        pageSize,
        setPageSize,
        total,
    } = useMedicalGroup(medicalGroup);

    const planColors = getPlanColors();

    // Map results to a unified structure for rendering
    const allGroups = results.map((r: any) => {
        if (medicalGroup === MEDICAL_GROUP.VITAL) {
            // vital: { id, vital_group_name, group_code }
            return {
                id: r.id,
                name: r.vitalGroupName || r.name,
                groupCode: r.groupCode || r.groupCode,
                medicalGroup: r.groupCode || r.groupCode, // for color mapping
            };
        }
        // mmm: { name, medicalGroup }
        return r;
    });

    // Sorting logic
    const sorted = [...allGroups].sort((a, b) => {
        const key = sortByGroup ? "medicalGroup" : "name";
        return (a[key] || "").localeCompare(b[key] || "");
    });

    // Input placeholder and label
    const inputPlaceholder = useMemo(() => medicalGroup === MEDICAL_GROUP.MMM
        ? "Search by PCP Name or group code"
        : "Search by name or group code", [medicalGroup]);
    const modalTitle = useMemo(() => medicalGroup === MEDICAL_GROUP.MMM
        ? "MMM PCP Medical Group Lookup"
        : "Vital Medical Group Lookup", [medicalGroup]);

    const handleOnClose = useCallback(() => {
        setSearchValue("");
        setSearch("");
        onClose();
    }, [onClose, setSearch, setSearchValue]);


    const handleSelectItem = useCallback((plan: string) => {

        if (!plan) return;

        let planToSelect = plan;
        // Normalize for matching: remove slashes and spaces, lowercase
        const normalize = (str: string) => str.replace(/[\s/]+/g, '').toLowerCase();
        const normPlan = normalize(plan);
        const selectedPlan = PLANS.find(p => normPlan.includes(normalize(p.name)) || normalize(p.name).includes(normPlan));

        if (medicalGroup === MEDICAL_GROUP.VITAL) {
            if (selectedPlan) {
                planToSelect = selectedPlan.name;
            } else {
                planToSelect = MEDICAL_GROUP.VITAL;
            }
        }
        setPlan(planToSelect);
        handleOnClose();
    }, [setPlan, handleOnClose, medicalGroup]);

    // Pagination controls
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const canPrev = page > 1;
    const canNext = page < totalPages;

    if (!isOpen) return null;


    return (
        <Dialog open={isOpen} onOpenChange={open => !open && handleOnClose()}>
            <DialogContent
                className="p-2 flex h-[90vh] max-w-full flex-col gap-1 overflow-hidden rounded-2xl sm:max-w-lg sm:rounded-[32px]"
                style={{ minWidth: 0 }}
                showCloseButton={false}
            >
                <Button
                    aria-label={"Close"}
                    className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    onClick={handleOnClose}
                    type="button"
                    variant={"ghost"}
                    size={"icon"}
                >
                    <X className="h-4 w-4" />
                </Button>

                <DialogHeader className="pointer-events-none flex flex-col items-start mb-2 w-full">
                    <div className="space-y-6 text-center w-full">
                        <DialogTitle className="font-bold font-open-sans text-foreground text-xl leading-[1.36] tracking-tight break-words">
                            {modalTitle}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center w-full px-2 sm:px-0">
                    <input
                        type="text"
                        placeholder={inputPlaceholder}
                        value={searchValue}
                        onChange={e => {
                            setSearchValue(e.target.value);
                            setSearch(e.target.value);
                        }}
                        className="w-full md:w-72 border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 outline-none rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800/70 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                    />

                    {allGroups.length > 0 && (
                        <div className="inline-flex items-center gap-2 text-sm">
                            <label className="text-gray-600 dark:text-gray-300">Sort:</label>
                            <select
                                value={sortByGroup ? "group" : "name"}
                                onChange={e => setSortByGroup(e.target.value === "group")}
                                className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/70 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100"
                            >
                                <option value="name">{medicalGroup === 'mmm' ? 'By Physician' : 'By Name'}</option>
                                <option value="group">{medicalGroup === 'mmm' ? 'By Group' : 'By Code'}</option>
                            </select>
                        </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-0 md:ml-auto">
                        {allGroups.length} result{allGroups.length === 1 ? "" : "s"}
                    </p>
                </div>
                {loading && (
                    <div className="flex justify-center py-8 w-full">
                        <LoadingSpinner />
                    </div>
                )}
                {!loading && allGroups.length > 0 && (
                    <div className="flex flex-col gap-3 overflow-y-auto w-full px-1 sm:px-0">
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>{medicalGroup === MEDICAL_GROUP.MMM ? "Medical Group" : "Group Code"}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sorted.map((r, idx) => (
                                        <TableRow
                                            key={r.id || idx}
                                            className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                            onClick={() => handleSelectItem(r.medicalGroup)}
                                        >
                                            <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                                            <TableCell>
                                                <span className="font-medium text-wrap text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {r.name}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {/* TODO: handle vital colors */}
                                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${planColors[r.medicalGroup] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"} ring-black/0`}>
                                                    {r.medicalGroup}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2 w-full">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                Page {page} of {totalPages} ({total} total)
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="px-2 py-1 rounded border text-xs disabled:opacity-50"
                                    onClick={() => canPrev && setPage(page - 1)}
                                    disabled={!canPrev}
                                >
                                    Previous
                                </button>
                                <button
                                    className="px-2 py-1 rounded border text-xs disabled:opacity-50"
                                    onClick={() => canNext && setPage(page + 1)}
                                    disabled={!canNext}
                                >
                                    Next
                                </button>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                                <span>Rows:</span>
                                <select
                                    value={pageSize}
                                    onChange={e => setPageSize(Number(e.target.value))}
                                    className="border rounded px-1 py-0.5 text-xs"
                                >
                                    {[10, 20, 50, 100].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
                {!loading && allGroups.length === 0 && searchValue && (
                    <div className="flex flex-col text-center gap-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">No matching {medicalGroup === MEDICAL_GROUP.MMM ? 'provider' : 'group'} found.</p>

                        {medicalGroup === MEDICAL_GROUP.VITAL && (
                            <a
                                className="cursor-pointer text-sm text-gray-600 dark:text-gray-400"
                                onClick={() => handleSelectItem("/unattached")}>
                                See Unattached Group<span className="underline text-blue-600 font-bold">Here</span>
                            </a>)
                        }
                        {medicalGroup === MEDICAL_GROUP.MMM && (
                            <a
                                className="cursor-pointer text-sm text-gray-600 dark:text-gray-400"
                                onClick={() => handleSelectItem("IPA B")}>
                                See IPA B group<span className="underline text-blue-600 font-bold">Here</span>
                            </a>)
                        }
                    </div>
                )}
                s
            </DialogContent>
        </Dialog >
    );
}
