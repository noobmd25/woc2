"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLANS } from "@/lib/constants";
import { mmmProviderSchema } from "@/lib/validations/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

export default function MMMDialogForm({
    isOpen,
    onClose,
    onSubmit,
    defaultValues,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; medicalGroup: string }) => void;
    defaultValues?: { name: string; medicalGroup: string };
}) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        control,
    } = useForm({
        resolver: zodResolver(mmmProviderSchema),
        defaultValues: { name: "", medicalGroup: "" },
    });

    const handleOnClose = () => {
        reset();
        onClose();
    }

    useEffect(() => {
        if (isOpen) {
            if (defaultValues) {
                reset(defaultValues);
            } else {
                reset({
                    name: "",
                    medicalGroup: "",
                });
            }
        }
    }, [isOpen, defaultValues, reset]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleOnClose()}>
            <DialogContent
                className="p-2 flex !max-w-md flex-col gap-1 overflow-hidden rounded-2xl sm:rounded-[32px]"
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
                            {defaultValues ? "Edit MMM Group" : "Add New MMM Group"}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit((data) => {
                        onSubmit(data);
                        handleOnClose();
                    })}
                    className="flex flex-col gap-3"
                >
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                            Provider Name
                        </label>
                        <Input
                            placeholder="Provider Name"
                            {...register("name")}
                            className="bg-white dark:bg-gray-800/70 border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                        />
                        {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                            Plan
                        </label>
                        <Controller
                            name="medicalGroup"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PLANS.filter((plan) => plan.isIpa).map((plan) => (
                                            <SelectItem key={plan.name} value={plan.name}>
                                                {plan.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.medicalGroup && <span className="text-xs text-red-500">{errors.medicalGroup.message}</span>}
                    </div>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-10 mt-1 md:mt-0 bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                    >
                        {isSubmitting ? (defaultValues ? "Updating..." : "Adding...") : defaultValues ? "Update" : "Add"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}