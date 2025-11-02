"use client";

import SearchableSelect from "@/components/ui/SearchableSelect";
import { getBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function RequestPage() {
    // You can extract the signup form logic from HomeClient into a separate component
    // and use it here directly, or copy the relevant JSX and handlers.
    const supabase = getBrowserClient();
    const router = useRouter();

    const [phoneInput, setPhoneInput] = useState("");
    const [position, setPosition] = useState<"Resident" | "Attending" | "">("");
    const [pgyYear, setPgyYear] = useState<string>("1");
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [specialties, setSpecialties] = useState<Array<{ id: string; name: string }>>([]);
    const [loadingSpecialties, setLoadingSpecialties] = useState(true);
    const [selectedSpecialty, setSelectedSpecialty] = useState("");
    const [selectedAttendingSpecialty, setSelectedAttendingSpecialty] = useState("");

    // Fetch specialties from API
    useEffect(() => {
        async function fetchSpecialties() {
            try {
                const res = await fetch('/api/specialties');
                if (!res.ok) {
                    throw new Error('Failed to fetch specialties');
                }
                const { data } = await res.json();
                setSpecialties(data || []);
            } catch (err) {
                console.error('Error fetching specialties:', err);
                toast.error('Failed to load specialties');
            } finally {
                setLoadingSpecialties(false);
            }
        }

        fetchSpecialties();
    }, []);

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

    const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        const full_name = String(formData.get("full_name") || "").trim();
        const email = String(formData.get("email") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const chosenPosition = String(
            formData.get("position") || position || "",
        ).trim();
        const specialtyAttending = selectedAttendingSpecialty || String(
            formData.get("specialty_attending") || "",
        ).trim();
        const specialtyResident = selectedSpecialty || String(
            formData.get("specialty_resident") || "",
        ).trim();
        const pgy = String(formData.get("pgy_year") || pgyYear || "").trim();
        const password = String(formData.get("password") || "");
        const confirm = String(formData.get("confirm_password") || "");

        if (!full_name || !email) {
            toast.error("Name and email required");
            return;
        }
        if (!chosenPosition) {
            toast.error("Select a position");
            return;
        }

        const provider_type = chosenPosition;
        let department = "";
        let year_of_training = "";
        if (chosenPosition === "Attending") {
            if (!specialtyAttending) {
                toast.error("Service / department required");
                return;
            }
            department = specialtyAttending;
        } else if (chosenPosition === "Resident") {
            if (!specialtyResident) {
                toast.error("Residency specialty required");
                return;
            }
            if (!pgy || !/^[1-7]$/.test(pgy)) {
                toast.error("PGY year 1-7 required");
                return;
            }
            department = specialtyResident;
            year_of_training = `PGY-${pgy}`;
        }

        if (!password || password.length < 12) {
            toast.error("Password min 12 chars");
            return;
        }
        if (password !== confirm) {
            toast.error("Passwords do not match");
            return;
        }
        if (
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/\d/.test(password)
        ) {
            toast.error("Need upper, lower, number");
            return;
        }

        try {
            const origin =
                (typeof window !== "undefined" && window.location.origin) ||
                process.env.NEXT_PUBLIC_SITE_URL ||
                (process.env.VERCEL_URL
                    ? `https://${process.env.VERCEL_URL}`
                    : "http://localhost:3000");

            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${origin}/auth/pending`,
                    data: {
                        full_name,
                        department,
                        provider_type,
                        phone,
                        year_of_training,
                        requested_role: "viewer",
                        status: "pending",
                    },
                },
            });
            if (signUpError) {
                toast.error(signUpError.message || "Sign up failed");
                try {
                    await supabase.from("signup_errors").insert({
                        email,
                        error_text: signUpError.message || String(signUpError),
                        context: { stage: "signup" },
                    });
                } catch { }
                return;
            }

            // Provisioning of profile & role request handled by DB trigger (provision_profile)
            toast.success("Account created. Check your email to confirm.");
            router.push("/auth/pending");
        } catch (err: any) {
            toast.error(err?.message || "Unexpected signup error");
            try {
                await supabase.from("signup_errors").insert({
                    email,
                    error_text: err?.message || String(err),
                    context: { stage: "unexpected" },
                });
            } catch { }
        }
    };
    return (
        <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
            <h1 className="text-4xl font-bold mb-4">Create Account</h1>
            <div>
                <form className="space-y-4" onSubmit={handleSignupSubmit}>
                    <input
                        name="full_name"
                        placeholder="Full Name (e.g., John Doe)"
                        autoComplete="name"
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        onBlur={() => setShowPasswordFields(true)}
                    />
                    <input
                        name="email"
                        type="email"
                        placeholder="Email (e.g., john.doe@example.com)"
                        autoComplete="email"
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        onBlur={() => setShowPasswordFields(true)}
                    />
                    <input
                        name="phone"
                        placeholder="Phone Number (e.g., (787) 123-4567)"
                        autoComplete="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <div className="flex flex-col text-left">
                        <label className="text-sm font-medium text-black dark:text-white mb-1">
                            Position
                        </label>
                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2 text-black dark:text-white">
                                <input
                                    type="radio"
                                    name="position"
                                    value="Resident"
                                    className="accent-blue-600"
                                    checked={position === "Resident"}
                                    onChange={() => {
                                        setPosition("Resident");
                                        setShowPasswordFields(true);
                                    }}
                                />
                                <span>Resident</span>
                            </label>
                            <label className="flex items-center space-x-2 text-black dark:text-white">
                                <input
                                    type="radio"
                                    name="position"
                                    value="Attending"
                                    className="accent-blue-600"
                                    checked={position === "Attending"}
                                    onChange={() => {
                                        setPosition("Attending");
                                        setShowPasswordFields(true);
                                    }}
                                />
                                <span>Attending</span>
                            </label>
                        </div>
                    </div>
                    {position === "Attending" && (
                        <div className="flex flex-col text-left">
                            <label className="text-sm font-medium text-black dark:text-white mb-1">
                                Service / Department
                            </label>
                            <SearchableSelect
                                options={specialties}
                                value={selectedAttendingSpecialty}
                                onChange={setSelectedAttendingSpecialty}
                                placeholder="Type to search departments..."
                                loading={loadingSpecialties}
                                name="specialty_attending"
                            />
                        </div>
                    )}
                    {position === "Resident" && (
                        <>
                            <div className="flex flex-col text-left">
                                <label className="text-sm font-medium text-black dark:text-white mb-1">
                                    Residency Specialty
                                </label>
                                <SearchableSelect
                                    options={specialties}
                                    value={selectedSpecialty}
                                    onChange={setSelectedSpecialty}
                                    placeholder="Type to search specialties..."
                                    loading={loadingSpecialties}
                                    name="specialty_resident"
                                />
                            </div>
                            <div className="flex items-center space-x-3">
                                <label className="text-sm font-medium text-black dark:text-white">
                                    Year of Training
                                </label>
                                <div className="flex items-center space-x-2">
                                    <span className="text-black dark:text-white">PGY-</span>
                                    <select
                                        name="pgy_year"
                                        value={pgyYear}
                                        onChange={(e) => setPgyYear(e.target.value)}
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
                            </div>
                        </>
                    )}
                    {showPasswordFields && (
                        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <input
                                name="password"
                                type="password"
                                placeholder="Create Password (min 12 chars)"
                                autoComplete="new-password"
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <input
                                name="confirm_password"
                                type="password"
                                placeholder="Confirm Password"
                                autoComplete="new-password"
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
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
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                            Create Account
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}