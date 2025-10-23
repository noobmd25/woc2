"use client";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { getBrowserClient } from "@/lib/supabase/client";
import { User2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function UserMenu() {
    const { user, isLoading } = useAuth();
    const profile = user?.profile;
    const supabase = getBrowserClient();

    const [signingOut, setSigningOut] = useState(false);

    const handleLogout = async () => {
        setSigningOut(true);

        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                toast.error(error.message);
            } else {
                setSigningOut(false);
            }
        } catch (e: any) {
            toast.error("Could not complete sign out. Please try again.");
            setSigningOut(false); // <-- Reset here on error before navigation
        }
    };

    if (isLoading) {
        return <Skeleton className="h-9 w-24" />;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="!w-10 !h-10 rounded-full p-0"
                    size="icon"
                    variant="outline"
                >
                    <UserAvatar
                        className="cursor-pointer"
                        imageUrl={""}
                        size="sm"
                        userName={profile?.fullName}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-64 max-w-[calc(100vw-2rem)] rounded-3xl border border-transparent bg-black p-4 text-white dark:border-border dark:bg-white dark:text-black"
            >
                {/* User Profile Section */}
                <div className="flex flex-col gap-6">
                    {/* User Info with Avatar and Edit Icon */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-end">
                            <div className="relative">
                                <User2 className="h-12 w-12 rounded-full bg-gray-300 p-2 text-white dark:bg-gray-700 dark:text-black" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <p className="font-semibold text-base text-white dark:text-black">
                                {profile?.fullName || "User"}
                            </p>
                            <p className="text-sm text-white dark:text-black">{profile?.role}</p>
                            <p className="text-[#d1d1d1] text-sm dark:text-gray-500">
                                {user?.email || ""}
                            </p>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="flex flex-col gap-3">
                        <DropdownMenuItem
                            className="cursor-pointer text-left text-sm text-white transition-colors hover:bg-white hover:text-black focus:text-black dark:text-black dark:focus:text-white dark:hover:bg-black dark:hover:text-white"
                            onClick={() => { }}>
                            Account Settings
                        </DropdownMenuItem>
                    </div>

                    {/* Logout Button */}
                    <DropdownMenuItem
                        className="flex w-full cursor-pointer justify-center rounded-lg border border-white px-4 py-2 text-center text-sm text-white transition-colors hover:bg-white hover:text-black focus:bg-white focus:text-black dark:border-black dark:text-black dark:focus:bg-black dark:focus:text-white dark:hover:bg-black dark:hover:text-white"
                        onClick={handleLogout}
                        disabled={signingOut}
                    >
                        Sign Out
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
