"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const supabase = getBrowserClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                router.push("/oncall"); // Redirect authenticated users to main app
            } else {
                router.push("/auth/login"); // Redirect to login
            }
        };
        checkUser();
    }, [router]);

    return (
        <div className="app-container px-4 py-6 max-w-lg mx-auto dark:bg-black">
            <div className="flex justify-center py-8">
                <LoadingSpinner />
            </div>
        </div>
    );
}