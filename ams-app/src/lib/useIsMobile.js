"use client";
import { useState, useEffect } from "react";

/**
 * Custom hook that returns true when the viewport is ≤768px (mobile).
 * SSR-safe: defaults to false on the server, then hydrates on mount.
 */
export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handleChange = (e) => setIsMobile(e.matches);

    // Set initial value
    setIsMobile(mql.matches);

    // Listen for changes
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [breakpoint]);

  return isMobile;
}
