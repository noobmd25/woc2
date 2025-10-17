"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { DirectoryProvider, DirectorySpecialty } from "@/lib/types/directory";
import { type ProviderFormData, providerFormSchema } from "@/lib/validations/forms";

interface AddEditProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<DirectoryProvider, "id">) => Promise<boolean>;
    provider?: DirectoryProvider | null;
    specialties: DirectorySpecialty[];
    loading?: boolean;
}

export default function AddEditProviderModal({
    isOpen,
    onClose,
    onSubmit,
    provider,
    specialties,
    loading = false,
}: AddEditProviderModalProps) {
    const form = useForm<ProviderFormData>({
        resolver: zodResolver(providerFormSchema),
        defaultValues: {
            provider_name: "",
            specialty: "",
            phone_number: "",
        },
    });

    const {
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        control,
        register,
    } = form;

    const isEditing = !!provider;

    // Reset form when modal opens/closes or provider changes
    useEffect(() => {
        if (isOpen) {
            if (provider) {
                reset({
                    provider_name: provider.provider_name,
                    specialty: provider.specialty,
                    phone_number: provider.phone_number,
                });
            } else {
                reset({
                    provider_name: "",
                    specialty: "",
                    phone_number: "",
                });
            }
        }
    }, [isOpen, provider, reset]);

    const onFormSubmit = async (data: ProviderFormData) => {
        try {
            const success = await onSubmit(data);
            if (success) {
                onClose();
            }
        } catch (error) {
            console.error("Error submitting provider:", error);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Edit Provider" : "Add New Provider"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the provider information below."
                            : "Enter the details for the new provider."
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-4">
                    {/* Provider Name */}
                    <div className="space-y-2">
                        <Label htmlFor="provider_name">Provider Name *</Label>
                        <Input
                            id="provider_name"
                            {...register("provider_name")}
                            placeholder="Enter provider name"
                            disabled={isSubmitting}
                        />
                        {errors.provider_name && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {errors.provider_name.message}
                            </p>
                        )}
                    </div>

                    {/* Specialty */}
                    <div className="space-y-2">
                        <Label htmlFor="specialty">Specialty *</Label>
                        <Controller
                            name="specialty"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select specialty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {specialties.map((spec) => (
                                            <SelectItem key={spec.id} value={spec.name || ""}>
                                                {spec.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.specialty && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {errors.specialty.message}
                            </p>
                        )}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                        <Label htmlFor="phone_number">Phone Number *</Label>
                        <Input
                            id="phone_number"
                            {...register("phone_number")}
                            placeholder="Enter phone number (e.g., (555) 123-4567)"
                            disabled={isSubmitting}
                        />
                        {errors.phone_number && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {errors.phone_number.message}
                            </p>
                        )}
                    </div>
                </form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={handleSubmit(onFormSubmit)}
                        disabled={isSubmitting || loading}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                {isEditing ? "Updating..." : "Adding..."}
                            </>
                        ) : (
                            isEditing ? "Update Provider" : "Add Provider"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}