import { useEffect, useRef } from "react";

const REFRESH_COOLDOWN_MS = 750;

export default function useForegroundRefresh(onRefresh, enabled = true) {
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof onRefresh !== "function") {
      return undefined;
    }

    const triggerRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) {
        return;
      }
      lastRefreshRef.current = now;
      onRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    };

    window.addEventListener("focus", triggerRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", triggerRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, onRefresh]);
}
