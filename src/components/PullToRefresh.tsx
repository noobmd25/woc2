'use client';

import React, { useRef, useState, useCallback, useContext, useEffect } from 'react';

// Context to allow pages to register a refresh handler
interface RefreshCtxType { setPageRefresh: (fn: (() => Promise<any> | void) | null) => void }
const RefreshCtx = React.createContext<RefreshCtxType | null>(null);

let lastGlobalRefresh = 0; // shared timestamp to provide a global cooldown

export function usePageRefresh(fn: (() => Promise<any> | void) | null) {
  const ctx = useContext(RefreshCtx);
  useEffect(() => {
    ctx?.setPageRefresh(fn);
    return () => ctx?.setPageRefresh(null);
  }, [fn, ctx]);
}

interface PullToRefreshProps {
  children: React.ReactNode;
  thresholdPx?: number; // fallback threshold if header height unknown
  globalCooldownMs?: number;
  vibrate?: boolean;
  headerSelector?: string; // allow customization / testing
}

export default function PullToRefresh({
  children,
  thresholdPx = 60,
  globalCooldownMs = 8000,
  vibrate = true,
  headerSelector = 'header',
}: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const startY = useRef<number | null>(null);
  const pageRefreshRef = useRef<(() => Promise<any> | void) | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [headerColor, setHeaderColor] = useState<string>('#2563eb'); // default tailwind blue-600

  // derive active threshold: prefer measured header height
  const activeThreshold = headerHeight && headerHeight > 0 ? headerHeight : thresholdPx;

  const setPageRefresh = useCallback((fn: (() => Promise<any> | void) | null) => {
    pageRefreshRef.current = fn ?? null;
  }, []);

  const doVibrate = (pattern: number | number[]) => {
    if (!vibrate) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { (navigator as any).vibrate(pattern); } catch { /* ignore */ }
    }
  };

  // Measure header height & color
  useEffect(() => {
    const measure = () => {
      if (typeof document === 'undefined') return;
      const el = document.querySelector<HTMLElement>(headerSelector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.height) setHeaderHeight(rect.height);
      const bg = getComputedStyle(el).backgroundColor;
      if (bg) setHeaderColor(bg);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    const el = document.querySelector<HTMLElement>(headerSelector);
    if (ro && el) ro.observe(el);

    // also re-measure after small delay (fonts / layout shifts)
    const t = setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      if (ro && el) ro.unobserve(el);
      clearTimeout(t);
    };
  }, [headerSelector]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 0 || refreshing) return;
    if (Date.now() - lastGlobalRefresh < globalCooldownMs) {
      setCooldownActive(true);
      return;
    }
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      e.preventDefault();
      const capped = Math.min(delta, activeThreshold * 2);
      setPullY(prev => {
        if (prev < activeThreshold && capped >= activeThreshold) doVibrate(15);
        return capped;
      });
    }
  };

  const triggerRefresh = async () => {
    setRefreshing(true);
    doVibrate([10, 40, 20]);
    try {
      if (pageRefreshRef.current) await pageRefreshRef.current(); else window.location.reload();
      lastGlobalRefresh = Date.now();
    } finally {
      setPullY(0);
      setRefreshing(false);
      setTimeout(() => setCooldownActive(false), 300);
    }
  };

  const onTouchEnd = () => {
    if (pullY >= activeThreshold && Date.now() - lastGlobalRefresh >= globalCooldownMs) {
      void triggerRefresh();
    } else {
      if (pullY > 0 && Date.now() - lastGlobalRefresh < globalCooldownMs) doVibrate(8);
      setPullY(0);
    }
    startY.current = null;
  };

  const cooldownMsLeft = Math.max(0, lastGlobalRefresh + globalCooldownMs - Date.now());
  const showCooldown = cooldownMsLeft > 0 && cooldownActive;

  return (
    <RefreshCtx.Provider value={{ setPageRefresh }}>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className="min-h-screen flex flex-col"
        style={{ overscrollBehaviorY: 'contain' }}
      >
        <div
          style={{
            height: pullY,
            transition: refreshing ? 'height .25s ease' : pullY === 0 ? 'height .18s ease' : 'none',
            background: pullY > 0 ? headerColor : 'none',
            borderTop: pullY > 0 ? `1px solid ${headerColor}` : 'none',
          }}
          className="flex items-end justify-center text-[11px] text-gray-100 dark:text-gray-200 select-none relative"
        >
          <div className="absolute inset-0" style={{ background: 'transparent' }} />
          <div className="h-full flex items-end pb-2">
            <div className="h-10 flex items-center gap-2 font-medium px-4">
              {refreshing ? (
                <>
                  <span className="animate-spin h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent" />
                  <span>Refreshing…</span>
                </>
              ) : showCooldown ? (
                <span className="opacity-90">Wait {(cooldownMsLeft / 1000).toFixed(1)}s</span>
              ) : pullY >= activeThreshold ? (
                <span>Release to refresh</span>
              ) : pullY > 0 ? (
                <span>Pull to refresh</span>
              ) : null}
            </div>
          </div>
        </div>
        <div style={{ transform: pullY ? `translateY(${pullY / 6}px)` : undefined }} className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </RefreshCtx.Provider>
  );
}
