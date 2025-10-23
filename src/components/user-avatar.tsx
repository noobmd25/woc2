import { cn } from "@/lib/utils";
import { User } from "lucide-react";

type UserAvatarProps = {
    imageUrl?: string | null;
    userName?: string | null;
    size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
    className?: string;
    showOnlineStatus?: boolean;
    isOnline?: boolean;
};

const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-24 w-24",
    "2xl": "h-32 w-32",
    "3xl": "h-40 w-40",
} as const;

const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
    "2xl": "h-16 w-16",
    "3xl": "h-24 w-24",
} as const;

const onlineIndicatorSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-4 w-4",
    xl: "h-5 w-5",
    "2xl": "h-6 w-6",
    "3xl": "h-8 w-8",
};

const onlineIndicatorPositions = {
    sm: "right-0 bottom-0",
    md: "-bottom-0.5 -right-0.5",
    lg: "-bottom-1 -right-1",
    xl: "-bottom-1 -right-1",
    "2xl": "-bottom-1 -right-1",
    "3xl": "-bottom-1 -right-1",
};

export function UserAvatar({
    imageUrl,
    userName,
    size = "md",
    className,
    showOnlineStatus = false,
    isOnline = false,
}: UserAvatarProps) {
    const sizeClass = sizeClasses[size];
    const iconSize = iconSizes[size];
    const onlineIndicatorSize = onlineIndicatorSizes[size];
    const onlineIndicatorPosition = onlineIndicatorPositions[size];

    const avatarContent = imageUrl ? (
        <div
            aria-label={userName || "Profile"}
            className={cn("rounded-full bg-cover", sizeClass)}
            role="img"
            style={{ backgroundImage: `url(${imageUrl})` }}
        />
    ) : (
        <div
            className={cn(
                "flex items-center justify-center rounded-full bg-background dark:bg-neutral-800",
                sizeClass
            )}
        >
            <User className={cn("text-black dark:text-white", iconSize)} />
        </div>
    );

    if (showOnlineStatus && isOnline) {
        return (
            <div className={cn("relative", className)}>
                {avatarContent}
                <div
                    className={cn(
                        "absolute rounded-full border-2 border-white",
                        onlineIndicatorSize,
                        "bg-lime-400",
                        onlineIndicatorPosition
                    )}
                    title="Online"
                />
            </div>
        );
    }

    return <div className={cn(className)}>{avatarContent}</div>;
}
