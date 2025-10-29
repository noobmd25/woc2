'use client';

import { track } from '@vercel/analytics';
import { useEffect } from 'react';

/**
 * Custom hook to track page views with Vercel Analytics
 * @param pageName - Name of the page being tracked
 * @param metadata - Optional metadata to include with the tracking event
 */
export function usePageAnalytics(
    pageName: string,
    metadata?: Record<string, string | number | boolean>
) {
    useEffect(() => {
        track(`page_view_${pageName}`, {
            page: pageName,
            timestamp: new Date().toISOString(),
            ...metadata,
        });
    }, [pageName, metadata]);
}
