"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        router.push(`/${userData.role}/profile`);
      } else {
        router.push(`/student/profile`); // Default fallback
      }
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found.");
      } else {
        setError("Authentication error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        
        {/* LEFT SIDE */}
        <div className="login-left">
          <div className="login-header-logo">
            <div className="logo-icon"></div>
            <span>AMS DESIGN</span>
          </div>

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

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <div className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <input
                  type="email"
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

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Wait..." : "LOGIN"}
              </button>

              <div className="form-actions">
                <label className="remember-me">
                  <input type="radio" name="remember" /> <span>Remember me</span>
                </label>
                <a href="#" className="forgot-link">Forgot your password?</a>
              </div>
              
              <div className="form-dots">
                <span></span><span></span><span></span>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="login-right">
          
          <div className="visual-nav">
             <a href="#">ABOUT</a>
             <a href="#">DOWNLOAD</a>
             <a href="#">PROMO</a>
             <a href="#">CONTACT</a>
             <button className="nav-signin">SIGN IN</button>
             <button className="nav-menu">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
             </button>
          </div>

          <div className="welcome-text">
            <h1>Welcome.</h1>
            <p>Experience seamless attendance tracking with our smart, dynamic QR-based monitoring system optimized for modern campuses.</p>
            <div className="signup-prompt">
              Not a member? <a href="#">Sign up now</a>
            </div>
          </div>

          {/* Animated Background Blob Motion behind right side */}
          <div className="animated-blobs">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="blob blob-3"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
