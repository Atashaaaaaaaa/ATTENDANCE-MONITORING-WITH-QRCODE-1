"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        // Register new user
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          name: name || email.split("@")[0],
          email,
          role,
          section: "",
          status: "active",
          createdAt: new Date().toISOString(),
        });
        router.push(`/${role}/profile`);
      } else {
        // Login existing user
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // Check role from Firestore
        const userDoc = await getDoc(doc(db, "users", cred.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          router.push(`/${userData.role}/profile`);
        } else {
          // No profile yet, redirect based on selected role
          router.push(`/${role}/profile`);
        }
      }
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email. Try registering.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Try logging in.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Authentication error. Please check your Firebase configuration.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo mode - skip auth
  const handleDemoLogin = (demoRole) => {
    router.push(`/${demoRole}/profile`);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "2.5rem" }}>⚡</span>
        </div>
        <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>
        <p className="login-subtitle">
          {isRegister
            ? "Register for the Attendance Monitoring System"
            : "Sign in to the Attendance Monitoring System"}
        </p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                className="form-control"
                placeholder="e.g. Juan Dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="email@dlsu.edu.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={{
              background: "none",
              border: "none",
              color: "#6C3CE1",
              cursor: "pointer",
              fontSize: "0.88rem",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            {isRegister ? "Already have an account? Sign In" : "Need an account? Register"}
          </button>
        </div>

        <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #E5E7EB" }}>
          <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#9CA3AF", marginBottom: "12px" }}>
            Or try a quick demo
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => handleDemoLogin("admin")} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: "center" }}>
              🛡️ Admin
            </button>
            <button onClick={() => handleDemoLogin("teacher")} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: "center" }}>
              📚 Teacher
            </button>
            <button onClick={() => handleDemoLogin("student")} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: "center" }}>
              🎓 Student
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link href="/" style={{ fontSize: "0.82rem", color: "#9CA3AF" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
