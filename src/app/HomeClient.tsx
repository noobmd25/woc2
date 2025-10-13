"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import ForgotPassword from "@/components/auth/ForgotPasswordModal";
import { usePageRefresh } from "@/components/PullToRefresh";
import SimpleHeader from "@/components/SimpleHeader";
import { getBrowserClient } from "@/lib/supabase/client";

export default function HomeClient() {
  const supabase = getBrowserClient();
  const router = useRouter();
  const search = useSearchParams();

  // Initialize showLogin based on localStorage and search params
  const [showLogin, setShowLogin] = useState(() => {
    if (typeof window === "undefined") return false;

    const fromLocalStorage = localStorage.getItem("openSignInModal") === "true";
    if (fromLocalStorage) {
      localStorage.removeItem("openSignInModal");
      return true;
    }

    return search?.get("showSignIn") === "true";
  });

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [position, setPosition] = useState<"Resident" | "Attending" | "">("");
  const [pgyYear, setPgyYear] = useState<string>("1");
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Clean up URL when showSignIn param is present
  useEffect(() => {
    if (search?.get("showSignIn") === "true") {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("showSignIn");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [search]);

  // Close any open modal with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showForgot) {
        setShowForgot(false);
        return;
      }
      if (showLogin) {
        setShowLogin(false);
        return;
      }
      if (showRequestModal) {
        setShowRequestModal(false);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForgot, showLogin, showRequestModal]);

  const _refreshSession = useCallback(async () => {
    try {
      await supabase.auth.getUser();
    } catch {}
  }, [supabase]);

  usePageRefresh(null); // full reload on pull-to-refresh

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
    const specialtyAttending = String(
      formData.get("specialty_attending") || "",
    ).trim();
    const specialtyResident = String(
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
        } catch {}
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
      } catch {}
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      ?.value;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error("Incorrect email or password");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .maybeSingle();
      const status = (profile as any)?.status || user.user_metadata?.status;
      const allowedStatus = ["approved", "active"];
      if (!allowedStatus.includes(status)) {
        await supabase.auth.signOut();
        toast("Your account is pending admin approval.");
        router.replace("/auth/pending");
        return;
      }
    }
    toast.success("Login successful");
    setShowLogin(false);
    const nextParam = search?.get("next");
    const redirectTo =
      nextParam && nextParam.startsWith("/") ? nextParam : "/oncall";
    router.replace(redirectTo);
  };

  return (
    <>
      <SimpleHeader />
      <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
        <h1 className="text-4xl font-bold mb-4">Welcome to Who's On Call</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300"></p>
        <button
          className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition"
          onClick={() => setShowLogin(true)}
        >
          Login
        </button>
        <button
          onClick={() => setShowRequestModal(true)}
          className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition"
        >
          Sign Up
        </button>

        {showLogin && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-in"
            onClick={() => setShowLogin(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg w-full max-w-sm modal-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white">
                Login
              </h2>
              <form className="space-y-4" onSubmit={handleLoginSubmit}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  autoComplete="email"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-sm mt-1">
                  <button
                    type="button"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setShowForgot(true)}
                  >
                    Forgot your password?
                  </button>
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowLogin(false)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-black dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRequestModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-in"
            onClick={() => setShowRequestModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg w-full max-w-md modal-pop-in"
            >
              <h2 className="text-2xl font-semibold mb-4 text-black dark:text-white">
                Create Account
              </h2>
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
                  <input
                    name="specialty_attending"
                    placeholder="Service / Department (e.g., Cardiology)"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                )}
                {position === "Resident" && (
                  <>
                    <input
                      name="specialty_resident"
                      placeholder="Residency Specialty (e.g., Internal Medicine)"
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
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
                    onClick={() => setShowRequestModal(false)}
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
          </div>
        )}

        {showForgot && <ForgotPassword onClose={() => setShowForgot(false)} />}
      </main>
    </>
  );
}
