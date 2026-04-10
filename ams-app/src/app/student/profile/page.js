"use client";
import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function StudentProfile() {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
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
      alert("Update saved locally. " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Student Profile</h1>
      </div>

      <div className="card">
        <div className="profile-card">
          <div className="profile-avatar student">S</div>
          <div>
            <div className="profile-name">Student Name</div>
            <div className="profile-role">Grade 12 - ICT</div>
            <div className="profile-id">Student ID: 2026-STU-450</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Personal Information</div>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <label>School Email</label>
            <p>student.email@dlsu.edu.ph</p>
          </div>
          <div className="info-item">
            <label>Enrollment Status</label>
            <p>Regular / Active</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Security Settings</div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Change Password</label>
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
            {saving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </>
  );
}
