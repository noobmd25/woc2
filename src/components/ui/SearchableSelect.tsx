'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Option {
    id: string;
    name: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    name?: string;
    className?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Type to search...',
    disabled = false,
    loading = false,
    name,
    className = '',
}: SearchableSelectProps) {
    const [searchTerm, setSearchTerm] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update search term when value changes externally
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle option selection
    const handleSelect = (optionName: string) => {
        onChange(optionName);
        setSearchTerm(optionName);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen && e.key !== 'Escape') {
            setIsOpen(true);
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[highlightedIndex].name);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && isOpen) {
            const element = document.getElementById(`option-${highlightedIndex}`);
            element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [highlightedIndex, isOpen]);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <input
                ref={inputRef}
                type="text"
                name={name}
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                    setHighlightedIndex(-1);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={loading ? 'Loading...' : placeholder}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={disabled || loading}
                autoComplete="off"
            />

            {/* Dropdown List */}
            {isOpen && !loading && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto z-50">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={option.id}
                                id={`option-${index}`}
                                onClick={() => handleSelect(option.name)}
                                className={`p-2 cursor-pointer transition-colors ${index === highlightedIndex
                                        ? 'bg-blue-100 dark:bg-blue-900'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                    } ${value === option.name
                                        ? 'font-semibold text-blue-600 dark:text-blue-400'
                                        : 'text-black dark:text-white'
                                    }`}
                            >
                                {option.name}
                            </div>
                        ))
                    ) : (
                        <div className="p-2 text-gray-500 dark:text-gray-400 text-sm">
                            No options found
                        </div>
                    )}
                </div>
            )}

            {/* Hidden input to store selected value for form submission */}
            <input type="hidden" name={`${name}_value`} value={value} />
        </div>
    );
}
