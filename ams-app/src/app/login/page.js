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
                  type="password"
                  placeholder="PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
            <p>Experience seamless attendance tracking with our smart, AI-powered facial recognition system optimized for modern campuses.</p>
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
        <div className="forgot-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="forgot-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🔒</div>
            <h3>Password Reset</h3>
            <div style={{color: '#555', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '25px'}}>
              Please contact your System Administrator to request a password reset for your account.<br /><br />
              <strong style={{color: '#4A7C59', fontSize: '0.95rem'}}>admin@dlsu.edu.ph</strong>
            </div>
            <button className="close-modal-btn" onClick={() => setShowForgotModal(false)}>Got it</button>
          </div>
        </div>
      )}

    </div>
  );
}
