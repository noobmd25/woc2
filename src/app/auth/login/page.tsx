"use client";

import { getBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function HomeClient() {
  const router = useRouter();
  // const search = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fromLocalStorage = localStorage.getItem("openSignInModal") === "true";
      if (fromLocalStorage) {
        localStorage.removeItem("openSignInModal");
        // Since we're not using a modal anymore, you could redirect or show a message
        toast.error("Please sign in below");
      }
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      toast.error("Please enter both email and password");
      setLoading(false);
      return;
    }

    const supabase = getBrowserClient();
    if (!supabase) {
      toast.error("Supabase client not available");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Signed in successfully");
        router.push("/oncall");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-black dark:bg-black dark:text-white transition-colors duration-300">
      <h1 className="text-4xl font-bold mb-4">Who's On Call</h1>
      <p className="text-lg mb-8 max-w-md">
        Manage your on-call schedules and directory with ease.
      </p>

      {/* Login Form - Now inline instead of modal */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-semibold mb-4">Sign In</h2>
        <form className="space-y-4" onSubmit={handleLoginSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-sm mt-4 text-gray-600 dark:text-gray-400">
          Don't have an account? Contact your admin.
        </p>
        <button
          onClick={() => router.push("/auth/request")}
          className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}