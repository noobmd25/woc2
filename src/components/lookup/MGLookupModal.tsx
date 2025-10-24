"use client";
import { useMedicalGroup } from "@/app/hooks/useMedicalGroup";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Dialog } from "@/components/ui/dialog";
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
    } = useMedicalGroup(medicalGroup);

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

    // Color palette for group/code chips
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

    // For MMM, group by medicalGroup; for Vital, group by group_code
    const uniqueGroups = Array.from(new Set(
        allGroups.map((r) => r.medicalGroup)
    )).sort((a, b) => a.localeCompare(b));
    const groupColors: Record<string, string> = {};
    uniqueGroups.forEach((g, idx) => {
        groupColors[g] = palette[idx % palette.length];
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
        // Check if any PLANS item is a substring of the plan param (case-insensitive, substring match)
        const selectedPlan = PLANS.find(p => plan.toLowerCase().includes(p.toLowerCase()));

        if (medicalGroup === MEDICAL_GROUP.VITAL) {
            if (selectedPlan) {
                planToSelect = selectedPlan;
            } else {
                planToSelect = MEDICAL_GROUP.VITAL;
            }
        }
        setPlan(planToSelect);
        handleOnClose();
    }, [setPlan, handleOnClose, medicalGroup]);

    if (!isOpen) return null;


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleOnClose()}>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl mx-2 p-2 sm:p-6 sm:mx-4 md:mx-8 md:p-8 overflow-y-auto max-h-[90vh]">
                    <button onClick={handleOnClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold mb-4">{modalTitle}</h2>
                    <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center">
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
                        <div className="flex justify-center py-8">
                            <LoadingSpinner />
                        </div>
                    )}
                    {!loading && allGroups.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {sorted.map((r, idx) => (
                                <a
                                    key={idx}
                                    className="group cursor-pointer rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-gray-900/40 px-4 py-2 shadow-sm hover:shadow-md transition-all hover:border-blue-400/70 dark:hover:border-blue-500/60"
                                    onClick={() => handleSelectItem(r.medicalGroup)}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex flex-row gap-1 items-center">
                                            {medicalGroup === 'mmm' ? (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    PCP #{idx + 1}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    Group ID: {r.id || idx + 1}
                                                </span>
                                            )}
                                            <span className="font-medium text-gray-900 dark:text-gray-100 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {r.name}
                                            </span>
                                        </div>
                                        <span
                                            className={`ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${groupColors[r.medicalGroup] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"} ring-black/0`}
                                        >
                                            {r.medicalGroup}
                                        </span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                    {!loading && allGroups.length === 0 && searchValue && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">No matching {medicalGroup === 'mmm' ? 'provider' : 'group'} found.</p>
                    )}
                </div>
            </div>
        </Dialog>
    );
}
