"use client";

import { memo } from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const LoadingSpinner = memo(
  ({ size = "md", className = "" }: LoadingSpinnerProps) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-2",
      md: "h-6 w-6 border-2",
      lg: "h-8 w-8 border-3",
    };

    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <div
          className={`animate-spin ${sizeClasses[size]} border-gray-300 border-t-blue-600 rounded-full`}
        />
      </div>
    );
  },
);

LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;
