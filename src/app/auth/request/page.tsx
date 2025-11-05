"use client";

import { useAuthActions } from "@/app/hooks/useAuthActions";
import { useSpecialties } from "@/app/hooks/useSpecialties";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { type SignupFormData, signupFormSchema } from "@/lib/validations/forms";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

export default function RequestPage() {
    // You can extract the signup form logic from HomeClient into a separate component
    // and use it here directly, or copy the relevant JSX and handlers.
    const router = useRouter();

    const [phoneInput, setPhoneInput] = useState("");
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const { specialties, loading: loadingSpecialties } = useSpecialties();
    const { signup, isLoading: isSigningUp } = useAuthActions();

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors, isSubmitting },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupFormSchema),
        defaultValues: {
            full_name: "",
            email: "",
            phone: "",
            position: undefined,
            specialty_attending: "",
            specialty_resident: "",
            pgy_year: "1",
            password: "",
            confirm_password: "",
        },
    });

    const watchedPosition = useWatch({ control, name: "position" });
    const watchedSpecialtyAttending = useWatch({ control, name: "specialty_attending" });
    const watchedSpecialtyResident = useWatch({ control, name: "specialty_resident" });

    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, 10);
        const match = digits.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
        if (!match) return digits;
        const [, area, prefix, line] = match;
        return [
            area ? `(${area}` : "",
            area && prefix ? `) ${prefix}` : "",
            prefix && line ? `-${line}` : "",
        ].join("");
    };

    const handleSignupSubmit = async (data: SignupFormData) => {
        const result = await signup(data);

        if (result.success) {
            router.push("/auth/pending");
        }
        // Error handling is done in the hook
    };
    return (
        <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
            <h1 className="text-4xl font-bold mb-4">Create Account</h1>
            <div>
                <form className="space-y-4" onSubmit={handleSubmit(handleSignupSubmit)}>
                    <div>
                        <input
                            {...register("full_name")}
                            placeholder="Full Name (e.g., John Doe)"
                            autoComplete="name"
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            onBlur={() => setShowPasswordFields(true)}
                        />
                        {errors.full_name && <span className="text-xs text-red-500">{errors.full_name.message}</span>}
                    </div>

                    <div>
                        <input
                            {...register("email")}
                            type="email"
                            placeholder="Email (e.g., john.doe@example.com)"
                            autoComplete="email"
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            onBlur={() => setShowPasswordFields(true)}
                        />
                        {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                    </div>

                    <div>
                        <input
                            {...register("phone")}
                            placeholder="Phone Number (e.g., (787) 123-4567)"
                            autoComplete="tel"
                            value={phoneInput}
                            onChange={(e) => {
                                const formatted = formatPhone(e.target.value);
                                setPhoneInput(formatted);
                                setValue("phone", formatted);
                            }}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                    </div>
                    <div className="flex flex-col text-left">
                        <label className="text-sm font-medium text-black dark:text-white mb-1">
                            Position
                        </label>
                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2 text-black dark:text-white">
                                <input
                                    {...register("position")}
                                    type="radio"
                                    value="Resident"
                                    className="accent-blue-600"
                                    onChange={() => {
                                        setValue("position", "Resident");
                                        setShowPasswordFields(true);
                                    }}
                                />
                                <span>Resident</span>
                            </label>
                            <label className="flex items-center space-x-2 text-black dark:text-white">
                                <input
                                    {...register("position")}
                                    type="radio"
                                    value="Attending"
                                    className="accent-blue-600"
                                    onChange={() => {
                                        setValue("position", "Attending");
                                        setShowPasswordFields(true);
                                    }}
                                />
                                <span>Attending</span>
                            </label>
                        </div>
                        {errors.position && <span className="text-xs text-red-500">{errors.position.message}</span>}
                    </div>
                    {watchedPosition === "Attending" && (
                        <div className="flex flex-col text-left">
                            <label className="text-sm font-medium text-black dark:text-white mb-1">
                                Service / Department
                            </label>
                            <SearchableSelect
                                options={specialties}
                                value={watchedSpecialtyAttending || ""}
                                onChange={(value) => setValue("specialty_attending", value)}
                                placeholder="Type to search departments..."
                                loading={loadingSpecialties}
                                name="specialty_attending"
                            />

                            {errors.specialty_attending && <span className="text-xs text-red-500">{errors.specialty_attending.message}</span>}
                        </div>
                    )}
                    {watchedPosition === "Resident" && (
                        <>
                            <div className="flex flex-col text-left">
                                <label className="text-sm font-medium text-black dark:text-white mb-1">
                                    Residency Specialty
                                </label>
                                <SearchableSelect
                                    options={specialties}
                                    value={watchedSpecialtyResident || ""}
                                    onChange={(value) => setValue("specialty_resident", value)}
                                    placeholder="Type to search specialties..."
                                    loading={loadingSpecialties}
                                    name="specialty_resident"
                                />

                                {errors.specialty_resident && <span className="text-xs text-red-500">{errors.specialty_resident.message}</span>}
                            </div>
                            <div className="flex items-center space-x-3">
                                <label className="text-sm font-medium text-black dark:text-white">
                                    Year of Training
                                </label>
                                <div className="flex items-center space-x-2">
                                    <span className="text-black dark:text-white">PGY-</span>
                                    <select
                                        {...register("pgy_year")}
                                        className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        {Array.from({ length: 7 }, (_, i) =>
                                            String(i + 1),
                                        ).map((yr) => (
                                            <option key={yr} value={yr}>
                                                {yr}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.pgy_year && <span className="text-xs text-red-500">{errors.pgy_year.message}</span>}
                            </div>
                        </>
                    )}
                    {showPasswordFields && (
                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div>
                                <input
                                    {...register("password")}
                                    type="password"
                                    placeholder="Create Password (min 12 chars)"
                                    autoComplete="new-password"
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
                            </div>
                            <div>
                                <input
                                    {...register("confirm_password")}
                                    type="password"
                                    placeholder="Confirm Password"
                                    autoComplete="new-password"
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                {errors.confirm_password && <span className="text-xs text-red-500">{errors.confirm_password.message}</span>}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Password must include upper & lower case letters and a
                                number. You cannot log in until an admin approves your
                                account.
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={() => router.push("/auth/login")}
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-black dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isSigningUp}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                        >
                            {isSigningUp ? "Creating Account..." : "Create Account"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}