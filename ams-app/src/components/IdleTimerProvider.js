"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 minutes before logout
const CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

// Pages that don't need idle tracking
const PUBLIC_PATHS = ["/login", "/"];

export default function IdleTimerProvider({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const lastActivityRef = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(120); // seconds until logout

  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  // Reset activity timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setCountdown(120);
    }
  }, [showWarning]);

  // Track user activity events
  useEffect(() => {
    if (!user || isPublicPage) return;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "mousedown"];

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (showWarning) {
        setShowWarning(false);
        setCountdown(120);
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, isPublicPage, showWarning]);

  // Check idle status periodically
  useEffect(() => {
    if (!user || isPublicPage) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        // Auto logout
        clearInterval(interval);
        handleLogout();
      } else if (elapsed >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS) {
        // Show warning
        const secondsLeft = Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000);
        setCountdown(secondsLeft);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, isPublicPage]);

  // Countdown timer when warning is shown
  useEffect(() => {
    if (!showWarning) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [showWarning]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      // ignore
    }
    router.push("/login");
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Don't render warning for unauthenticated or public pages
  if (!user || isPublicPage) return <>{children}</>;

  return (
    <>
      {children}

      {/* Idle Warning Modal */}
      {showWarning && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "40px 36px",
              maxWidth: "420px",
              width: "90%",
              textAlign: "center",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3)",
              animation: "fadeInUp 0.35s ease",
            }}
          >
            {/* Warning Icon */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                border: "3px solid #F59E0B",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>

            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#1A1A2E",
              }}
            >
              Session Timeout Warning
            </h3>

            <p
              style={{
                margin: "0 0 24px",
                fontSize: "0.88rem",
                color: "#64748B",
                lineHeight: "1.6",
              }}
            >
              You&apos;ve been inactive. Your session will automatically end for security.
            </p>

            {/* Countdown */}
            <div
              style={{
                background: "#FEF2F2",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "24px",
                border: "1px solid #FECACA",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#DC2626",
                  fontFamily: "monospace",
                  letterSpacing: "2px",
                }}
              >
                {formatTime(countdown)}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#991B1B",
                  fontWeight: 600,
                  marginTop: "4px",
                }}
              >
                until automatic logout
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #E5E7EB",
                  background: "white",
                  color: "#6B7280",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Logout Now
              </button>
              <button
                onClick={resetTimer}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #4A7C59, #6B9E78)",
                  color: "white",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(74, 124, 89, 0.3)",
                  transition: "all 0.2s ease",
                }}
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
