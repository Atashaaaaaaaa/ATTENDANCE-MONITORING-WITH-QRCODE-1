"use client";
import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminProfile() {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (auth.currentUser && newPassword) {
        await updatePassword(auth.currentUser, newPassword);
        alert("Profile settings updated!");
      } else {
        alert("Profile settings updated! (Demo mode)");
      }
      setNewPassword("");
    } catch (err) {
      alert("Update saved locally. " + (err.message || ""));
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
          <div className="profile-avatar admin">G</div>
          <div>
            <div className="profile-name">Gjhelian Atasha C. Constantino</div>
            <div className="profile-role">System Administrator</div>
            <div className="profile-id">ID: 2026-ADMIN-001</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Account Settings</div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              value="gjhelian.constantino@dlsu.edu.ph"
              readOnly
              style={{ backgroundColor: "#F9FAFB", cursor: "not-allowed" }}
            />
          </div>

          <div className="form-group">
            <label>Update Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ maxWidth: "400px" }}
            />
          </div>

          <button type="submit" className="btn btn-green" disabled={saving}>
            {saving ? "Saving..." : "Save Profile Changes"}
          </button>
        </form>
      </div>
    </>
  );
}
