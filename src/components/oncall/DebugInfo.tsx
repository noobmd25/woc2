"use client";

import type { OnCallDebugInfo } from "@/app/hooks/useOnCall";

interface DebugInfoProps {
    debugInfo: OnCallDebugInfo | null;
    role: string | null;
}

export default function DebugInfo({ debugInfo, role }: DebugInfoProps) {
    if (!debugInfo || (role !== "admin" && role !== "scheduler")) {
        return null;
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Debug Info
            </h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                    <span className="font-medium">Criteria:</span> {debugInfo.criteria}
                </p>
                <p>
                    <span className="font-medium">Rows found:</span> {debugInfo.rows}
                </p>
            </div>
        </div>
    );
}