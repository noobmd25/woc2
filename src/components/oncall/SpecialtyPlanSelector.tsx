"use client";

import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PLANS, SPECIALTIES } from "@/lib/constants";

interface SpecialtyPlanSelectorProps {
    specialty: string;
    plan: string;
    specialties: string[];
    specialtyLoading: boolean;
    onSpecialtyChange: (value: string) => void;
    onPlanChange: (value: string) => void;
}

export default function SpecialtyPlanSelector({
    specialty,
    plan,
    specialties,
    specialtyLoading,
    onSpecialtyChange,
    onPlanChange,
}: SpecialtyPlanSelectorProps) {
    const showPlanSelector = specialty === SPECIALTIES.INTERNAL_MEDICINE;

    return (
        <div className="space-y-4">
            {/* Specialty Selector */}
            <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <div className="relative">
                    <Select
                        value={specialty}
                        onValueChange={onSpecialtyChange}
                        disabled={specialtyLoading}
                    >
                        <SelectTrigger
                            className="w-full"
                            id="specialty">
                            <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                        <SelectContent>
                            {specialties.filter(Boolean).map((spec) => (
                                <SelectItem key={spec} value={spec}>
                                    {spec}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {specialtyLoading && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2">
                            <LoadingSpinner size="sm" />
                        </div>
                    )}
                </div>
            </div>

            {/* Plan Selector (only for Internal Medicine) */}
            {!specialtyLoading && showPlanSelector && (
                <div className="space-y-2">
                    <Label htmlFor="plan">Healthcare Plan</Label>
                    <Select value={plan} onValueChange={onPlanChange}>
                        <SelectTrigger id="plan" className="w-full">
                            <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                            {PLANS.map((planOption) => (
                                <SelectItem key={planOption} value={planOption}>
                                    {planOption}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Plan Guidance for Internal Medicine */}
                    {!plan && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                            <p className="text-amber-800 dark:text-amber-200 text-sm">
                                Please select a healthcare plan for Internal Medicine to see the on-call provider.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}