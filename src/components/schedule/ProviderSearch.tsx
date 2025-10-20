"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { scoreName } from "@/lib/schedule-utils";
import { type Provider } from "@/lib/types/provider";

interface ProviderSearchProps {
  providers: Provider[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onProviderSelect: (provider: Provider) => void;
  loading?: boolean;
  selectedProvider?: string;
}

const ProviderSearch = memo(
  ({
    providers,
    searchQuery,
    onSearchChange,
    onProviderSelect,
    loading = false,
    selectedProvider = "",
  }: ProviderSearchProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Memoized filtered and sorted providers
    const filteredProviders = useMemo(() => {
      const query = searchQuery.trim();
      if (!query) return providers.slice(0, 50); // Show top 50 when empty

      return providers
        .map((provider) => ({
          ...provider,
          score: scoreName(provider.name, query),
        }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // Top 20 results for search
    }, [providers, searchQuery]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
      if (isOpen && listRef.current) {
        const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    }, [highlightedIndex, isOpen]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value);
        setIsOpen(true);
        setHighlightedIndex(0);
      },
      [onSearchChange],
    );

    const handleInputClick = useCallback(() => {
      setIsOpen(true);
    }, []);

    const handleProviderClick = useCallback(
      (provider: Provider) => {
        onProviderSelect(provider);
        setIsOpen(false);
        setHighlightedIndex(0);
      },
      [onProviderSelect],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
          if (e.key === "ArrowDown" || e.key === "Enter") {
            setIsOpen(true);
            e.preventDefault();
          }
          return;
        }

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setHighlightedIndex((prev) =>
              prev < filteredProviders.length - 1 ? prev + 1 : prev
            );
            break;
          case "ArrowUp":
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
            break;
          case "Enter":
            e.preventDefault();
            if (filteredProviders[highlightedIndex]) {
              handleProviderClick(filteredProviders[highlightedIndex]);
            }
            break;
          case "Escape":
            e.preventDefault();
            setIsOpen(false);
            inputRef.current?.blur();
            break;
          case "Tab":
            setIsOpen(false);
            break;
        }
      },
      [isOpen, filteredProviders, highlightedIndex, handleProviderClick],
    );

    const handleMouseEnter = useCallback((index: number) => {
      setHighlightedIndex(index);
    }, []);

    const toggleDropdown = useCallback(() => {
      if (!loading) {
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          inputRef.current?.focus();
        }
      }
    }, [loading, isOpen]);

    return (
      <div ref={containerRef} className="relative mt-2">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            placeholder={
              loading ? "Loading providers..." : "Type to search or click to browse..."
            }
            disabled={loading}
            className="w-full px-3 py-2 pr-10 border rounded-md dark:bg-gray-900 dark:text-white dark:border-gray-700 disabled:opacity-50"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls="provider-listbox"
            role="combobox"
          />

          {/* Chevron / Loading indicator */}
          <button
            type="button"
            onClick={toggleDropdown}
            disabled={loading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Toggle dropdown"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
            ) : (
              <svg
                className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Dropdown list */}
        {isOpen && !loading && (
          <div
            ref={listRef}
            id="provider-listbox"
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-y-auto"
          >
            {filteredProviders.length > 0 ? (
              <>
                {!searchQuery.trim() && (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    {providers.length} providers available • Showing {filteredProviders.length}
                  </div>
                )}
                {filteredProviders.map((provider, index) => {
                  const isHighlighted = index === highlightedIndex;
                  const isSelected = selectedProvider === provider.name;

                  return (
                    <button
                      key={`${provider.name}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleProviderClick(provider)}
                      onMouseEnter={() => handleMouseEnter(index)}
                      className={`w-full text-left px-3 py-2.5 focus:outline-none border-b dark:border-gray-700 last:border-b-0 transition-colors ${isHighlighted
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        } ${isSelected ? "bg-blue-100 dark:bg-blue-900/30" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {provider.name}
                          </div>
                          {provider.specialty && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {provider.specialty}
                            </div>
                          )}
                          {(provider.phone_1 || provider.phone_2) && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 truncate">
                              {[provider.phone_1, provider.phone_2]
                                .filter(Boolean)
                                .join(" • ")}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <svg
                            className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                <svg
                  className="w-8 h-8 mx-auto mb-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <div className="text-sm">
                  No providers found matching <strong>"{searchQuery}"</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

ProviderSearch.displayName = "ProviderSearch";

export default ProviderSearch;
