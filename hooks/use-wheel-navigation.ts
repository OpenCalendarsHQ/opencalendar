import { useEffect, useRef } from "react";

interface UseWheelNavigationOptions {
  onScrollLeft?: () => void;   // Navigate backward (previous day/week)
  onScrollRight?: () => void;  // Navigate forward (next day/week)
  threshold?: number; // Minimum accumulated deltaX to trigger navigation
  cooldown?: number; // Milliseconds between navigations
  enabled?: boolean;
}

/**
 * Hook for navigating calendar views using horizontal scrolling (touchpad/trackpad)
 * Swipe left = go back, swipe right = go forward
 * Works with touchpad horizontal scroll (two-finger horizontal swipe)
 */
export function useWheelNavigation({
  onScrollLeft,
  onScrollRight,
  threshold = 80, // Lower threshold for better horizontal scroll detection
  cooldown = 300,
  enabled = true,
}: UseWheelNavigationOptions) {
  const lastNavigationRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal scroll (deltaX), ignore vertical scroll (deltaY)
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        return; // This is primarily vertical scroll, ignore it
      }

      const target = e.target as HTMLElement;

      // Find the scrollable container
      const scrollContainer = target.closest('[data-scroll-container]') as HTMLElement;
      if (!scrollContainer) return;

      // Accumulate horizontal scroll delta for touchpad support
      accumulatedDeltaRef.current += e.deltaX;

      // Reset accumulated delta after 200ms of no scrolling
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        accumulatedDeltaRef.current = 0;
      }, 200);

      // Check if we should trigger navigation
      const now = Date.now();
      const timeSinceLastNav = now - lastNavigationRef.current;

      if (timeSinceLastNav < cooldown) {
        return;
      }

      // Scrolling right = forward (next day/week)
      if (accumulatedDeltaRef.current > threshold && onScrollRight) {
        e.preventDefault();
        onScrollRight();
        lastNavigationRef.current = now;
        accumulatedDeltaRef.current = 0;
      }
      // Scrolling left = backward (previous day/week)
      else if (accumulatedDeltaRef.current < -threshold && onScrollLeft) {
        e.preventDefault();
        onScrollLeft();
        lastNavigationRef.current = now;
        accumulatedDeltaRef.current = 0;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [enabled, threshold, cooldown, onScrollLeft, onScrollRight]);
}
