"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateNavigationProps {
    currentDate: Date;
    onPreviousDay: () => void;
    onNextDay: () => void;
    onToday: () => void;
}

export default function DateNavigation({
    currentDate,
    onPreviousDay,
    onNextDay,
    onToday,
}: DateNavigationProps) {
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        }).format(date);
    };

    return (
        <div className="space-y-4">
            {/* Date Display */}
            <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatDate(currentDate)}
                </h2>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onPreviousDay}
                    className="flex items-center gap-1"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onToday}
                    className="px-4"
                >
                    Today
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onNextDay}
                    className="flex items-center gap-1"
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}