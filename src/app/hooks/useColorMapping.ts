"use client";

import { useMemo } from "react";

import {
  generateDistinctColors,
  getTextColorForBackground,
} from "@/lib/schedule-utils";

export const useColorMapping = (providers: string[]) => {
  // Memoized color mapping to prevent regeneration on every render
  const colorMapping = useMemo(() => {
    const uniqueProviders = [...new Set(providers)].sort();
    const colors = generateDistinctColors(uniqueProviders.length);

    const mapping = new Map<
      string,
      { backgroundColor: string; textColor: string }
    >();

    uniqueProviders.forEach((provider, index) => {
      const backgroundColor = colors[index] || "#6b7280"; // fallback gray
      const textColor = getTextColorForBackground(backgroundColor);

      mapping.set(provider, { backgroundColor, textColor });
    });

    return mapping;
  }, [providers]);

  // Get colors for a specific provider
  const getProviderColors = (provider: string) => {
    return (
      colorMapping.get(provider) || {
        backgroundColor: "#6b7280",
        textColor: "white",
      }
    );
  };

  return {
    colorMapping,
    getProviderColors,
  };
};
