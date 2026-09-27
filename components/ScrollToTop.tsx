import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/* ================= BULLETPROOF SCROLL RESTORATION ================= */
const scrollPositions = new Map<string, number>();
let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Helper to save current scroll coordinate accurately without blocking main thread
export const recordCurrentScroll = (key?: string, pathname?: string, immediate = false) => {
  if (typeof window === "undefined") return;

  const y = window.scrollY;
  if (y === undefined || isNaN(y)) return;

  const activeKey = key || window.history.state?.key || "default";
  const activePath = pathname || window.location.pathname;

  // Instant in-memory map update (0ms, non-blocking)
  scrollPositions.set(activeKey, y);
  scrollPositions.set(activePath, y);

  const persistToStorage = () => {
    try {
      sessionStorage.setItem(`lak_scroll_key_${activeKey}`, String(y));
      sessionStorage.setItem(`lak_scroll_path_${activePath}`, String(y));
    } catch {
      // ignore storage quota errors
    }
  };

  if (immediate) {
    if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
    persistToStorage();
  } else {
    if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
    scrollDebounceTimer = setTimeout(persistToStorage, 150);
  }
};

// Global click & pointer listener: captures scroll position at the EXACT instant of user tap/click before navigation starts
if (typeof window !== "undefined") {
  const onUserInteraction = () => {
    recordCurrentScroll(undefined, undefined, true);
  };

  window.addEventListener("pointerdown", onUserInteraction, { capture: true, passive: true });
  window.addEventListener("click", onUserInteraction, { capture: true, passive: true });
}

export const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Prevent browser from doing conflicting automatic scroll jumps during component mount
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Save scroll continuously as the user scrolls
  useEffect(() => {
    const handleScroll = () => {
      recordCurrentScroll(location.key, location.pathname);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      // NOTE: Do NOT record scroll here because route unmount collapses document height
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.key, location.pathname]);

  // Handle scroll on route change
  useEffect(() => {
    if (navigationType === "POP") {
      // User clicked Back or Forward (in browser or on-page Back button):
      // Look up the exact saved scroll coordinate for this history entry
      let targetY: number | undefined = scrollPositions.get(location.key);

      if (targetY === undefined) {
        try {
          const stored = sessionStorage.getItem(`lak_scroll_key_${location.key}`);
          if (stored !== null) targetY = Number(stored);
        } catch {}
      }

      if (targetY === undefined || isNaN(targetY)) {
        targetY = scrollPositions.get(location.pathname);
      }

      if (targetY === undefined || isNaN(targetY)) {
        try {
          const stored = sessionStorage.getItem(`lak_scroll_path_${location.pathname}`);
          if (stored !== null) targetY = Number(stored);
        } catch {}
      }

      if (targetY !== undefined && !isNaN(targetY)) {
        const destY = Math.max(0, Math.round(targetY));

        const applyScroll = () => {
          window.scrollTo({
            top: destY,
            left: 0,
            behavior: "instant" as ScrollBehavior,
          });
        };

        // 1. Immediate restore
        applyScroll();

        // 2. Immediate animation frame
        requestAnimationFrame(applyScroll);

        // 3. Repeat across initial rendering cycle (~500ms) to lock against async component mounting
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          applyScroll();
          // Once page height has expanded and scroll is locked, stop
          if (Math.abs(window.scrollY - destY) <= 1 || attempts >= 16) {
            clearInterval(interval);
          }
        }, 30);

        return () => clearInterval(interval);
      }
    } else {
      // PUSH or REPLACE: New page navigation
      if (location.hash) {
        const id = location.hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }
      // Fresh page: smoothly start at top
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.key, navigationType, location.hash]);

  return null;
};
