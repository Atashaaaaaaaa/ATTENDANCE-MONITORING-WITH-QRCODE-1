"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, userRole, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
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

      await signIn(email, password);
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

    </div>
  );
}
