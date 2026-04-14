"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const {
    signIn,
    userRole,
    loading: authLoading,
    pending2FA,
    pending2FAEmail,
    pending2FARecipientEmail,
    twoFAError,
    verify2FACode,
    generate2FACode,
    cancel2FA,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // 2FA state
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (userRole) {
      const dashboardPath = {
        admin: '/admin/overview',
        teacher: '/teacher/dashboard',
        student: '/student/attendance',
      };
      router.push(dashboardPath[userRole] || '/login');
    }
  }, [userRole, router]);

  // OTP countdown timer
  useEffect(() => {
    if (!pending2FA) return;
    setOtpCountdown(300); // Reset to 5 min

    const interval = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pending2FA]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto-focus first OTP input when modal opens
  useEffect(() => {
    if (pending2FA && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    }
  }, [pending2FA]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email.trim()) {
        throw new Error("Email is required");
      }
      if (!password) {
        throw new Error("Password is required");
      }

      const result = await signIn(email, password);

      // If 2FA is required, the modal will show automatically via pending2FA state
      // If admin bypass, result won't have requires2FA
      if (result && !result.requires2FA) {
        // Direct login (admin bypass) — redirect handled by useEffect
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit input
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otpDigits];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtpDigits(newOtp);
      const nextIdx = Math.min(index + digits.length, 5);
      otpRefs.current[nextIdx]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpDigits];
    newOtp[index] = value;
    setOtpDigits(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (code.length !== 6) return;

    setVerifying(true);
    try {
      const success = await verify2FACode(code);
      if (!success) {
        // Error is set in context
      }
    } catch (err) {
      // Error handled in context
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpCountdown(300);
    // Pass loginEmail — the context will look up the Firestore email internally
    await generate2FACode(pending2FAEmail, null);
    otpRefs.current[0]?.focus();
  };

  // Helper to mask an email for display (e.g. "j***n@gmail.com")
  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${local[1]}${'*'.repeat(Math.min(local.length - 3, 5))}${local[local.length - 1]}@${domain}`;
  };

  const handleCancel2FA = () => {
    cancel2FA();
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpCountdown(300);
  };

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (authLoading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="avatar-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 40, height: 40}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div></div>;

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* LEFT SIDE */}
        <div className="login-left">
          <Link href="/" className="login-header-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="logo-icon"></div>
            <span>AMS DESIGN</span>
          </Link>

          <div className="login-form-wrapper">
            <div className="avatar-container">
              <div className="avatar-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="input-group">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <input
                  type="text"
                  placeholder="USERNAME"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>

              <button type="submit" className="login-btn" disabled={loading || authLoading}>
                {loading ? "Wait..." : "LOGIN"}
              </button>

              <div className="form-actions">
                <label className="remember-me">
                  <input type="radio" name="remember" /> <span>Remember me</span>
                </label>
                <span className="forgot-link" style={{cursor: 'pointer'}} onClick={() => setShowForgotModal(true)}>Forgot your password?</span>
              </div>

            </form>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-right">

          <div className="welcome-text">
            <h1>Welcome.</h1>
            <p style={{ color: "var(--primary-dark)", fontWeight: "500" }}>Experience seamless attendance tracking with our smart, AI-powered facial recognition system optimized for modern campuses.</p>
          </div>

          {/* Animated Background Blob Motion behind right side */}
          <div className="animated-blobs">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>
          </div>
        </div>

      </div>

      {/* 2FA VERIFICATION MODAL */}
      {pending2FA && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(8px)",
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
              borderRadius: "24px",
              padding: "40px 36px",
              maxWidth: "440px",
              width: "92%",
              textAlign: "center",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1)",
              animation: "fadeInUp 0.4s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative gradient bar */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "4px",
              background: "linear-gradient(90deg, #4A7C59, #6B9E78, #A7F3D0)",
            }}></div>

            {/* Icon */}
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                border: "3px solid #A7F3D0",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#047857"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                <circle cx="12" cy="16" r="1"></circle>
              </svg>
            </div>

            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "1.3rem",
                fontWeight: 800,
                color: "#1A3A28",
                letterSpacing: "-0.02em",
              }}
            >
              Verify Your Identity
            </h3>

            <p
              style={{
                margin: "0 0 6px",
                fontSize: "0.88rem",
                color: "#64748B",
                lineHeight: "1.6",
              }}
            >
              A verification code has been sent to your registered email
            </p>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "#4A7C59",
              }}
            >
              {maskEmail(pending2FARecipientEmail || pending2FAEmail)}
            </p>

            {/* Error */}
            {twoFAError && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  marginBottom: "16px",
                  fontSize: "0.82rem",
                  color: "#991B1B",
                  fontWeight: 600,
                }}
              >
                {twoFAError}
              </div>
            )}

            {/* OTP Input */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    handleOtpChange(0, pasted);
                  }}
                  style={{
                    width: "48px",
                    height: "56px",
                    textAlign: "center",
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    borderRadius: "12px",
                    border: digit
                      ? "2px solid #4A7C59"
                      : "2px solid #E5E7EB",
                    background: digit ? "#F0FDF4" : "#F9FAFB",
                    color: "#1A3A28",
                    outline: "none",
                    transition: "all 0.2s ease",
                    fontFamily: "monospace",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#4A7C59";
                    e.target.style.boxShadow = "0 0 0 3px rgba(74, 124, 89, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = digit ? "#4A7C59" : "#E5E7EB";
                    e.target.style.boxShadow = "none";
                  }}
                />
              ))}
            </div>

            {/* Countdown */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                marginBottom: "24px",
                fontSize: "0.78rem",
                color: otpCountdown < 60 ? "#DC2626" : "#64748B",
                fontWeight: 600,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {otpCountdown > 0
                ? `Code expires in ${formatCountdown(otpCountdown)}`
                : "Code has expired"}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyOtp}
              disabled={otpDigits.join("").length !== 6 || verifying || otpCountdown === 0}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                background:
                  otpDigits.join("").length === 6 && otpCountdown > 0
                    ? "linear-gradient(135deg, #4A7C59, #6B9E78)"
                    : "#E5E7EB",
                color:
                  otpDigits.join("").length === 6 && otpCountdown > 0
                    ? "white"
                    : "#9CA3AF",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor:
                  otpDigits.join("").length === 6 && otpCountdown > 0
                    ? "pointer"
                    : "not-allowed",
                marginBottom: "12px",
                transition: "all 0.2s ease",
                boxShadow:
                  otpDigits.join("").length === 6 && otpCountdown > 0
                    ? "0 4px 15px rgba(74, 124, 89, 0.3)"
                    : "none",
              }}
            >
              {verifying ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span style={{
                    width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite", display: "inline-block",
                  }}></span>
                  Verifying...
                </span>
              ) : (
                "Verify & Login"
              )}
            </button>

            {/* Resend & Cancel */}
            <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
              <button
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                style={{
                  background: "none",
                  border: "none",
                  color: resendCooldown > 0 ? "#9CA3AF" : "#4A7C59",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                  textDecoration: resendCooldown > 0 ? "none" : "underline",
                  padding: "4px 8px",
                }}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend Code"}
              </button>
              <button
                onClick={handleCancel2FA}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9CA3AF",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.25s ease",
          }}
          onClick={() => setShowForgotModal(false)}>
          <div 
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-xl)",
              padding: "36px 32px",
              maxWidth: "460px",
              width: "90%",
              boxShadow: "var(--shadow-xl)",
              animation: "fadeInUp 0.35s ease",
              position: "relative",
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--warning-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "var(--warning)"
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                marginBottom: "16px",
                color: "var(--text-primary)",
              }}
            >
              Password Reset
            </h3>
            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--text-secondary)",
                marginBottom: "24px",
                lineHeight: "1.6"
              }}
            >
              Please contact your System Administrator to request a password reset for your account.
            </p>
            <div
              style={{
                background: "var(--bg-body)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                marginBottom: "24px",
              }}
            >
              <strong style={{color: 'var(--primary-dark)', fontSize: '0.95rem'}}>admin@dlsu.edu.ph</strong>
            </div>
            <button 
              className="btn btn-purple" 
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setShowForgotModal(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
