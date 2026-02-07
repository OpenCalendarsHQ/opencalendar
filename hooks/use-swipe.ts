import { useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  threshold?: number; // minimum distance for swipe
  allowedTime?: number; // max time for swipe
}

export function useSwipe(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) {
  const { threshold = 50, allowedTime = 300 } = options;
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startTime.current = Date.now();
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;
      const elapsed = Date.now() - startTime.current;

      if (elapsed > allowedTime) return;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Horizontal swipe
      if (absDx > threshold && absDx > absDy) {
        if (dx > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      }
      // Vertical swipe
      else if (absDy > threshold && absDy > absDx) {
        if (dy > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    },
    [handlers, threshold, allowedTime]
  );

  return { onTouchStart, onTouchEnd };
}
