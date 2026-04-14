"use client";
import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

export default function AdminProfile() {
  const { user, userData } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const isHardcodedAdmin = user?.uid === "hardcoded-admin-id";
  const displayName = isHardcodedAdmin ? "Gjhelian Atasha C. Constantino" : (userData?.fullName || userData?.name || user?.email || "Admin");
  const displayEmail = isHardcodedAdmin ? "admin" : (user?.email || userData?.email || "—");
  const displayRole = userData?.role || "admin";
  const initial = displayName?.charAt(0)?.toUpperCase() || "A";

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      if (auth.currentUser && newPassword) {
        await updatePassword(auth.currentUser, newPassword);
        alert("Password updated successfully!");
      } else {
        alert("Password updated! (Demo mode)");
      }
      setNewPassword("");
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        alert("For security, please log out and log in again before changing your password.");
      } else {
        alert("Error updating password: " + (err.message || ""));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Admin Profile</h1>
      </div>

      <div className="card">
        <div className="profile-card">
          <div className="profile-avatar admin" style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: "1.5rem", fontWeight: 800,
            flexShrink: 0,
          }}>{initial}</div>
          <div>
            <div className="profile-name">{displayName}</div>
            <div className="profile-role" style={{ textTransform: "capitalize" }}>
              {displayRole === "admin" ? "System Administrator" : displayRole}
            </div>
            <div className="profile-id" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              UID: {user?.uid || "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Account Information</div>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <label>Full Name</label>
            <p>{displayName}</p>
          </div>
          <div className="info-item">
            <label>Email Address</label>
            <p>{displayEmail}</p>
          </div>
          <div className="info-item">
            <label>Role</label>
            <p style={{ textTransform: "capitalize" }}>{displayRole}</p>
          </div>
          {userData?.department && (
            <div className="info-item">
              <label>Department</label>
              <p>{userData.department}</p>
            </div>
          )}
          {userData?.createdAt && (
            <div className="info-item">
              <label>Account Created</label>
              <p>{new Date(userData.createdAt?.seconds ? userData.createdAt.seconds * 1000 : userData.createdAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Security Settings</div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Update Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter new password (min. 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ maxWidth: "400px" }}
              minLength={6}
            />
          </div>

          <button type="submit" className="btn btn-green" disabled={saving || !newPassword}>
            {saving ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </>
  );
}
